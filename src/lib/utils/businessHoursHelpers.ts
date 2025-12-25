/**
 * Business Hours Utilities
 * Helper functions to check if a business is currently open
 */

export interface BusinessHours {
  is_24_7?: boolean;
  open?: string;   // "09:00"
  close?: string;  // "20:00"
  // Per-day schedules can be added later if needed
}

/**
 * Check if business is currently open based on business hours
 */
export function isBusinessOpen(businessHours: BusinessHours | null | undefined, open_24h?: boolean): boolean {
  // If business is 24/7, always open
  if (businessHours?.is_24_7 || open_24h) {
    return true;
  }

  // If no business hours defined, assume open (backwards compatibility)
  if (!businessHours || (!businessHours.open && !businessHours.close)) {
    return true;
  }

  // Get current time in HH:MM format
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const openTime = businessHours.open || '00:00';
  const closeTime = businessHours.close || '23:59';

  // Simple string comparison works for HH:MM format
  return currentTime >= openTime && currentTime <= closeTime;
}

/**
 * Get next opening datetime (tomorrow at opening time if business is closed)
 */
export function getNextOpeningTime(businessHours: BusinessHours | null | undefined, open_24h?: boolean): Date {
  const now = new Date();
  
  // 24/7 businesses are always open - return now
  if (businessHours?.is_24_7 || open_24h) {
    return now;
  }

  // If no hours defined, return now
  if (!businessHours?.open) {
    return now;
  }

  // Check if currently open
  if (isBusinessOpen(businessHours, open_24h)) {
    return now; // Already open
  }

  // Business is closed - calculate next opening time
  const [hours, minutes] = businessHours.open.split(':').map(Number);
  const nextOpening = new Date();
  nextOpening.setHours(hours, minutes, 0, 0);

  // If opening time has passed today, move to tomorrow
  if (nextOpening <= now) {
    nextOpening.setDate(nextOpening.getDate() + 1);
  }

  return nextOpening;
}

/**
 * Get human-readable business status
 */
export function getBusinessStatus(businessHours: BusinessHours | null | undefined, open_24h?: boolean): {
  isOpen: boolean;
  message: string;
  opensAt?: string;
  closesAt?: string;
} {
  const isOpen = isBusinessOpen(businessHours, open_24h);

  if (businessHours?.is_24_7 || open_24h) {
    return {
      isOpen: true,
      message: '24/7 Open'
    };
  }

  if (!businessHours?.open || !businessHours?.close) {
    return {
      isOpen: true,
      message: 'Open'
    };
  }

  return {
    isOpen,
    message: isOpen ? `Open until ${businessHours.close}` : `Closed • Opens at ${businessHours.open}`,
    opensAt: businessHours.open,
    closesAt: businessHours.close
  };
}
