// Mapzy Vox IA - Service Worker
const CACHE_NAME = 'mapzyvox-cache-v1';
const OFFLINE_URL = '/mapzy-ia/offline.html';
const BASE_PATH = '/mapzy-ia';

// Arquivos a serem pré-cacheados na instalação
const PRE_CACHE_URLS = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/login.html`,
  `${BASE_PATH}/dashboard.html`,
  `${BASE_PATH}/offline.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/css/styles.css`,
  `${BASE_PATH}/js/app.js`,
  `${BASE_PATH}/js/audio-recorder.js`,
  `${BASE_PATH}/js/firebase-config.js`,
  `${BASE_PATH}/js/register-sw.js`,
  `${BASE_PATH}/js/security.js`,
  `${BASE_PATH}/js/storage-manager.js`,
  `${BASE_PATH}/js/transcription.js`,
  `${BASE_PATH}/js/ui-controller.js`,
  `${BASE_PATH}/js/user-auth.js`,
  `${BASE_PATH}/android/android-launchericon-192-192.png`,
  `${BASE_PATH}/android/android-launchericon-512-512.png`,
  `${BASE_PATH}/ios/180.png`
];

// Instalar o service worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  
  // Skip waiting força a ativação imediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cache aberto, adicionando recursos');
        return cache.addAll(PRE_CACHE_URLS);
      })
      .catch((error) => {
        console.error('[Service Worker] Erro durante o cache inicial:', error);
      })
  );
});

// Ativar o service worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  
  // Tomar controle de clientes não controlados (páginas abertas)
  event.waitUntil(self.clients.claim());
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Função para verificar se uma URL é do mesmo domínio
function isSameOrigin(url) {
  const self = new URL(self.location);
  const target = new URL(url, self.location.origin);
  return self.origin === target.origin;
}

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  // Não interceptar requisições para APIs externas
  if (event.request.url.includes('api.openai.com') || 
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }
  
  // Para requisições com método diferente de GET, não usar cache
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Estratégia para navegação (Network First)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              console.log('[Service Worker] Cacheando página de navegação:', event.request.url);
              cache.put(event.request, response.clone());
              return response;
            });
        })
        .catch(() => {
          return caches.match(event.request)
            .then((response) => {
              if (response) {
                return response;
              }
              
              console.log('[Service Worker] Carregando página offline para navegação');
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // Estratégia para recursos estáticos (Cache First)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retornar do cache se disponível
        if (response) {
          return response;
        }
        
        // Se não estiver no cache, buscar na rede
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache miss - buscar da rede
            console.log('[Service Worker] Carregando da rede recurso não cacheado:', event.request.url);
            
            // Fazer clone para armazenar no cache
            const responseToCache = networkResponse.clone();
            
            // Somente cachear recursos do mesmo domínio
            if (isSameOrigin(event.request.url)) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('[Service Worker] Erro ao buscar e cachear:', error);
            
            // Para imagens, retornar uma imagem placeholder
            if (event.request.destination === 'image') {
              return caches.match(`${BASE_PATH}/android/android-launchericon-192-192.png`);
            }
            
            // Para outros recursos, retornar nulo ou uma resposta default
            return new Response('Recurso não disponível offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Lidar com notificações push
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notificação push recebida');
  
  let notificationData = {};
  
  try {
    if (event.data) {
      notificationData = event.data.json();
    }
  } catch (error) {
    notificationData = {
      title: 'Mapzy Vox IA',
      body: 'Nova atualização disponível',
      icon: `${BASE_PATH}/android/android-launchericon-192-192.png`
    };
  }
  
  const title = notificationData.title || 'Mapzy Vox IA';
  const options = {
    body: notificationData.body || 'Nova notificação',
    icon: notificationData.icon || `${BASE_PATH}/android/android-launchericon-192-192.png`,
    badge: `${BASE_PATH}/android/android-launchericon-96-96.png`,
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || `${BASE_PATH}/`
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Ação ao clicar na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificação clicada');
  
  event.notification.close();
  
  // Verificar se há URL para abrir
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow(`${BASE_PATH}/`)
    );
  }
});

// Evento para sincronização em segundo plano
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag);
  
  if (event.tag === 'sync-transcriptions') {
    event.waitUntil(syncTranscriptions());
  }
});

// Função para sincronizar dados (pode ser expandida conforme necessário)
async function syncTranscriptions() {
  console.log('[Service Worker] Sincronizando transcrições');
  
  // Aqui você pode implementar a lógica de sincronização
  // Exemplo: buscar dados do IndexedDB e enviar para o Firebase
  
  return Promise.resolve(); // Retornar uma promise resolvida para o evento sync
}

// Manipular compartilhamento (share target)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/mapzy-ia/') && url.search.includes('?share')) {
    console.log('[Service Worker] Interceptando compartilhamento');
    // Aqui você pode implementar lógica para lidar com o conteúdo compartilhado
  }
});

// Configurar os widgets web
self.addEventListener('periodicsync', (event) => {
  if (event.tag.startsWith('widget-update-')) {
    const widgetId = event.tag.replace('widget-update-', '');
    console.log('[Service Worker] Atualizando widget:', widgetId);
    
    event.waitUntil(updateWidget(widgetId));
  }
});

// Função para atualizar widgets (será implementada conforme necessário)
async function updateWidget(widgetId) {
  console.log('[Service Worker] Processando atualização do widget:', widgetId);
  // Implementar lógica de atualização do widget
  return Promise.resolve();
}

// Evento para instalação do PWA
self.addEventListener('appinstalled', (event) => {
  console.log('[Service Worker] App instalado');
});
