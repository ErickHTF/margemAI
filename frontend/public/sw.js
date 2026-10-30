/**
 * Service Worker — Margem.AI
 *
 * Estratégia de Segurança PWA:
 * 1. App Shell Offline: Permite instalação na tela inicial e acesso à casca estática (HTML/JS/CSS).
 * 2. Isolamento Estrito de Dados Financeiros:
 *    - Requisições para /v1/* (dados do MEI, vendas, custos, precificação) NUNCA são cacheadas em disco (NetworkOnly).
 *    - Requisições contendo cabeçalho Authorization NUNCA são salvas em Cache Storage.
 *    - Requisições com métodos diferentes de GET NUNCA são interceptadas para cache.
 */

// Os bundles versionados do Vite são injetados no build (swPrecache.js); sem eles o app abre em branco offline.
const BUILD_ID = 'dev';
const BUILD_ASSETS = [];

const CACHE_NAME = `margemai-app-shell-${BUILD_ID}`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  ...BUILD_ASSETS
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isSensitiveOrMutating(request, url) {
  if (request.method !== 'GET') {
    return true;
  }

  if (request.headers && request.headers.has('authorization')) {
    return true;
  }

  if (url.origin !== self.location.origin) {
    return true;
  }

  const pathname = url.pathname;
  if (
    pathname === '/v1' ||
    pathname.startsWith('/v1/') ||
    pathname === '/actuator' ||
    pathname.startsWith('/actuator/')
  ) {
    return true;
  }

  return false;
}

function cacheResponse(request, response) {
  if (!response || response.status !== 200) {
    return undefined;
  }
  const responseClone = response.clone();
  return caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Proteção de dados financeiros do MEI e infraestrutura: sempre NetworkOnly
  if (isSensitiveOrMutating(request, url)) {
    return;
  }

  // waitUntil mantém o worker vivo até a gravação no cache terminar, mesmo após respondWith resolver.
  const networkResponse = fetch(request);
  event.waitUntil(
    networkResponse.then((response) => cacheResponse(request, response)).catch(() => undefined)
  );

  // 1. Navegação de páginas HTML (App Shell) -> NetworkFirst com fallback para cache/index.html
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      networkResponse.catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // 2. Assets estáticos (JS, CSS, SVGs, fontes) -> StaleWhileRevalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || networkResponse)
  );
});
