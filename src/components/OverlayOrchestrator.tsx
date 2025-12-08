/**
 * Overlay Orchestrator - Smart priority-based overlay management
 * 
 * Prevents overwhelming users with multiple simultaneous overlays.
 * Priority system ensures critical messages are seen first.
 * 
 * Priority Levels:
 * 1. CRITICAL (10000) - PenaltyModal (blocks actions, must be addressed)
 * 2. HIGH (9999) - OfflineBanner (affects functionality)
 * 3. MEDIUM (50) - QueueStatus (informational, can wait)
 * 4. LOW (40) - CookieConsent (can be deferred)
 */

import { useState, useEffect, ReactNode } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBanner } from './OfflineBanner';
import { QueueStatus } from './QueueStatus';
import { CookieConsent } from './CookieConsent';
import { PenaltyModal } from './PenaltyModal';
import { UserPenalty } from '@/lib/api/penalty';

type OverlayType = 'penalty' | 'offline' | 'queue' | 'cookie';

interface OverlayState {
  type: OverlayType;
  priority: number;
  visible: boolean;
  canDismiss: boolean;
}

interface OverlayOrchestratorProps {
  // Penalty Modal props
  showPenaltyModal: boolean;
  penaltyData: UserPenalty | null;
  userPoints: number;
  onPenaltyClose: () => void;
  onPenaltyLifted: () => Promise<void>;
}

export function OverlayOrchestrator({
  showPenaltyModal,
  penaltyData,
  userPoints,
  onPenaltyClose,
  onPenaltyLifted,
}: OverlayOrchestratorProps) {
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [cookieConsentNeeded, setCookieConsentNeeded] = useState(false);
  
  // Track which overlays should be visible based on conditions
  const [overlays, setOverlays] = useState<Record<OverlayType, OverlayState>>({
    penalty: { type: 'penalty', priority: 10000, visible: false, canDismiss: true },
    offline: { type: 'offline', priority: 9999, visible: false, canDismiss: false },
    queue: { type: 'queue', priority: 50, visible: false, canDismiss: true },
    cookie: { type: 'cookie', priority: 40, visible: false, canDismiss: true },
  });

  // Check cookie consent status
  useEffect(() => {
    const savedConsent = localStorage.getItem('cookieConsent');
    setCookieConsentNeeded(!savedConsent);
  }, []);

  // Monitor queue status
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const { requestQueue } = await import('@/lib/requestQueue');
        const status = await requestQueue.getQueueStatus();
        setQueueCount(status.count);
      } catch (e) {
        setQueueCount(0);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 10000); // Check every 10s
    
    const handleQueueChange = () => checkQueue();
    window.addEventListener('queue-updated', handleQueueChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('queue-updated', handleQueueChange);
    };
  }, []);

  // Update overlay visibility based on conditions
  useEffect(() => {
    setOverlays(prev => ({
      ...prev,
      penalty: { ...prev.penalty, visible: showPenaltyModal && !!penaltyData },
      offline: { ...prev.offline, visible: !isOnline },
      queue: { ...prev.queue, visible: queueCount > 0 },
      cookie: { ...prev.cookie, visible: cookieConsentNeeded },
    }));
  }, [showPenaltyModal, penaltyData, isOnline, queueCount, cookieConsentNeeded]);

  // Determine which overlay to show based on priority
  const activeOverlay = Object.values(overlays)
    .filter(overlay => overlay.visible)
    .sort((a, b) => b.priority - a.priority)[0];

  // Show lower priority overlays only if no higher priority ones are active
  const shouldShowPenalty = activeOverlay?.type === 'penalty';
  const shouldShowOffline = activeOverlay?.type === 'offline' || (!shouldShowPenalty && overlays.offline.visible);
  const shouldShowQueue = activeOverlay?.type === 'queue' || (!shouldShowPenalty && !shouldShowOffline && overlays.queue.visible);
  const shouldShowCookie = activeOverlay?.type === 'cookie' || (!shouldShowPenalty && !shouldShowOffline && !shouldShowQueue && overlays.cookie.visible);

  return (
    <>
      {/* CRITICAL: Penalty Modal (z-10000) - Full overlay, blocks everything */}
      {shouldShowPenalty && penaltyData && onPenaltyClose && onPenaltyLifted && (
        <PenaltyModal
          penalty={penaltyData}
          userPoints={userPoints}
          onClose={onPenaltyClose}
          onPenaltyLifted={onPenaltyLifted}
        />
      )}

      {/* HIGH: Offline Banner (z-9999) - Top notification bar */}
      {shouldShowOffline && <OfflineBanner />}

      {/* MEDIUM: Queue Status (z-50) - Bottom notification */}
      {shouldShowQueue && <QueueStatus />}

      {/* LOW: Cookie Consent (z-40) - Bottom banner */}
      {shouldShowCookie && (
        <div style={{ zIndex: 40 }}>
          <CookieConsent />
        </div>
      )}
    </>
  );
}
