const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('apiBrowser', {
    leggiDati: () => ipcRenderer.invoke('leggi-dati'),
    salvaDati: (dati) => ipcRenderer.invoke('salva-dati', dati),
    
    // Funzioni aggiornate per gestire qualsiasi tipo di allegato
    salvaAllegato: (filePath) => ipcRenderer.invoke('salva-allegato', filePath),
    apriPdfEsterno: (fileName) => ipcRenderer.invoke('apri-pdf-esterno', fileName),
    getAllegatoPath: (fileName) => ipcRenderer.invoke('get-allegato-path', fileName),
    
    getWorkspacePath: () => ipcRenderer.invoke('get-workspace-path'),
    changeWorkspace: () => ipcRenderer.invoke('change-workspace'),
    exportWorkspaceZip: () => ipcRenderer.invoke('export-workspace-zip'),
    
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    apriLinkEsterno: (url) => ipcRenderer.invoke('apri-link-esterno', url),
    onExportProgress: (callback) => ipcRenderer.on('export-progress', (event, progress) => callback(progress))
});