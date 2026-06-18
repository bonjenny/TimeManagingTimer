import { batchSetItems } from './storage';
import { buildExportPayload } from './export_data';
import { LEGACY_APP_PATH, isLegacyEcountApp, isLocalEnvironment } from './migrationNotice';

const LEGACY_ORIGIN = 'https://developer.ecount.com';
const MIGRATION_REQUEST = 'TIMEKEEPER_MIGRATION_REQUEST';
const MIGRATION_DATA = 'TIMEKEEPER_MIGRATION_DATA';
const MIGRATION_ERROR = 'TIMEKEEPER_MIGRATION_ERROR';
const MIGRATION_TIMEOUT_MS = 30_000;

const ALLOWED_OPENER_ORIGINS = new Set([
  'https://bonjenny.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

const isAllowedOpenerOrigin = (origin: string): boolean => {
  if (ALLOWED_OPENER_ORIGINS.has(origin)) return true;
  if (isLocalEnvironment() && origin.startsWith('http://localhost:')) return true;
  if (isLocalEnvironment() && origin.startsWith('http://127.0.0.1:')) return true;
  return false;
};

const isAllowedLegacyMessageOrigin = (origin: string): boolean => {
  if (origin === LEGACY_ORIGIN) return true;
  if (isLocalEnvironment() && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
    return true;
  }
  return false;
};

export const getLegacyAppUrl = (): string => {
  if (isLocalEnvironment()) {
    return `${window.location.origin}${window.location.pathname}?migrate=export`;
  }
  return `${LEGACY_ORIGIN}${LEGACY_APP_PATH}?migrate=export`;
};

export const canImportFromLegacySite = (): boolean => {
  return !isLegacyEcountApp();
};

export async function importExportPayload(data: Record<string, unknown>): Promise<void> {
  const items: Record<string, string> = {};
  Object.entries(data).forEach(([key, value]) => {
    items[key] = typeof value === 'string' ? value : JSON.stringify(value);
  });
  await batchSetItems(items);
}

const sendExportToOpener = (request_id: string): void => {
  if (!window.opener || window.opener.closed) return;

  const opener_origin = window.opener.origin;
  if (!isAllowedOpenerOrigin(opener_origin)) return;

  try {
    const payload = buildExportPayload();
    if (Object.keys(payload).length === 0) {
      window.opener.postMessage(
        { type: MIGRATION_ERROR, request_id, message: '가져올 데이터가 없습니다.' },
        opener_origin,
      );
      return;
    }

    window.opener.postMessage({ type: MIGRATION_DATA, request_id, payload }, opener_origin);
  } catch {
    window.opener.postMessage(
      { type: MIGRATION_ERROR, request_id, message: '데이터보내기에 실패했습니다.' },
      opener_origin,
    );
  }
};

export function startLegacyMigrationBridge(): void {
  if (!isLegacyEcountApp() && !isLocalEnvironment()) return;

  const params = new URLSearchParams(window.location.search);
  const should_auto_export = params.get('migrate') === 'export';

  const handleMessage = (event: MessageEvent) => {
    if (!isAllowedOpenerOrigin(event.origin)) return;
    if (event.data?.type !== MIGRATION_REQUEST) return;

    sendExportToOpener(event.data.request_id);
  };

  window.addEventListener('message', handleMessage);

  if (should_auto_export && window.opener && !window.opener.closed) {
    const request_id = params.get('request_id') ?? crypto.randomUUID();
    window.setTimeout(() => sendExportToOpener(request_id), 500);
  }
}

export function requestLegacyDataImport(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request_id = crypto.randomUUID();
    const legacy_url = `${getLegacyAppUrl()}&request_id=${encodeURIComponent(request_id)}`;
    const popup = window.open(legacy_url, 'timekeeper-migration', 'width=480,height=360');

    if (!popup) {
      reject(new Error('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.'));
      return;
    }

    const cleanup = () => {
      window.clearTimeout(timeout_id);
      window.removeEventListener('message', handleMessage);
      if (!popup.closed) popup.close();
    };

    const timeout_id = window.setTimeout(() => {
      cleanup();
      reject(new Error('구 사이트 응답 시간이 초과되었습니다. 구 사이트에 접속 가능한지 확인해 주세요.'));
    }, MIGRATION_TIMEOUT_MS);

    const handleMessage = async (event: MessageEvent) => {
      if (!isAllowedLegacyMessageOrigin(event.origin)) return;
      if (event.data?.request_id !== request_id) return;

      if (event.data.type === MIGRATION_DATA) {
        try {
          await importExportPayload(event.data.payload);
          cleanup();
          resolve();
        } catch {
          cleanup();
          reject(new Error('데이터 저장에 실패했습니다.'));
        }
        return;
      }

      if (event.data.type === MIGRATION_ERROR) {
        cleanup();
        reject(new Error(event.data.message ?? '구 사이트에서 데이터를 가져오지 못했습니다.'));
      }
    };

    window.addEventListener('message', handleMessage);
  });
}
