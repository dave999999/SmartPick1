import { supabase } from './supabase';
import { queueNotification, sendImmediateNotification } from './notificationQueue';

/**
 * Send a notification via secure Edge Function
 * Bot token is stored securely on the server, not exposed to client
 * 
 * @deprecated Use queueNotification for partner notifications (respects batching)
 * Use sendImmediateNotification for time-critical customer notifications
 */
async function sendNotification(userId: string, message: string, type: 'partner' | 'customer'): Promise<boolean> {
  return sendImmediateNotification(userId, message, type);
}

/**
 * Generate Telegram bot link for user to start conversation
 */
export function getTelegramBotLink(userId: string): string {
  // Get bot username from environment or use default
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SmartPickGE_bot';
  // Encode user ID as base64url start parameter (no padding)
  const b64 = btoa(userId)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  // Add timestamp to make link unique and prevent caching
  const timestamp = Date.now();
  const startParam = `${b64}_${timestamp}`;
  
  // Use tg:// protocol for direct app opening (works on mobile and desktop)
  // Falls back to web if app not installed
  return `tg://resolve?domain=${botUsername}&start=${startParam}`;
}

/**
 * Verify and save user's Telegram chat ID
 */
export async function connectTelegramAccount(
  userId: string,
  chatId: string,
  username?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        telegram_chat_id: chatId,
        telegram_username: username,
        enable_telegram: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Error saving Telegram connection:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error connecting Telegram:', error);
    return false;
  }
}

/**
 * Disconnect Telegram account
 */
export async function disconnectTelegramAccount(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        telegram_chat_id: null,
        telegram_username: null,
        enable_telegram: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error disconnecting Telegram:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error disconnecting Telegram:', error);
    return false;
  }
}

/**
 * Check if user has Telegram connected
 */
export async function getTelegramConnection(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('telegram_chat_id, telegram_username, enable_telegram')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Telegram connection:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching Telegram connection:', error);
    return null;
  }
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

/**
 * Send new reservation notification to partner
 * Respects partner's notification preferences
 * Uses batching system to prevent spam
 */
export async function notifyPartnerNewReservation(
  partnerUUID: string, // The partner's actual UUID from partners table
  customerName: string,
  customerId: string,
  offerTitle: string,
  quantity: number,
  pickupBy: string
) {
  const message = `🎉 <b>ახალი შეკვეთა!</b>

<b>მომხმარებელი:</b> ${customerName}
<b>პროდუქტი:</b> ${offerTitle}
<b>რაოდენობა:</b> ${quantity}
<b>აღება:</b> ${pickupBy}

მომხმარებელი მალე ჩამოვა შეკვეთის ასაღებად.`;

  return queueNotification(partnerUUID, 'new_order', message, {
    customer_id: customerId,
  });
}

/**
 * Send pickup complete notification to partner
 * Immediate notification (bypasses queue - already completed)
 */
export async function notifyPartnerPickupComplete(
  partnerId: string,
  customerName: string,
  offerTitle: string,
  quantity: number
) {
  const message = `✅ <b>Pickup Complete!</b>

<b>Customer:</b> ${customerName}
<b>Item:</b> ${offerTitle}
<b>Quantity:</b> ${quantity}

Order successfully completed. Great job! 👏`;

  return sendImmediateNotification(partnerId, message, 'partner');
}

/**
 * Send low stock notification to partner
 * Respects partner's notification preferences
 * Uses batching system to prevent spam
 */
export async function notifyPartnerLowStock(
  partnerId: string,
  partnerUUID: string,
  offerTitle: string,
  quantityLeft: number
) {
  const message = `⚠️ <b>დაბალი მარაგი!</b>

<b>პროდუქტი:</b> ${offerTitle}
<b>დარჩენილი:</b> ${quantityLeft}

თქვენი პროდუქტის მარაგი იწურება. ჩაამატეთ მეტი რაოდენობა!`;

  return queueNotification(partnerUUID, 'low_stock', message);
}

/**
 * Send reservation cancelled notification to partner
 * Respects partner's notification preferences
 * Uses batching system to prevent spam
 */
export async function notifyPartnerReservationCancelled(
  partnerId: string,
  partnerUUID: string,
  customerName: string,
  customerId: string,
  offerTitle: string,
  quantity: number
) {
  const message = `🚫 <b>რეზერვაცია გაუქმდა</b>

<b>მომხმარებელი:</b> ${customerName}
<b>პროდუქტი:</b> ${offerTitle}
<b>რაოდენობა:</b> ${quantity}

მომხმარებელმა გააუქმა რეზერვაცია. რაოდენობა დაბრუნდა თქვენს შეთავაზებაში.`;

  return queueNotification(partnerUUID, 'cancellation', message, {
    customer_id: customerId,
  });
}

/**
 * Send no-show notification to partner
 * @deprecated Replaced by passive confirmation system
 * No-shows are now detected by detect-missed-scans Edge Function
 */
export async function notifyPartnerNoShow(
  partnerId: string,
  customerName: string,
  offerTitle: string,
  quantity: number
) {
  const message = `❌ <b>Customer No-Show</b>

<b>Customer:</b> ${customerName}
<b>Item:</b> ${offerTitle}
<b>Quantity:</b> ${quantity}

The customer did not pick up their reservation. Penalty has been applied to their account.`;

  return sendImmediateNotification(partnerId, message, 'partner');
}

/**
 * Send 15-minute pickup reminder to customer
 * Time-critical, bypasses queue
 */
export async function notifyCustomerPickupReminder(
  customerId: string,
  offerTitle: string,
  partnerName: string,
  partnerAddress: string,
  expiresAt: string
) {
  const message = `⏰ <b>Pickup Reminder!</b>

<b>Hurry! Only 15 minutes left to pick up:</b>
${offerTitle}

<b>Location:</b> ${partnerName}
${partnerAddress}

<b>Expires at:</b> ${expiresAt}

Don't forget to pick up your order! 🏃‍♂️`;

  return sendImmediateNotification(customerId, message, 'customer');
}

/**
 * Send new offer notification to customer
 * Time-critical, bypasses queue
 */
export async function notifyCustomerNewOffer(
  customerId: string,
  offerTitle: string,
  partnerName: string,
  distance: string,
  expiresAt: string
) {
  const message = `🎁 <b>New Offer Nearby!</b>

<b>${offerTitle}</b>
📍 ${partnerName} (${distance})

<b>Expires:</b> ${expiresAt}

Open SmartPick app to reserve now! 🚀`;

  return sendImmediateNotification(customerId, message, 'customer');
}

/**
 * Send reservation confirmation to customer
 * Time-critical, bypasses queue
 */
export async function notifyCustomerReservationConfirmed(
  customerId: string,
  offerTitle: string,
  quantity: number,
  partnerName: string,
  partnerAddress: string,
  pickupBy: string
) {
  const message = `✅ <b>Reservation Confirmed!</b>

<b>Item:</b> ${offerTitle}
<b>Quantity:</b> ${quantity}

<b>Pickup from:</b>
${partnerName}
${partnerAddress}

<b>Pick up before:</b> ${pickupBy}

See you there! 🎉`;

  return sendImmediateNotification(customerId, message, 'customer');
}
