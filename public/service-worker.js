/* eslint-disable no-restricted-globals */
/**
 * SmartPick PWA Service Worker
 * Auto-versioned at build time for guaranteed cache invalidation
 *
 * Notes:
 * - VERSION is injected during build (see vite.config.ts)
 * - HTML is network-first (always try fresh), fallback to cache/offline.
 * - Static assets are cached with stale-while-revalidate for speed.
 */

// VERSION is replaced at build time with timestamp (e.g., "20250106-143052")
const VERSION = '__BUILD_VERSION__';
const CACHE_NAME = `smartpick-v${VERSION}`;
const RUNTIME_CACHE = `smartpick-runtime-v${VERSION}`;

// Precache only essentials. Avoid listing hashed bundles explicitly here — Vite names change per build.
const PRECACHE_URLS = ['/', '/index.html', '/offline.html'];

// ---- Install: precache & take control immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: clean old caches, claim clients, and ping pages to reload if needed
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating…');
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.map((n) => {
        if (n !== CACHE_NAME && n !== RUNTIME_CACHE) {
          console.log('[SW] Deleting old cache:', n);
          return caches.delete(n);
        }
      })
    );
    await self.clients.claim();

    // Ask open pages to refresh (they can decide to ignore)
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => {
      client.postMessage({ type: 'SW_ACTIVATED', version: VERSION });
    });
  })());
});

// Utility: treat as navigation/HTML?
function isHtmlNavigation(request, url) {
  return (
    request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/' ||
    url.pathname.endsWith('/')
  );
}

// ---- Fetch: HTML = network-first; API = network-only (fallback: cache); assets = stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Only GET is cacheable
  if (request.method !== 'GET') return;

  // Avoid caching Supabase auth/REST responses to prevent stale data
  const isApi =
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/') ||
    url.pathname.startsWith('/api/');

  // ---- API: network-first; fallback to cache if offline (optional)
  if (isApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Optionally: cache successful GETs (commented out to reduce staleness)
          // if (response && response.status === 200) {
          //   const copy = response.clone();
          //   caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          // }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ---- HTML (navigation): network-first to guarantee fresh build after deploy
  if (isHtmlNavigation(request, url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match('/offline.html');
        })
    );
    return;
  }

  // ---- Static assets (JS/CSS/images): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(() => cached); // if network fails, fall back to cache

      // If we have cache, return it immediately and refresh in background
      return cached || networkFetch;
    })
  );
});

// ---- Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'SmartPick', body: event.data.text() };
  }

  const title = data.title || 'SmartPick';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'default',
    requireInteraction: !!data.requireInteraction,
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ---- Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        const urlToOpen = event.notification.data?.url || '/';
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// ---- Background sync placeholder
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reservations') {
    event.waitUntil(syncPendingReservations());
  }
});

async function syncPendingReservations() {
  console.log('[SW] Syncing pending reservations…');
  // Implement if you add offline queueing
}

// ---- Messages from pages
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => cache.addAll(event.data.payload || []))
    );
  }
});
