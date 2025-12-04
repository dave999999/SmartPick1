/**
 * Error Utilities
 * Helper functions for extracting and formatting error messages
 */

/**
 * Extract a user-friendly error message from various error types
 */
export const extractErrorMessage = (error: unknown, fallback = 'Unknown error'): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const baseMessage = (error as { message?: string }).message;
    if (baseMessage) {
      return baseMessage;
    }

    if ('error' in error && typeof (error as { error?: { message?: string } }).error === 'object') {
      const nested = (error as { error?: { message?: string } }).error?.message;
      if (nested) {
        return nested;
      }
    }
  }

  return fallback;
};

/**
 * Check if error is about slot limits
 */
export const isSlotLimitError = (error: unknown): boolean => {
  const errorMessage = extractErrorMessage(error).toLowerCase();
  return errorMessage.includes('maximum') || 
         errorMessage.includes('slots') || 
         errorMessage.includes('slot limit');
};

/**
 * Check if error is about rate limiting
 */
export const isRateLimitError = (error: unknown): boolean => {
  const errorMessage = extractErrorMessage(error).toLowerCase();
  return errorMessage.includes('rate limit') || 
         errorMessage.includes('too many') ||
         errorMessage.includes('try again later');
};
