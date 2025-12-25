import { supabase } from './supabase';

/**
 * ============================================
 * STEP 4: CONTEXT-AWARE NOTIFICATION QUEUE
 * ============================================
 * 
 * Instead of sending notifications immediately, we queue them.
 * The flush-notification-queue Edge Function processes them in batches.
 * 
 * This approach:
 * - Prevents spam (batches multiple notifications)
 * - Respects silent hours
 * - Adds trust indicators to messages
 */

/**
 * Get user reliability score and return trust indicator
 */
async function getUserTrustIndicator(userId: string): Promise<string> {
  try {
    const { data: reliability } = await supabase
      .from('user_reliability')
      .select('reliability_score')
      .eq('user_id', userId)
      .maybeSingle();

    if (!reliability) {
      return ''; // New user, no history yet
    }

    const score = reliability.reliability_score;

    // Trust indicators based on score
    if (score >= 95) {
      return ' ⭐'; // High trust partner
    } else if (score >= 85) {
      return ''; // Good, no indicator
    } else if (score >= 70) {
      return ' ⚠️'; // Caution
    } else {
      return ' 🔴'; // Low reliability
    }
  } catch (error) {
    console.error('Error fetching user trust indicator:', error);
    return ''; // Fail gracefully
  }
}

/**
 * Queue a notification for batching
 * 
 * @param partnerId - Partner's UUID
 * @param messageType - Type of notification (new_order, cancellation, etc.)
 * @param messageText - The actual message text
 * @param metadata - Optional metadata (customer_id, reservation_id, etc.)
 */
export async function queueNotification(
  partnerId: string,
  messageType: string,
  messageText: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    // Check if partner has batching enabled
    const { data: partner } = await supabase
      .from('partners')
      .select('batching_enabled, user_id, notification_preferences')
      .eq('id', partnerId)
      .single();

    if (!partner) {
      console.error(`Partner ${partnerId} not found`);
      return false;
    }

    // Check if partner has this notification type and telegram enabled
    if (partner.notification_preferences) {
      const prefs = partner.notification_preferences;
      const typeKey = messageType.replace('_', '');
      
      // Map message types to preference keys
      const prefMap: Record<string, string> = {
        'neworder': 'newOrder',
        'cancellation': 'cancellation',
        'lowstock': 'lowStock',
      };

      const prefKey = prefMap[typeKey];
      
      if (prefKey && (!prefs[prefKey] || !prefs.telegram)) {
        console.log(`Partner ${partnerId} has ${messageType} or Telegram notifications disabled`);
        return false;
      }
    }

    // Check if partner has Telegram connected
    const { data: telegramPrefs } = await supabase
      .from('notification_preferences')
      .select('telegram_chat_id')
      .eq('user_id', partner.user_id)
      .maybeSingle();

    if (!telegramPrefs?.telegram_chat_id) {
      console.log(`Partner ${partnerId} has no Telegram connected`);
      return false;
    }

    // Add trust indicator if customer_id provided
    let enhancedMessage = messageText;
    if (metadata?.customer_id) {
      const trustIndicator = await getUserTrustIndicator(metadata.customer_id);
      if (trustIndicator) {
        // Insert trust indicator after customer name
        enhancedMessage = messageText.replace(
          /(<b>Customer:<\/b> [^<\n]+)/,
          `$1${trustIndicator}`
        ).replace(
          /(<b>მომხმარებელი:<\/b> [^<\n]+)/,
          `$1${trustIndicator}`
        );
      }
    }

    // Insert into queue (use user_id, not partner UUID)
    const { error } = await supabase
      .from('notification_queue')
      .insert({
        partner_id: partner.user_id,
        message_type: messageType,
        message_text: enhancedMessage,
        metadata: metadata || {},
      });

    if (error) {
      console.error('Error queuing notification:', error);
      return false;
    }

    console.log(`✅ Notification queued: ${messageType} for partner ${partnerId}`);
    return true;
  } catch (error) {
    console.error('Error queuing notification:', error);
    return false;
  }
}

/**
 * Send immediate notification (bypasses queue)
 * Use only for critical/time-sensitive notifications
 */
export async function sendImmediateNotification(
  userId: string,
  message: string,
  type: 'partner' | 'customer'
): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: { userId, message, type }
    });

    if (error) {
      console.warn('⚠️ Notification service unavailable:', error.message);
      return false;
    }

    if (data && !data.success) {
      console.log('⚠️ Notification not sent:', data.message || 'User has not enabled notifications');
      return false;
    }

    console.log('✅ Immediate notification sent successfully');
    return data?.success || false;
  } catch (error) {
    console.warn('⚠️ Notification service unavailable');
    return false;
  }
}

/**
 * Get customer name for notification
 */
export async function getCustomerName(customerId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', customerId)
      .maybeSingle();

    if (error || !data?.full_name) {
      // Fallback to auth metadata
      const { data: authData } = await supabase.auth.admin.getUserById(customerId);
      return authData?.user?.user_metadata?.full_name || 'Customer';
    }

    return data.full_name;
  } catch (error) {
    console.error('Error fetching customer name:', error);
    return 'Customer';
  }
}
