function aggiungiCartella() {
    document.getElementById('folder-name-input').value = '';
    document.getElementById('folder-modal').classList.remove('hidden-tab');
    setTimeout(() => document.getElementById('folder-name-input').focus(), 100);
}

function chiudiFolderModal() {
    document.getElementById('folder-modal').classList.add('hidden-tab');
}

function confermaAggiungiCartella() {
    const nome = document.getElementById('folder-name-input').value;
    if (nome) {
        const percorsoPulito = nome.trim().replace(/\/+$/, "");
        
        if (percorsoPulito === '') {
            mostraMessaggio("Il nome della cartella non può essere vuoto.", "error");
            return;
        }

        if (!appData.cartelle.includes(percorsoPulito)) {
            appData.cartelle.push(percorsoPulito);
            salvaTutto();
            renderSidebar();
            aggiornaSelectCartelle();
            chiudiFolderModal();
        } else {
            mostraMessaggio("Questa cartella esiste già.", "error");
        }
    }
}

// Sposta tutti i file e sottocartelle di un path in un nuovo path
async function spostaCartella(pathSorgente, pathDestinazioneBase) {
    if (pathSorgente === 'Generale') return; // Generale non si sposta
    if (pathSorgente === pathDestinazioneBase || pathDestinazioneBase.startsWith(pathSorgente + '/')) {
        // Impossibile spostare una cartella dentro se stessa o dentro una sua sottocartella
        return;
    }

    const nomeCartella = pathSorgente.split('/').pop();
    const nuovoPath = pathDestinazioneBase === 'ROOT' ? nomeCartella : `${pathDestinazioneBase}/${nomeCartella}`;
    
    if (appData.cartelle.includes(nuovoPath)) {
        mostraMessaggio("Esiste già una cartella con questo nome nella destinazione.", "error");
        return;
    }

    // Aggiorna cartelle
    const prefix = pathSorgente + '/';
    appData.cartelle = appData.cartelle.map(c => {
        if (c === pathSorgente) return nuovoPath;
        if (c.startsWith(prefix)) return c.replace(pathSorgente, nuovoPath);
        return c;
    });

    // Aggiorna manoscritti
    appData.manoscritti.forEach(m => {
        if (m.cartella === pathSorgente) m.cartella = nuovoPath;
        else if (m.cartella && m.cartella.startsWith(prefix)) m.cartella = m.cartella.replace(pathSorgente, nuovoPath);
    });

    await salvaTutto();
    renderSidebar();
    aggiornaSelectCartelle();
    renderMain();
}

async function spostaManoscritto(idManoscritto, nuovoPathCartella) {
    const m = appData.manoscritti.find(x => x.id === idManoscritto);
    if (m && m.cartella !== nuovoPathCartella) {
        m.cartella = nuovoPathCartella;
        await salvaTutto();
        renderMain();
    }
}

async function eliminaCartellaAttuale() {
    if (cartellaAttuale === 'Generale') {
        mostraMessaggio("La cartella 'Generale' non può essere eliminata.", "error");
        return;
    }
    
    // Controlla se ci sono manoscritti dentro
    const haManoscritti = appData.manoscritti.some(m => m.cartella === cartellaAttuale);
    if (haManoscritti) {
        mostraMessaggio("Impossibile eliminare: la cartella contiene ancora dei manoscritti.", "error");
        return;
    }

    if(confirm(`Sei sicuro di voler eliminare la cartella "${cartellaAttuale}"?`)) {
        appData.cartelle = appData.cartelle.filter(c => c !== cartellaAttuale);
        cartellaAttuale = 'Generale';
        await salvaTutto();
        renderSidebar();
        renderMain();
        aggiornaSelectCartelle();
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    let nomeAllegato = document.getElementById('form-allegato-nome').value;
    let tipoAllegato = document.getElementById('form-allegato-tipo').value;
    const fileInput = document.getElementById('form-allegato');
    
    if (fileInput.files.length > 0 && window.apiBrowser) {
        try {
            const filePath = fileInput.files[0].path;
            const risultato = await window.apiBrowser.salvaAllegato(filePath);
            if (risultato) {
                nomeAllegato = risultato.fileName;
                tipoAllegato = risultato.ext === '.pdf' ? 'pdf' : 'immagine';
            }
        } catch (error) {
            console.error("Errore durante il salvataggio dell'allegato:", error);
            mostraMessaggio("Errore nel salvataggio del file. La scheda verrà salvata senza allegato.", "error");
        }
    }

    const idCorrente = document.getElementById('form-id').value;
    const cartellaScelta = document.getElementById('form-cartella').value;
    const tipoId = document.getElementById('form-tipo-documento').value;
    
    const tipo = appData.tipiDocumento.find(t => t.id === tipoId) || appData.tipiDocumento[0];
    const dynamicData = {};
    tipo.campi.forEach(campoId => {
        const el = document.getElementById('dyn-' + campoId.replace(/\s+/g, '_'));
        if (el) dynamicData[campoId] = el.value;
    });

    const newData = {
        id: idCorrente || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
        cartella: cartellaScelta,
        tipoDocumento: tipoId,
        segnatura: document.getElementById('form-segnatura').value,
        tags: document.getElementById('form-tags').value,
        allegato: nomeAllegato,
        allegatoTipo: tipoAllegato,
        ...dynamicData // Include i campi personalizzati (dataCronica, prezzo, ecc.)
    };
    
    // Mantieni valori storici fissi per compatibilità con le vecchie card
    if(!newData.titolo && dynamicData.titolo) newData.titolo = dynamicData.titolo;
    if(!newData.autore && dynamicData.autore) newData.autore = dynamicData.autore;
    if(!newData.note && dynamicData.note) newData.note = dynamicData.note;

    if (idCorrente) {
        const index = appData.manoscritti.findIndex(m => m.id === idCorrente);
        if (index !== -1) appData.manoscritti[index] = {...appData.manoscritti[index], ...newData}; // Merge per non perdere la trascrizione
    } else {
        appData.manoscritti.push(newData);
    }

    await salvaTutto();
    
    // Imposta la vista sulla cartella in cui abbiamo appena salvato
    cartellaAttuale = cartellaScelta; 
    renderSidebar();
    
    resetForm();
    switchTab('list');
    renderMain();
}

async function editItem(id) {
    const m = appData.manoscritti.find(x => x.id === id);
    document.getElementById('form-id').value = m.id;
    document.getElementById('form-cartella').value = m.cartella || 'Generale';
    document.getElementById('form-tipo-documento').value = m.tipoDocumento || 'manoscritto';
    
    renderDynamicFields();
    
    document.getElementById('form-segnatura').value = m.segnatura || '';
    document.getElementById('form-tags').value = m.tags || '';
    document.getElementById('form-allegato-nome').value = m.allegato || '';
    document.getElementById('form-allegato-tipo').value = m.allegatoTipo || '';
    
    const tipo = appData.tipiDocumento.find(t => t.id === (m.tipoDocumento || 'manoscritto')) || appData.tipiDocumento[0];
    tipo.campi.forEach(campoId => {
        const el = document.getElementById('dyn-' + campoId.replace(/\s+/g, '_'));
        if (el) el.value = m[campoId] || '';
    });
    
    const pImg = document.getElementById('preview-immagine');
    const pPdf = document.getElementById('preview-pdf');
    pImg.classList.add('hidden'); pPdf.classList.add('hidden');
    
    if (m.allegato && window.apiBrowser) {
        if (m.allegatoTipo === 'pdf') {
            document.getElementById('pdf-nome-file').textContent = "File in archivio";
            pPdf.classList.remove('hidden');
        } else {
            const b64 = await window.apiBrowser.leggiImmagine(m.allegato);
            if (b64) { pImg.src = b64; pImg.classList.remove('hidden'); }
        }
    }

    document.getElementById('form-title').textContent = "Modifica Scheda";
    document.getElementById('btn-cancel-edit').classList.remove('hidden');
    switchTab('add');
}

async function deleteItem(id) {
    if (confirm('Vuoi eliminare questa scheda? (L\'allegato rimarrà in cartella)')) {
        appData.manoscritti = appData.manoscritti.filter(x => x.id !== id);
        await salvaTutto();
        renderMain();
    }
}

function cancelEdit() { resetForm(); switchTab('list'); }

// --- LOGICA TRASCRIZIONE ---

async function apriTrascrizione(id) {
    const m = appData.manoscritti.find(x => x.id === id);
    if (!m) return;
    
    document.getElementById('trascrizione-id').value = m.id;
    document.getElementById('trascrizione-subtitle').textContent = `${m.segnatura} ${m.titolo ? '- ' + m.titolo : ''}`;
    
    // Carica il testo precedente (se esiste, altrimenti inizializza con un paragrafo vuoto cliccabile)
    document.getElementById('trascrizione-editor').innerHTML = m.trascrizione || '<p><br></p>';
    
    const panelAllegato = document.getElementById('trascrizione-allegato-panel');
    const btnCarica = document.getElementById('btn-carica-allegato-trasc');
    
    const imgPreview = document.getElementById('trasc-img-preview');
    const pdfPreview = document.getElementById('trasc-pdf-preview');
    const noAllegato = document.getElementById('trasc-no-allegato');
    
    imgPreview.classList.add('hidden');
    pdfPreview.classList.add('hidden');
    noAllegato.classList.add('hidden');
    imgPreview.src = '';
    pdfPreview.src = '';
    
    if (m.allegato && window.apiBrowser) {
        // Mostra il pannello diviso
        panelAllegato.classList.remove('hidden');
        btnCarica.classList.add('hidden');
        
        if (m.allegatoTipo === 'pdf') {
            const filePath = await window.apiBrowser.getAllegatoPath(m.allegato);
            pdfPreview.src = 'file:///' + filePath.replace(/\\/g, '/');
            pdfPreview.classList.remove('hidden');
        } else {
            const b64 = await window.apiBrowser.leggiImmagine(m.allegato);
            if (b64) {
                imgPreview.src = b64;
                imgPreview.classList.remove('hidden');
            } else {
                noAllegato.classList.remove('hidden');
            }
        }
    } else {
        // Nasconde il pannello destro, l'editor va a tutto schermo
        panelAllegato.classList.add('hidden');
        btnCarica.classList.remove('hidden'); 
        btnCarica.style.display = 'flex'; // override eventuale stile
    }
    
    switchTab('trascrizione');
}

function chiudiTrascrizione() {
    // Prima di chiudere fermiamo l'iframe
    document.getElementById('trasc-pdf-preview').src = '';
    switchTab('list');
}

async function salvaTrascrizione() {
    const id = document.getElementById('trascrizione-id').value;
    const editor = document.getElementById('trascrizione-editor');
    const testo = editor.innerHTML;
    
    const m = appData.manoscritti.find(x => x.id === id);
    if (m) {
        m.trascrizione = testo;
        await salvaTutto();
        mostraMessaggio("Trascrizione salvata con successo!", "success");
        editor.focus();
    }
}

async function caricaAllegatoTrascrizione(e) {
    const file = e.target.files[0];
    if (!file || !window.apiBrowser) return;
    
    const id = document.getElementById('trascrizione-id').value;
    const m = appData.manoscritti.find(x => x.id === id);
    if (!m) return;
    
    try {
        const filePath = file.path;
        const risultato = await window.apiBrowser.salvaAllegato(filePath);
        if (risultato) {
            m.allegato = risultato.fileName;
            m.allegatoTipo = risultato.ext === '.pdf' ? 'pdf' : 'immagine';
            await salvaTutto();
            
            // Ricarica la vista trascrizione per mostrare il nuovo file
            apriTrascrizione(id);
        }
    } catch (error) {
        console.error("Errore caricamento da trascrizione:", error);
        mostraMessaggio("Errore nel salvataggio dell'allegato.", "error");
    }
    
    // Resetta l'input
    e.target.value = '';
}

// --- GESTIONE TIPI DOCUMENTO MODULARI ---

function apriNewTypeModal() {
    document.getElementById('new-type-select').value = 'custom';
    applicaModello();
    document.getElementById('new-type-modal').classList.remove('hidden-tab');
}

function chiudiNewTypeModal() {
    document.getElementById('new-type-modal').classList.add('hidden-tab');
}

const MODELLI_PREDEFINITI = {
    imbreviature: { nome: 'Imbreviature Notarili', campi: ['dataCronica', 'dataTopica', 'autore', 'note'] },
    atti: { nome: 'Atti Giudiziari', campi: ['dataCronica', 'dataTopica', 'titolo', 'note'] },
    fiscali: { nome: 'Documenti Fiscali', campi: ['dataCronica', 'dataTopica', 'prezzo', 'note'] }
};

function applicaModello() {
    const sel = document.getElementById('new-type-select').value;
    const nameInput = document.getElementById('custom-type-name');
    const extraInput = document.getElementById('custom-type-extra-input');
    const placeholder = document.getElementById('empty-fields-placeholder');
    
    // Pulisce il form
    nameInput.value = '';
    if (extraInput) extraInput.value = '';
    
    // Rimuove pillole
    document.querySelectorAll('.custom-field-item').forEach(el => el.remove());
    if (placeholder) placeholder.classList.remove('hidden');

    document.querySelectorAll('.custom-type-field').forEach(cb => cb.checked = false);

    // Seleziona campi in base al modello
    if (sel !== 'custom') {
        const modello = MODELLI_PREDEFINITI[sel];
        nameInput.value = modello.nome;
        modello.campi.forEach(campoId => {
            const cb = document.querySelector(`.custom-type-field[value="${campoId}"]`);
            if (cb) {
                cb.checked = true;
                aggiungiPill(campoId, cb.dataset.label || campoId, true);
            } else {
                aggiungiPill(campoId, campoId, false);
            }
        });
    }
}

function toggleCampoBase(cb) {
    if (cb.checked) {
        aggiungiPill(cb.value, cb.dataset.label || cb.value, true);
    } else {
        rimuoviPill(cb.value);
    }
}

function aggiungiCampoCustom() {
    const input = document.getElementById('custom-type-extra-input');
    const val = input.value.trim();
    if (val) {
        aggiungiPill(val, val, false);
        input.value = '';
    }
}

function aggiungiPill(val, label, isBase) {
    const existing = Array.from(document.querySelectorAll('.custom-field-item')).map(el => el.dataset.val.toLowerCase());
    if (existing.includes(val.toLowerCase())) return;
    
    const list = document.getElementById('custom-fields-list');
    const placeholder = document.getElementById('empty-fields-placeholder');
    if (placeholder) placeholder.classList.add('hidden');

    const pill = document.createElement('div');
    pill.className = "custom-field-item flex items-center gap-1 px-2 py-1.5 bg-white border border-stone-300 text-stone-800 rounded-sm text-sm font-medium shadow-sm cursor-grab active:cursor-grabbing transition-transform";
    pill.dataset.val = val;
    pill.draggable = true;

    pill.ondragstart = (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', val);
        setTimeout(() => pill.classList.add('opacity-40'), 0);
        window._draggedPill = pill;
    };
    
    pill.ondragend = (e) => {
        pill.classList.remove('opacity-40');
        window._draggedPill = null;
        document.querySelectorAll('.custom-field-item').forEach(p => p.style.transform = '');
    };
    
    pill.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = pill.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        
        document.querySelectorAll('.custom-field-item').forEach(p => {
            if (p !== pill && p !== window._draggedPill) p.style.transform = '';
        });
        
        if (window._draggedPill && window._draggedPill !== pill) {
            pill.style.transform = e.clientX < mid ? 'translateX(10px)' : 'translateX(-10px)';
        }
    };
    
    pill.ondragleave = (e) => pill.style.transform = '';
    
    pill.ondrop = (e) => {
        e.preventDefault();
        pill.style.transform = '';
        if (window._draggedPill && window._draggedPill !== pill) {
            const rect = pill.getBoundingClientRect();
            const mid = rect.left + rect.width / 2;
            if (e.clientX < mid) list.insertBefore(window._draggedPill, pill);
            else list.insertBefore(window._draggedPill, pill.nextSibling);
        }
    };

    pill.innerHTML = `
        <i data-lucide="grip-horizontal" class="w-3 h-3 text-stone-400 mr-1"></i>
        <span>${label}</span>
        <button type="button" onclick="rimuoviPillDalPulsante(this, '${val.replace(/'/g, "\\'")}')" class="text-stone-400 hover:text-red-600 focus:outline-none ml-1 transition-colors"><i data-lucide="x" class="w-3 h-3"></i></button>
    `;
    list.appendChild(pill);
    if(window.lucide) lucide.createIcons();
    
    if (isBase) {
        const cb = document.querySelector(`.custom-type-field[value="${val}"]`);
        if (cb) cb.checked = true;
    }
}

function rimuoviPillDalPulsante(btn, val) {
    btn.parentElement.remove();
    const cb = document.querySelector(`.custom-type-field[value="${val}"]`);
    if (cb) cb.checked = false;
    
    if (document.querySelectorAll('.custom-field-item').length === 0) {
        const placeholder = document.getElementById('empty-fields-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
    }
}

function rimuoviPill(val) {
    const pill = document.querySelector(`.custom-field-item[data-val="${val}"]`);
    if (pill) pill.remove();
    
    if (document.querySelectorAll('.custom-field-item').length === 0) {
        const placeholder = document.getElementById('empty-fields-placeholder');
        if (placeholder) placeholder.classList.remove('hidden');
    }
}

function confermaCreaTipo() {
    const nome = document.getElementById('custom-type-name').value.trim();
    if (!nome) { 
        mostraMessaggio("Inserisci un nome per il nuovo tipo di documento.", "error"); 
        return; 
    }
    
    const sel = document.getElementById('new-type-select').value;
    const prefissoId = sel !== 'custom' ? sel : 'custom';
    const id = prefissoId + '_' + Date.now();
    const campi = [];
    
    document.querySelectorAll('.custom-field-item').forEach(pill => {
        campi.push(pill.dataset.val);
    });
    
    if (campi.length === 0) {
        mostraMessaggio("Aggiungi almeno un campo alla scheda.", "error");
        return;
    }

    appData.tipiDocumento.push({ id, nome, campi });
    salvaTutto();
    aggiornaSelectTipiDocumento();
    chiudiNewTypeModal();
}
