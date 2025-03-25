// Variáveis globais para compartilhar entre os módulos
window.transcribedText = "";
window.processedText = "";
window.currentProcessingType = "summary";
window.currentTranscriptionId = null;

// Função principal de inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando aplicação...');
    
    // Inicializar módulos
    initUI();
    initAudioRecorder();
    initTranscription();
    
    // Verificar autenticação
    checkAuthState();
    
    // Carregar a chave API
    loadApiKey();
    
    console.log('Aplicação inicializada.');
});

// Garantir que funções globais estejam disponíveis para o HTML
window.updateStatus = updateStatus;
window.showError = showError;
window.logout = window.authUtils.logout;
window.loadTranscriptionDetails = window.transcriptionUtils.loadTranscriptionDetails;
window.deleteTranscription = window.transcriptionUtils.deleteTranscription;
