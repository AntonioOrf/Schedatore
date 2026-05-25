// @ts-nocheck

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('welcome-modal')) {
            const html = `
    <div id="welcome-modal" class="modal-overlay hidden-tab z-70 bg-stone-900/80 backdrop-blur-sm">
        <div class="modal-window max-w-lg p-8 text-center shadow-2xl border-2 border-stone-200">
            <div class="flex justify-center mb-6">
                <div class="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 shadow-inner">
                    <i data-lucide="folder-open" class="w-8 h-8"></i>
                </div>
            </div>
            <h2 class="text-2xl font-serif text-stone-800 mb-4" data-i18n="welcome_title">Benvenuto in ArchiView</h2>
            <p class="text-stone-600 mb-6 leading-relaxed">
                <span data-i18n="welcome_desc">Per iniziare, è necessario creare o selezionare una <strong>Cartella di lavoro</strong>.<br><br>In questa cartella verranno salvati in automatico tutti i dati (il database) e gli allegati (come i PDF e le foto). Ti consigliamo di creare una cartella dedicata (ad esempio in "Documenti") per tenere tutto in ordine e al sicuro.</span>
            </p>
            <button onclick="selezionaCartellaIniziale()" class="btn btn-primary w-full justify-center py-3 text-lg font-medium shadow-md">
                <i data-lucide="folder" class="w-5 h-5 mr-2"></i>
                <span data-i18n="btn_choose_folder">Scegli o crea cartella</span>
            </button>
        </div>
    </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        }
    });
})();
