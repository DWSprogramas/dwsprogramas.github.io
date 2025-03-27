// Service Worker para Mapzy Vox IA
const CACHE_NAME = 'mapzyvox-cache-v2';
const OFFLINE_URL = './offline.html';

// Assets a serem cacheados na instalação
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './login.html',
  './offline.html',
  './manifest.json',
  './css/styles.css',
  './android/android-launchericon-192-192.png',
  './android/android-launchericon-512-512.png',
  './ios/180.png'
];

// Instalar o Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  // Força a ativação imediata - importante para PWAs
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando arquivos');
        // Adiciona cada recurso individualmente para melhor tratamento de erros
        return Promise.all(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(error => {
              console.error(`[Service Worker] Falha ao cachear ${url}:`, error);
            });
          })
        );
      })
  );
});

// Ativar o Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  
  // Tomar controle imediatamente de todas as abas/janelas
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

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  // Ignorar requisições para APIs e análise
  if (event.request.url.includes('api.openai.com') || 
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('analytics')) {
    return;
  }
  
  // Para requisições do tipo não-GET, passar direto para a rede
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Para requisições de navegação (carregamento de página), usar Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      // Tenta primeiro a rede
      fetch(event.request)
        .then(response => {
          // Em caso de sucesso, retorna a resposta
          return response;
        })
        .catch(() => {
          // Em caso de falha (offline), tenta o cache
          return caches.match(OFFLINE_URL)
            .then(cachedResponse => {
              if (cachedResponse) {
                // Se encontrar a página offline no cache, retorna ela
                return cachedResponse;
              }
              // Caso não encontre, tentar qualquer página cacheada
              return caches.match('./index.html');
            });
        })
    );
    return;
  }
  
  // Para outros recursos (imagens, scripts, estilos), usar Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se estiver no cache, retorna imediatamente
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Se não estiver no cache, buscar na rede
        return fetch(event.request)
          .then(networkResponse => {
            // Verificar se a resposta é válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Clonar a resposta para o cache
            const responseToCache = networkResponse.clone();
            
            // Armazenar no cache para uso futuro
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('[Service Worker] Erro ao cachear resposta:', error);
              });
            
            return networkResponse;
          })
          .catch(error => {
            console.error('[Service Worker] Erro ao buscar recurso:', error);
            // Para imagens, poderia retornar uma imagem fallback
            if (event.request.destination === 'image') {
              return caches.match('./android/android-launchericon-192-192.png');
            }
            // Para outros recursos, apenas falha
            throw error;
          });
      })
  );
});

// Evento de instalação do PWA
self.addEventListener('appinstalled', (event) => {
  console.log('[Service Worker] PWA instalado com sucesso!');
});

// Evento de sincronização em background (para futuras melhorias)
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-pending-data') {
    console.log('[Service Worker] Sync: Sincronizando dados pendentes');
    // Implementação futura para sincronizar dados quando online
  }
});
