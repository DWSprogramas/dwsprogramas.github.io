// Nome do cache para armazenar arquivos
const CACHE_NAME = 'mapzyvox-cache-v2'; // Incrementar versão para forçar uma atualização
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
  './android/android-launchericon-48-48.png',
  './android/android-launchericon-72-72.png',
  './android/android-launchericon-96-96.png',
  './android/android-launchericon-144-144.png',
  './android/android-launchericon-192-192.png',
  './android/android-launchericon-512-512.png',
  './ios/152.png',
  './ios/180.png',
  './ios/256.png',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Instalar o service worker e criar o cache
self.addEventListener('install', event => {
  console.log('Service Worker instalando...');
  
  // Skip waiting força a ativação imediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        // Tentativa de cache com tratamento de erro por item
        const cachePromises = urlsToCache.map(url => {
          return cache.add(url).catch(error => {
            console.warn(`Falha ao cachear ${url}:`, error);
          });
        });
        
        return Promise.all(cachePromises);
      })
      .catch(error => {
        console.error('Erro durante o cache inicial:', error);
      })
  );
});

// Ativar o service worker e limpar caches antigos
self.addEventListener('activate', event => {
  console.log('Service Worker ativando...');
  
  // Tomar controle de clientes não controlados (páginas abertas)
  event.waitUntil(self.clients.claim());
  
  // Limpar caches antigos
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker ativado!');
    })
  );
});

// Interceptar as requisições de rede
self.addEventListener('fetch', event => {
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

  // URL da requisição para comparações
  const requestUrl = new URL(event.request.url);
  
  // Estratégia para arquivos HTML e JavaScript: Network First
  if (requestUrl.pathname.endsWith('.html') || 
      requestUrl.pathname.endsWith('.js') || 
      requestUrl.pathname === '/' ||
      requestUrl.pathname === '') {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone da resposta para cachear
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            })
            .catch(error => {
              console.warn('Erro ao atualizar cache:', error);
            });
            
          return response;
        })
        .catch(() => {
          // Se falhar, tenta buscar do cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // Se o tipo de requisição for 'navigate', mostrar página offline
              if (event.request.mode === 'navigate') {
                return caches.match(OFFLINE_URL);
              }
              
              // Para outros recursos não encontrados no cache
              return new Response('Recurso não disponível offline', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            });
        })
    );
  } 
  // Estratégia para recursos estáticos: Cache First
  else {
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          // Retorna do cache se disponível
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Se não estiver no cache, busca na rede
          return fetch(event.request)
            .then(response => {
              // Clone da resposta para cachear
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                })
                .catch(error => {
                  console.warn('Erro ao atualizar cache:', error);
                });
                
              return response;
            })
            .catch(error => {
              console.error('Erro ao buscar recurso:', error);
              
              // Retornar uma resposta vazia para recursos não críticos
              return new Response(null, {
                status: 404,
                statusText: 'Not Found'
              });
            });
        })
    );
  }
});

// Evento para quando o app for instalado
self.addEventListener('appinstalled', (event) => {
  console.log('PWA foi instalado com sucesso!');
});

// Evento para sincronização em segundo plano
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transcriptions') {
    console.log('Sincronizando transcrições pendentes...');
    // Aqui implementaremos a sincronização das transcrições salvas offline
    event.waitUntil(syncTranscriptions());
  }
});

// Função para sincronizar transcrições
async function syncTranscriptions() {
  // Esta função seria implementada para enviar transcrições salvas localmente para o Firebase
  // quando a conexão fosse restabelecida
  try {
    // Aqui buscaríamos as transcrições pendentes do IndexedDB ou localStorage
    // e as enviaríamos para o Firebase
    
    // Para implementação futura
    return Promise.resolve();
  } catch (error) {
    console.error('Erro ao sincronizar transcrições:', error);
    return Promise.reject(error);
  }
}

// Evento para notificações push
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nova atualização disponível',
      icon: './android/android-launchericon-144-144.png',
      badge: './android/android-launchericon-48-48.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || './'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Mapzy Vox IA', options)
    );
  }
});

// Ação ao clicar na notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Verificar se há atualização do service worker periodicamente
setInterval(() => {
  self.registration.update()
    .then(() => console.log('Service Worker: verificação de atualização concluída'))
    .catch(err => console.error('Erro ao verificar atualizações do Service Worker:', err));
}, 6 * 60 * 60 * 1000); // A cada 6 horas
