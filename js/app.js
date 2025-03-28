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
  if (window.storageUtils && typeof window.storageUtils.removeExpiredItems === 'function') {
    window.storageUtils.removeExpiredItems().catch(err => {
      console.warn('Erro ao remover itens expirados:', err);
    });
  }
  
// Verificar autenticação primeiro, antes de inicializar outros módulos
  checkAuthState((user) => {
  console.log('Usuário autenticado ou redirecionamento já foi tratado. Inicializando módulos...');

  // Inicializar módulos se estiver autenticado ou na página de login
  initUIComponents();

  if (!window.location.pathname.includes('login.html')) {
    initAudioRecorder();
    initTranscription();
    handleUrlParams();
    loadApiKey();
    handleUrlParams();

    if (process.env.NODE_ENV !== 'production') {
      window.debug = {
        checkStorageQuota: window.storageUtils?.checkStorageQuota,
        getStorageUsage: window.storageUtils?.getStorageUsage,
        clearUserStorage: window.storageUtils?.clearUserStorage,
        appState: window.appState,
        verifyHttps: () => {
          const allLinks = Array.from(document.querySelectorAll('a[href]'));
          const allScripts = Array.from(document.querySelectorAll('script[src]'));
          const allStyles = Array.from(document.querySelectorAll('link[href]'));
          const allImages = Array.from(document.querySelectorAll('img[src]'));

          const httpLinks = allLinks.filter(a => a.href.startsWith('http:'));
          const httpScripts = allScripts.filter(s => s.src.startsWith('http:'));
          const httpStyles = allStyles.filter(l => l.href.startsWith('http:'));
          const httpImages = allImages.filter(i => i.src.startsWith('http:'));

          return {
            httpLinks,
            httpScripts,
            httpStyles,
            httpImages,
            hasHttpContent: httpLinks.length > 0 || httpScripts.length > 0 || httpStyles.length > 0 || httpImages.length > 0
          };
        }
      };
    }
  }

  console.log('Aplicação inicializada.');
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
        document.getElementById(`${tabName}Tab`).classList.add('active');
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
    
    // Registrar analítica ou mostrar mensagem de sucesso
    if (typeof gtag === 'function') {
      gtag('event', 'pwa_installed');
    }
    
    // Exibir mensagem temporária
    showTemporaryMessage('Aplicativo instalado com sucesso!');
  });
  
  console.log('Recursos de PWA inicializados.');
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
