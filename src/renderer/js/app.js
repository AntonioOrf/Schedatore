document.addEventListener('DOMContentLoaded', async () => {
    if(window.lucide) lucide.createIcons();
    await initData();
    
    document.getElementById('search-input').addEventListener('input', renderMain);
    document.getElementById('manoscritto-form').addEventListener('submit', handleFormSubmit);
    
    // Gestione Anteprime file
    document.getElementById('form-allegato').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const previewImg = document.getElementById('preview-immagine');
        const previewPdf = document.getElementById('preview-pdf');
        previewImg.classList.add('hidden'); previewPdf.classList.add('hidden');
        
        if (file) {
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                document.getElementById('pdf-nome-file').textContent = file.name;
                previewPdf.classList.remove('hidden');
            } else {
                const reader = new FileReader();
                reader.onload = (e) => { previewImg.src = e.target.result; previewImg.classList.remove('hidden'); }
                reader.readAsDataURL(file);
            }
        }
    });
});
