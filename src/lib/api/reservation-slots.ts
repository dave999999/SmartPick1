import { supabase } from '../supabase';
import { logger } from '../logger';
import { 
  DEFAULT_RESERVATION_SLOTS, 
  MAX_RESERVATION_SLOTS, 
  getSlotUnlockCost 
} from '../constants';

/**
 * Reservation Slots API
 * Handles progressive slot unlocking system
 */

export interface SlotPurchaseHistory {
  slot: number;
  cost: number;
  timestamp: string;
  balance_after: number;
}

export interface UserSlotInfo {
  current_max: number;
  purchased_slots: SlotPurchaseHistory[];
  next_slot_cost: number | null;
  can_upgrade: boolean;
  total_spent: number;
}

/**
 * Get user's current max reservation slots
 */
export const getUserMaxSlots = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('max_reservation_quantity')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.max_reservation_quantity || DEFAULT_RESERVATION_SLOTS;
  } catch (error) {
    logger.error('Error fetching user max slots:', error);
    return DEFAULT_RESERVATION_SLOTS; // Fallback to default
  }
};

/**
 * Get comprehensive slot information for a user
 */
export const getUserSlotInfo = async (userId: string): Promise<UserSlotInfo> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('max_reservation_quantity, purchased_slots')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const currentMax = data?.max_reservation_quantity || DEFAULT_RESERVATION_SLOTS;
    const purchasedSlots = (data?.purchased_slots as SlotPurchaseHistory[]) || [];
    const canUpgrade = currentMax < MAX_RESERVATION_SLOTS;
    const nextSlotCost = canUpgrade ? getSlotUnlockCost(currentMax + 1) : null;
    
    // Calculate total spent on slots
    const totalSpent = purchasedSlots.reduce((sum, purchase) => sum + purchase.cost, 0);

    return {
      current_max: currentMax,
      purchased_slots: purchasedSlots,
      next_slot_cost: nextSlotCost,
      can_upgrade: canUpgrade,
      total_spent: totalSpent,
    };
  } catch (error) {
    logger.error('Error fetching user slot info:', error);
    throw error;
  }
};

/**
 * Purchase next reservation slot
 */
export const purchaseReservationSlot = async (userId: string): Promise<{
  success: boolean;
  new_max: number;
  new_balance: number;
  cost: number;
}> => {
  try {
    // Get current slot info
    const slotInfo = await getUserSlotInfo(userId);
    
    if (!slotInfo.can_upgrade) {
      throw new Error('Already at maximum slot capacity');
    }

    if (slotInfo.next_slot_cost === null) {
      throw new Error('Cannot determine next slot cost');
    }

    const nextSlotNumber = slotInfo.current_max + 1;
    const cost = slotInfo.next_slot_cost;

    // CSRF Protection
    const { getCSRFToken } = await import('@/lib/csrf');
    const csrfToken = await getCSRFToken();
    if (!csrfToken) {
      throw new Error('Security token required. Please refresh the page and try again.');
    }

    // Call database function to purchase slot
    const { data, error } = await supabase.rpc('purchase_reservation_slot', {
      p_user_id: userId,
      p_slot_number: nextSlotNumber,
      p_cost: cost,
    });

    if (error) throw error;

    logger.log('✅ Slot purchased successfully:', {
      userId,
      slotNumber: nextSlotNumber,
      cost,
      newBalance: data.new_balance,
    });

    return data;
  } catch (error) {
    logger.error('Error purchasing reservation slot:', error);
    throw error;
  }
};

/**
 * Check if user has enough points to purchase next slot
 */
export const canAffordNextSlot = async (userId: string): Promise<boolean> => {
  try {
    // Get user's max slots from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('max_reservation_quantity')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const currentMax = userData?.max_reservation_quantity || DEFAULT_RESERVATION_SLOTS;
    
    if (currentMax >= MAX_RESERVATION_SLOTS) return false;

    // Get user's balance from user_points table
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (pointsError) throw pointsError;

    const balance = pointsData?.balance || 0;
    const nextSlotCost = getSlotUnlockCost(currentMax + 1);
    return balance >= nextSlotCost;
  } catch (error) {
    logger.error('Error checking slot affordability:', error);
    return false;
  }
};

/**
 * Get next N upgradeable slots with costs (for UI display)
 */
export const getUpgradeableSlotsPreview = (currentMax: number, count: number = 3): Array<{
  slot: number;
  cost: number;
}> => {
  const slots: Array<{ slot: number; cost: number }> = [];
  
  for (let i = 1; i <= count; i++) {
    const slotNumber = currentMax + i;
    if (slotNumber > MAX_RESERVATION_SLOTS) break;
    
    const cost = getSlotUnlockCost(slotNumber);
    slots.push({ slot: slotNumber, cost });
  }
  
  return slots;
};
