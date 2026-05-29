// @ts-nocheck

window.driveStatus = { isAuthenticated: false, user: null };

async function aggiornaStatoDrive() {
    if (window.apiDrive) {
        window.driveStatus = await window.apiDrive.status();
        const section = document.getElementById('settings-drive-section');
        const statusText = document.getElementById('settings-drive-status');
        const loginBtn = document.getElementById('btn-drive-login');
        const logoutBtn = document.getElementById('btn-drive-logout');
        const syncBtn = document.getElementById('btn-drive-sync');

        if (section) {
            if (window.driveStatus.isAuthenticated) {
                statusText.innerHTML = `<span class="text-green-600 font-semibold">Connesso come: ${window.driveStatus.user}</span>`;
                loginBtn.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
                syncBtn.classList.remove('hidden');
            } else {
                statusText.innerHTML = `<span class="text-stone-500">Non connesso</span>`;
                loginBtn.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
                syncBtn.classList.add('hidden');
            }
        }
    }
}

window.loginGoogleDrive = async function() {
    if (window.apiDrive) {
        if (typeof mostraMessaggio === 'function') mostraMessaggio("Apri il browser per completare l'accesso...", "info");
        try {
            await window.apiDrive.auth();
            await aggiornaStatoDrive();
            if (typeof mostraMessaggio === 'function') mostraMessaggio("Autenticazione a Google Drive completata!", "success");
        } catch (e) {
            console.error(e);
            if (typeof mostraMessaggio === 'function') mostraMessaggio("Errore durante l'autenticazione", "error");
        }
    }
};

window.logoutGoogleDrive = async function() {
    if (window.apiDrive) {
        try {
            await window.apiDrive.logout();
            await aggiornaStatoDrive();
            if (typeof mostraMessaggio === 'function') mostraMessaggio("Disconnesso da Google Drive.", "info");
        } catch (e) {
            console.error(e);
        }
    }
};

window.sincronizzaGoogleDrive = async function(silent = false) {
    if (window.apiDrive) {
        const btn = document.getElementById('btn-drive-sync');
        if (btn) btn.disabled = true;
        if (!silent && typeof mostraMessaggio === 'function') mostraMessaggio("Sincronizzazione su Google Drive in corso...", "info");
        
        try {
            // 1. Scarica da Drive (se esiste)
            const driveData = await window.apiDrive.pull();
            if (driveData && driveData.database) {
                // Esegue il merge sfruttando la logica già presente in state.ts
                if (typeof window.sincronizzaEUnisciDati === 'function') {
                    // Imposta temporaneamente l'ultimo caricamento per far vincere i record più recenti
                    const oldLastLoaded = window.ultimoCaricamento;
                    window.ultimoCaricamento = driveData.driveModifiedTime;
                    await window.sincronizzaEUnisciDati(driveData.database);
                    window.ultimoCaricamento = oldLastLoaded;
                }
            }

            // 2. Carica le modifiche locali unite (upload)
            await window.apiDrive.sync();
            
            if (!silent && typeof mostraMessaggio === 'function') mostraMessaggio("Sincronizzazione completata con successo!", "success");
            
            // Invia Ping Realtime a Pusher tramite Vercel Serverless
            inviaPingPusher();
        } catch (e) {
            console.error(e);
            if (!silent && typeof mostraMessaggio === 'function') mostraMessaggio("Errore durante la sincronizzazione: " + e.message, "error");
        } finally {
            if (btn) btn.disabled = false;
        }
    }
};

window.sincronizzaGoogleDriveBackground = async function() {
    console.log("Sincronizzazione in background avviata da Pusher...");
    await window.sincronizzaGoogleDrive(true);
    // Dopo aver sincronizzato (scaricato le modifiche), forza il ricaricamento dell'interfaccia
    if (typeof apriDatabase === 'function') {
        const workspacePath = await window.apiBrowser.getWorkspacePath();
        if (workspacePath) {
            window.apriDatabase(workspacePath, true);
        }
    }
};

async function inviaPingPusher() {
    if (!window.apiSettings) return;
    const settings = await window.apiSettings.get();
    
    if (settings.pusherWebhook && window.currentPusherChannelName) {
        try {
            await fetch(settings.pusherWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel: window.currentPusherChannelName,
                    event: 'drive-updated',
                    data: { senderId: window.myAppInstanceId }
                })
            });
            console.log("Ping Pusher inviato con successo.");
        } catch (err) {
            console.warn("Impossibile inviare ping Pusher:", err);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Inizializza lo stato all'avvio
    aggiornaStatoDrive();
});
