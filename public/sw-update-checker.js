// Simple Update Check Service Worker
// Checks for updates on every visit without aggressive caching

const CACHE_NAME = 'smartpick-update-check-v1';
const UPDATE_CHECK_INTERVAL = 30000; // 30 seconds

// Install event - minimal setup
self.addEventListener('install', (event) => {
  console.log('[SW] Installing update checker...');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating update checker...');
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

// Fetch event - always fetch from network, check for updates
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // For HTML files, always fetch from network and check version
  if (event.request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone response to check for version changes
          const responseClone = response.clone();
          
          // Check if version has changed
          checkForUpdates(responseClone);
          
          return response;
        })
        .catch(() => {
          // If offline, try to serve from cache as fallback
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other resources, use network-first strategy with short cache
  // ONLY cache GET requests (POST/PUT/DELETE cannot be cached)
  if (event.request.method !== 'GET') {
    return; // Let browser handle non-GET requests normally
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache successful responses
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

// Check for updates by comparing version metadata
async function checkForUpdates(response) {
  try {
    const html = await response.text();
    
    // Extract version from meta tag
    const versionMatch = html.match(/<meta name="app-version" content="([^"]+)"/);
    if (!versionMatch) return;
    
    const newVersion = versionMatch[1];
    const storedVersion = await getStoredVersion();
    
    if (storedVersion && storedVersion !== newVersion) {
      console.log('[SW] New version detected:', newVersion);
      
      // Notify all clients about the update
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({
          type: 'NEW_VERSION_AVAILABLE',
          version: newVersion
        });
      });
      
      // Store new version
      await storeVersion(newVersion);
    } else if (!storedVersion) {
      // First time, just store the version
      await storeVersion(newVersion);
    }
  } catch (error) {
    console.error('[SW] Error checking for updates:', error);
  }
}

// Store version in IndexedDB
async function storeVersion(version) {
  try {
    const db = await openDB();
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    await store.put({ key: 'version', value: version });
  } catch (error) {
    console.error('[SW] Error storing version:', error);
  }
}

// Get stored version from IndexedDB
async function getStoredVersion() {
  try {
    const db = await openDB();
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const result = await store.get('version');
    return result?.value;
  } catch (error) {
    console.error('[SW] Error getting version:', error);
    return null;
  }
}

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('smartpick-sw', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CHECK_UPDATE') {
    // Force a check for updates
    fetch('/', { cache: 'no-cache' })
      .then(response => checkForUpdates(response.clone()));
  }
});
