import { supabase } from './supabase';
import { logger } from './logger';

/**
 * Request forgiveness from partner for a no-show penalty
 */
export async function requestPartnerForgiveness(
  userId: string,
  reservationId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Get reservation details including partner info
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        partner_id,
        partners (
          id,
          business_name,
          user_id
        )
      `)
      .eq('id', reservationId)
      .single();

    if (resError || !reservation) {
      return { success: false, message: 'Reservation not found' };
    }

    const partner = reservation.partners as any;
    if (!partner) {
      return { success: false, message: 'Partner not found' };
    }

    // Create forgiveness request notification for partner
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: partner.user_id,
        type: 'forgiveness_request',
        title: 'Forgiveness Request',
        message: `A customer has requested forgiveness for a no-show. ${reason ? `Reason: ${reason}` : ''}`,
        data: {
          reservation_id: reservationId,
          customer_id: userId,
          reason: reason || null,
        },
      });

    if (notifError) {
      logger.error('Failed to create forgiveness notification', notifError);
      throw notifError;
    }

    // Track forgiveness request in reservations
    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        forgiveness_requested: true,
        forgiveness_request_reason: reason || null,
        forgiveness_requested_at: new Date().toISOString(),
      })
      .eq('id', reservationId);

    if (updateError) {
      logger.error('Failed to update reservation with forgiveness request', updateError);
      // Don't fail completely - notification was sent
    }

    return {
      success: true,
      message: 'Forgiveness request sent to partner. They will review your case.',
    };
  } catch (error) {
    logger.error('Error requesting forgiveness:', error);
    return {
      success: false,
      message: 'Failed to send forgiveness request. Please try again.',
    };
  }
}

/**
 * Check if forgiveness was already requested for a reservation
 */
export async function checkForgivenessStatus(reservationId: string): Promise<{
  requested: boolean;
  approved: boolean;
  denied: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('forgiveness_requested, forgiveness_approved, forgiveness_denied')
      .eq('id', reservationId)
      .single();

    if (error || !data) {
      return { requested: false, approved: false, denied: false };
    }

    return {
      requested: data.forgiveness_requested || false,
      approved: data.forgiveness_approved || false,
      denied: data.forgiveness_denied || false,
    };
  } catch (error) {
    logger.error('Error checking forgiveness status:', error);
    return { requested: false, approved: false, denied: false };
  }
}
