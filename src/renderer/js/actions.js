function aggiungiCartella() {
    const nome = prompt("Nome della nuova cartella:\n(Consiglio: per creare una sottocartella usa la barra, es. 'Fondo Latino/Secolo XII')");
    if (nome) {
        const percorsoPulito = nome.trim().replace(/\/+$/, ""); // Rimuove eventuali slash finali
        
        if (percorsoPulito === '') {
            alert("Il nome della cartella non può essere vuoto.");
            return;
        }

        if (!appData.cartelle.includes(percorsoPulito)) {
            appData.cartelle.push(percorsoPulito);
            salvaTutto();
            renderSidebar();
            aggiornaSelectCartelle();
        } else {
            alert("Questa cartella esiste già.");
        }
    }
}

async function eliminaCartellaAttuale() {
    if (cartellaAttuale === 'Generale') {
        alert("La cartella 'Generale' non può essere eliminata.");
        return;
    }
    
    // Controlla se ci sono manoscritti dentro
    const haManoscritti = appData.manoscritti.some(m => m.cartella === cartellaAttuale);
    if (haManoscritti) {
        alert("Impossibile eliminare: la cartella contiene ancora dei manoscritti.");
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
            alert("Errore nel salvataggio del file. La scheda verrà salvata senza allegato.");
        }
    }

    const idCorrente = document.getElementById('form-id').value;
    const cartellaScelta = document.getElementById('form-cartella').value;

    const newData = {
        id: idCorrente || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
        cartella: cartellaScelta,
        segnatura: document.getElementById('form-segnatura').value,
        titolo: document.getElementById('form-titolo').value,
        autore: document.getElementById('form-autore').value,
        note: document.getElementById('form-note').value,
        allegato: nomeAllegato,
        allegatoTipo: tipoAllegato
    };

    if (idCorrente) {
        const index = appData.manoscritti.findIndex(m => m.id === idCorrente);
        if (index !== -1) appData.manoscritti[index] = newData;
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
    document.getElementById('form-segnatura').value = m.segnatura || '';
    document.getElementById('form-titolo').value = m.titolo || '';
    document.getElementById('form-autore').value = m.autore || '';
    document.getElementById('form-note').value = m.note || '';
    document.getElementById('form-allegato-nome').value = m.allegato || '';
    document.getElementById('form-allegato-tipo').value = m.allegatoTipo || '';
    
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
