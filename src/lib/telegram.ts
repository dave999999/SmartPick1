import { supabase } from './supabase';

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  reply_markup?: any;
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(message: TelegramMessage): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('Telegram bot token not configured');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: message.chat_id,
        text: message.text,
        parse_mode: message.parse_mode || 'HTML',
        reply_markup: message.reply_markup,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Generate Telegram bot link for user to start conversation
 */
export function getTelegramBotLink(userId: string): string {
  // Get bot username from environment or use default
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'SmartPickGE_bot';
  // Encode user ID as start parameter
  const startParam = btoa(userId).replace(/=/g, '');
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
      .single();

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
 */
export async function notifyPartnerNewReservation(
  partnerId: string,
  customerName: string,
  offerTitle: string,
  quantity: number,
  pickupBy: string
) {
  const connection = await getTelegramConnection(partnerId);
  if (!connection?.telegram_chat_id || !connection.enable_telegram) {
    return false;
  }

  const message = `🎉 <b>New Reservation!</b>

<b>Customer:</b> ${customerName}
<b>Item:</b> ${offerTitle}
<b>Quantity:</b> ${quantity}
<b>Pickup by:</b> ${pickupBy}

The customer will arrive soon to pick up their order.`;

  return sendTelegramMessage({
    chat_id: connection.telegram_chat_id,
    text: message,
    parse_mode: 'HTML',
  });
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
  const connection = await getTelegramConnection(partnerId);
  if (!connection?.telegram_chat_id || !connection.enable_telegram) {
    return false;
  }

  const message = `✅ <b>Pickup Complete!</b>

<b>Customer:</b> ${customerName}
<b>Item:</b> ${offerTitle}
<b>Quantity:</b> ${quantity}

Order successfully completed. Great job! 👏`;

  return sendTelegramMessage({
    chat_id: connection.telegram_chat_id,
    text: message,
    parse_mode: 'HTML',
  });
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
  const connection = await getTelegramConnection(partnerId);
  if (!connection?.telegram_chat_id || !connection.enable_telegram) {
    return false;
  }

  const message = `❌ <b>Customer No-Show</b>

<b>Customer:</b> ${customerName}
<b>Item:</b> ${offerTitle}
<b>Quantity:</b> ${quantity}

The customer did not pick up their reservation. Penalty has been applied to their account.`;

  return sendTelegramMessage({
    chat_id: connection.telegram_chat_id,
    text: message,
    parse_mode: 'HTML',
  });
}

/**
 * Send low stock alert to partner
 */
export async function notifyPartnerLowStock(
  partnerId: string,
  offerTitle: string,
  quantityLeft: number
) {
  const connection = await getTelegramConnection(partnerId);
  if (!connection?.telegram_chat_id || !connection.enable_telegram) {
    return false;
  }

  const message = `⚠️ <b>Low Stock Alert!</b>

<b>Item:</b> ${offerTitle}
<b>Quantity left:</b> ${quantityLeft}

Your offer is running low. Consider creating a new offer or updating the quantity.`;

  return sendTelegramMessage({
    chat_id: connection.telegram_chat_id,
    text: message,
    parse_mode: 'HTML',
  });
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
  const connection = await getTelegramConnection(customerId);
  if (!connection?.telegram_chat_id || !connection.enable_telegram) {
    return false;
  }

  const message = `⏰ <b>Pickup Reminder!</b>

<b>Hurry! Only 15 minutes left to pick up:</b>
${offerTitle}

<b>Location:</b> ${partnerName}
${partnerAddress}

<b>Expires at:</b> ${expiresAt}

Don't forget to pick up your order! 🏃‍♂️`;

  return sendTelegramMessage({
    chat_id: connection.telegram_chat_id,
    text: message,
    parse_mode: 'HTML',
  });
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
  const connection = await getTelegramConnection(customerId);
  if (!connection?.telegram_chat_id || !connection.enable_telegram) {
    return false;
  }

  const message = `🎁 <b>New Offer Nearby!</b>

<b>${offerTitle}</b>
📍 ${partnerName} (${distance})

<b>Expires:</b> ${expiresAt}

Open SmartPick app to reserve now! 🚀`;

  return sendTelegramMessage({
    chat_id: connection.telegram_chat_id,
    text: message,
    parse_mode: 'HTML',
  });
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
  const connection = await getTelegramConnection(customerId);
  if (!connection?.telegram_chat_id || !connection.enable_telegram) {
    return false;
  }

  const message = `✅ <b>Reservation Confirmed!</b>

<b>Item:</b> ${offerTitle}
<b>Quantity:</b> ${quantity}

<b>Pickup from:</b>
${partnerName}
${partnerAddress}

<b>Pick up before:</b> ${pickupBy}

See you there! 🎉`;

  return sendTelegramMessage({
    chat_id: connection.telegram_chat_id,
    text: message,
    parse_mode: 'HTML',
  });
}
