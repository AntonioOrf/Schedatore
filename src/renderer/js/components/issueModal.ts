// @ts-nocheck

(function() {
    // Iniezione dinamica dell'HTML della modale all'avvio
    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('issue-modal')) {
            const modalHtml = `
                <div id="issue-modal" class="modal-overlay hidden-tab">
                    <div class="modal-window max-w-lg">
                        <div class="modal-header shrink-0">
                            <h3 class="modal-title">
                                <i data-lucide="alert-circle" class="w-5 h-5 text-amber-700"></i>
                                <span data-i18n="modal_report_issue">Segnala un problema</span>
                            </h3>
                            <button type="button" onclick="chiudiIssueModal()" class="btn btn-ghost btn-icon">
                                <i data-lucide="x" class="w-5 h-5"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="issue-form" class="space-y-4" onsubmit="inviaIssueForm(event)">
                                <div>
                                    <label class="form-label" data-i18n="issue_title">Titolo della segnalazione *</label>
                                    <input type="text" id="issue-title-input" required class="form-input" data-i18n-placeholder="placeholder_issue_title" placeholder="Es. Errore durante il salvataggio o caricamento file...">
                                </div>
                                <div>
                                    <label class="form-label" data-i18n="issue_type">Tipo di segnalazione</label>
                                    <select id="issue-type-select" class="form-input">
                                        <option value="bug" data-i18n="issue_type_bug">Bug / Errore del programma</option>
                                        <option value="enhancement" data-i18n="issue_type_enhancement">Suggerimento / Nuova funzionalità</option>
                                        <option value="feedback" data-i18n="issue_type_feedback">Feedback generico</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="form-label" data-i18n="issue_description">Descrizione dettagliata *</label>
                                    <textarea id="issue-desc-input" required class="form-input min-h-[120px] resize-y" data-i18n-placeholder="placeholder_issue_desc" placeholder="Descrivi il problema, come riprodurlo, o cosa ti aspetti che accada..."></textarea>
                                </div>
                                <div class="modal-footer mt-4">
                                    <button type="button" onclick="chiudiIssueModal()" class="btn btn-ghost" data-i18n="btn_cancel">Annulla</button>
                                    <button type="submit" class="btn btn-primary" data-i18n="btn_submit_issue">Apri su GitHub</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    });

    window.apriIssueModal = function() {
        const modal = document.getElementById('issue-modal');
        if (modal) {
            modal.classList.remove('hidden-tab');
            // Resetta i campi del form
            document.getElementById('issue-title-input').value = '';
            document.getElementById('issue-type-select').value = 'bug';
            document.getElementById('issue-desc-input').value = '';
            
            // Applica le traduzioni se ci sono
            if (typeof window.applicaTraduzioniHtml === 'function') {
                window.applicaTraduzioniHtml();
            }
            if (window.lucide) {
                lucide.createIcons({ nodes: [modal] });
            }
            setTimeout(() => document.getElementById('issue-title-input').focus(), 100);
        }
    };

    window.chiudiIssueModal = function() {
        const modal = document.getElementById('issue-modal');
        if (modal) {
            modal.classList.add('hidden-tab');
        }
    };

    window.inviaIssueForm = function(event) {
        event.preventDefault();
        const title = document.getElementById('issue-title-input').value.trim();
        const type = document.getElementById('issue-type-select').value;
        const description = document.getElementById('issue-desc-input').value.trim();

        const typeLabels = {
            bug: 'Bug 🐛',
            enhancement: 'Miglioramento 💡',
            feedback: 'Feedback 💬'
        };

        const body = `### Tipo di Segnalazione\n${typeLabels[type] || type}\n\n### Descrizione\n${description}\n\n---\n### Dettagli di Sistema\n- **Versione App**: 1.1.2\n- **Piattaforma**: ${navigator.userAgent}`;

        const url = `https://github.com/AntonioOrf/ArchiView/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

        if (window.apiBrowser && window.apiBrowser.apriLinkEsterno) {
            window.apiBrowser.apriLinkEsterno(url);
        } else {
            window.open(url, '_blank');
        }

        window.chiudiIssueModal();
    };
})();
