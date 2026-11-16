// 야근 포도알판 창 (모니터 오른쪽 아래 작은 창). 붙인 날짜 저장 · 창 크기 · PNG 저장/복사를 맡는다.
// 붙인 날짜는 이 PC 의 userData/grape.json 에만 둔다 (TimeKeeper 앱과 따로). 출퇴근은 캘린더 스냅숏(clock)을 같이 받는다.
// 월별 판 · 근무일 계산 · 그리기는 화면(renderer/grape.js + grape-board.js)이 한다
const { app, BrowserWindow, screen, ipcMain, dialog, clipboard, ClipboardItem } = require('electron');
const fs = require('fs');
const path = require('path');
const { toggle } = require('./renderer/grape-board');
const HOLIDAYS = require('./holidays.json');

const FILE = path.join(app.getPath('userData'), 'grape.json');
// 창 크기: 판 · 접힘(알 개수만) · 기념 카드
const SIZES = { board: { width: 300, height: 500 }, collapsed: { width: 190, height: 48 }, card: { width: 420, height: 770 } };

function load() {
  // 포도알판은 기본 꺼짐: 트레이 메뉴 「야근 포도알판」을 켜야 보인다
  const base = { visible: false, pinned: true, mode: 'board', anchor: null, dates: [] };
  try {
    const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    // 예전(20알 판) 저장본: 판마다 들어 있던 알 날짜를 한데 모은다
    const old = [...(saved.history || []), saved.current].flatMap((b) => (b?.grapes || []).map((g) => g.date));
    const { current: _c, history: _h, ...rest } = saved;
    return { ...base, ...rest, dates: [...new Set([...(saved.dates || []), ...old])].sort() };
  } catch {
    return base;
  }
}

function setupGrape({ preload, getState, onChange = () => {} }) {
  let data = load();
  let win = null;
  const save = (patch) => {
    data = { ...data, ...patch };
    try {
      fs.mkdirSync(path.dirname(FILE), { recursive: true });
      fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('grape save failed', e);
    }
  };
  const send = (channel, payload) => win && !win.isDestroyed() && win.webContents.send(channel, payload);
  const push = () => {
    send('state', getState());
    send('grape', { dates: data.dates, holidays: HOLIDAYS, pinned: data.pinned, mode: data.mode });
  };

  // 오른쪽 아래 모서리(anchor)를 붙박고 크기만 바꾼다. 처음엔 주 모니터 작업 영역 오른쪽 아래
  const boundsFor = (mode) => {
    const area = screen.getPrimaryDisplay().workArea;
    const a = data.anchor || { right: area.x + area.width - 16, bottom: area.y + area.height - 16 };
    const s = SIZES[mode];
    return { x: Math.round(a.right - s.width), y: Math.max(area.y, Math.round(a.bottom - s.height)), ...s };
  };

  function create() {
    if (data.mode === 'card') save({ mode: 'board' });
    win = new BrowserWindow({
      ...boundsFor(data.mode),
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      skipTaskbar: true,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      alwaysOnTop: data.pinned,
      show: data.visible,
      title: '야근 포도알',
      webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
    });
    win.loadFile(path.join(__dirname, 'renderer', 'grape.html'));
    win.webContents.on('did-finish-load', push);
    // 끌어서 옮기면 오른쪽 아래 모서리를 기억한다
    let t = null;
    win.on('moved', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!win || win.isDestroyed()) return;
        const b = win.getBounds();
        save({ anchor: { right: b.x + b.width, bottom: b.y + b.height } });
      }, 300);
    });
    win.on('closed', () => (win = null));
  }

  const on = (channel, fn) => ipcMain.on(channel, (e, ...args) => e.sender === win?.webContents && fn(...args));
  on('grape-toggle', (date) => {
    save({ dates: toggle(data.dates, String(date)) });
    push();
  });
  on('grape-mode', (mode) => {
    if (!SIZES[mode]) return;
    save({ mode });
    win.setBounds(boundsFor(mode));
    push();
  });
  on('grape-pin', () => {
    save({ pinned: !data.pinned });
    win.setAlwaysOnTop(data.pinned);
    push();
  });
  on('grape-hide', () => {
    save({ visible: false });
    win.hide();
    onChange(); // 트레이 메뉴 체크 표시
  });
  // 기념 카드 부분만 찍어 PNG 로 저장하거나 클립보드에 넣는다 (메신저에 바로 붙여넣기)
  ipcMain.handle('grape-capture', async (e, rect, action, name) => {
    if (!win || e.sender !== win.webContents) return false;
    const r = { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
    const image = await win.webContents.capturePage(r);
    if (action === 'copy') {
      // Electron 45 부터 clipboard.writeImage 가 없다 → 브라우저와 같은 ClipboardItem(image/png) 으로 쓴다
      await clipboard.write([new ClipboardItem({ 'image/png': new Blob([image.toPNG()], { type: 'image/png' }) })]);
      return true;
    }
    const res = await dialog.showSaveDialog(win, {
      title: '기념 카드 저장',
      defaultPath: path.join(app.getPath('pictures'), `${String(name || '야근포도알').replace(/[\\/:*?"<>|]/g, '')}.png`),
      filters: [{ name: 'PNG', extensions: ['png'] }],
    });
    if (res.canceled || !res.filePath) return false;
    fs.writeFileSync(res.filePath, image.toPNG());
    return true;
  });

  return {
    create,
    push,
    isVisible: () => data.visible,
    toggle: () => {
      if (!win) return;
      const visible = !win.isVisible();
      save({ visible });
      visible ? win.show() : win.hide();
      onChange();
    },
    resetPosition: () => {
      save({ anchor: null });
      if (win) win.setBounds(boundsFor(data.mode));
    },
  };
}

module.exports = { setupGrape };
