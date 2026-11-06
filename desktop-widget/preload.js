// 위젯 화면에 열어 주는 최소한의 통로. 파일·노드 API 는 넘기지 않는다
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tkDesktop', {
  onState: (cb) => ipcRenderer.on('state', (_e, state) => cb(state)),
  setOpacity: (v) => ipcRenderer.send('set-opacity', v),
  pickFolder: () => ipcRenderer.send('pick-folder'),
  toggleTheme: () => ipcRenderer.send('toggle-theme'),
  openApp: () => ipcRenderer.send('open-app'),
  hide: () => ipcRenderer.send('hide'),
});
