const { ipcMain, app, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { state } = require('../workspaceManager');

const REDIRECT_URI = 'http://localhost:3456/oauth2callback';

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'google-drive-tokens.json');

let localServer = null;
let googleInstance = null;
let oauth2Client = null;
let drive = null;

function initGoogle() {
  if (!googleInstance) {
    let clientId = 'YOUR_GOOGLE_DRIVE_CLIENT_ID';
    let clientSecret = 'YOUR_GOOGLE_DRIVE_CLIENT_SECRET';
    
    try {
      const creds = require('./cloudCredentials');
      clientId = creds.GOOGLE_CLIENT_ID;
      clientSecret = creds.GOOGLE_CLIENT_SECRET;
    } catch (e) {
      console.warn("File cloudCredentials.ts non trovato o non configurato.");
    }

    if (!clientId || !clientSecret || clientId === 'YOUR_GOOGLE_DRIVE_CLIENT_ID') {
      throw new Error("Credenziali Google Drive mancanti. Il file cloudCredentials.ts non è configurato.");
    }

    const { google } = require('googleapis');
    googleInstance = google;
    oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
    drive = google.drive({ version: 'v3', auth: oauth2Client });
  }
}

function loadSavedTokens() {
  try {
    initGoogle();
  } catch (e) {
    console.warn("Google Drive disabilitato:", e.message);
    return false;
  }
  
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oauth2Client.setCredentials(tokens);
      return true;
    } catch (e) {
      console.error('Errore nel caricamento dei token di Drive:', e);
    }
  }
  return false;
}

async function authenticateDrive() {
  return new Promise((resolve, reject) => {
    if (loadSavedTokens()) {
      return resolve(true);
    }

    if (!oauth2Client) {
      return reject(new Error("Credenziali Google Drive mancanti. Il file cloudCredentials.ts non è configurato."));
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });

    if (localServer) localServer.close();

    localServer = http.createServer(async (req, res) => {
      try {
        const urlObj = new URL(req.url, `http://localhost:3456`);
        const code = urlObj.searchParams.get('code');
        
        if (code) {
          res.end('<h1>Autenticazione completata!</h1><p>Puoi chiudere questa scheda e tornare ad ArchiView.</p><script>window.close()</script>');
          localServer.close();
          localServer = null;
          
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
          resolve(true);
        } else {
          res.end('In attesa di autenticazione...');
        }
      } catch (e) {
        res.end('Errore durante l\'autenticazione.');
        reject(e);
      }
    }).listen(3456, () => {
      shell.openExternal(authUrl);
    });
  });
}

async function logoutDrive() {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
  }
  oauth2Client.setCredentials(null);
  return true;
}

async function checkDriveStatus() {
  if (!loadSavedTokens()) return { isAuthenticated: false };
  try {
    const res = await drive.about.get({ fields: 'user' });
    return { 
      isAuthenticated: true, 
      user: res.data.user.emailAddress 
    };
  } catch (e) {
    return { isAuthenticated: false };
  }
}

// Funzioni Helper per Drive
async function getOrCreateFolder(folderName, parentId = null) {
  let q = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  const res = await drive.files.list({ q, spaces: 'drive', fields: 'files(id, name)' });
  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentId ? [parentId] : undefined
  };

  const folder = await drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  });
  return folder.data.id;
}

async function uploadFile(localPath, driveFileName, parentId) {
  const q = `name='${driveFileName}' and '${parentId}' in parents and trashed=false`;
  const res = await drive.files.list({ q, spaces: 'drive', fields: 'files(id)' });
  
  const media = {
    body: fs.createReadStream(localPath)
  };

  if (res.data.files.length > 0) {
    const fileId = res.data.files[0].id;
    await drive.files.update({
      fileId: fileId,
      media: media
    });
  } else {
    await drive.files.create({
      resource: {
        name: driveFileName,
        parents: [parentId]
      },
      media: media,
      fields: 'id'
    });
  }
}

async function downloadFile(fileId, destPath) {
  return new Promise((resolve, reject) => {
    drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' })
      .then(res => {
        const dest = fs.createWriteStream(destPath);
        res.data.on('end', () => resolve(undefined))
                .on('error', (err: any) => reject(err))
                .pipe(dest);
      })
      .catch(reject);
  });
}

// Nuovo metodo per scaricare i dati da Drive
async function pullFromDrive() {
  if (!state.currentWorkspacePath) throw new Error("Nessun workspace aperto");
  
  const rootFolderId = await getOrCreateFolder('ArchiView_Backup');
  
  const q = `name='database_manoscritti.json' and '${rootFolderId}' in parents and trashed=false`;
  const res = await drive.files.list({ q, spaces: 'drive', fields: 'files(id, modifiedTime)' });
  
  if (res.data.files.length > 0) {
    const fileId = res.data.files[0].id;
    const driveModifiedTime = new Date(res.data.files[0].modifiedTime).getTime();
    
    // Ritorna il file in memoria senza sovrascrivere direttamente,
    // così il frontend può fare il merge in modo sicuro.
    const driveRes = await drive.files.get({ fileId: fileId, alt: 'media' });
    return { database: driveRes.data, driveModifiedTime };
  }
  
  return null;
}

async function syncToDrive() {
  if (!state.currentWorkspacePath) throw new Error("Nessun workspace aperto");
  
  const rootFolderId = await getOrCreateFolder('ArchiView_Backup');
  
  const dbPath = path.join(state.currentWorkspacePath, 'database_manoscritti.json');
  if (fs.existsSync(dbPath)) {
    await uploadFile(dbPath, 'database_manoscritti.json', rootFolderId);
  }

  // Come da richiesta: gli allegati non vengono caricati sul drive, rimangono in locale
  return true;
}

function setupDriveIpc() {
  ipcMain.handle('drive-auth', async () => {
    return await authenticateDrive();
  });
  ipcMain.handle('drive-logout', async () => {
    return await logoutDrive();
  });
  ipcMain.handle('drive-status', async () => {
    return await checkDriveStatus();
  });
  ipcMain.handle('drive-pull', async () => {
    return await pullFromDrive();
  });
  ipcMain.handle('drive-sync', async () => {
    await syncToDrive();
    return true;
  });
}

module.exports = { setupDriveIpc };
export {};
