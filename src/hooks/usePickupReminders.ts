import { useEffect, useState } from 'react';
import { Reservation } from '@/lib/types';

export function usePickupReminders() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [scheduledReminders, setScheduledReminders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }

    return false;
  };

  const schedulePickupReminder = (reservation: Reservation) => {
    if (!reservation || scheduledReminders.has(reservation.id)) {
      return; // Already scheduled
    }

    const expiresAt = new Date(reservation.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

    // Calculate when to show reminder (15 min before expiry)
    const reminderTime = timeUntilExpiry - fifteenMinutes;

    if (reminderTime > 0 && reminderTime < 24 * 60 * 60 * 1000) {
      // Only schedule if reminder is in the future and within 24 hours
      const timeoutId = setTimeout(() => {
        showPickupNotification(reservation);
        setScheduledReminders((prev) => {
          const next = new Set(prev);
          next.delete(reservation.id);
          return next;
        });
      }, reminderTime);

      setScheduledReminders((prev) => new Set(prev).add(reservation.id));

      // Clean up timeout if component unmounts
      return () => {
        clearTimeout(timeoutId);
        setScheduledReminders((prev) => {
          const next = new Set(prev);
          next.delete(reservation.id);
          return next;
        });
      };
    } else if (timeUntilExpiry > 0 && timeUntilExpiry <= fifteenMinutes) {
      // If less than 15 minutes remaining, show notification immediately
      showPickupNotification(reservation);
    }
  };

  const showPickupNotification = (reservation: Reservation) => {
    if (Notification.permission !== 'granted') {
      return;
    }

    const partnerName = reservation.offer?.partner?.business_name || 'Partner';
    const offerTitle = reservation.offer?.title || 'Your reservation';

    const notification = new Notification('⏰ Pickup Reminder - SmartPick', {
      body: `Don't forget! Your reservation for "${offerTitle}" at ${partnerName} expires in 15 minutes!`,
      icon: '/icon1.png',
      badge: '/icon1.png',
      tag: `pickup-${reservation.id}`, // Prevents duplicate notifications
      requireInteraction: true, // Stays visible until user interacts
    });

    // Trigger vibration separately where supported
    // @ts-ignore - some environments support navigator.vibrate
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      // @ts-ignore
      navigator.vibrate?.([200, 100, 200]);
    }

    notification.onclick = () => {
      window.focus();
      window.location.href = `/reservation/${reservation.id}`;
      notification.close();
    };
  };

  const scheduleMultipleReminders = (reservations: Reservation[]) => {
    const activeReservations = reservations.filter(
      (r) => r.status === 'ACTIVE' && new Date(r.expires_at) > new Date()
    );

    activeReservations.forEach((reservation) => {
      schedulePickupReminder(reservation);
    });
  };

  return {
    permission,
    requestPermission,
    schedulePickupReminder,
    scheduleMultipleReminders,
    hasPermission: permission === 'granted',
  };
}
