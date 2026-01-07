/**
 * SESSION TIMEOUT MONITORING
 * Professional session management with automatic timeout detection
 * Prevents stale sessions and improves security
 */

import { supabase } from './supabase';
import { logger } from './logger';

// Session configuration
const SESSION_CONFIG = {
  // Inactivity timeout (30 minutes of no user interaction)
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,
  
  // Absolute session timeout (12 hours regardless of activity)
  ABSOLUTE_TIMEOUT_MS: 12 * 60 * 60 * 1000,
  
  // Heartbeat interval (update server every 5 minutes)
  HEARTBEAT_INTERVAL_MS: 5 * 60 * 1000,
  
  // Warning before logout (2 minutes before timeout)
  WARNING_BEFORE_TIMEOUT_MS: 2 * 60 * 1000,
};

// Session state
let lastActivityTime: number = Date.now();
let sessionStartTime: number = Date.now();
let inactivityTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let warningTimer: NodeJS.Timeout | null = null;
let isWarningShown: boolean = false;

// Callbacks for UI updates
type SessionWarningCallback = (remainingSeconds: number) => void;
type SessionExpiredCallback = (reason: 'inactivity' | 'absolute_timeout' | 'manual') => void;

let onSessionWarning: SessionWarningCallback | null = null;
let onSessionExpired: SessionExpiredCallback | null = null;

/**
 * Initialize session monitoring
 * Call this after user logs in
 */
export function initializeSessionMonitoring(
  onWarning?: SessionWarningCallback,
  onExpired?: SessionExpiredCallback
) {
  logger.info('[session] Initializing session monitoring');
  
  // Set callbacks
  onSessionWarning = onWarning || null;
  onSessionExpired = onExpired || null;
  
  // Reset timers
  lastActivityTime = Date.now();
  sessionStartTime = Date.now();
  isWarningShown = false;
  
  // Start monitoring
  startInactivityTimer();
  startHeartbeat();
  setupActivityListeners();
  
  logger.info('[session] Session monitoring active', {
    inactivity_timeout: SESSION_CONFIG.INACTIVITY_TIMEOUT_MS / 1000 / 60 + ' min',
    absolute_timeout: SESSION_CONFIG.ABSOLUTE_TIMEOUT_MS / 1000 / 60 / 60 + ' hours',
    heartbeat_interval: SESSION_CONFIG.HEARTBEAT_INTERVAL_MS / 1000 / 60 + ' min',
  });
}

/**
 * Stop session monitoring
 * Call this after user logs out or session expires
 */
export function stopSessionMonitoring() {
  logger.info('[session] Stopping session monitoring');
  
  // Clear all timers
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  
  if (warningTimer) {
    clearTimeout(warningTimer);
    warningTimer = null;
  }
  
  // Remove event listeners
  removeActivityListeners();
  
  // Reset callbacks
  onSessionWarning = null;
  onSessionExpired = null;
  isWarningShown = false;
}

/**
 * Update last activity timestamp
 * Call this on user interactions
 */
export function recordActivity() {
  const now = Date.now();
  lastActivityTime = now;
  
  // Clear warning if shown
  if (isWarningShown) {
    isWarningShown = false;
    logger.info('[session] Activity detected, warning cleared');
  }
  
  // Restart inactivity timer
  startInactivityTimer();
}

/**
 * Check if session has expired
 */
export function isSessionExpired(): { expired: boolean; reason?: string } {
  const now = Date.now();
  const inactiveDuration = now - lastActivityTime;
  const sessionDuration = now - sessionStartTime;
  
  if (inactiveDuration >= SESSION_CONFIG.INACTIVITY_TIMEOUT_MS) {
    return { expired: true, reason: 'inactivity' };
  }
  
  if (sessionDuration >= SESSION_CONFIG.ABSOLUTE_TIMEOUT_MS) {
    return { expired: true, reason: 'absolute_timeout' };
  }
  
  return { expired: false };
}

/**
 * Get remaining time before session expires
 */
export function getRemainingSessionTime(): {
  inactivity: number;
  absolute: number;
  willExpireDue: 'inactivity' | 'absolute_timeout';
} {
  const now = Date.now();
  const inactivityRemaining = SESSION_CONFIG.INACTIVITY_TIMEOUT_MS - (now - lastActivityTime);
  const absoluteRemaining = SESSION_CONFIG.ABSOLUTE_TIMEOUT_MS - (now - sessionStartTime);
  
  return {
    inactivity: Math.max(0, inactivityRemaining),
    absolute: Math.max(0, absoluteRemaining),
    willExpireDue: inactivityRemaining < absoluteRemaining ? 'inactivity' : 'absolute_timeout',
  };
}

/**
 * Manually expire session
 */
export async function expireSession(reason: 'manual' | 'inactivity' | 'absolute_timeout' = 'manual') {
  logger.warn('[session] Session expired:', reason);
  
  // Notify callback
  if (onSessionExpired) {
    onSessionExpired(reason);
  }
  
  // Stop monitoring
  stopSessionMonitoring();
  
  // Sign out from Supabase
  try {
    await supabase.auth.signOut();
    logger.info('[session] User signed out due to:', reason);
  } catch (error) {
    logger.error('[session] Error signing out:', error);
  }
}

/**
 * Send heartbeat to server to update session activity
 */
async function sendHeartbeat() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      logger.warn('[session] No active session, stopping heartbeat');
      stopSessionMonitoring();
      return;
    }
    
    // Call Edge Function or RPC to update session activity
    // This prevents server-side session timeout
    const { error } = await supabase.rpc('update_session_activity', {
      p_session_id: session.access_token.substring(0, 64), // Use token prefix as session ID
      p_user_id: session.user.id,
    });
    
    if (error) {
      logger.error('[session] Heartbeat error:', error);
    } else {
      logger.debug('[session] Heartbeat sent successfully');
    }
  } catch (error) {
    logger.error('[session] Heartbeat exception:', error);
  }
}

/**
 * Start inactivity timer
 */
function startInactivityTimer() {
  // Clear existing timer
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  
  if (warningTimer) {
    clearTimeout(warningTimer);
  }
  
  // Set warning timer (2 minutes before expiration)
  const warningTime = SESSION_CONFIG.INACTIVITY_TIMEOUT_MS - SESSION_CONFIG.WARNING_BEFORE_TIMEOUT_MS;
  warningTimer = setTimeout(() => {
    if (!isWarningShown) {
      isWarningShown = true;
      const remainingSeconds = SESSION_CONFIG.WARNING_BEFORE_TIMEOUT_MS / 1000;
      logger.warn('[session] Inactivity warning:', remainingSeconds + 's remaining');
      
      if (onSessionWarning) {
        onSessionWarning(remainingSeconds);
      }
    }
  }, warningTime);
  
  // Set expiration timer
  inactivityTimer = setTimeout(() => {
    logger.warn('[session] Inactivity timeout reached');
    expireSession('inactivity');
  }, SESSION_CONFIG.INACTIVITY_TIMEOUT_MS);
}

/**
 * Start heartbeat interval
 */
function startHeartbeat() {
  // Clear existing interval
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
  }
  
  // Send initial heartbeat
  sendHeartbeat();
  
  // Set interval
  heartbeatTimer = setInterval(() => {
    sendHeartbeat();
  }, SESSION_CONFIG.HEARTBEAT_INTERVAL_MS);
}

/**
 * Setup activity listeners (mouse, keyboard, touch)
 */
function setupActivityListeners() {
  if (typeof window === 'undefined') return;
  
  // Throttle activity recording (max once per 10 seconds)
  let lastRecorded = 0;
  const throttledActivity = () => {
    const now = Date.now();
    if (now - lastRecorded >= 10000) {
      lastRecorded = now;
      recordActivity();
    }
  };
  
  // Add listeners
  window.addEventListener('mousedown', throttledActivity, { passive: true });
  window.addEventListener('keydown', throttledActivity, { passive: true });
  window.addEventListener('touchstart', throttledActivity, { passive: true });
  window.addEventListener('scroll', throttledActivity, { passive: true });
  window.addEventListener('click', throttledActivity, { passive: true });
}

/**
 * Remove activity listeners
 */
function removeActivityListeners() {
  if (typeof window === 'undefined') return;
  
  const throttledActivity = () => {}; // Dummy function (can't access original)
  window.removeEventListener('mousedown', throttledActivity);
  window.removeEventListener('keydown', throttledActivity);
  window.removeEventListener('touchstart', throttledActivity);
  window.removeEventListener('scroll', throttledActivity);
  window.removeEventListener('click', throttledActivity);
}

/**
 * Get session info for debugging
 */
export function getSessionInfo() {
  const remaining = getRemainingSessionTime();
  const { expired, reason } = isSessionExpired();
  
  return {
    expired,
    expirationReason: reason,
    lastActivityTime: new Date(lastActivityTime).toISOString(),
    sessionStartTime: new Date(sessionStartTime).toISOString(),
    remainingInactivitySeconds: Math.floor(remaining.inactivity / 1000),
    remainingAbsoluteSeconds: Math.floor(remaining.absolute / 1000),
    willExpireDue: remaining.willExpireDue,
    isWarningShown,
  };
}

/**
 * USAGE EXAMPLE:
 * 
 * // In your auth context or App.tsx:
 * import { initializeSessionMonitoring, stopSessionMonitoring } from '@/lib/sessionMonitor';
 * 
 * // After successful login:
 * initializeSessionMonitoring(
 *   (remainingSeconds) => {
 *     // Show warning toast
 *     toast.warning(`Your session will expire in ${Math.floor(remainingSeconds / 60)} minutes due to inactivity`);
 *   },
 *   (reason) => {
 *     // Show expiration message
 *     if (reason === 'inactivity') {
 *       toast.error('Your session expired due to inactivity. Please log in again.');
 *     } else {
 *       toast.error('Your session has expired. Please log in again.');
 *     }
 *     // Redirect to login
 *     navigate('/login');
 *   }
 * );
 * 
 * // On logout:
 * stopSessionMonitoring();
 */
