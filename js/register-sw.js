// Script para registrar o Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('Tentando registrar o Service Worker...');
    
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service Worker registrado com sucesso!', registration);
        
        // Verificar se há atualizações do Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('Nova versão do Service Worker encontrada!');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Nova versão disponível! Recarregue para atualizar.');
              
              // Opcionalmente, mostrar uma notificação ao usuário sobre a atualização
              if (confirm('Nova versão disponível! Deseja atualizar agora?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch(error => {
        console.error('Erro ao registrar Service Worker:', error);
      });
    
    // Verificar status da conexão
    window.addEventListener('online', () => {
      console.log('Aplicação está online!');
      document.body.classList.remove('offline');
      
      // Notificar o usuário que está online novamente
      const event = new CustomEvent('app-online');
      window.dispatchEvent(event);
    });
    
    window.addEventListener('offline', () => {
      console.log('Aplicação está offline!');
      document.body.classList.add('offline');
      
      // Notificar o usuário que está offline
      const event = new CustomEvent('app-offline');
      window.dispatchEvent(event);
    });
    
    // Evento personalizado para verificar se a aplicação está instalada
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir o comportamento padrão do navegador
      e.preventDefault();
      
      // Armazenar o evento para uso posterior
      window.deferredPrompt = e;
      
      // Atualizar UI para mostrar botão de instalação
      const installButton = document.getElementById('installButton');
      if (installButton) {
        const pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
        if (pwaInstallPrompt) {
          pwaInstallPrompt.style.display = 'block';
        }
      }
    });
    
    // Detectar quando o PWA foi instalado
    window.addEventListener('appinstalled', () => {
      console.log('PWA foi instalado com sucesso!');
      
      // Limpar o prompt armazenado
      window.deferredPrompt = null;
      
      // Atualizar UI (ocultar botão de instalação)
      const pwaInstallPrompt = document.getElementById('pwaInstallPrompt');
      if (pwaInstallPrompt) {
        pwaInstallPrompt.style.display = 'none';
      }
    });
  });
}

// Função para verificar se a aplicação está sendo executada como PWA instalado
function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Exporta função para verificar se é PWA instalado
window.isPWAInstalled = isPWAInstalled;
