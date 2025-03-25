// Nome do cache para armazenar arquivos
const CACHE_NAME = 'transcritor-audio-cache-v2';

// Lista de arquivos para serem cacheados inicialmente
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './service-worker.js',
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

// Instala o service worker e cria o cache
self.addEventListener('install', event => {
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
});

// Ativa o service worker e limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Se o cache não estiver na whitelist, remova-o
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepta as requisições de rede e usa o cache quando possível
self.addEventListener('fetch', event => {
  // Não intercepta requisições para APIs externas
  if (event.request.url.includes('api.openai.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone da requisição, pois ela só pode ser usada uma vez
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Verifica se recebemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone da resposta, pois ela só pode ser usada uma vez
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
      .catch(error => {
        console.error('Erro durante fetch:', error);
        // Pode retornar uma página offline aqui
      })
  );
});
