function renderSidebar() {
    const container = document.getElementById('folder-list');
    container.innerHTML = '';
    
    // Ordina alfabeticamente per creare l'albero
    const cartelleOrdinate = [...appData.cartelle].sort();

    cartelleOrdinate.forEach(percorso => {
        const parti = percorso.split('/');
        const nomeCartella = parti[parti.length - 1]; // Prende l'ultima parola
        const profondita = parti.length - 1; // Calcola il livello per l'indentazione

        const div = document.createElement('div');
        const isAttuale = percorso === cartellaAttuale;
        
        // Stile dell'elemento (cambia se è selezionato)
        div.className = `flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${isAttuale ? 'bg-amber-100/80 text-amber-900 font-bold border border-amber-200' : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'}`;
        
        // Crea l'effetto "albero" (sottocartelle spostate a destra)
        div.style.marginLeft = `${profondita * 1.25}rem`;
        
        // Icona aperta se selezionata
        const icona = isAttuale ? 'folder-open' : 'folder';
        
        div.innerHTML = `<i data-lucide="${icona}" class="w-4 h-4 shrink-0 ${isAttuale ? 'text-amber-600' : 'text-stone-400'}"></i> <span class="truncate">${nomeCartella}</span>`;
        
        div.onclick = () => {
            cartellaAttuale = percorso;
            document.getElementById('search-input').value = ''; // Resetta la ricerca
            switchTab('list');
            renderSidebar(); // Ridisegna per aggiornare i colori
            renderMain();
        };
        
        container.appendChild(div);
    });
    if(window.lucide) lucide.createIcons();
}

function aggiornaSelectCartelle() {
    const select = document.getElementById('form-cartella');
    select.innerHTML = '';
    [...appData.cartelle].sort().forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        // Sostituisce la barra con una freccia per estetica nel menu a tendina
        opt.textContent = c.replace(/\//g, ' ⮞ '); 
        if (c === cartellaAttuale) opt.selected = true;
        select.appendChild(opt);
    });
}

async function renderMain() {
    // Aggiorna intestazione
    const partiTitolo = cartellaAttuale.split('/');
    document.getElementById('titolo-cartella-attuale').textContent = partiTitolo[partiTitolo.length - 1];

    const grid = document.getElementById('manoscritti-grid');
    const search = document.getElementById('search-input').value.toLowerCase();
    
    // Doppio Filtro: per Cartella E per Ricerca testo
    const filtered = appData.manoscritti.filter(m => {
        const matchCartella = m.cartella === cartellaAttuale;
        const matchSearch = (m.segnatura||'').toLowerCase().includes(search) || (m.titolo||'').toLowerCase().includes(search);
        return matchCartella && matchSearch;
    });

    document.getElementById('counter-results').textContent = `Documenti: ${filtered.length}`;
    grid.innerHTML = '';
    
    const btnDeleteFolder = document.getElementById('btn-delete-folder');
    
    if (filtered.length === 0) {
        grid.classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
        
        // Se la cartella è vuota (ignorando la ricerca) e NON è "Generale", mostra il bottone Elimina
        const manoscrittiTotaliInCartella = appData.manoscritti.filter(m => m.cartella === cartellaAttuale).length;
        if (manoscrittiTotaliInCartella === 0 && cartellaAttuale !== 'Generale' && search === '') {
            btnDeleteFolder.classList.remove('hidden');
            btnDeleteFolder.classList.add('flex');
        } else {
            btnDeleteFolder.classList.add('hidden');
            btnDeleteFolder.classList.remove('flex');
        }
    } else {
        grid.classList.remove('hidden');
        document.getElementById('empty-state').classList.add('hidden');
        
        // Creazione Card
        for (const m of filtered) {
            const div = document.createElement('div');
            div.className = "card-bg rounded-xl p-4 border border-amber-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow";
            
            let allegatoHTML = '';
            if (m.allegato && window.apiBrowser) {
                if (m.allegatoTipo === 'pdf') {
                    allegatoHTML = `
                        <div onclick="window.apiBrowser.apriPdfEsterno('${m.allegato}')" class="mt-3 p-2 bg-stone-100 hover:bg-amber-50 border border-stone-300 rounded flex items-center justify-between cursor-pointer group">
                            <div class="flex items-center gap-2 text-stone-700"><i data-lucide="file-text" class="w-5 h-5 text-red-600"></i><span class="text-xs font-semibold">Apri PDF</span></div>
                        </div>`;
                } else {
                    const base64Data = await window.apiBrowser.leggiImmagine(m.allegato);
                    if (base64Data) {
                        allegatoHTML = `
                            <div onclick="apriModal('${base64Data}')" class="mt-3 overflow-hidden rounded border border-stone-300 cursor-pointer relative group h-32">
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex justify-center items-center text-white"><i data-lucide="zoom-in"></i></div>
                                <img class="w-full h-full object-cover" src="${base64Data}" />
                            </div>`;
                    }
                }
            }

            div.innerHTML = `
                <div>
                    <h3 class="text-lg font-bold text-stone-800 mb-2 truncate" title="${m.segnatura}">${m.segnatura}</h3>
                    <div class="space-y-1 text-sm">
                        ${m.titolo ? `<p class="truncate"><b>Titolo:</b> <i>${m.titolo}</i></p>` : ''}
                        ${m.autore ? `<p class="truncate"><b>Autore:</b> ${m.autore}</p>` : ''}
                    </div>
                    ${allegatoHTML}
                </div>
                <div class="mt-3 pt-3 border-t border-amber-100 flex justify-end gap-1">
                    <button onclick="editItem('${m.id}')" class="p-1.5 text-stone-500 hover:text-amber-700 bg-stone-100 rounded" title="Modifica"><i data-lucide="edit" class="w-4 h-4"></i></button>
                    <button onclick="deleteItem('${m.id}')" class="p-1.5 text-stone-500 hover:text-red-600 bg-stone-100 rounded" title="Elimina"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            `;
            grid.appendChild(div);
        }
    }
    if(window.lucide) lucide.createIcons();
}

function resetForm() {
    document.getElementById('manoscritto-form').reset();
    document.getElementById('form-id').value = '';
    document.getElementById('form-allegato-nome').value = '';
    document.getElementById('form-allegato-tipo').value = '';
    // Reimposta la select sulla cartella in cui si stava navigando
    document.getElementById('form-cartella').value = cartellaAttuale;
    document.getElementById('preview-immagine').classList.add('hidden');
    document.getElementById('preview-pdf').classList.add('hidden');
    document.getElementById('form-title').textContent = "Compila Nuova Scheda";
    document.getElementById('btn-cancel-edit').classList.add('hidden');
}

function switchTab(tab) {
    const vList = document.getElementById('view-list');
    const vAdd = document.getElementById('view-add');
    
    if (tab === 'list') {
        vList.classList.remove('hidden-tab'); vAdd.classList.add('hidden-tab');
        resetForm(); renderMain();
    } else {
        vAdd.classList.remove('hidden-tab'); vList.classList.add('hidden-tab');
        aggiornaSelectCartelle();
    }
}

function apriModal(b64) { document.getElementById('modal-img').src = b64; document.getElementById('image-modal').classList.remove('hidden-tab'); }
function chiudiModal() { document.getElementById('image-modal').classList.add('hidden-tab'); }
