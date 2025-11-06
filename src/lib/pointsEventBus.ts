/**
 * Simple pub-sub event bus for SmartPoints balance changes
 * Allows components to react to points changes across the app
 */

type PointsChangeCallback = (newBalance: number, userId: string) => void;

const listeners = new Set<PointsChangeCallback>();

/**
 * Subscribe to points change events
 * @param callback Function to call when points change
 * @returns Unsubscribe function
 */
export const onPointsChange = (callback: PointsChangeCallback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

/**
 * Emit a points change event to all listeners
 * Call this after points are added or deducted
 * @param newBalance The new points balance
 * @param userId The user ID whose points changed
 */
export const emitPointsChange = (newBalance: number, userId: string) => {
  listeners.forEach(cb => cb(newBalance, userId));
};

/**
 * Get current number of active listeners (for debugging)
 */
export const getListenerCount = () => listeners.size;
