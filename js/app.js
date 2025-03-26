// Variáveis globais para compartilhar entre os módulos
window.transcribedText = "";
window.processedText = "";
window.currentProcessingType = "summary";
window.currentTranscriptionId = null;
window.appState = {
  isOnline: navigator.onLine,
  isPWA: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  isInstallPromptShown: false,
  deferredInstallPrompt: null,
  lastUpdated: Date.now()
};

// Função principal de inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando aplicação...');
  
  // Realizar inicialização do PWA
  initPWA();
  
  // Remover itens expirados do armazenamento
  if (window.storageUtils && typeof window.storageUtils.removeExpiredItems === 'function') {
    window.storageUtils.removeExpiredItems();
  }
  
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
      handleUrlParams();
      
      // Carregar a chave API
      loadApiKey();
      
      // Verificar se há parâmetros na URL
      handleUrlParams();
      
      // Anexar funções de diagnóstico à janela para debugging
      if (process.env.NODE_ENV !== 'production') {
        window.debug = {
          checkStorageQuota: window.storageUtils?.checkStorageQuota,
          getStorageUsage: window.storageUtils?.getStorageUsage,
          clearUserStorage: window.storageUtils?.clearUserStorage,
          appState: window.appState
        };
      }
    }
    
    console.log('Aplicação inicializada.');
  });
});

// Inicializar recursos específicos de PWA
function initPWA() {
  console.log('Inicializando recursos de PWA...');
  
  // Atualizar o estado online/offline
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOnlineStatus);
  
  // Detectar modo de exibição (standalone = PWA instalado)
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (evt) => {
    window.appState.isPWA = evt.matches;
    console.log('Modo PWA:', window.appState.isPWA ? 'Ativo' : 'Inativo');
  });
  
  // Capturar o evento beforeinstallprompt para uso posterior
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir o prompt automático
    e.preventDefault();
    // Armazenar o evento para uso posterior
    window.appState.deferredInstallPrompt = e;
    // Mostrar nosso próprio botão de instalação
    showInstallPrompt();
  });
  
  // Capturar quando o PWA é instalado
  window.addEventListener('appinstalled', (event) => {
    console.log('Aplicativo instalado com sucesso!');
    window.appState.isPWA = true;
    window.appState.isInstallPromptShown = false;
    window.appState.deferredInstallPrompt = null;
    hideInstallPrompt();
    
    // Registrar analítica ou mostrar mensagem de sucesso
    if (typeof gtag === 'function') {
      gtag('event', 'pwa_installed');
    }
    
    // Exibir mensagem temporária
    showTemporaryMessage('Aplicativo instalado com sucesso!');
  });
  
  console.log('Recursos de PWA inicializados.');
}

// Mostrar o prompt de instalação personalizado
function showInstallPrompt() {
  if (window.appState.isInstallPromptShown || window.appState.isPWA) {
    return;
  }
  
  const pwaPrompt = document.getElementById('pwaInstallPrompt');
  if (pwaPrompt) {
    pwaPrompt.style.display = 'block';
    window.appState.isInstallPromptShown = true;
    
    // Adicionar manipuladores de eventos se ainda não tiverem sido adicionados
    const installButton = document.getElementById('installButton');
    const dismissButton = document.getElementById('dismissButton');
    
    if (installButton && !installButton.getAttribute('data-listener-added')) {
      installButton.addEventListener('click', handleInstallClick);
      installButton.setAttribute('data-listener-added', 'true');
    }
    
    if (dismissButton && !dismissButton.getAttribute('data-listener-added')) {
      dismissButton.addEventListener('click', handleDismissClick);
      dismissButton.setAttribute('data-listener-added', 'true');
    }
  }
}

// Esconder o prompt de instalação
function hideInstallPrompt() {
  const pwaPrompt = document.getElementById('pwaInstallPrompt');
  if (pwaPrompt) {
    pwaPrompt.style.display = 'none';
    window.appState.isInstallPromptShown = false;
  }
}

// Manipular clique no botão de instalação
function handleInstallClick() {
  if (!window.appState.deferredInstallPrompt) {
    console.log('Prompt de instalação não disponível');
    return;
  }
  
  // Mostrar o prompt de instalação
  window.appState.deferredInstallPrompt.prompt();
  
  // Esperar pela resposta do usuário
  window.appState.deferredInstallPrompt.userChoice.then((choiceResult) => {
    console.log('Usuário ' + (choiceResult.outcome === 'accepted' ? 'aceitou' : 'recusou') + ' a instalação');
    
    // Limpar a referência
    window.appState.deferredInstallPrompt = null;
    window.appState.isInstallPromptShown = false;
  });
  
  // Ocultar nosso prompt personalizado
  hideInstallPrompt();
}

// Manipular clique no botão de dispensa
function handleDismissClick() {
  hideInstallPrompt();
  
  // Armazenar o horário para não incomodar o usuário novamente por um tempo
  const dismissTime = Date.now();
  localStorage.setItem('pwa_install_dismissed', dismissTime.toString());
}

// Manipulador de mudança de status online/offline
function handleOnlineStatus() {
  const isOnline = navigator.onLine;
  window.appState.isOnline = isOnline;
  console.log('Status de conexão:', isOnline ? 'Online' : 'Offline');
  
  // Atualizar a UI com base no status de conexão
  const body = document.body;
  if (isOnline) {
    body.classList.remove('offline-mode');
    body.classList.add('online-mode');
    // Mostrar mensagem temporária
    showTemporaryMessage('Conexão restaurada');
    
    // Sincronizar dados com o servidor quando voltar online
    if (window.firebaseHelper && window.appState.pendingOperations) {
      processPendingOperations();
    }
  } else {
    body.classList.remove('online-mode');
    body.classList.add('offline-mode');
    // Mostrar mensagem temporária
    showTemporaryMessage('Você está offline. Alguns recursos podem estar limitados.');
  }
  
  // Disparar um evento personalizado para que outros componentes possam reagir
  const event = new CustomEvent('connectionStatusChanged', { detail: { isOnline } });
  document.dispatchEvent(event);
}

// Processar operações pendentes após reconexão
function processPendingOperations() {
  if (!window.appState.pendingOperations || !Array.isArray(window.appState.pendingOperations)) {
    window.appState.pendingOperations = [];
    return;
  }
  
  console.log(`Processando ${window.appState.pendingOperations.length} operações pendentes`);
  
  const operations = [...window.appState.pendingOperations];
  window.appState.pendingOperations = [];
  
  // Processar cada operação pendente
  operations.forEach(op => {
    console.log('Processando operação pendente:', op.type);
    switch (op.type) {
      case 'saveTranscription':
        if (window.firebaseHelper && window.firebaseHelper.saveTranscription) {
          window.firebaseHelper.saveTranscription(op.data)
            .then(() => console.log('Transcrição sincronizada'))
            .catch(err => {
              console.error('Erro ao sincronizar transcrição:', err);
              window.appState.pendingOperations.push(op);
            });
        }
        break;
      case 'deleteTranscription':
        if (window.firebaseHelper && window.firebaseHelper.deleteTranscription) {
          window.firebaseHelper.deleteTranscription(op.data)
            .then(() => console.log('Exclusão sincronizada'))
            .catch(err => {
              console.error('Erro ao sincronizar exclusão:', err);
              window.appState.pendingOperations.push(op);
            });
        }
        break;
      default:
        console.warn('Tipo de operação pendente desconhecido:', op.type);
    }
  });
}

// Exibir mensagem temporária na tela
function showTemporaryMessage(message, duration = 3000) {
  // Verificar se já existe um container de mensagens
  let messageContainer = document.getElementById('temporary-message-container');
  
  if (!messageContainer) {
    // Criar container se não existir
    messageContainer = document.createElement('div');
    messageContainer.id = 'temporary-message-container';
    messageContainer.style.position = 'fixed';
    messageContainer.style.bottom = '20px';
    messageContainer.style.left = '50%';
    messageContainer.style.transform = 'translateX(-50%)';
    messageContainer.style.zIndex = '9999';
    document.body.appendChild(messageContainer);
  }
  
  // Criar elemento de mensagem
  const messageElement = document.createElement('div');
  messageElement.className = 'temporary-message';
  messageElement.textContent = message;
  messageElement.style.backgroundColor = window.appState.isOnline ? '#4CAF50' : '#FF9800';
  messageElement.style.color = 'white';
  messageElement.style.padding = '10px 20px';
  messageElement.style.borderRadius = '4px';
  messageElement.style.marginBottom = '10px';
  messageElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  messageElement.style.transition = 'opacity 0.3s ease-in-out';
  
  // Adicionar ao container
  messageContainer.appendChild(messageElement);
  
  // Remover após o tempo especificado
  setTimeout(() => {
    messageElement.style.opacity = '0';
    setTimeout(() => {
      // Remover mensagem se ainda existir
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 300); // Aguardar a transição terminar
  }, duration);
}

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

// Função para processar parâmetros da URL
function handleUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Verificar se há um ID de transcrição para editar
  const transcriptionId = urlParams.get('id');
  if (transcriptionId) {
    console.log('Carregando transcrição:', transcriptionId);
    window.currentTranscriptionId = transcriptionId;
    
    if (window.transcriptionUtils && typeof window.transcriptionUtils.loadTranscriptionDetails === 'function') {
      window.transcriptionUtils.loadTranscriptionDetails(transcriptionId);
    } else {
      console.error('Função loadTranscriptionDetails não encontrada');
    }
  }
  
  // Verificar ação específica
  const action = urlParams.get('action');
  if (action) {
    console.log('Executando ação:', action);
    
    switch (action) {
      case 'record':
        // Focar na guia de gravação e possivelmente iniciar gravação
        if (document.querySelector('.tab[data-tab="recorder"]')) {
          document.querySelector('.tab[data-tab="recorder"]').click();
        }
        break;
      case 'history':
        // Focar na guia de histórico
        if (document.querySelector('.tab[data-tab="history"]')) {
          document.querySelector('.tab[data-tab="history"]').click();
        }
        break;
      default:
        console.log('Ação desconhecida:', action);
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
                               
  // Adicionar funcionalidades de PWA ao objeto global
  window.pwa = {
    installApp: handleInstallClick,
    dismissInstall: handleDismissClick,
    showInstallPrompt: showInstallPrompt,
    hideInstallPrompt: hideInstallPrompt,
    isInstalled: () => window.appState.isPWA,
    isOnline: () => window.appState.isOnline
  };
}

// Chamar setup das funções globais
setupGlobalFunctions();

// Exportar funções para uso global
window.app = {
  showTemporaryMessage,
  handleOnlineStatus,
  processPendingOperations,
  checkAuthState,
  handleUrlParams
};
