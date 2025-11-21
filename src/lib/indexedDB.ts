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

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
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

  async put(storeName: string, data: any): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
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

  // Cache offers
  async cacheOffers(offers: any[]): Promise<void> {
    await this.init();
    const transaction = this.db!.transaction([STORES.OFFERS], 'readwrite');
    const store = transaction.objectStore(STORES.OFFERS);

    for (const offer of offers) {
      store.put({ ...offer, cached_at: Date.now() });
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get cached offers
  async getCachedOffers(): Promise<any[]> {
    return this.getAll(STORES.OFFERS);
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
