/**
 * Mapzy Vox IA - Registro e gerenciamento do Service Worker
 * Responsável pelo comportamento offline e atualizações do PWA
 */

// Verificar e registrar o Service Worker imediatamente
(function() {
  // Log mais detalhado para diagnóstico
  console.log('Inicializando registro do Service Worker...');
  console.log('URL atual:', window.location.href);
  console.log('URL base:', window.location.origin);
  
  if ('serviceWorker' in navigator) {
    // Registre o service worker o mais cedo possível
    registerServiceWorker();
  } else {
    console.warn('Service Worker não é suportado neste navegador');
    // Disparar um evento personalizado para informar que o SW não é suportado
    window.dispatchEvent(new CustomEvent('swNotSupported'));
  }
  
  // Configurar eventos de conectividade independentemente do SW
  setupConnectivityEvents();
})();

/**
 * Registra o Service Worker utilizando várias tentativas de caminho
 */
function registerServiceWorker() {
  console.log('Tentando registrar o Service Worker...');
  
  // Tentar primeiro com caminho absoluto
  let swPath = '/service-worker.js';
  
  navigator.serviceWorker.register(swPath, { scope: '/' })
    .then(registration => {
      console.log('Service Worker registrado com sucesso!', registration.scope);
      handleRegistrationSuccess(registration);
    })
    .catch(error => {
      console.warn('Falha ao registrar SW com caminho absoluto:', error);
      
      // Tentar com caminho relativo
      swPath = './service-worker.js';
      navigator.serviceWorker.register(swPath)
        .then(registration => {
          console.log('Service Worker registrado com caminho relativo:', registration.scope);
          handleRegistrationSuccess(registration);
        })
        .catch(error2 => {
          console.error('Falha definitiva ao registrar Service Worker:', error2);
          // Disparar evento de falha
          window.dispatchEvent(new CustomEvent('swRegistrationFailed', { detail: error2 }));
        });
    });
}

/**
 * Lida com o registro bem-sucedido do Service Worker
 * @param {ServiceWorkerRegistration} registration - Objeto de registro do Service Worker
 */
function handleRegistrationSuccess(registration) {
  // Verificar e lidar com atualizações
  setupServiceWorkerUpdates(registration);
  
  // Configurar eventos de instalação
  setupPWAInstallEvents();
  
  // Disparar evento personalizado para informar que o SW está registrado
  window.dispatchEvent(new CustomEvent('swRegistered', { detail: registration }));
}

/**
 * Configura o gerenciamento de atualizações do Service Worker
 * @param {ServiceWorkerRegistration} registration - Objeto de registro do Service Worker
 */
function setupServiceWorkerUpdates(registration) {
  // Verificar atualizações periodicamente (a cada hora)
  const checkInterval = 3600000; // 1 hora em milissegundos
  setInterval(() => {
    registration.update()
      .then(() => console.log('Service Worker: verificação de atualização concluída'))
      .catch(err => console.error('Erro ao verificar atualizações do Service Worker:', err));
  }, checkInterval);

  // Ouvir por novas versões do Service Worker
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    console.log('Nova versão do Service Worker em instalação...');
    
    newWorker.addEventListener('statechange', () => {
      // Quando uma nova versão estiver pronta
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('Nova versão do Service Worker instalada e pronta para uso');
        showUpdateNotification();
      }
    });
  });
  
  // Escutar mensagens do Service Worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHE_UPDATED') {
      console.log('Cache atualizado pelo Service Worker:', event.data.url);
    }
  });
}

/**
 * Mostra uma notificação de atualização disponível
 */
function showUpdateNotification() {
  // Verificar se o elemento de notificação já existe
  let updateNotification = document.getElementById('sw-update-notification');
  
  // Criar o elemento se não existir
  if (!updateNotification) {
    updateNotification = document.createElement('div');
    updateNotification.id = 'sw-update-notification';
    updateNotification.style.position = 'fixed';
    updateNotification.style.bottom = '20px';
    updateNotification.style.right = '20px';
    updateNotification.style.backgroundColor = '#4CAF50';
    updateNotification.style.color = 'white';
    updateNotification.style.padding = '15px';
    updateNotification.style.borderRadius = '4px';
    updateNotification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    updateNotification.style.zIndex = '10000';
    updateNotification.style.display = 'flex';
    updateNotification.style.alignItems = 'center';
    updateNotification.style.justifyContent = 'space-between';
    
    updateNotification.innerHTML = `
      <span>Nova versão disponível!</span>
      <div style="margin-left: 15px;">
        <button id="sw-update-now" style="background: white; color: #4CAF50; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Atualizar agora</button>
        <button id="sw-update-later" style="background: transparent; color: white; border: 1px solid white; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Mais tarde</button>
      </div>
    `;
    
    document.body.appendChild(updateNotification);
    
    // Adicionar handlers para os botões
    document.getElementById('sw-update-now').addEventListener('click', () => {
      window.location.reload();
    });
    
    document.getElementById('sw-update-later').addEventListener('click', () => {
      updateNotification.style.display = 'none';
    });
  } else {
    updateNotification.style.display = 'flex';
  }
}

/**
 * Configura eventos de conectividade (online/offline)
 */
function setupConnectivityEvents() {
  // Evento para quando a aplicação ficar online
  window.addEventListener('online', () => {
    console.log('Aplicação está online!');
    document.body.classList.remove('offline');
    document.body.classList.add('online');
    
    // Notificar o aplicativo sobre a mudança de estado
    const event = new CustomEvent('app-online');
    window.dispatchEvent(event);
    
    // Tentar sincronizar dados pendentes
    if (window.app && typeof window.app.processPendingOperations === 'function') {
      window.app.processPendingOperations();
    }
    
    // Verificar se há conteúdo de fallback a ser removido
    const offlineContent = document.getElementById('offline-content');
    if (offlineContent) {
      offlineContent.style.display = 'none';
    }
  });
  
  // Evento para quando a aplicação ficar offline
  window.addEventListener('offline', () => {
    console.log('Aplicação está offline!');
    document.body.classList.remove('online');
    document.body.classList.add('offline');
    
    // Notificar o aplicativo sobre a mudança de estado
    const event = new CustomEvent('app-offline');
    window.dispatchEvent(event);
    
    // Mostrar mensagem de offline se a página atual não estiver no cache
    checkOfflineCapability();
  });
  
  // Verificar status inicial
  if (navigator.onLine) {
    document.body.classList.add('online');
    document.body.classList.remove('offline');
  } else {
    document.body.classList.remove('online');
    document.body.classList.add('offline');
    checkOfflineCapability();
  }
}

/**
 * Verifica se a página atual está disponível offline
 */
function checkOfflineCapability() {
  if (!navigator.serviceWorker.controller) {
    console.log('Service Worker não está controlando a página - conteúdo offline pode não estar disponível');
    return;
  }
  
  // Verifica se a página atual está em cache
  if (window.caches) {
    caches.match(window.location.href)
      .then(response => {
        if (!response) {
          console.log('Página atual não está em cache para uso offline');
          // Aqui você pode redirecionar para uma página de fallback
          // ou mostrar uma mensagem no topo da página
        } else {
          console.log('Página disponível offline através do cache');
        }
      })
      .catch(err => console.error('Erro ao verificar cache:', err));
  }
}

/**
 * Configura eventos de instalação do PWA
 */
function setupPWAInstallEvents() {
  // Evento para capturar o prompt de instalação
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir o comportamento padrão do navegador
    e.preventDefault();
    
    // Armazenar o evento para uso posterior
    window.deferredPrompt = e;
    
    // Notificar o app.js sobre o evento
    if (window.appState) {
      window.appState.deferredInstallPrompt = e;
    }
    
    // Atualizar UI para mostrar botão de instalação
    const pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
    if (pwaInstallPrompt) {
      pwaInstallPrompt.style.display = 'block';
    }
    
    console.log('PWA disponível para instalação');
  });
  
  // Detectar quando o PWA foi instalado
  window.addEventListener('appinstalled', () => {
    console.log('PWA foi instalado com sucesso!');
    
    // Limpar o prompt armazenado
    window.deferredPrompt = null;
    
    // Limpar referência no estado da aplicação
    if (window.appState) {
      window.appState.deferredInstallPrompt = null;
      window.appState.isPWA = true;
    }
    
    // Atualizar UI (ocultar botão de instalação)
    const pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
    if (pwaInstallPrompt) {
      pwaInstallPrompt.style.display = 'none';
    }
    
    // Registrar a instalação (para analytics)
    if (typeof gtag === 'function') {
      gtag('event', 'pwa_installed');
    }
  });
}

/**
 * Verifica se a aplicação está sendo executada como PWA instalado
 * @returns {boolean} Verdadeiro se estiver executando como PWA instalado
 */
function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Exporta funções para uso global
window.pwaUtils = {
  isPWAInstalled,
  checkOfflineCapability,
  showUpdateNotification
};
