// TimeKeeper 캘린더 바탕화면 위젯 (Electron)
// - 테두리 없는 투명 창에 캘린더를 그린다. 배경 투명도는 위젯 머리의 슬라이더나 트레이 메뉴에서
// - 데이터: TimeKeeper 앱(브라우저)이 「자동 백업 폴더」에 쓰는 timekeeper-calendar-widget.json 을 지켜본다.
//   위젯은 브라우저와 저장소가 달라서 앱 데이터를 직접 못 읽는다
// - 트레이 아이콘: 투명도 · 클릭 통과(잠금) · 항상 위 · 윈도우 시작 시 실행 · 폴더 바꾸기 · 종료
const { app, BrowserWindow, Tray, Menu, dialog, ipcMain, shell, nativeImage, screen, nativeTheme } = require('electron');
const fs = require('fs');
const path = require('path');
const { readSnapshotFrom, isWatchedFile } = require('./snapshot');

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

function sendState() {
  if (!win || win.isDestroyed()) return;
  const dark = settings.theme === 'system' ? nativeTheme.shouldUseDarkColors : settings.theme === 'dark';
  win.webContents.send('state', { snapshot: readSnapshot(), settings: { ...settings, dark } });
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
  win.setIgnoreMouseEvents(settings.clickThrough, { forward: true });
}

function buildTrayMenu() {
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
          app.setLoginItemSettings({ openAtLogin: item.checked });
        },
      },
      { type: 'separator' },
      { label: settings.folder ? `폴더: ${settings.folder}` : '폴더: (아직 안 고름)', enabled: false },
      { label: '자동 백업 폴더 바꾸기…', click: pickFolder },
      { label: 'TimeKeeper 열기', click: () => shell.openExternal(APP_URL) },
      { label: '위치 초기화', click: () => win && win.center() },
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

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createWindow();
    const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'));
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip('TimeKeeper 캘린더 위젯');
    tray.on('click', () => win && (win.isVisible() ? win.hide() : win.show()));
    buildTrayMenu();
    watchFolder();
    nativeTheme.on('updated', sendState); // 윈도우 라이트/다크가 바뀌면 따라간다
    if (!settings.folder) setTimeout(pickFolder, 600); // 처음 켜면 폴더부터
  });
  app.on('second-instance', () => win && win.show());
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
