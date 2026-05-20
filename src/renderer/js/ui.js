// Stato globale per le cartelle espansive
window.cartelleEspanse = window.cartelleEspanse || new Set(['Generale']);

const CONFIG_CAMPI = {
    dataCronica: { label: 'Data Cronica', placeholder: 'Es. 12 Maggio 1340', type: 'text' },
    dataTopica: { label: 'Data Topica', placeholder: 'Es. Firenze', type: 'text' },
    autore: { label: 'Autore/i', placeholder: 'Es. Anonimo / Notaio', type: 'text' },
    titolo: { label: 'Titolo / Contenuto', placeholder: 'Titolo o descrizione sintetica', type: 'text' },
    note: { label: 'Note', placeholder: 'Note testuali o codicologiche', type: 'textarea' },
    prezzo: { label: 'Prezzo', placeholder: 'Es. 12 fiorini', type: 'text' }
};

function renderSidebar() {
    const container = document.getElementById('folder-list');
    container.innerHTML = '';
    
    // Assicuriamoci che tutte le cartelle intermedie esistano in appData.cartelle
    let cartelleSet = new Set(appData.cartelle);
    appData.cartelle.forEach(percorso => {
        const parti = percorso.split('/');
        let pathCorrente = '';
        parti.forEach(part => {
            pathCorrente = pathCorrente ? pathCorrente + '/' + part : part;
            cartelleSet.add(pathCorrente);
        });
    });
    appData.cartelle = Array.from(cartelleSet).sort();
    
    // Costruisci l'albero
    const root = {};
    appData.cartelle.forEach(percorso => {
        const parti = percorso.split('/');
        let current = root;
        parti.forEach((part, i) => {
            const pathCompleto = parti.slice(0, i + 1).join('/');
            if (!current[part]) current[part] = { path: pathCompleto, children: {} };
            current = current[part].children;
        });
    });

    // Funzione ricorsiva per renderizzare
    function renderNode(nodeName, nodeObj, parentEl, profondita) {
        const fullPath = nodeObj.path;
        const hasChildren = Object.keys(nodeObj.children).length > 0;
        const isAttuale = fullPath === cartellaAttuale;
        
        // Mantieni espanso se è attuale o genitore dell'attuale
        if (cartellaAttuale.startsWith(fullPath)) {
            window.cartelleEspanse.add(fullPath);
        }

        const div = document.createElement('div');
        div.className = "flex flex-col";
        
        const riga = document.createElement('div');
        riga.className = `flex items-center gap-1 p-1.5 rounded-sm cursor-pointer transition-colors text-sm ${isAttuale ? 'bg-amber-100/80 text-amber-900 font-bold border border-amber-200 shadow-sm' : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900'}`;
        riga.style.paddingLeft = `${profondita * 1.25 + 0.25}rem`;
        
        // Drag and Drop Logic
        riga.draggable = true;
        riga.ondragstart = (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'folder', path: fullPath }));
            e.dataTransfer.effectAllowed = 'move';
            riga.classList.add('opacity-50');
        };
        riga.ondragend = (e) => riga.classList.remove('opacity-50');
        
        riga.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            riga.classList.add('ring-2', 'ring-amber-500', 'bg-amber-50');
        };
        riga.ondragleave = (e) => riga.classList.remove('ring-2', 'ring-amber-500', 'bg-amber-50');
        riga.ondrop = (e) => {
            e.preventDefault();
            riga.classList.remove('ring-2', 'ring-amber-500', 'bg-amber-50');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type === 'folder' && typeof spostaCartella !== 'undefined') {
                    if (data.path !== fullPath) spostaCartella(data.path, fullPath);
                } else if (data.type === 'manoscritto' && typeof spostaManoscritto !== 'undefined') {
                    spostaManoscritto(data.id, fullPath);
                }
            } catch(err) { console.error(err); }
        };

        // Icona espansione (Chevron)
        const spanToggle = document.createElement('span');
        spanToggle.className = "w-5 h-5 flex items-center justify-center shrink-0";
        if (hasChildren) {
            const isExpanded = window.cartelleEspanse.has(fullPath);
            spanToggle.innerHTML = `<i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" class="w-4 h-4 text-stone-500 hover:text-amber-700 transition-colors"></i>`;
            spanToggle.onclick = (e) => {
                e.stopPropagation();
                if (isExpanded) window.cartelleEspanse.delete(fullPath);
                else window.cartelleEspanse.add(fullPath);
                renderSidebar();
            };
        }

        // Icona Cartella
        const icona = isAttuale ? 'folder-open' : 'folder';
        const testo = document.createElement('span');
        testo.className = "truncate flex items-center gap-1.5 flex-1 select-none";
        testo.innerHTML = `<i data-lucide="${icona}" class="w-4 h-4 shrink-0 ${isAttuale ? 'text-amber-600' : 'text-stone-400'}"></i> ${nodeName}`;
        
        riga.appendChild(spanToggle);
        riga.appendChild(testo);
        
        riga.onclick = () => {
            cartellaAttuale = fullPath;
            window.cartelleEspanse.add(fullPath);
            document.getElementById('search-input').value = '';
            switchTab('list');
            renderSidebar();
            renderMain();
        };

        div.appendChild(riga);

        // Nodi Figli
        if (hasChildren && window.cartelleEspanse.has(fullPath)) {
            const childContainer = document.createElement('div');
            Object.keys(nodeObj.children).forEach(childName => {
                renderNode(childName, nodeObj.children[childName], childContainer, profondita + 1);
            });
            div.appendChild(childContainer);
        }

        parentEl.appendChild(div);
    }

    Object.keys(root).forEach(k => renderNode(k, root[k], container, 0));

    // Area di drop speciale per spostare alla root (Generale)
    const dropRoot = document.createElement('div');
    dropRoot.className = "p-4 text-center text-xs text-stone-400 border-2 border-dashed border-transparent hover:border-stone-300 rounded mt-4 transition-colors select-none";
    dropRoot.textContent = "Trascina qui per spostare in radice";
    dropRoot.ondragover = (e) => { e.preventDefault(); dropRoot.classList.add('border-amber-400', 'bg-amber-50'); };
    dropRoot.ondragleave = (e) => { dropRoot.classList.remove('border-amber-400', 'bg-amber-50'); };
    dropRoot.ondrop = (e) => {
        e.preventDefault();
        dropRoot.classList.remove('border-amber-400', 'bg-amber-50');
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (data.type === 'folder' && typeof spostaCartella !== 'undefined') spostaCartella(data.path, 'ROOT');
        } catch(err) {}
    };
    container.appendChild(dropRoot);

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

function aggiornaSelectTipiDocumento() {
    const select = document.getElementById('form-tipo-documento');
    if (!select) return;
    select.innerHTML = '';
    appData.tipiDocumento.forEach(tipo => {
        const opt = document.createElement('option');
        opt.value = tipo.id;
        opt.textContent = tipo.nome;
        select.appendChild(opt);
    });
    if (appData.tipiDocumento.length > 0) {
        renderDynamicFields();
    }
}

function renderDynamicFields() {
    const tipoId = document.getElementById('form-tipo-documento').value;
    const tipo = appData.tipiDocumento.find(t => t.id === tipoId) || appData.tipiDocumento[0];
    const container = document.getElementById('form-dynamic-fields');
    if(!container) return;
    container.innerHTML = '';

    tipo.campi.forEach(campoId => {
        let conf = CONFIG_CAMPI[campoId];
        if (!conf) {
            conf = {
                label: campoId,
                placeholder: '',
                type: 'text'
            };
        }

        const div = document.createElement('div');
        div.className = 'space-y-1';
        const label = document.createElement('label');
        label.className = 'text-sm font-semibold text-stone-700 flex items-center gap-1';
        label.textContent = conf.label;
        div.appendChild(label);

        const el = document.createElement(conf.type === 'textarea' ? 'textarea' : 'input');
        el.id = 'dyn-' + campoId.replace(/\s+/g, '_');
        if(conf.type === 'textarea') el.rows = 3;
        else el.type = 'text';
        el.className = 'w-full p-2 border border-stone-300 rounded-sm bg-white';
        el.placeholder = conf.placeholder;
        div.appendChild(el);
        container.appendChild(div);
    });
}

async function renderMain() {
    const grid = document.getElementById('manoscritti-grid');
    const search = document.getElementById('search-input').value.toLowerCase();
    const tagSearch = (document.getElementById('global-tag-search').value || '').toLowerCase();
    
    const isGlobalSearch = search !== '' || tagSearch !== '';
    
    if (isGlobalSearch) {
        document.getElementById('titolo-cartella-attuale').textContent = "Risultati Ricerca Globale";
    } else {
        const partiTitolo = cartellaAttuale.split('/');
        document.getElementById('titolo-cartella-attuale').textContent = partiTitolo[partiTitolo.length - 1];
    }
    
    // Filtro per Cartella (se non globale) E per Ricerca E per Tag
    const filtered = appData.manoscritti.filter(m => {
        const matchCartella = isGlobalSearch ? true : m.cartella === cartellaAttuale;
        
        const tipoDoc = appData.tipiDocumento.find(t => t.id === (m.tipoDocumento || 'manoscritto'));
        const campiPossibili = tipoDoc ? tipoDoc.campi : ['titolo', 'autore', 'note'];
        const matchSearch = search === '' || (m.segnatura||'').toLowerCase().includes(search) || campiPossibili.some(campo => (m[campo] || '').toString().toLowerCase().includes(search));
        
        const mTags = (m.tags || '').toLowerCase();
        const matchTag = tagSearch === '' || mTags.includes(tagSearch);
        
        return matchCartella && matchSearch && matchTag;
    });

    document.getElementById('counter-results').textContent = `Documenti trovati: ${filtered.length}`;
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
            div.className = "card-bg rounded-sm p-4 border border-amber-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing";
            
            // Logica Drag and Drop
            div.draggable = true;
            div.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'manoscritto', id: m.id }));
                e.dataTransfer.effectAllowed = 'move';
                div.classList.add('opacity-50');
            };
            div.ondragend = () => div.classList.remove('opacity-50');
            
            let allegatoHTML = '';
            let btnTrascrivi = `
                <button onclick="apriTrascrizione('${m.id}')" class="flex-1 py-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                    <span class="text-xs font-bold uppercase tracking-wider">Trascrivi</span>
                </button>
            `;

            if (m.allegato && window.apiBrowser) {
                if (m.allegatoTipo === 'pdf') {
                    allegatoHTML = `
                        <div class="mt-3 flex gap-2">
                            <button onclick="apriPdfInterno('${m.allegato}')" class="flex-1 py-1.5 px-3 bg-stone-100 hover:bg-red-50 text-stone-700 hover:text-red-700 border border-stone-300 rounded-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm">
                                <span class="text-xs font-bold uppercase tracking-wider">Vedi PDF</span>
                            </button>
                            ${btnTrascrivi}
                        </div>`;
                } else {
                    const base64Data = await window.apiBrowser.leggiImmagine(m.allegato);
                    if (base64Data) {
                        allegatoHTML = `
                            <div onclick="apriModal('${base64Data}')" class="mt-3 overflow-hidden rounded border border-stone-300 cursor-pointer relative group h-32 mb-2">
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex justify-center items-center text-white"><i data-lucide="zoom-in"></i></div>
                                <img class="w-full h-full object-cover" src="${base64Data}" />
                            </div>
                            <div class="flex">${btnTrascrivi}</div>`;
                    } else {
                        allegatoHTML = `<div class="mt-3 flex">${btnTrascrivi}</div>`;
                    }
                }
            } else {
                allegatoHTML = `<div class="mt-3 flex">${btnTrascrivi}</div>`;
            }

            let tagsHTML = '';
            if (m.tags) {
                const tagsList = m.tags.split(',').map(t => t.trim()).filter(t => t);
                if (tagsList.length > 0) {
                    tagsHTML = '<div class="flex flex-wrap gap-1 mt-2">' + tagsList.map(t => `<span class="px-2 py-0.5 bg-stone-200 text-stone-600 text-[10px] uppercase font-bold tracking-wider rounded-sm">${t}</span>`).join('') + '</div>';
                }
            }

            let infoHTML = '';
            const tipoDoc = appData.tipiDocumento.find(t => t.id === (m.tipoDocumento || 'manoscritto'));
            const campiPossibili = tipoDoc ? tipoDoc.campi : ['titolo', 'autore', 'note'];
            campiPossibili.forEach(campo => {
                if (m[campo]) {
                    const label = (CONFIG_CAMPI[campo] || {}).label || campo;
                    if (campo === 'note') infoHTML += `<p class="text-stone-500 mt-2 text-xs italic line-clamp-3 leading-relaxed border-l-2 border-amber-200 pl-2" title="${m.note.replace(/"/g, '&quot;')}">${m.note}</p>`;
                    else if (campo === 'titolo') infoHTML += `<p class="truncate"><b>${label}:</b> <i>${m.titolo}</i></p>`;
                    else infoHTML += `<p class="truncate"><b>${label}:</b> ${m[campo]}</p>`;
                }
            });

            div.innerHTML = `
                <div>
                    <h3 class="text-lg font-bold text-stone-800 mb-1 truncate" title="${m.segnatura}">${m.segnatura}</h3>
                    <span class="inline-block bg-amber-100 text-amber-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm mb-2">${tipoDoc ? tipoDoc.nome : 'Documento'}</span>
                    <div class="space-y-1 text-sm">
                        ${infoHTML}
                        ${tagsHTML}
                    </div>
                    ${allegatoHTML}
                </div>
                <div class="mt-3 pt-3 border-t border-amber-100 flex justify-end gap-2">
                    <button onclick="editItem('${m.id}')" class="px-2 py-1 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-amber-700 bg-stone-100 hover:bg-stone-200 rounded-sm border border-stone-200 transition-colors">Modifica</button>
                    <button onclick="deleteItem('${m.id}')" class="px-2 py-1 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-red-600 bg-stone-100 hover:bg-red-50 rounded-sm border border-stone-200 transition-colors">Elimina</button>
                </div>
            `;
            grid.appendChild(div);
        }
    }
    if(window.lucide) lucide.createIcons();
}

function resetForm() {
    document.getElementById('form-segnatura').value = '';
    document.getElementById('form-tags').value = '';
    document.getElementById('form-allegato').value = '';
    document.getElementById('form-id').value = '';
    document.getElementById('form-allegato-nome').value = '';
    document.getElementById('form-allegato-tipo').value = '';
    const dynContainer = document.getElementById('form-dynamic-fields');
    if(dynContainer) dynContainer.querySelectorAll('input, textarea').forEach(el => el.value = '');
    
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
    const vTrascrizione = document.getElementById('view-trascrizione');
    
    vList.classList.add('hidden-tab');
    vAdd.classList.add('hidden-tab');
    if (vTrascrizione) vTrascrizione.classList.add('hidden-tab');
    
    if (tab === 'list') {
        vList.classList.remove('hidden-tab');
        resetForm(); renderMain();
    } else if (tab === 'add') {
        vAdd.classList.remove('hidden-tab');
        aggiornaSelectCartelle();
        aggiornaSelectTipiDocumento();
    } else if (tab === 'trascrizione') {
        if (vTrascrizione) vTrascrizione.classList.remove('hidden-tab');
    }
}

window.apriPdfInterno = async function(fileName) {
    if (window.apiBrowser) {
        const filePath = await window.apiBrowser.getAllegatoPath(fileName);
        apriModal(filePath, 'pdf');
    }
}

function apriModal(sorgente, tipo = 'img') {
    const modalImg = document.getElementById('modal-img');
    const modalPdf = document.getElementById('modal-pdf');
    modalImg.classList.add('hidden');
    modalPdf.classList.add('hidden');

    if (tipo === 'pdf') {
        modalPdf.src = 'file:///' + sorgente.replace(/\\/g, '/');
        modalPdf.classList.remove('hidden');
    } else {
        modalImg.src = sorgente;
        modalImg.classList.remove('hidden');
    }
    document.getElementById('image-modal').classList.remove('hidden-tab');
}

function chiudiModal() { 
    document.getElementById('image-modal').classList.add('hidden-tab'); 
    document.getElementById('modal-pdf').src = '';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('hidden-tab')) {
        sidebar.classList.remove('hidden-tab');
    } else {
        sidebar.classList.add('hidden-tab');
    }
}

function switchSidebarTab(tabName) {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('hidden-tab'); // Assicurati che sia aperta

    document.getElementById('sidebar-folders').classList.add('hidden-tab');
    document.getElementById('sidebar-search').classList.add('hidden-tab');
    document.getElementById('sidebar-tags').classList.add('hidden-tab');

    if (tabName === 'folders') document.getElementById('sidebar-folders').classList.remove('hidden-tab');
    if (tabName === 'search') {
        document.getElementById('sidebar-search').classList.remove('hidden-tab');
        document.getElementById('search-input').focus();
        renderSearchSuggestions();
    }
    if (tabName === 'tags') {
        document.getElementById('sidebar-tags').classList.remove('hidden-tab');
        renderTagList();
    }
}

function renderSearchSuggestions() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const container = document.getElementById('search-suggestions');
    container.innerHTML = '';
    
    if (!search) {
        container.innerHTML = '<div class="p-4 text-xs text-stone-400 italic text-center">Digita per vedere i risultati...</div>';
        return;
    }

    const matches = appData.manoscritti.filter(m => 
        (m.segnatura||'').toLowerCase().includes(search) || 
        (m.titolo||'').toLowerCase().includes(search) || 
        (m.autore||'').toLowerCase().includes(search)
    ).slice(0, 10); // Massimo 10 suggerimenti

    if (matches.length === 0) {
        container.innerHTML = '<div class="p-4 text-xs text-stone-400 italic text-center">Nessun match esatto nei titoli/autori.</div>';
        return;
    }

    matches.forEach(m => {
        const div = document.createElement('div');
        div.className = "p-2 border-b border-stone-200 hover:bg-amber-50 cursor-pointer transition-colors";
        div.onclick = () => {
            // Scroll alla card nella grid se esiste, oppure imposta la ricerca esatta
            document.getElementById('search-input').value = m.segnatura;
            renderMain();
            renderSearchSuggestions();
        };
        div.innerHTML = `
            <div class="text-xs font-bold text-stone-700 truncate">${m.segnatura}</div>
            ${m.titolo ? `<div class="text-[10px] text-stone-500 truncate mt-0.5"><i>${m.titolo}</i></div>` : ''}
            ${m.autore ? `<div class="text-[10px] text-stone-500 truncate mt-0.5"><b>Autore:</b> ${m.autore}</div>` : ''}
        `;
        container.appendChild(div);
    });
}

function renderTagList() {
    const container = document.getElementById('tag-list');
    container.innerHTML = '';
    const tagCount = {};
    
    // Calcola le occorrenze dei tag
    appData.manoscritti.forEach(m => {
        if (m.tags) {
            m.tags.split(',').forEach(tag => {
                const t = tag.trim().toLowerCase();
                if (t) {
                    tagCount[t] = (tagCount[t] || 0) + 1;
                }
            });
        }
    });

    const sortedTags = Object.keys(tagCount).sort();

    if (sortedTags.length === 0) {
        container.innerHTML = '<div class="p-4 text-xs text-stone-400 italic text-center">Nessun tag utilizzato nel database.</div>';
        return;
    }
    
    const activeTag = document.getElementById('global-tag-search').value.toLowerCase();
    
    if (activeTag) {
        document.getElementById('btn-clear-tag').classList.remove('hidden');
    } else {
        document.getElementById('btn-clear-tag').classList.add('hidden');
    }

    sortedTags.forEach(tag => {
        const btn = document.createElement('button');
        const isActive = tag === activeTag;
        btn.className = `w-full text-left px-3 py-2 rounded-sm text-sm font-medium transition-colors flex justify-between items-center ${isActive ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-stone-50 text-stone-700 hover:bg-stone-200 border border-transparent'}`;
        btn.onclick = () => {
            if (isActive) {
                document.getElementById('global-tag-search').value = '';
            } else {
                document.getElementById('global-tag-search').value = tag;
            }
            renderMain();
            renderTagList(); // ricarica per mostrare l'active state
        };
        btn.innerHTML = `<span>#${tag}</span><span class="text-[10px] bg-white/50 px-1.5 py-0.5 rounded text-stone-500">${tagCount[tag]}</span>`;
        container.appendChild(btn);
    });
}

window.mostraMessaggio = function(testo, tipo = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const bgClass = tipo === 'error' ? 'bg-red-600' : (tipo === 'success' ? 'bg-green-600' : 'bg-stone-800');
    toast.className = `${bgClass} text-white px-4 py-3 rounded-sm shadow-lg text-sm font-medium flex items-center gap-2 opacity-0 transition-opacity duration-300 pointer-events-auto`;
    
    let icon = 'info';
    if (tipo === 'success') icon = 'check-circle';
    if (tipo === 'error') icon = 'alert-triangle';
    
    toast.innerHTML = `<i data-lucide="${icon}" class="w-5 h-5 shrink-0"></i> <span>${testo}</span>`;
    container.appendChild(toast);
    if(window.lucide) lucide.createIcons();
    
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.remove('opacity-0')));
    
    setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, 3500);
}
