/**
 * Mapzy Vox IA - Aplicativo principal
 * Gerencia o estado da aplicação, recursos de PWA e inicialização dos módulos
 */

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
  lastUpdated: Date.now(),
  pendingOperations: [],
  apiEndpoints: {
    openai: "https://api.openai.com/v1/chat/completions"
  }
};

// Constantes para URLs
const APP_BASE_URL = location.protocol + '//' + location.host + location.pathname.substring(0, location.pathname.lastIndexOf('/') + 1);
const OFFLINE_PAGE_URL = new URL('offline.html', APP_BASE_URL).href;

// Função principal de inicialização
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando aplicação...');
  
  // Garantir que a aplicação está usando HTTPS
  enforceHttps();
  
  // Realizar inicialização do PWA
  initPWA();
  
  // Remover itens expirados do armazenamento
  try {
    if (window.storageUtils && typeof window.storageUtils.removeExpiredItems === 'function') {
      // Verificar se a função retorna uma Promise antes de usar .catch
      const result = window.storageUtils.removeExpiredItems();
      if (result && typeof result.catch === 'function') {
        result.catch(err => {
          console.warn('Erro ao remover itens expirados:', err);
        });
      }
    }
  } catch (err) {
    console.warn('Erro ao remover itens expirados:', err);
  }
  
  // Verificar autenticação primeiro, antes de inicializar outros módulos
  checkAuthState((user) => {
    if (!user && !window.location.pathname.includes('login.html')) {
      console.log('Usuário não autenticado. Redirecionando para login...');
      window.location.href = new URL('login.html', APP_BASE_URL).href;
      return; // Parar a execução se redirecionando
    }
    
    console.log('Usuário autenticado ou na página de login. Inicializando módulos...');
    
    // Inicializar módulos se estiver autenticado ou na página de login
    initUIComponents();
    
    // Apenas inicializar estes módulos se não estiver na página de login
    if (!window.location.pathname.includes('login.html')) {
      initAudioRecorder();
      initTranscription();
      handleUrlParams();
      
      // Carregar a chave API
      loadApiKey();
      
      // Verificar se há parâmetros na URL
      handleUrlParams();
    }
    
    console.log('Aplicação inicializada.');
  });
});

/**
 * Garante que a aplicação está usando HTTPS
 */
function enforceHttps() {
  // Redirecionar para HTTPS automaticamente se estiver em HTTP (exceto localhost)
  if (location.protocol === 'http:' && !location.hostname.includes('localhost') && !location.hostname.includes('127.0.0.1')) {
    console.log('Redirecionando para HTTPS...');
    window.location.href = window.location.href.replace('http:', 'https:');
    return;
  }
  
  // Adicionar listener para detectar e corrigir links HTTP
  document.addEventListener('click', (e) => {
    // Verificar se o clique foi em um link
    const link = e.target.closest('a');
    if (link && link.href && link.href.startsWith('http:') && !link.href.includes('localhost') && !link.href.includes('127.0.0.1')) {
      e.preventDefault();
      console.log('Convertendo link HTTP para HTTPS:', link.href);
      window.location.href = link.href.replace('http:', 'https:');
    }
  });
}

/**
 * Inicializa a interface do usuário
 */
function initUIComponents() {
  // Inicialização dos elementos de UI
  if (typeof window.uiController !== 'undefined' && typeof window.uiController.initUI === 'function') {
    window.uiController.initUI();
  } else {
    console.warn('Módulo UI Controller não encontrado, inicializando UI básica');
    // Inicialização básica das abas
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Remover classe 'active' de todas as abas
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Adicionar classe 'active' na aba clicada
        button.classList.add('active');
        const tabContent = document.getElementById(`${tabName}Tab`);
        if (tabContent) {
          tabContent.classList.add('active');
        }
      });
    });
  }
}

/**
 * Inicializa recursos específicos de PWA
 */
function initPWA() {
  console.log('Inicializando recursos de PWA...');
  
  // Atualizar o estado online/offline
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOnlineStatus);
  
  // Configuração inicial do status de conexão
  handleOnlineStatus();
  
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
    
    // Exibir mensagem temporária
    showTemporaryMessage('Aplicativo instalado com sucesso!');
  });
  
  console.log('Recursos de PWA inicializados.');
}

/**
 * Verificar o estado de autenticação
 */
function checkAuthState(callback) {
  // Verificar se o Firebase Auth está disponível
  if (!window.firebase || !window.firebase.auth) {
    console.error('Firebase Auth não está disponível');
    return;
  }
  
  window.firebase.auth().onAuthStateChanged((user) => {
    if (callback && typeof callback === 'function') {
      callback(user);
    }
  });
}

/**
 * Mostrar o prompt de instalação personalizado
 */
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

/**
 * Esconder o prompt de instalação
 */
function hideInstallPrompt() {
  const pwaPrompt = document.getElementById('pwaInstallPrompt');
  if (pwaPrompt) {
    pwaPrompt.style.display = 'none';
    window.appState.isInstallPromptShown = false;
  }
}

/**
 * Manipular clique no botão de instalação
 */
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

/**
 * Manipular clique no botão de dispensa
 */
function handleDismissClick() {
  hideInstallPrompt();
  
  // Armazenar o horário para não incomodar o usuário novamente por um tempo
  const dismissTime = Date.now();
  localStorage.setItem('pwa_install_dismissed', dismissTime.toString());
}

/**
 * Manipulador de mudança de status online/offline
 */
function handleOnlineStatus() {
  const isOnline = navigator.onLine;
  const previousStatus = window.appState.isOnline;
  window.appState.isOnline = isOnline;
  
  console.log('Status de conexão:', isOnline ? 'Online' : 'Offline');
  
  // Atualizar a UI com base no status de conexão
  const body = document.body;
  if (isOnline) {
    body.classList.remove('offline-mode');
    body.classList.add('online-mode');
    
    // Apenas mostrar mensagem se houve mudança de status
    if (!previousStatus) {
      showTemporaryMessage('Conexão restaurada');
    }
    
    // Sincronizar dados com o servidor quando voltar online
    if (!previousStatus && window.appState.pendingOperations && window.appState.pendingOperations.length > 0) {
      processPendingOperations();
    }
  } else {
    body.classList.remove('online-mode');
    body.classList.add('offline-mode');
    
    // Apenas mostrar mensagem se houve mudança de status
    if (previousStatus) {
      showTemporaryMessage('Você está offline. Alguns recursos podem estar limitados.');
    }
  }
  
  // Disparar um evento personalizado para que outros componentes possam reagir
  const event = new CustomEvent('connectionStatusChanged', { detail: { isOnline } });
  document.dispatchEvent(event);
}

/**
 * Exibir uma mensagem temporária
 */
function showTemporaryMessage(message, duration = 3000) {
  // Tentar criar o elemento de mensagem se não existir
  let messageElement = document.getElementById('temp-message');
  if (!messageElement) {
    messageElement = document.createElement('div');
    messageElement.id = 'temp-message';
    messageElement.style.position = 'fixed';
    messageElement.style.bottom = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.backgroundColor = '#333';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.zIndex = '9999';
    messageElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    messageElement.style.textAlign = 'center';
    messageElement.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(messageElement);
  }
  
  // Definir a mensagem
  messageElement.textContent = message;
  messageElement.style.opacity = '1';
  
  // Remover a mensagem após o tempo definido
  setTimeout(() => {
    messageElement.style.opacity = '0';
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.parentNode.removeChild(messageElement);
      }
    }, 300);
  }, duration);
}

/**
 * Processar operações pendentes após reconexão
 */
function processPendingOperations() {
  if (!window.appState.pendingOperations || !Array.isArray(window.appState.pendingOperations)) {
    window.appState.pendingOperations = [];
    return;
  }
  
  console.log(`Processando ${window.appState.pendingOperations.length} operações pendentes`);
  
  // Fazer uma cópia da fila e limpar a original para evitar duplicações
  const operations = [...window.appState.pendingOperations];
  window.appState.pendingOperations = [];
  
  // Processar cada operação pendente
  const processPromises = operations.map(op => {
    console.log('Processando operação pendente:', op.type);
    
    return new Promise((resolve) => {
      let operationPromise;
      
      switch (op.type) {
        case 'saveTranscription':
          if (window.firebaseHelper && window.firebaseHelper.saveTranscription && window.firebaseHelper.isInitialized()) {
            operationPromise = window.firebaseHelper.saveTranscription(op.data);
          }
          break;
        case 'deleteTranscription':
          if (window.firebaseHelper && window.firebaseHelper.deleteTranscription && window.firebaseHelper.isInitialized()) {
            operationPromise = window.firebaseHelper.deleteTranscription(op.data);
          }
          break;
        case 'updateTranscription':
          if (window.firebaseHelper && window.firebaseHelper.updateTranscription && window.firebaseHelper.isInitialized()) {
            operationPromise = window.firebaseHelper.updateTranscription(op.data.id, op.data);
          }
          break;
        default:
          console.warn('Tipo de operação pendente desconhecido:', op.type);
          return resolve();
      }
      
      if (operationPromise) {
        operationPromise
          .then(() => {
            console.log(`Operação ${op.type} sincronizada com sucesso`);
            resolve();
          })
          .catch(err => {
            console.error(`Erro ao sincronizar operação ${op.type}:`, err);
            // Colocar de volta na fila para tentar novamente depois
            window.appState.pendingOperations.push(op);
            resolve();
          });
      } else {
        resolve();
      }
    });
  });
  
  // Aguardar todas as operações
  Promise.all(processPromises)
    .then(() => {
      console.log('Sincronização de operações pendentes concluída');
      
      // Se ainda houver operações pendentes, mostrar mensagem
      if (window.appState.pendingOperations.length > 0) {
        console.warn(`${window.appState.pendingOperations.length} operações ainda pendentes`);
        showTemporaryMessage(`Algumas operações não puderam ser sincronizadas. Tentando novamente mais tarde.`);
      }
    });
}

/**
 * Carregar a chave API do usuário
 */
function loadApiKey() {
  try {
    // Primeiro tentar carregar do localStorage
    const savedApiKey = localStorage.getItem('openai_api_key');
    
    // Verificar se storageUtils está disponível
    if (window.storageUtils && typeof window.storageUtils.loadApiKey === 'function') {
      window.storageUtils.loadApiKey()
        .then(apiKey => {
          console.log('Chave API carregada com sucesso');
        })
        .catch(error => {
          console.warn('Erro ao carregar chave API:', error);
        });
    } else if (savedApiKey) {
      console.log('Chave API carregada do localStorage');
    } else {
      console.warn('Não foi possível carregar a chave API');
    }
  } catch (error) {
    console.warn('Erro ao carregar chave API:', error);
  }
}

/**
 * Inicializar gravador de áudio
 */
function initAudioRecorder() {
  if (typeof window.initAudioRecorder === 'function') {
    window.initAudioRecorder();
  } else {
    console.warn('Função initAudioRecorder não encontrada');
  }
}

/**
 * Inicializar transcrição
 */
function initTranscription() {
  if (typeof window.transcriptionUtils !== 'undefined' && typeof window.transcriptionUtils.initTranscription === 'function') {
    window.transcriptionUtils.initTranscription();
  } else {
    console.warn('Função initTranscription não encontrada');
  }
}

/**
 * Tratar parâmetros da URL
 */
function handleUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Se houver um ID na URL, carregar a transcrição
  const transcriptionId = urlParams.get('id');
  if (transcriptionId && typeof window.transcriptionUtils !== 'undefined' && typeof window.transcriptionUtils.loadTranscriptionDetails === 'function') {
    window.transcriptionUtils.loadTranscriptionDetails(transcriptionId);
  }
  
  // Se houver uma ação na URL, executá-la
  const action = urlParams.get('action');
  if (action === 'record') {
    const recordTab = document.querySelector('.tab[data-tab="recorder"]');
    if (recordTab) {
      recordTab.click();
    }
  } else if (action === 'history') {
    const historyTab = document.querySelector('.tab[data-tab="history"]');
    if (historyTab) {
      historyTab.click();
    }
  }
}
