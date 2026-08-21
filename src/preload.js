const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe object to the UI window
contextBridge.exposeInMainWorld('authAPI', {
    attemptLogin: (username, password) => ipcRenderer.invoke('auth:login', { username, password })
});