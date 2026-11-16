// 위젯 화면에 열어 주는 최소한의 통로. 파일·노드 API 는 넘기지 않는다
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tkDesktop', {
  onState: (cb) => ipcRenderer.on('state', (_e, state) => cb(state)),
  setOpacity: (v) => ipcRenderer.send('set-opacity', v),
  pickFolder: () => ipcRenderer.send('pick-folder'),
  toggleTheme: () => ipcRenderer.send('toggle-theme'),
  openApp: () => ipcRenderer.send('open-app'),
  hide: () => ipcRenderer.send('hide'),
  // 야근 포도알판 창
  grape: {
    onBoard: (cb) => ipcRenderer.on('grape', (_e, b) => cb(b)),
    toggle: (date) => ipcRenderer.send('grape-toggle', date),
    mode: (m) => ipcRenderer.send('grape-mode', m),
    pin: () => ipcRenderer.send('grape-pin'),
    hide: () => ipcRenderer.send('grape-hide'),
    capture: (rect, action, name) => ipcRenderer.invoke('grape-capture', rect, action, name),
  },
});
