// Nome do cache para armazenar arquivos
const CACHE_NAME = 'mapzyvox-cache-v1';
const OFFLINE_URL = './offline.html';

// Lista de arquivos para serem cacheados inicialmente
const urlsToCache = [
  './',
  './index.html',
  './login.html',
  './dashboard.html',
  './manifest.json',
  './offline.html',
  './css/styles.css',
  './js/app.js',
  './js/audio-recorder.js',
  './js/firebase-config.js',
  './js/register-sw.js',
  './js/security.js',
  './js/storage-manager.js',
  './js/transcription.js',
  './js/ui-controller.js',
  './js/user-auth.js',
  './js/verificador-estrutura.js',
  './android/android-launchericon-48-48.png',
  './android/android-launchericon-72-72.png',
  './android/android-launchericon-96-96.png',
  './android/android-launchericon-144-144.png',
  './android/android-launchericon-192-192.png',
  './android/android-launchericon-512-512.png',
  './ios/152.png',
  './ios/180.png',
  './ios/256.png'
];

// Instalar o service worker e criar o cache
self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Erro durante o cache:', error);
      })
  );
  
  // Forçar ativação imediata sem esperar por fechamento de páginas
  self.skipWaiting();
});

// Ativar o service worker e limpar caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker ativando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Se o cache não estiver na whitelist, remova-o
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker ativado!');
      // Tomar controle de clientes não controlados (páginas abertas)
      return self.clients.claim();
    })
  );
});

// Interceptar as requisições de rede e usar o cache quando possível
self.addEventListener('fetch', event => {
  // Não intercepta requisições para APIs externas
  if (event.request.url.includes('api.openai.com') || 
      event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    // Tenta buscar o recurso na rede
    fetch(event.request)
      .then(response => {
        // Verificar se recebemos uma resposta válida
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone da resposta, pois ela só pode ser usada uma vez
        const responseToCache = response.clone();

        // Atualizar o cache com a nova resposta
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Se falhar (provavelmente offline), buscar no cache
        return caches.match(event.request)
          .then(cachedResponse => {
            // Retorna o recurso do cache se existir, ou a página offline
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Se o tipo de requisição for 'navigate', mostrar página offline
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            // Para outros recursos que não estão no cache e não são navegação
            // Poderia retornar uma imagem padrão para requisições de imagem, etc.
            return new Response('Recurso não disponível offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Evento para quando o app for instalado
self.addEventListener('appinstalled', (event) => {
  console.log('PWA foi instalado com sucesso!');
});
