// Variáveis globais para compartilhar entre os módulos
window.transcribedText = "";
window.processedText = "";
window.currentProcessingType = "summary";
window.currentTranscriptionId = null;

// Função principal de inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando aplicação...');
    
    // Verificar autenticação primeiro, antes de inicializar outros módulos
    checkAuthState((user) => {
        if (!user && !window.location.pathname.includes('login.html')) {
            console.log('Usuário não autenticado. Redirecionando para login...');
            window.location.href = './login.html';
            return; // Parar a execução se redirecionando
        }
        
        console.log('Usuário autenticado ou na página de login. Inicializando módulos...');
        
        // Inicializar módulos se estiver autenticado ou na página de login
        initUI();
        
        // Apenas inicializar estes módulos se não estiver na página de login
        if (!window.location.pathname.includes('login.html')) {
            initAudioRecorder();
            initTranscription();
            
            // Carregar a chave API
            loadApiKey();
        }
        
        console.log('Aplicação inicializada.');
    });
});

// Função para verificar o estado de autenticação
function checkAuthState(callback) {
    if (window.authUtils && typeof window.authUtils.checkAuthState === 'function') {
        window.authUtils.checkAuthState(callback);
    } else {
        console.error('Módulo authUtils não disponível ou função checkAuthState não encontrada');
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(callback);
        } else {
            console.error('Firebase Auth não está disponível');
            callback(null);
        }
    }
}

// Garantir que funções globais estejam disponíveis para o HTML
function setupGlobalFunctions() {
    window.updateStatus = typeof updateStatus === 'function' ? updateStatus : 
                         (typeof window.uiController !== 'undefined' && typeof window.uiController.updateStatus === 'function') ? 
                         window.uiController.updateStatus : function(msg) { console.log(msg); };
                         
    window.showError = typeof showError === 'function' ? showError : 
                      (typeof window.uiController !== 'undefined' && typeof window.uiController.showError === 'function') ? 
                      window.uiController.showError : function(msg) { console.error(msg); };
                      
    window.logout = typeof logout === 'function' ? logout :
                   (typeof window.authUtils !== 'undefined' && typeof window.authUtils.logout === 'function') ? 
                   window.authUtils.logout : function() { console.log('Função de logout não encontrada'); };
                   
    window.loadTranscriptionDetails = typeof loadTranscriptionDetails === 'function' ? loadTranscriptionDetails :
                                    (typeof window.transcriptionUtils !== 'undefined' && typeof window.transcriptionUtils.loadTranscriptionDetails === 'function') ? 
                                    window.transcriptionUtils.loadTranscriptionDetails : function() { console.log('Função loadTranscriptionDetails não encontrada'); };
                                    
    window.deleteTranscription = typeof deleteTranscription === 'function' ? deleteTranscription :
                               (typeof window.transcriptionUtils !== 'undefined' && typeof window.transcriptionUtils.deleteTranscription === 'function') ? 
                               window.transcriptionUtils.deleteTranscription : function() { console.log('Função deleteTranscription não encontrada'); };
}

// Chamar setup das funções globais
setupGlobalFunctions();
