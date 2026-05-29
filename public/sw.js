/**
 * Guepardo Estabelecimento — Service Worker
 * Estratégia: NetworkFirst para dados dinâmicos, CacheFirst para assets estáticos.
 * Versão: 1.0.0
 */

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `guepardo-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `guepardo-dynamic-${CACHE_VERSION}`;

// Assets que serão pré-cacheados na instalação
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/cheetah-scooter.png',
  '/cheetah-icon.png',
  '/guepardo-logo-full.png',
  '/manifest.json',
  '/sounds/rugido-guepardo.mp3',
];

// ─── INSTALL: pré-cachear assets estáticos ─────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Guepardo PWA Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets...');
      // Use addAll com fallback individual para não falhar em assets opcionais
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) =>
            console.warn(`[SW] Could not cache ${url}:`, err)
          )
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: limpar caches antigos ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new Service Worker...');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── MESSAGE: suporte a SKIP_WAITING ─────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


// ─── FETCH: estratégias de cache ─────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests não-GET, chrome-extension e outras origens problemáticas
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // 1. Supabase API → NetworkFirst (dados em tempo real, não podem ser stale)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, 10000));
    return;
  }

  // 2. Mapbox API → NetworkFirst com cache de 1h
  if (url.hostname.includes('mapbox.com') || url.hostname.includes('osrm.org')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, 8000));
    return;
  }

  // 3. Google Fonts CSS → StaleWhileRevalidate
  if (url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
    return;
  }

  // 4. Google Fonts arquivos → CacheFirst (imutáveis)
  if (url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  // 5. Assets estáticos locais
  if (url.origin === self.location.origin) {
    // Documentos/Navegação (index.html, /) -> NetworkFirst para evitar cache trap
    if (
      request.mode === 'navigate' ||
      request.destination === 'document' ||
      url.pathname === '/' ||
      url.pathname.endsWith('.html')
    ) {
      event.respondWith(networkFirst(request, DYNAMIC_CACHE, 5000));
      return;
    }

    // Demais assets estáticos locais (JS, CSS, imagens, etc.) -> CacheFirst
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 6. Outros → NetworkFirst com fallback
  event.respondWith(networkFirst(request, DYNAMIC_CACHE, 5000));
});

// ─── ESTRATÉGIAS ─────────────────────────────────────────────────────────

/** NetworkFirst: tenta rede, usa cache se falhar */
async function networkFirst(request, cacheName, timeoutMs = 5000) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout')), timeoutMs)
      ),
    ]);

    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] Network failed, falling back to cache:', request.url);
    const cached = await cache.match(request);
    if (cached) return cached;

    // Para navegação (HTML), retorna o index.html em cache
    if (request.destination === 'document') {
      const indexCache = await caches.match('/index.html');
      if (indexCache) return indexCache;
    }

    return new Response('Sem conexão. Por favor, verifique sua internet.', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/** CacheFirst: usa cache, atualiza em background */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    console.warn('[SW] CacheFirst failed for:', request.url);
    return new Response('Asset não disponível offline.', { status: 503 });
  }
}

/** StaleWhileRevalidate: retorna cache imediatamente, atualiza em background */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cached);

  return cached || fetchPromise;
}
