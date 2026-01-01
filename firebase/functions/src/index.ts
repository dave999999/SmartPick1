/**
 * Firebase Cloud Functions for Push Notifications
 * 100% Firebase - no Supabase dependency
 * Region: europe-west1 (Belgium) - closest to Georgia
 * Auth: No Firebase Auth required - open HTTPS endpoints
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Use European region for lower latency to Georgia
const region = 'europe-west1';

/**
 * Save/update a user's FCM token
 * Open HTTPS endpoint (no Firebase Auth)
 * Purpose: Avoid Firestore Web SDK streaming issues in Capacitor (CapacitorHttp interceptor).
 */
export const saveFcmToken = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, token, platform, notificationTypes } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Missing required field: userId' });
    return;
  }

  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'Missing required field: token' });
    return;
  }

  try {
    await db
      .collection('fcm_tokens')
      .doc(userId)
      .set(
        {
          userId,
          token,
          platform: typeof platform === 'string' ? platform : 'unknown',
          notificationTypes: typeof notificationTypes === 'object' && notificationTypes ? notificationTypes : undefined,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ error: error.message ?? 'Unknown error' });
  }
});

/**
 * Send push notification to a user
 * Open HTTPS endpoint
 */
export const sendPushNotification = functions.region(region).https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId, title, body, notificationData = {} } = req.body;

  if (!userId || !title || !body) {
    res.status(400).json({ error: 'Missing required fields: userId, title, body' });
    return;
  }

  try {
    // Get user's FCM token from Firestore
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'No FCM token found for user' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    if (!fcmToken) {
      res.status(404).json({ success: false, message: 'Invalid FCM token' });
      return;
    }

    // Send notification
    const message = {
      notification: {
        title,
        body
      },
      data: notificationData,
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      }
    };

    const response = await admin.messaging().send(message);
    
    res.json({ 
      success: true, 
      messageId: response 
    });

  } catch (error: any) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify partner about new reservation
 */
export const notifyPartnerNewReservation = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { partnerId, customerName, offerTitle, quantity } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(partnerId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'Partner token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: '🔔 New Reservation',
        body: `${customerName} reserved ${quantity}x ${offerTitle}`
      },
      data: {
        type: 'partner_alert',
        partnerId,
        offerTitle
      },
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'notification_sound',
          channelId: 'reservations'
        }
      }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify customer about confirmed reservation
 */
export const notifyReservationConfirmed = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId, offerTitle, partnerName, pickupBy } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'User token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: '✅ Reservation Confirmed',
        body: `${offerTitle} at ${partnerName}. Pickup by ${pickupBy}`
      },
      data: {
        type: 'reservation_confirmed',
        offerTitle,
        partnerName
      },
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'notification_sound',
          channelId: 'reservations'
        }
      }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify customer about expiring reservation
 */
export const notifyReservationExpiring = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId, offerTitle, minutesLeft } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'User token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: '⏰ Reservation Expiring Soon',
        body: `${offerTitle} expires in ${minutesLeft} minutes!`
      },
      data: {
        type: 'expiringSoon',
        offerTitle,
        minutesLeft: minutesLeft.toString()
      },
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'notification_sound',
          channelId: 'reservations'
        }
      }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify about reservation expired - Shows missed pickup modal
 */
export const notifyReservationExpired = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId, offerTitle } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'User token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: '⏱️ Reservation Expired',
        body: `Your ${offerTitle} reservation has expired`
      },
      data: { type: 'reservationExpired', offerTitle },
      token: fcmToken,
      android: { priority: 'high' as const, notification: { sound: 'notification_sound', channelId: 'reservations' } }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify about new offers nearby - Opens nearby offers sheet
 */
export const notifyNewOffersNearby = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId, count, offerIds } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'User token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: '🎯 New Offers Nearby!',
        body: `${count} new deals just added within 2km`
      },
      data: { type: 'newOffersNearby', offerIds: JSON.stringify(offerIds || []) },
      token: fcmToken,
      android: { priority: 'high' as const, notification: { sound: 'notification_sound', channelId: 'offers' } }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify about new offer from favorite partner
 */
export const notifyFavoritePartner = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId, partnerName, partnerId, offerTitle } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'User token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: `❤️ ${partnerName}`,
        body: `New offer: ${offerTitle}`
      },
      data: { type: 'favoritePartners', partnerId, partnerName, offerTitle },
      token: fcmToken,
      android: { priority: 'high' as const, notification: { sound: 'notification_sound', channelId: 'offers' } }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify about achievement unlocked - Opens achievement tab
 */
export const notifyAchievement = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId, achievementTitle } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'User token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: '🏆 Achievement Unlocked!',
        body: achievementTitle
      },
      data: { type: 'achievements', achievementTitle },
      token: fcmToken,
      android: { priority: 'high' as const, notification: { sound: 'notification_sound', channelId: 'achievements' } }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify about referral reward - Shows referral rewards modal
 */
export const notifyReferralReward = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { userId, referralCode, pointsEarned } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'User token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: '🎁 Welcome Bonus!',
        body: `You earned ${pointsEarned} SmartPoints for joining via referral`
      },
      data: { type: 'referralRewards', referralCode, pointsEarned: pointsEarned.toString() },
      token: fcmToken,
      android: { priority: 'high' as const, notification: { sound: 'notification_sound', channelId: 'achievements' } }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Notify partner about reservation cancellation
 */
export const notifyPartnerReservationCancelled = functions.region(region).https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const { partnerId, customerName, offerTitle, quantity } = req.body;

  try {
    const tokenDoc = await db.collection('fcm_tokens').doc(partnerId).get();
    
    if (!tokenDoc.exists) {
      res.status(404).json({ success: false, message: 'Partner token not found' });
      return;
    }

    const fcmToken = tokenDoc.data()?.token;

    const message = {
      notification: {
        title: '❌ Reservation Cancelled',
        body: `${customerName} cancelled ${quantity}x ${offerTitle}`
      },
      data: {
        type: 'partner_alert',
        partnerId,
        offerTitle,
        action: 'cancelled'
      },
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'notification_sound',
          channelId: 'reservations'
        }
      }
    };

    const response = await admin.messaging().send(message);
    res.json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
