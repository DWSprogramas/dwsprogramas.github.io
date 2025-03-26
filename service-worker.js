// Service Worker para Mapzy Vox IA
const CACHE_NAME = 'mapzyvox-cache-v1';
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
  './android/android-launchericon-512-512.png'
];

// Instalar o Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando arquivos');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Ativar o Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  event.waitUntil(self.clients.claim());
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  // Não interceptar requisições para APIs
  if (event.request.url.includes('api.openai.com') || 
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }
  
  // Para navegação, usar estratégia Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }
  
  // Para outros recursos, usar Cache First
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Retornar do cache se disponível
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Se não estiver no cache, buscar na rede
        return fetch(event.request)
          .then((response) => {
            // Não cachear respostas não-ok
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar a resposta
            const responseToCache = response.clone();
            
            // Adicionar ao cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
  );
});

// Evento de instalação do PWA
self.addEventListener('appinstalled', (event) => {
  console.log('[Service Worker] App instalado');
});
