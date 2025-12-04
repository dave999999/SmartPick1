/**
 * Date/Time Utilities for Partner Dashboard
 * Helper functions for calculating business hours and offer expiration
 */

import { DEFAULT_24H_OFFER_DURATION_HOURS } from '../constants';
import type { Partner } from '../types';

/**
 * Get business closing time as Date object
 */
export const getBusinessClosingTime = (partner: Partner | null): Date | null => {
  if (!partner) return null;

  // 24/7 businesses have no closing time
  if (partner.open_24h) {
    return null;
  }

  // Use partner's closing_time field
  if (partner.closing_time) {
    const [hours, minutes] = partner.closing_time.split(':').map(Number);
    const closing = new Date();
    closing.setHours(hours, minutes, 0, 0);

    // If closing time is in the past today, it means tomorrow
    if (closing < new Date()) {
      closing.setDate(closing.getDate() + 1);
    }

    return closing;
  }

  return null;
};

/**
 * Calculate offer pickup end time based on business settings
 */
export const calculatePickupEndTime = (
  partner: Partner | null,
  autoExpire: boolean
): Date => {
  const now = new Date();
  
  if (!partner) {
    // Fallback: 2 hours from now
    return new Date(now.getTime() + 2 * 60 * 60 * 1000);
  }

  // 24-hour business with auto-expire: 12 hours
  if (partner.open_24h && autoExpire) {
    return new Date(now.getTime() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000);
  }

  // Regular business: until closing time
  const closing = getBusinessClosingTime(partner);
  if (closing && closing > now) {
    return closing;
  }

  // Fallback: 2 hours from now
  return new Date(now.getTime() + 2 * 60 * 60 * 1000);
};

/**
 * Check if a business is operating 24/7
 */
export const is24HourBusiness = (partner: Partner | null): boolean => {
  return partner?.open_24h === true;
};
