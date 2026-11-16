// TimeKeeper 캘린더 바탕화면 위젯 (Electron)
// - 테두리 없는 투명 창에 캘린더를 그린다. 배경 투명도는 위젯 머리의 슬라이더나 트레이 메뉴에서
// - 데이터: TimeKeeper 앱(브라우저)이 「자동 백업 폴더」에 쓰는 timekeeper-calendar-widget.json 을 지켜본다.
//   위젯은 브라우저와 저장소가 달라서 앱 데이터를 직접 못 읽는다
// - 트레이 아이콘: 투명도 · 클릭 통과(잠금) · 항상 위 · 윈도우 시작 시 실행 · 폴더 바꾸기 · 종료
const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, shell, nativeImage, screen, nativeTheme } = require('electron');
const fs = require('fs');
const path = require('path');
const { readSnapshotFrom, isWatchedFile } = require('./snapshot');
const { setupGrape } = require('./grape-main');

const APP_URL = 'https://developer.ecount.com/EFA/time-managing.html';
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

// theme: system(윈도우 설정 따라감) | light | dark
const DEFAULTS = { bounds: null, opacity: 0.55, clickThrough: false, alwaysOnTop: false, folder: '', launchAtLogin: false, theme: 'system' };

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}
let settings = loadSettings();
function saveSettings(patch) {
  settings = { ...settings, ...patch };
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('settings save failed', e);
  }
}

let win = null;
let tray = null;
let watcher = null;

// 위젯 파일이 없거나 오래됐으면 가장 최근 자동 백업에서 캘린더를 꺼낸다 (snapshot.js)
const readSnapshot = () => readSnapshotFrom(settings.folder);

function statePayload() {
  const dark = settings.theme === 'system' ? nativeTheme.shouldUseDarkColors : settings.theme === 'dark';
  return { snapshot: readSnapshot(), settings: { ...settings, dark } };
}

// 야근 포도알판 창 (grape-main.js). 캘린더와 같은 스냅숏 · 테마를 받는다. 기본은 꺼짐 (트레이 메뉴에서 켠다)
const grape = setupGrape({ preload: path.join(__dirname, 'preload.js'), getState: statePayload, onChange: () => buildTrayMenu() });

function sendState() {
  if (win && !win.isDestroyed()) win.webContents.send('state', statePayload());
  grape.push();
}

// 폴더를 지켜보다 위젯 파일이 바뀌면 다시 그린다 (앱이 1.5초 모아서 쓰므로 0.3초만 더 기다린다)
function watchFolder() {
  if (watcher) watcher.close();
  watcher = null;
  if (!settings.folder || !fs.existsSync(settings.folder)) return;
  let timer = null;
  watcher = fs.watch(settings.folder, (_event, file) => {
    if (!isWatchedFile(file)) return;
    clearTimeout(timer);
    timer = setTimeout(sendState, 300);
  });
}

async function pickFolder() {
  const result = await dialog.showOpenDialog(win, {
    title: 'TimeKeeper 자동 백업 폴더 고르기',
    message: 'TimeKeeper 설정 › 데이터 관리에서 고른 자동 백업 폴더를 고르세요',
    properties: ['openDirectory'],
    defaultPath: settings.folder || app.getPath('documents'),
  });
  if (result.canceled || !result.filePaths[0]) return;
  saveSettings({ folder: result.filePaths[0] });
  watchFolder();
  sendState();
  buildTrayMenu();
}

function applyWindowFlags() {
  if (!win) return;
  win.setAlwaysOnTop(settings.alwaysOnTop);
  // 클릭 통과: 위젯 아래 바탕화면·창을 그대로 누를 수 있다 (트레이에서 풀기)
  // forward 는 끈다. 켜면 전역 마우스 훅으로 움직임이 계속 들어와 다른 창에 가려져 있어도 칩 툴팁이 뜬다
  win.setIgnoreMouseEvents(settings.clickThrough);
}

// portable exe 는 임시 폴더에 풀려서 돈다. process.execPath(임시 경로)를 등록하면 재부팅 때 그 폴더가 없어 안 뜨므로
// 사용자가 둔 exe 경로(PORTABLE_EXECUTABLE_FILE)를 등록한다. 켤 때마다 다시 등록해서 exe 를 옮겨도 따라간다
function applyLoginItem() {
  const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin, path: exe });
}

function buildTrayMenu() {
  if (!tray) return;
  const opacityItems = [0.15, 0.3, 0.45, 0.55, 0.7, 0.85, 1].map((v) => ({
    label: `${Math.round(v * 100)}%`,
    type: 'radio',
    checked: Math.abs(settings.opacity - v) < 0.01,
    click: () => {
      saveSettings({ opacity: v });
      sendState();
    },
  }));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'TimeKeeper 캘린더 위젯', enabled: false },
      { type: 'separator' },
      { label: '배경 진하기', submenu: opacityItems },
      {
        label: '테마',
        submenu: [
          ['system', '윈도우 설정 따라가기'],
          ['light', '라이트'],
          ['dark', '다크'],
        ].map(([v, label]) => ({
          label,
          type: 'radio',
          checked: settings.theme === v,
          click: () => {
            saveSettings({ theme: v });
            sendState();
          },
        })),
      },
      {
        label: '클릭 통과 (잠금)',
        type: 'checkbox',
        checked: settings.clickThrough,
        click: (item) => {
          saveSettings({ clickThrough: item.checked });
          applyWindowFlags();
          sendState();
        },
      },
      {
        label: '항상 위',
        type: 'checkbox',
        checked: settings.alwaysOnTop,
        click: (item) => {
          saveSettings({ alwaysOnTop: item.checked });
          applyWindowFlags();
        },
      },
      {
        label: '윈도우 시작 시 실행',
        type: 'checkbox',
        checked: settings.launchAtLogin,
        click: (item) => {
          saveSettings({ launchAtLogin: item.checked });
          applyLoginItem();
        },
      },
      { type: 'separator' },
      { label: settings.folder ? `폴더: ${settings.folder}` : '폴더: (아직 안 고름)', enabled: false },
      { label: '자동 백업 폴더 바꾸기…', click: pickFolder },
      { label: 'TimeKeeper 열기', click: () => shell.openExternal(APP_URL) },
      { label: '야근 포도알판', type: 'checkbox', checked: grape.isVisible(), click: () => grape.toggle() },
      { label: '위치 초기화', click: () => { if (win) win.center(); grape.resetPosition(); } },
      { type: 'separator' },
      { label: '종료', click: () => app.quit() },
    ])
  );
}

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  const b = settings.bounds || { width: 820, height: 600, x: area.x + area.width - 860, y: area.y + 40 };
  win = new BrowserWindow({
    ...b,
    minWidth: 420,
    minHeight: 320,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    title: 'TimeKeeper 캘린더',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', sendState);
  applyWindowFlags();
  let save_timer = null;
  const remember = () => {
    clearTimeout(save_timer);
    save_timer = setTimeout(() => win && !win.isDestroyed() && saveSettings({ bounds: win.getBounds() }), 500);
  };
  win.on('move', remember);
  win.on('resize', remember);
}

// ── 하나만 띄우기 · 새 버전으로 바꿔 끼우기 ──
// 위젯은 하나만 뜬다. 켜져 있을 때 exe 를 또 실행하면 새 것은 꺼지고 켜져 있던 창이 보인다.
// 그런데 더 높은 버전 exe 를 실행했으면: 켜져 있던 위젯이 비켜 주고(종료) 새 버전이 뜬다.
// 켜져 있는 위젯의 버전 · pid 는 running.json 에 적어 둔다 (1.0.5 이하엔 이 기능이 없어 안내 창을 띄운다)
const VERSION = app.getVersion();
const RUN_FILE = path.join(app.getPath('userData'), 'running.json');
const isNewer = (a, b) => {
  const x = String(a).split('.').map(Number);
  const y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
};
const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
async function acquireLock() {
  if (app.requestSingleInstanceLock({ version: VERSION })) return true;
  let running = null;
  try {
    running = JSON.parse(fs.readFileSync(RUN_FILE, 'utf8'));
  } catch {
    // 1.0.5 이하가 켜져 있다 (기록 없음)
  }
  if (running && running.pid && alive(running.pid) && !isNewer(VERSION, running.version)) return false; // 같거나 높은 버전이 켜져 있다
  // 예전 버전이 켜져 있다: 1.0.6 이상이면 위 요청(second-instance)을 받고 스스로 꺼진다. 꺼질 때까지 4초 기다린다
  for (let i = 0; i < 16 && (!running || alive(running.pid)); i++) await new Promise((r) => setTimeout(r, 250));
  if (app.requestSingleInstanceLock({ version: VERSION })) return true;
  await app.whenReady();
  dialog.showMessageBoxSync({
    type: 'info',
    title: 'TimeKeeper 캘린더 위젯',
    message: '이전 버전 위젯이 켜져 있어요',
    detail: '작업표시줄 오른쪽 트레이의 위젯 아이콘을 우클릭 › 「종료」한 뒤, 이 파일을 다시 실행해 주세요.\n(다음 버전부터는 새 파일을 실행하면 알아서 바뀌어요)',
  });
  return false;
}

acquireLock().then((ok) => {
  if (!ok) return app.quit();
  start();
});

function start() {
  app.whenReady().then(() => {
    try {
      fs.mkdirSync(path.dirname(RUN_FILE), { recursive: true });
      fs.writeFileSync(RUN_FILE, JSON.stringify({ version: VERSION, pid: process.pid }));
    } catch (e) {
      console.error('running.json write failed', e);
    }
    createWindow();
    grape.create();
    if (app.isPackaged) applyLoginItem();
    const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip('TimeKeeper 캘린더 위젯');
    tray.on('click', () => win && (win.isVisible() ? win.hide() : win.show()));
    buildTrayMenu();
    watchFolder();
    nativeTheme.on('updated', sendState); // 윈도우 라이트/다크가 바뀌면 따라간다
    if (!settings.folder) setTimeout(pickFolder, 600); // 처음 켜면 폴더부터
  });
  // exe 를 또 실행했다: 더 높은 버전이면 비켜 주고(종료), 아니면 창을 보여준다
  app.on('second-instance', (_e, _argv, _cwd, data) => {
    if (data && isNewer(data.version, VERSION)) return app.quit();
    if (win) win.show();
  });
  app.on('window-all-closed', () => app.quit());
}

// 위젯 화면(renderer)에서 오는 요청
ipcMain.on('set-opacity', (_e, v) => {
  saveSettings({ opacity: Math.min(1, Math.max(0, Number(v) || 0)) });
  buildTrayMenu();
});
ipcMain.on('pick-folder', () => pickFolder());
// 위젯 머리의 ☀/🌙 버튼: 라이트 ↔ 다크
ipcMain.on('toggle-theme', () => {
  const dark = settings.theme === 'system' ? nativeTheme.shouldUseDarkColors : settings.theme === 'dark';
  saveSettings({ theme: dark ? 'light' : 'dark' });
  buildTrayMenu();
  sendState();
});
ipcMain.on('open-app', () => shell.openExternal(APP_URL));
ipcMain.on('hide', () => win && win.hide());
