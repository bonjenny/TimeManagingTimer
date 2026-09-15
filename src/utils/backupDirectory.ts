import { openDB } from 'idb';

// 자동 백업 저장 폴더. 브라우저 File System Access API(크롬·웨일·엣지)로 사용자가 고른 폴더에 직접 쓴다.
// 폴더 핸들은 문자열이 아니라서 앱 kv 저장소(백업 JSON 에 통째로 들어감)가 아닌 별도 IndexedDB 에 둔다.

type PermissionMode = { mode: 'readwrite' };
interface DirHandle extends FileSystemDirectoryHandle {
  queryPermission(opts: PermissionMode): Promise<PermissionState>;
  requestPermission(opts: PermissionMode): Promise<PermissionState>;
}
type PickerWindow = Window & { showDirectoryPicker?: (opts: { id?: string; mode?: 'readwrite' }) => Promise<DirHandle> };

const DB_NAME = 'timekeeper-fs';
const STORE = 'handles';
const KEY = 'backup-dir';
const RW: PermissionMode = { mode: 'readwrite' };

const db = () => openDB(DB_NAME, 1, { upgrade: (d) => { d.createObjectStore(STORE); } });

export const isDirectoryPickerSupported = () => typeof (window as PickerWindow).showDirectoryPicker === 'function';

export async function getBackupDirectory(): Promise<{ name: string; permission: PermissionState } | null> {
  if (!isDirectoryPickerSupported()) return null;
  const handle = (await (await db()).get(STORE, KEY)) as DirHandle | undefined;
  if (!handle) return null;
  return { name: handle.name, permission: await handle.queryPermission(RW) };
}

/** 폴더 선택 창을 띄워 저장. 반드시 클릭 같은 사용자 동작 안에서 호출. 취소하면 null. */
export async function pickBackupDirectory(): Promise<string | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  try {
    const handle = await picker({ id: 'timekeeper-backup', mode: 'readwrite' });
    await (await db()).put(STORE, handle, KEY);
    return handle.name;
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return null;
    throw e;
  }
}

/** 브라우저를 다시 켜면 권한이 "확인 필요"로 돌아간다. 사용자 동작 안에서 다시 허용받는다. */
export async function requestBackupDirectoryPermission(): Promise<PermissionState | null> {
  const handle = (await (await db()).get(STORE, KEY)) as DirHandle | undefined;
  return handle ? handle.requestPermission(RW) : null;
}

export async function clearBackupDirectory(): Promise<void> {
  await (await db()).delete(STORE, KEY);
}

/** 폴더가 설정돼 있고 쓰기 권한이 살아 있으면 파일을 쓰고 true. 아니면 false (호출부가 다운로드로 대체). */
export async function writeToBackupDirectory(file_name: string, content: string): Promise<boolean> {
  if (!isDirectoryPickerSupported()) return false;
  try {
    const handle = (await (await db()).get(STORE, KEY)) as DirHandle | undefined;
    if (!handle || (await handle.queryPermission(RW)) !== 'granted') return false;
    const file = await handle.getFileHandle(file_name, { create: true });
    const writable = await file.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (e) {
    console.warn('[TimeKeeper] 백업 폴더 저장 실패, 다운로드로 대체:', e);
    return false;
  }
}
