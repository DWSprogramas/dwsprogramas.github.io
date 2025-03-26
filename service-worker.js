// This is the "Offline page" service worker for Mapzy Vox IA

importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "mapzyvox-offline-page";
const BASE_PATH = "/mapzy-ia";
const offlineFallbackPage = `${BASE_PATH}/offline.html`;
// Página de fallback quando offline
const offlineFallbackPage = `${BASE_PATH}/offline.html`;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', async (event) => {
  console.log('[Service Worker] Instalando...');
  
  // Força a ativação imediata
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => {
        console.log('[Service Worker] Adicionando página offline ao cache');
        return cache.add(offlineFallbackPage);
      })
      .catch(error => {
        console.error('[Service Worker] Erro ao adicionar página offline ao cache:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  
  // Tomar controle de clientes não controlados (páginas abertas)
  event.waitUntil(self.clients.claim());
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

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
  
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Tentar usar a resposta pré-carregada, se disponível
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          return preloadResp;
        }

        // Se não houver pré-carregamento, tentar rede
        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        // Se falhar, usar o cache
        console.log('[Service Worker] Falha na rede, servindo página offline');
        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp;
      }
    })());
  }
});

// Evento para quando o PWA for instalado
self.addEventListener('appinstalled', (event) => {
  console.log('[Service Worker] App instalado');
});

// Certificar-se de que o sw.js seja encontrado pelo PWABuilder
self.addEventListener('fetch', (event) => {
  if (event.request.url.endsWith('sw.js') || 
      event.request.url.endsWith('service-worker.js') || 
      event.request.url.endsWith('pwabuilder-sw.js')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response('// Service Worker OK'))
    );
  }
});
