/**
 * Request Queue Manager for offline operations
 * Handles queuing, retry logic, and background sync
 */

import { indexedDBManager, QueuedRequest, STORES } from './indexedDB';
import { createReservation, cancelReservation } from './api';
import { toast } from 'sonner';
import { logger } from './logger';

class RequestQueueManager {
  private processing = false;

  /**
   * Queue a reservation for later processing
   */
  async queueReservation(data: {
    offerId: string;
    quantity: number;
    userId: string;
    offerDetails?: any;
  }): Promise<string> {
    const requestId = `reservation_${Date.now()}_${Math.random()}`;
    
    await indexedDBManager.queueRequest({
      type: 'reservation',
      data,
      maxRetries: 3,
    });

    logger.info('[Queue] Reservation queued for sync', { requestId, data });
    toast.info('📝 Reservation queued. Will sync when back online.', {
      duration: 5000,
    });

    // Try to register background sync
    this.registerBackgroundSync();

    return requestId;
  }

  /**
   * Queue a cancellation for later processing
   */
  async queueCancellation(reservationId: string): Promise<void> {
    await indexedDBManager.queueRequest({
      type: 'cancelReservation',
      data: { reservationId },
      maxRetries: 3,
    });

    logger.info('[Queue] Cancellation queued', { reservationId });
    toast.info('📝 Cancellation queued. Will sync when back online.');

    this.registerBackgroundSync();
  }

  /**
   * Process all queued requests
   */
  async processQueue(): Promise<void> {
    if (this.processing) {
      logger.info('[Queue] Already processing, skipping...');
      return;
    }

    if (!navigator.onLine) {
      logger.info('[Queue] Still offline, skipping queue processing');
      return;
    }

    this.processing = true;
    logger.info('[Queue] Starting queue processing...');

    try {
      const queuedRequests = await indexedDBManager.getQueuedRequests();
      
      if (queuedRequests.length === 0) {
        logger.info('[Queue] No requests in queue');
        return;
      }

      logger.info('[Queue] Processing', { count: queuedRequests.length });
      toast.info(`🔄 Syncing ${queuedRequests.length} queued request(s)...`);

      const results = await Promise.allSettled(
        queuedRequests.map(req => this.processRequest(req))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (successful > 0) {
        toast.success(`✅ ${successful} request(s) synced successfully!`);
      }
      if (failed > 0) {
        toast.error(`❌ ${failed} request(s) failed to sync`);
      }

      logger.info('[Queue] Processing complete', { successful, failed });
    } catch (error) {
      logger.error('[Queue] Error processing queue', error);
      toast.error('Failed to process queued requests');
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single queued request
   */
  private async processRequest(request: QueuedRequest): Promise<void> {
    logger.info('[Queue] Processing request', { id: request.id, type: request.type });

    try {
      switch (request.type) {
        case 'reservation':
          await this.processReservation(request);
          break;
        case 'cancelReservation':
          await this.processCancellation(request);
          break;
        default:
          logger.warn('[Queue] Unknown request type', { type: request.type });
      }

      // Remove from queue on success
      await indexedDBManager.dequeue(request.id);
      logger.info('[Queue] Request processed successfully', { id: request.id });
    } catch (error) {
      logger.error('[Queue] Failed to process request', { id: request.id, error });

      // Increment retry count
      const newRetries = request.retries + 1;
      
      if (newRetries >= request.maxRetries) {
        // Max retries reached, remove from queue
        await indexedDBManager.dequeue(request.id);
        logger.warn('[Queue] Max retries reached, removing from queue', { id: request.id });
        
        toast.error(`Failed to sync ${request.type} after ${request.maxRetries} attempts`, {
          description: 'Please try again manually',
        });
      } else {
        // Update retry count
        await indexedDBManager.updateRetryCount(request.id, newRetries);
        logger.info('[Queue] Retry scheduled', { id: request.id, retries: newRetries });
      }

      throw error;
    }
  }

  /**
   * Process a queued reservation
   */
  private async processReservation(request: QueuedRequest): Promise<void> {
    const { offerId, quantity, userId } = request.data;

    try {
      const result = await createReservation(offerId, userId, quantity);
      logger.info('[Queue] Reservation created', { reservationId: result.id });
      
      // Notify success
      toast.success('🎉 Your queued reservation was created!', {
        description: `Reservation #${result.id.slice(0, 8)}`,
      });

      // Trigger a page refresh or state update
      window.dispatchEvent(new CustomEvent('reservation-synced', { detail: result }));
    } catch (error) {
      logger.error('[Queue] Failed to create reservation', error);
      throw error;
    }
  }

  /**
   * Process a queued cancellation
   */
  private async processCancellation(request: QueuedRequest): Promise<void> {
    const { reservationId } = request.data;

    try {
      await cancelReservation(reservationId);
      logger.info('[Queue] Reservation cancelled', { reservationId });
      
      toast.success('✅ Your queued cancellation was processed');

      // Trigger state update
      window.dispatchEvent(new CustomEvent('cancellation-synced', { detail: { reservationId } }));
    } catch (error) {
      logger.error('[Queue] Failed to cancel reservation', error);
      throw error;
    }
  }

  /**
   * Register background sync (if supported)
   */
  private registerBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration: any) => {
        return registration.sync.register('sync-reservations');
      }).then(() => {
        logger.info('[Queue] Background sync registered');
      }).catch((error) => {
        logger.warn('[Queue] Background sync not supported', error);
      });
    }
  }

  /**
   * Get queue status
   */
  async getQueueStatus(): Promise<{
    count: number;
    requests: QueuedRequest[];
  }> {
    const requests = await indexedDBManager.getQueuedRequests();
    return {
      count: requests.length,
      requests,
    };
  }

  /**
   * Clear all queued requests (admin action)
   */
  async clearQueue(): Promise<void> {
    await indexedDBManager.clear(STORES.QUEUE);
    logger.info('[Queue] Queue cleared');
    toast.info('Queue cleared');
  }
}

export const requestQueue = new RequestQueueManager();

// Auto-process queue when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    logger.info('[Queue] Back online, processing queue...');
    requestQueue.processQueue();
  });

  // Listen for service worker sync events
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data.type === 'SYNC_QUEUE') {
      requestQueue.processQueue();
    }
  });
}
