const CACHE_NAME = 'electric-state-v2';

// Only cache non-HTML static assets — never cache HTML/navigation
// so deploys take effect immediately without requiring a SW version bump.
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/hero-bg.jpg',
];

// Install: precache only static non-HTML assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API/auth, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Supabase, API routes, and auth — always network
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) {
    return;
  }

  // Navigation requests (HTML pages) — always network-first, never cache
  // This ensures new deployments take effect immediately.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') || fetch('/'))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          // Only cache same-origin assets
          // Clone must happen synchronously before returning the response,
          // otherwise the body is already consumed when the async cache.put runs.
          if (response.ok && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
