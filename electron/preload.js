const { contextBridge } = require('electron');

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  isElectron: true
});
