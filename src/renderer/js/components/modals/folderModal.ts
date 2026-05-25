// @ts-nocheck

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('folder-modal')) {
            const html = `
    <div id="folder-modal" class="modal-overlay hidden-tab">
        <div class="modal-window max-w-md">
            <div class="modal-header">
                <h3 class="modal-title" data-i18n="modal_new_folder">Nuova Cartella</h3>
            </div>
            <div class="modal-body">
                <label class="form-label" data-i18n="label_folder_name">Nome della cartella o percorso</label>
                <input type="text" id="folder-name-input" data-i18n-placeholder="label_folder_name" class="form-input">
                <p class="text-xs text-stone-500 mt-2 italic" data-i18n="hint_folder_name">Consiglio: usa la barra ( / ) per creare automaticamente sottocartelle.</p>
                <div class="modal-footer">
                    <button onclick="chiudiFolderModal()" class="btn btn-ghost" data-i18n="btn_cancel">Annulla</button>
                    <button onclick="confermaAggiungiCartella()" class="btn btn-primary" data-i18n="btn_create_folder">Crea Cartella</button>
                </div>
            </div>
        </div>
    </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        }
    });
})();
