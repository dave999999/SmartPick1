/**
 * IndexedDB wrapper for offline data persistence
 */

const DB_NAME = 'SmartPickDB';
const DB_VERSION = 1;

// Store names
export const STORES = {
  OFFERS: 'offers',
  RESERVATIONS: 'reservations',
  QUEUE: 'queue',
  USER_DATA: 'userData',
} as const;

export interface QueuedRequest {
  id: string;
  type: 'reservation' | 'cancelReservation' | 'updateProfile';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface CachedData<T = any> {
  id: string;
  data: T;
  cached_at: number;
  ttl: number; // milliseconds
  version: string; // app version for invalidation
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private isClosing: boolean = false;

  async init(): Promise<void> {
    // If database exists and is open, return
    if (this.db && !this.isClosing) return;
    if (this.initPromise) return this.initPromise;

    // Reset state
    this.isClosing = false;
    this.db = null;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        this.initPromise = null;
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isClosing = false;

        // Handle database close events
        this.db.onclose = () => {
          console.warn('[IndexedDB] Database connection closed');
          this.isClosing = true;
          this.db = null;
          this.initPromise = null;
        };

        // Handle version change (another tab upgraded schema)
        this.db.onversionchange = () => {
          console.warn('[IndexedDB] Database version changed, closing connection');
          this.db?.close();
          this.isClosing = true;
          this.db = null;
          this.initPromise = null;
        };

        console.log('[IndexedDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[IndexedDB] Upgrading database schema...');

        // Offers store
        if (!db.objectStoreNames.contains(STORES.OFFERS)) {
          const offersStore = db.createObjectStore(STORES.OFFERS, { keyPath: 'id' });
          offersStore.createIndex('partner_id', 'partner_id', { unique: false });
          offersStore.createIndex('timestamp', 'cached_at', { unique: false });
        }

        // Reservations store
        if (!db.objectStoreNames.contains(STORES.RESERVATIONS)) {
          const reservationsStore = db.createObjectStore(STORES.RESERVATIONS, { keyPath: 'id' });
          reservationsStore.createIndex('user_id', 'user_id', { unique: false });
          reservationsStore.createIndex('status', 'status', { unique: false });
        }

        // Queue store for failed requests
        if (!db.objectStoreNames.contains(STORES.QUEUE)) {
          const queueStore = db.createObjectStore(STORES.QUEUE, { keyPath: 'id' });
          queueStore.createIndex('type', 'type', { unique: false });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // User data store
        if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
          db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  async put(storeName: string, data: any, retryCount = 0): Promise<void> {
    try {
      await this.init();
      
      if (!this.db || this.isClosing) {
        throw new Error('Database connection is closed');
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.put(data);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          transaction.onerror = () => reject(transaction.error);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      if (retryCount < 1 && (error instanceof Error && 
          (error.message.includes('closing') || error.message.includes('closed')))) {
        this.initPromise = null;
        return this.put(storeName, data, retryCount + 1);
      }
      throw error;
    }
  }

  async get<T>(storeName: string, key: string, retryCount = 0): Promise<T | undefined> {
    try {
      await this.init();
      
      if (!this.db || this.isClosing) {
        throw new Error('Database connection is closed');
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.get(key);

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          transaction.onerror = () => reject(transaction.error);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      if (retryCount < 1 && (error instanceof Error && 
          (error.message.includes('closing') || error.message.includes('closed')))) {
        this.initPromise = null;
        return this.get<T>(storeName, key, retryCount + 1);
      }
      throw error;
    }
  }

  async getAll<T>(storeName: string, retryCount = 0): Promise<T[]> {
    try {
      await this.init();
      
      // Check if database is still valid
      if (!this.db || this.isClosing) {
        throw new Error('Database connection is closed');
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([storeName], 'readonly');
          const store = transaction.objectStore(storeName);
          const request = store.getAll();

          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);

          // Handle transaction errors
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(new Error('Transaction aborted'));
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      // Retry once if connection was closed
      if (retryCount < 1 && (error instanceof Error && 
          (error.message.includes('closing') || error.message.includes('closed')))) {
        console.warn('[IndexedDB] Connection closed, retrying...', { storeName, retryCount });
        this.initPromise = null; // Force re-initialization
        return this.getAll<T>(storeName, retryCount + 1);
      }
      throw error;
    }
  }

  async delete(storeName: string, key: string, retryCount = 0): Promise<void> {
    try {
      await this.init();
      
      if (!this.db || this.isClosing) {
        throw new Error('Database connection is closed');
      }

      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          transaction.onerror = () => reject(transaction.error);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      if (retryCount < 1 && (error instanceof Error && 
          (error.message.includes('closing') || error.message.includes('closed')))) {
        this.initPromise = null;
        return this.delete(storeName, key, retryCount + 1);
      }
      throw error;
    }
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex<T>(storeName: string, indexName: string, query: IDBValidKey): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(query);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache offers with TTL and versioning
  async cacheOffers(offers: any[], ttl: number = 5 * 60 * 1000): Promise<void> {
    await this.init();
    const transaction = this.db!.transaction([STORES.OFFERS], 'readwrite');
    const store = transaction.objectStore(STORES.OFFERS);
    const version = (import.meta.env.VITE_APP_VERSION as string) || '1.0.0';

    // Create cached data wrapper
    const cachedData: CachedData = {
      id: 'offers',
      data: offers,
      cached_at: Date.now(),
      ttl,
      version
    };

    store.put(cachedData);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`[IndexedDB] Cached ${offers.length} offers (TTL: ${ttl}ms, Version: ${version})`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get cached offers with TTL and version validation
  async getCachedOffers(): Promise<any[] | null> {
    try {
      const cached = await this.get<CachedData>(STORES.OFFERS, 'offers');
      
      if (!cached) {
        console.log('[IndexedDB] No cached offers found');
        return null;
      }
      
      // Check version
      const currentVersion = (import.meta.env.VITE_APP_VERSION as string) || '1.0.0';
      if (cached.version !== currentVersion) {
        console.log(`[IndexedDB] Cache version mismatch (cached: ${cached.version}, current: ${currentVersion}), invalidating`);
        await this.delete(STORES.OFFERS, 'offers');
        return null;
      }
      
      // Check TTL
      const age = Date.now() - cached.cached_at;
      if (age > cached.ttl) {
        console.log(`[IndexedDB] Cache expired (age: ${Math.round(age/1000)}s, TTL: ${Math.round(cached.ttl/1000)}s)`);
        await this.delete(STORES.OFFERS, 'offers');
        return null;
      }
      
      console.log(`[IndexedDB] Cache hit! Age: ${Math.round(age/1000)}s, ${cached.data.length} offers`);
      return cached.data;
    } catch (error) {
      console.error('[IndexedDB] Error reading cached offers:', error);
      return null;
    }
  }

  // Queue a failed request
  async queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${request.type}_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    };
    await this.put(STORES.QUEUE, queuedRequest);
  }

  // Get queued requests
  async getQueuedRequests(): Promise<QueuedRequest[]> {
    return this.getAll<QueuedRequest>(STORES.QUEUE);
  }

  // Update retry count
  async updateRetryCount(id: string, retries: number): Promise<void> {
    const request = await this.get<QueuedRequest>(STORES.QUEUE, id);
    if (request) {
      request.retries = retries;
      await this.put(STORES.QUEUE, request);
    }
  }

  // Remove from queue
  async dequeue(id: string): Promise<void> {
    await this.delete(STORES.QUEUE, id);
  }

  // Clear old cached data
  async clearOldCache(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    await this.init();
    const offers = await this.getAll<any>(STORES.OFFERS);
    const now = Date.now();

    const transaction = this.db!.transaction([STORES.OFFERS], 'readwrite');
    const store = transaction.objectStore(STORES.OFFERS);

    for (const offer of offers) {
      if (offer.cached_at && (now - offer.cached_at) > maxAge) {
        store.delete(offer.id);
      }
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const indexedDBManager = new IndexedDBManager();
