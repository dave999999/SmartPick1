/**
 * Admin Communication API
 * Send announcements, emails, and push notifications to users and partners
 */

import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface Announcement {
  id?: string;
  title: string;
  message: string;
  target_audience: 'ALL_USERS' | 'ALL_PARTNERS' | 'SPECIFIC_USERS' | 'SPECIFIC_PARTNERS' | 'EVERYONE';
  target_ids?: string[]; // For SPECIFIC_USERS or SPECIFIC_PARTNERS
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  channel: 'IN_APP' | 'EMAIL' | 'PUSH' | 'ALL';
  scheduled_at?: string; // ISO timestamp for scheduled announcements
  created_by: string;
  created_at?: string;
  sent_count?: number;
  read_count?: number;
  status?: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
}

export interface MessageStats {
  total_sent: number;
  total_read: number;
  read_rate: number;
  avg_read_time_minutes: number;
  bounce_rate: number;
}

/**
 * Send announcement to users/partners
 */
export async function sendAnnouncement(announcement: Announcement): Promise<{ success: boolean; message: string; sent_count: number }> {
  try {
    logger.info('[Admin] Sending announcement', { announcement });

    const { data, error } = await supabase.rpc('admin_send_announcement', {
      p_title: announcement.title,
      p_message: announcement.message,
      p_target_audience: announcement.target_audience,
      p_target_ids: announcement.target_ids || [],
      p_priority: announcement.priority,
      p_channel: announcement.channel,
      p_scheduled_at: announcement.scheduled_at || null,
    });

    if (error) {
      logger.error('[Admin] Failed to send announcement', error);
      throw error;
    }

    logger.info('[Admin] Announcement sent successfully', data);
    return {
      success: true,
      message: 'Announcement sent successfully',
      sent_count: data.sent_count || 0,
    };
  } catch (error) {
    logger.error('[Admin] Error sending announcement', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send announcement',
      sent_count: 0,
    };
  }
}

/**
 * Get announcement history with stats
 */
export async function getAnnouncementHistory(limit = 50): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[Admin] Failed to get announcement history', error);
    return [];
  }
}

/**
 * Send direct message to specific user/partner
 */
export async function sendDirectMessage(
  recipientId: string,
  recipientType: 'USER' | 'PARTNER',
  subject: string,
  message: string,
  channel: 'IN_APP' | 'EMAIL' | 'BOTH' = 'BOTH'
): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('admin_send_direct_message', {
      p_recipient_id: recipientId,
      p_recipient_type: recipientType,
      p_subject: subject,
      p_message: message,
      p_channel: channel,
    });

    if (error) throw error;

    return {
      success: true,
      message: 'Message sent successfully',
    };
  } catch (error) {
    logger.error('[Admin] Failed to send direct message', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send message',
    };
  }
}

/**
 * Get users matching criteria for targeted announcements
 */
export async function getUsersForTargeting(criteria: {
  role?: 'CUSTOMER' | 'PARTNER';
  level_min?: number;
  level_max?: number;
  points_min?: number;
  points_max?: number;
  active_since?: string; // ISO date
  inactive_since?: string; // ISO date
  has_penalty?: boolean;
  city?: string;
}): Promise<{ id: string; full_name: string; email: string; role: string }[]> {
  try {
    const { data, error } = await supabase.rpc('admin_get_users_for_targeting', criteria);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[Admin] Failed to get users for targeting', error);
    return [];
  }
}

/**
 * Get partners matching criteria for targeted announcements
 */
export async function getPartnersForTargeting(criteria: {
  status?: 'PENDING' | 'APPROVED' | 'PAUSED' | 'DISABLED';
  verified?: boolean;
  offers_min?: number;
  offers_max?: number;
  reservations_min?: number;
  reservations_max?: number;
  rating_min?: number;
  rating_max?: number;
  city?: string;
}): Promise<{ id: string; business_name: string; contact_email: string; status: string }[]> {
  try {
    const { data, error } = await supabase.rpc('admin_get_partners_for_targeting', criteria);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('[Admin] Failed to get partners for targeting', error);
    return [];
  }
}

/**
 * Get message delivery stats
 */
export async function getMessageStats(announcementId: string): Promise<MessageStats> {
  try {
    const { data, error } = await supabase.rpc('admin_get_message_stats', {
      p_announcement_id: announcementId,
    });

    if (error) throw error;
    return data || {
      total_sent: 0,
      total_read: 0,
      read_rate: 0,
      avg_read_time_minutes: 0,
      bounce_rate: 0,
    };
  } catch (error) {
    logger.error('[Admin] Failed to get message stats', error);
    return {
      total_sent: 0,
      total_read: 0,
      read_rate: 0,
      avg_read_time_minutes: 0,
      bounce_rate: 0,
    };
  }
}

/**
 * Schedule announcement for later
 */
export async function scheduleAnnouncement(announcement: Announcement, scheduledAt: Date): Promise<{ success: boolean; message: string }> {
  try {
    const announcementWithSchedule = {
      ...announcement,
      scheduled_at: scheduledAt.toISOString(),
      status: 'SCHEDULED' as const,
    };

    return await sendAnnouncement(announcementWithSchedule);
  } catch (error) {
    logger.error('[Admin] Failed to schedule announcement', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to schedule announcement',
    };
  }
}

/**
 * Cancel scheduled announcement
 */
export async function cancelScheduledAnnouncement(announcementId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('announcements')
      .update({ status: 'DRAFT' })
      .eq('id', announcementId)
      .eq('status', 'SCHEDULED');

    if (error) throw error;

    return {
      success: true,
      message: 'Scheduled announcement cancelled',
    };
  } catch (error) {
    logger.error('[Admin] Failed to cancel scheduled announcement', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to cancel announcement',
    };
  }
}
