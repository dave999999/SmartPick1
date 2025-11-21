// Service Worker for offline caching and request queuing

// Increment when asset strategy changes
const CACHE_VERSION = 'v2';
const CACHE_NAME = `smartpick-${CACHE_VERSION}`;
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE = `${CACHE_NAME}-images`;

// Assets to cache immediately on install
// Static core files (add hashed bundles dynamically on install)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(STATIC_CACHE);
      console.log('[SW] Caching static assets');
      await cache.addAll(STATIC_ASSETS);
      // Attempt to pre-cache JS bundles if present (best-effort)
      const manifestResp = await fetch('/index.html');
      const html = await manifestResp.text();
      const bundleMatches = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
      for (const asset of bundleMatches) {
        try {
          await cache.add(asset);
        } catch (e) {
          console.warn('[SW] Skipped bundle precache', asset, e);
        }
      }
    } catch (err) {
      console.error('[SW] Failed during install caching:', err);
    } finally {
      await self.skipWaiting();
    }
  })());
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('smartpick-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - cache strategy based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Supabase API requests (handle separately)
  if (url.origin.includes('supabase.co')) {
    return;
  }

  // Skip map tile requests - let them load directly
  if (url.hostname.includes('basemaps.cartocdn.com') || 
      url.hostname.includes('tile.openstreetmap.org')) {
    return;
  }

  // Skip chrome-extension and browser-specific URLs
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  // Images: Cache-first strategy
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          return caches.open(IMAGE_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        }).catch(() => {
          // Return placeholder image on failure
          return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#ddd" width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" fill="#999">Image unavailable</text></svg>', {
            headers: { 'Content-Type': 'image/svg+xml' }
          });
        });
      })
    );
    return;
  }

  // Static assets and app shell: Stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => undefined);
      if (cached) {
        // Kick off update in background
        fetchPromise.catch(() => {});
        return cached;
      }
      const network = await fetchPromise;
      if (network) return network;
      if (request.mode === 'navigate') {
        return (await cache.match('/offline.html')) || (await caches.match('/')) || new Response('Offline', { status: 503 });
      }
      return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
    })());
  }
});

// Message event - handle commands from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_OFFERS') {
    // Cache offers data for offline access
    const { offers } = event.data;
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.put('/api/offers', new Response(JSON.stringify(offers), {
        headers: { 'Content-Type': 'application/json' }
      }));
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('smartpick-'))
            .map((name) => caches.delete(name))
        );
      }).then(() => {
        event.ports[0]?.postMessage({ success: true });
      })
    );
  }
});

// Background sync for queued requests (when supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reservations') {
    event.waitUntil(syncQueuedReservations());
  }
});

async function syncQueuedReservations() {
  console.log('[SW] Syncing queued reservations...');
  // Implementation will be handled by the queue manager
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_QUEUE' });
  });
}

// Push notification event - display notification
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push event with no data');
    return;
  }

  try {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icon-192x192.png',
      badge: data.badge || '/badge-72x72.png',
      tag: data.tag,
      data: data.data,
      actions: data.actions || [
        { action: 'view', title: 'View Offer' },
        { action: 'close', title: 'Dismiss' }
      ],
      vibrate: [200, 100, 200],
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[SW] Error handling push event:', error);
  }
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Default action or 'view' action - open the offer
  if (event.action === 'view' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if no matching window found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
