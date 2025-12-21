import { supabase } from './supabase';

/**
 * Send a notification via secure Edge Function
 * Bot token is stored securely on the server, not exposed to client
 */
async function sendNotification(userId: string, message: string, type: 'partner' | 'customer'): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: { userId, message, type }
    });

    if (error) {
      // Silently fail if Edge Function is not deployed
      console.warn('⚠️ Notification service unavailable:', error.message);
      return false;
    }

    if (data && !data.success) {
      console.log('⚠️ Notification not sent:', data.message || 'User has not enabled Telegram notifications');
      return false;
    }

    console.log('✅ Telegram notification sent successfully');
    return data?.success || false;
  } catch (error) {
    // Silently fail - notification is optional
    console.warn('⚠️ Notification service unavailable');
    return false;
  }
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
  
  return `https://t.me/${botUsername}?start=${startParam}`;
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
 */
export async function notifyPartnerNewReservation(
  partnerId: string,
  customerName: string,
  offerTitle: string,
  quantity: number,
  pickupBy: string
) {
  // Check if partner has this notification enabled
  const { data: partner } = await supabase
    .from('partners')
    .select('notification_preferences')
    .eq('user_id', partnerId)
    .single();

  if (partner?.notification_preferences) {
    const prefs = partner.notification_preferences;
    // Check if newOrder notification is enabled and telegram channel is enabled
    if (!prefs.newOrder || !prefs.telegram) {
      console.log(`Partner ${partnerId} has newOrder or Telegram notifications disabled`);
      return false;
    }
  }

  const message = `🎉 <b>ახალი შეკვეთა!</b>

<b>მომხმარებელი:</b> ${customerName}
<b>პროდუქტი:</b> ${offerTitle}
<b>რაოდენობა:</b> ${quantity}
<b>აღება:</b> ${pickupBy}

მომხმარებელი მალე ჩამოვა შეკვეთის ასაღებად.`;

  return sendNotification(partnerId, message, 'partner');
}

/**
 * Send pickup complete notification to partner
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

  return sendNotification(partnerId, message, 'partner');
}

/**
 * Send low stock notification to partner
 * Respects partner's notification preferences
 */
export async function notifyPartnerLowStock(
  partnerId: string,
  offerTitle: string,
  quantityLeft: number
) {
  // Check if partner has this notification enabled
  const { data: partner } = await supabase
    .from('partners')
    .select('notification_preferences')
    .eq('user_id', partnerId)
    .single();

  if (partner?.notification_preferences) {
    const prefs = partner.notification_preferences;
    // Check if lowStock notification is enabled and telegram channel is enabled
    if (!prefs.lowStock || !prefs.telegram) {
      console.log(`Partner ${partnerId} has lowStock or Telegram notifications disabled`);
      return false;
    }
  }

  const message = `⚠️ <b>დაბალი მარაგი!</b>

<b>პროდუქტი:</b> ${offerTitle}
<b>დარჩენილი:</b> ${quantityLeft}

თქვენი პროდუქტის მარაგი იწურება. ჩაამატეთ მეტი რაოდენობა!`;

  return sendNotification(partnerId, message, 'partner');
}

/**
 * Send reservation cancelled notification to partner
 * Respects partner's notification preferences
 */
export async function notifyPartnerReservationCancelled(
  partnerId: string,
  customerName: string,
  offerTitle: string,
  quantity: number
) {
  // Check if partner has this notification enabled
  const { data: partner } = await supabase
    .from('partners')
    .select('notification_preferences')
    .eq('user_id', partnerId)
    .single();

  if (partner?.notification_preferences) {
    const prefs = partner.notification_preferences;
    // Check if cancellation notification is enabled and telegram channel is enabled
    if (!prefs.cancellation || !prefs.telegram) {
      console.log(`Partner ${partnerId} has cancellation or Telegram notifications disabled`);
      return false;
    }
  }

  const message = `🚫 <b>რეზერვაცია გაუქმდა</b>

<b>მომხმარებელი:</b> ${customerName}
<b>პროდუქტი:</b> ${offerTitle}
<b>რაოდენობა:</b> ${quantity}

მომხმარებელმა გააუქმა რეზერვაცია. რაოდენობა დაბრუნდა თქვენს შეთავაზებაში.`;

  return sendNotification(partnerId, message, 'partner');
}

/**
 * Send no-show notification to partner
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

  return sendNotification(partnerId, message, 'partner');
}

/**
 * Send 15-minute pickup reminder to customer
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

  return sendNotification(customerId, message, 'customer');
}

/**
 * Send new offer notification to customer
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

  return sendNotification(customerId, message, 'customer');
}

/**
 * Send reservation confirmation to customer
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

  return sendNotification(customerId, message, 'customer');
}
