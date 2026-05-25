const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const userDataPath = app.getPath('userData');
const settingsPath = path.join(userDataPath, 'settings.json');

const state = {
  workspacePath: '',
  dataFilePath: '',
  attachmentsDirPath: '',
  mainWindow: null
};

function getAllSettings() {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
      console.error("Errore lettura settings:", error);
    }
  }
  return {};
}

function saveAllSettings(newSettings) {
  const current = getAllSettings();
  const updated = { ...current, ...newSettings };
  fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2));
  return updated;
}

function loadWorkspace() {
  const settings = getAllSettings();
  if (settings.workspacePath && fs.existsSync(settings.workspacePath)) {
    return settings.workspacePath;
  }
  return null;
}

function initWorkspace(folderPath) {
  state.workspacePath = folderPath;
  state.dataFilePath = path.join(folderPath, 'database_manoscritti.json');
  state.attachmentsDirPath = path.join(folderPath, 'allegati_manoscritti');

  if (!fs.existsSync(state.attachmentsDirPath)) {
    fs.mkdirSync(state.attachmentsDirPath, { recursive: true });
  }

  saveAllSettings({ workspacePath: folderPath });
}

module.exports = {
  state,
  loadWorkspace,
  initWorkspace,
  getAllSettings,
  saveAllSettings
};
export {};
