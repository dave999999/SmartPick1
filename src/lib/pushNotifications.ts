import { logger } from '@/lib/logger';
/**
 * Push Notifications Helper - 100% Firebase
 * Sends push notifications via Firebase Cloud Functions (not Supabase)
 */

const FUNCTIONS_URL = 'https://europe-west1-smartpick-app.cloudfunctions.net';

export interface PushNotificationData {
  userId: string;
  title: string;
  body: string;
  notificationData?: {
    type?: 'reservation_confirmed' | 'reservation_expiring' | 'new_offer' | 'partner_alert';
    reservationId?: string;
    offerId?: string;
    partnerId?: string;
    [key: string]: any;
  };
}

/**
 * Send push notification to a user via Firebase Cloud Function
 */
export async function sendPushNotification(
  notification: PushNotificationData
): Promise<boolean> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/sendPushNotification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification)
    });

    const result = await response.json();
    logger.debug('Push notification sent:', result);
    return result?.success || false;
  } catch (error) {
    logger.error('Failed to send push notification:', error);
    return false;
  }
}

/**
 * Notify customer about confirmed reservation
 */
export async function notifyReservationConfirmed(
  userId: string,
  offerTitle: string,
  partnerName: string,
  pickupBy: string
): Promise<void> {
  try {
    await fetch(`${FUNCTIONS_URL}/notifyReservationConfirmed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, offerTitle, partnerName, pickupBy })
    });
  } catch (error) {
    logger.error('Failed to notify reservation confirmed:', error);
  }
}

/**
 * Notify customer about expiring reservation
 */
export async function notifyReservationExpiring(
  userId: string,
  offerTitle: string,
  minutesLeft: number
): Promise<void> {
  try {
    await fetch(`${FUNCTIONS_URL}/notifyReservationExpiring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, offerTitle, minutesLeft })
    });
  } catch (error) {
    logger.error('Failed to notify reservation expiring:', error);
  }
}

/**
 * Notify partner about new reservation
 */
export async function notifyPartnerNewReservation(
  partnerId: string,
  customerName: string,
  offerTitle: string,
  quantity: number
): Promise<void> {
  try {
    await fetch(`${FUNCTIONS_URL}/notifyPartnerNewReservation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId, customerName, offerTitle, quantity })
    });
  } catch (error) {
    logger.error('Failed to notify partner:', error);
  }
}

/**
 * Notify partner about reservation cancellation
 */
export async function notifyPartnerReservationCancelled(
  partnerId: string,
  customerName: string,
  offerTitle: string,
  quantity: number
): Promise<void> {
  try {
    await sendPushNotification({
      userId: partnerId,
      title: '❌ Reservation Cancelled',
      body: `${customerName} cancelled ${quantity}x ${offerTitle}`,
      notificationData: {
        type: 'partner_alert',
        partnerId,
        offerTitle
      }
    });
  } catch (error) {
    logger.error('Failed to notify partner about cancellation:', error);
  }
}

/**
 * Notify users about new offers nearby
 */
export async function notifyNewOffersNearby(
  userId: string,
  offerTitle: string,
  partnerName: string,
  distance: number
): Promise<void> {
  try {
    await fetch(`${FUNCTIONS_URL}/notifyNewOffersNearby`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, offerTitle, partnerName, distance })
    });
  } catch (error) {
    logger.error('Failed to notify new offers nearby:', error);
  }
}

/**
 * Notify user about new offer from favorite partner
 */
export async function notifyFavoritePartner(
  userId: string,
  partnerName: string,
  offerTitle: string
): Promise<void> {
  try {
    await fetch(`${FUNCTIONS_URL}/notifyFavoritePartner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, partnerName, offerTitle })
    });
  } catch (error) {
    logger.error('Failed to notify favorite partner:', error);
  }
}

/**
 * Notify user about achievement unlock
 */
export async function notifyAchievement(
  userId: string,
  achievementName: string,
  rewardPoints: number
): Promise<void> {
  try {
    await fetch(`${FUNCTIONS_URL}/notifyAchievement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, achievementName, rewardPoints })
    });
  } catch (error) {
    logger.error('Failed to notify achievement:', error);
  }
}

/**
 * Notify user about referral reward
 */
export async function notifyReferralReward(
  userId: string,
  friendName: string,
  rewardPoints: number
): Promise<void> {
  try {
    await fetch(`${FUNCTIONS_URL}/notifyReferralReward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, friendName, rewardPoints })
    });
  } catch (error) {
    logger.error('Failed to notify referral reward:', error);
  }
}
