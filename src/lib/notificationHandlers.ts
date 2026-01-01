import { logger } from '@/lib/logger';
/**
 * Notification Action Handlers
 * Routes users to appropriate screens/modals when they tap notifications
 */

export type NotificationType = 
  | 'expiringSoon'
  | 'reservationExpired'
  | 'reservationCancelled'
  | 'newOffersNearby'
  | 'favoritePartners'
  | 'achievements'
  | 'referralRewards'
  | 'partner_alert'
  | 'partner_new_reservation'
  | 'partner_cancellation'
  | 'partner_low_stock';

export interface NotificationData {
  type: NotificationType;
  action?: string; // 'new_reservation' | 'cancelled' | 'low_stock'
  [key: string]: any;
}

export interface NotificationHandler {
  onExpiringSoon: () => void;
  onReservationExpired: () => void;
  onReservationCancelled: () => void;
  onNewOffersNearby: (offerIds?: string[]) => void;
  onFavoritePartners: (partnerId?: string) => void;
  onAchievements: () => void;
  onReferralRewards: (referralCode?: string) => void;
  onPartnerNewReservation?: () => void;
  onPartnerCancellation?: () => void;
  onPartnerLowStock?: () => void;
}

/**
 * Handle notification tap based on type
 */
export function handleNotificationTap(
  notificationData: NotificationData,
  handlers: NotificationHandler
): void {
  const { type, action } = notificationData;

  // Handle partner notifications
  if (type === 'partner_alert') {
    if (action === 'cancelled' && handlers.onPartnerCancellation) {
      handlers.onPartnerCancellation();
      return;
    } else if (handlers.onPartnerNewReservation) {
      handlers.onPartnerNewReservation();
      return;
    }
  }

  if (type === 'partner_low_stock' && handlers.onPartnerLowStock) {
    handlers.onPartnerLowStock();
    return;
  }

  // Handle customer notifications
  switch (type) {
    case 'expiringSoon':
      // Opens app, shows QR code if active reservation exists
      handlers.onExpiringSoon();
      break;

    case 'reservationExpired':
      // Shows missed pickup modal
      handlers.onReservationExpired();
      break;

    case 'reservationCancelled':
      // Just opens app (no special action)
      handlers.onReservationCancelled();
      break;

    case 'newOffersNearby':
      // Opens nearby offers sheet
      handlers.onNewOffersNearby(notificationData.offerIds);
      break;

    case 'favoritePartners':
      // Shows partner's offers (like clicking partner pin on map)
      handlers.onFavoritePartners(notificationData.partnerId);
      break;

    case 'achievements':
      // Opens achievements tab in profile
      handlers.onAchievements();
      break;

    case 'referralRewards':
      // Shows referral success modal
      handlers.onReferralRewards(notificationData.referralCode);
      break;

    default:
      logger.warn('Unknown notification type:', type);
  }
}
