const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gta', {
  settings: () => ipcRenderer.invoke('settings'),
  run: request => ipcRenderer.invoke('run', request),
  progress: callback => ipcRenderer.on('progress', (_event, message) => callback(message))
});
