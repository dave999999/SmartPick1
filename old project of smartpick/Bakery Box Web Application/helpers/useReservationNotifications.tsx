import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { type PartnerReservation } from '../endpoints/reservations/partner_GET.schema';
import { useTranslation } from './useTranslation';

/**
 * Custom hook to handle notifications for new reservations.
 * Detects new reservations, plays sound, shows browser notifications, and toast alerts.
 */
export const useReservationNotifications = (
  reservations: PartnerReservation[] | undefined,
  enabled: boolean = true
) => {
  const { t } = useTranslation();
  const previousReservationIdsRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef(true);
  const notificationPermissionRequestedRef = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (notificationPermissionRequestedRef.current) return;
    
    if ('Notification' in window && Notification.permission === 'default') {
      notificationPermissionRequestedRef.current = true;
      Notification.requestPermission().then((permission) => {
        console.log('Notification permission:', permission);
      }).catch((error) => {
        console.error('Error requesting notification permission:', error);
      });
    }
  }, []);

  // Play notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      // Create a simple beep sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      console.log('Notification sound played');
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Show browser notification
  const showBrowserNotification = (reservation: PartnerReservation) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notificationBody = t('notifications.newReservationFrom')
          .replace('{product}', reservation.productTitle)
          .replace('{customer}', reservation.userDisplayName);
        
        const notification = new Notification(t('notifications.newReservation'), {
          body: notificationBody,
          icon: '/icon-192x192.png', // Use app icon
          badge: '/icon-192x192.png',
          tag: `reservation-${reservation.reservationId}`, // Prevent duplicate notifications
          requireInteraction: false,
          silent: false,
        });

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);

        console.log('Browser notification shown for reservation:', reservation.reservationId);
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    } else if ('Notification' in window && Notification.permission === 'denied') {
      console.log('Browser notifications are blocked by user');
    }
  };

  // Detect new reservations and trigger notifications
  useEffect(() => {
    if (!reservations || !enabled) return;

    const currentReservationIds = new Set(reservations.map(r => r.reservationId));

    // Skip notifications on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      previousReservationIdsRef.current = currentReservationIds;
      return;
    }

    // Find new reservations (IDs that weren't in the previous set)
    const newReservations = reservations.filter(
      r => !previousReservationIdsRef.current.has(r.reservationId)
    );

    if (newReservations.length > 0) {
      console.log('New reservations detected:', newReservations.length);

      // Play sound once for all new reservations
      playNotificationSound();

      // Show notifications for each new reservation
      newReservations.forEach((reservation) => {
        const toastDescription = t('notifications.newReservationFrom')
          .replace('{product}', reservation.productTitle)
          .replace('{customer}', reservation.userDisplayName);
        
        // Toast notification
        toast.success(t('notifications.newReservation'), {
          description: toastDescription,
          icon: <Bell size={20} />,
          duration: 5000,
        });

        // Browser notification
        showBrowserNotification(reservation);
      });
    }

    // Update the previous IDs ref
    previousReservationIdsRef.current = currentReservationIds;
  }, [reservations, t]);
};