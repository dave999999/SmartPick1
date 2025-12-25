/**
 * Overlay Orchestrator - Smart priority-based overlay management
 * 
 * Prevents overwhelming users with multiple simultaneous overlays.
 * Priority system ensures critical messages are seen first.
 * 
 * Priority Levels:
 * 1. CRITICAL (10002) - AdminReviewModal (6th+ offense, admin review required)
 * 2. CRITICAL (10001) - SuspensionModal (countdown, blocks EVERYTHING, can't dismiss)
 * 3. CRITICAL (10000) - PenaltyModal (warnings only, blocks actions, must acknowledge)
 * 4. HIGH (9999) - OfflineBanner (affects functionality)
 * 4. MEDIUM (50) - QueueStatus (informational, can wait)
 * 5. LOW (40) - CookieConsent (can be deferred)
 */

import { useState, useEffect, ReactNode } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OfflineBanner } from './OfflineBanner';
import { QueueStatus } from './QueueStatus';
import { CookieConsent } from './CookieConsent';
import { PenaltyModal } from './PenaltyModal';
import { SuspensionModal } from './SuspensionModal';
import { AdminReviewModal } from './AdminReviewModal';
import { UserPenalty } from '@/lib/api/penalty';

type OverlayType = 'adminReview' | 'suspension' | 'penalty' | 'offline' | 'queue' | 'cookie';

interface OverlayState {
  type: OverlayType;
  priority: number;
  visible: boolean;
  canDismiss: boolean;
}

interface OverlayOrchestratorProps {
  // Penalty Modal props (for warnings)
  showPenaltyModal: boolean;
  penaltyData: UserPenalty | null;
  // Suspension Modal props (for suspensions)
  showSuspensionModal: boolean;
  suspensionPenalty: UserPenalty | null;
  // Shared props
  userPoints: number;
  onPenaltyClose: () => void;
  onSuspensionClose: () => void;
  onLiftPenalty: (penaltyId: string, userId: string) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
  onPenaltyLifted: () => Promise<void>;
}

export function OverlayOrchestrator({
  showPenaltyModal,
  penaltyData,
  showSuspensionModal,
  suspensionPenalty,
  userPoints,
  onPenaltyClose,
  onSuspensionClose,
  onLiftPenalty,
  onPenaltyLifted,
}: OverlayOrchestratorProps) {
  // DEBUG: Log suspension modal state
  console.log('🔍 OverlayOrchestrator - Suspension state:', {
    showSuspensionModal,
    hasSuspensionPenalty: !!suspensionPenalty,
    suspensionPenaltyType: suspensionPenalty?.penalty_type,
    showPenaltyModal,
    hasPenaltyData: !!penaltyData
  });
  
  const isOnline = useOnlineStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [cookieConsentNeeded, setCookieConsentNeeded] = useState(false);
  
  // Track which overlays should be visible based on conditions
  const [overlays, setOverlays] = useState<Record<OverlayType, OverlayState>>({
    adminReview: { type: 'adminReview' as OverlayType, priority: 10002, visible: false, canDismiss: false }, // 6th+ offense
    suspension: { type: 'suspension', priority: 10001, visible: false, canDismiss: false }, // 4th-5th offense
    penalty: { type: 'penalty', priority: 10000, visible: false, canDismiss: true }, // Warnings only
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
    const isAdminReviewCase = showSuspensionModal && suspensionPenalty && suspensionPenalty.offense_number >= 6;
    const isRegularSuspension = showSuspensionModal && suspensionPenalty && suspensionPenalty.offense_number < 6;
    
    setOverlays(prev => ({
      ...prev,
      adminReview: { ...prev.adminReview, visible: isAdminReviewCase },
      suspension: { ...prev.suspension, visible: isRegularSuspension },
      penalty: { ...prev.penalty, visible: showPenaltyModal && !!penaltyData },
      offline: { ...prev.offline, visible: !isOnline },
      queue: { ...prev.queue, visible: queueCount > 0 },
      cookie: { ...prev.cookie, visible: cookieConsentNeeded },
    }));
  }, [showSuspensionModal, suspensionPenalty, showPenaltyModal, penaltyData, isOnline, queueCount, cookieConsentNeeded]);

  // Determine which overlay to show based on priority
  const activeOverlay = Object.values(overlays)
    .filter(overlay => overlay.visible)
    .sort((a, b) => b.priority - a.priority)[0];

  console.log('🎯 Active overlays:', Object.entries(overlays)
    .filter(([_, overlay]) => overlay.visible)
    .map(([key, overlay]) => `${key}(priority:${overlay.priority})`));
  console.log('🏆 Highest priority overlay:', activeOverlay?.type);

  // Show lower priority overlays only if no higher priority ones are active
  const shouldShowAdminReview = activeOverlay?.type === 'adminReview';
  const shouldShowSuspension = activeOverlay?.type === 'suspension';
  const shouldShowPenalty = activeOverlay?.type === 'penalty';
  
  console.log('🔍 Render decisions:', {
    shouldShowAdminReview,
    shouldShowSuspension,
    shouldShowPenalty,
    offenseNumber: suspensionPenalty?.offense_number,
    hasSuspensionPenalty: !!suspensionPenalty,
    hasPenaltyData: !!penaltyData
  });
  
  const shouldShowOffline = activeOverlay?.type === 'offline' || (!shouldShowAdminReview && !shouldShowSuspension && !shouldShowPenalty && overlays.offline.visible);
  const shouldShowQueue = activeOverlay?.type === 'queue' || (!shouldShowAdminReview && !shouldShowSuspension && !shouldShowPenalty && !shouldShowOffline && overlays.queue.visible);
  const shouldShowCookie = activeOverlay?.type === 'cookie' || (!shouldShowAdminReview && !shouldShowSuspension && !shouldShowPenalty && !shouldShowOffline && !shouldShowQueue && overlays.cookie.visible);

  return (
    <>
      {/* CRITICAL: Admin Review Modal (z-10002) - For 6th+ offenses, admin must review */}
      {shouldShowAdminReview && suspensionPenalty && onSuspensionClose && (
        <AdminReviewModal
          penalty={suspensionPenalty}
          onClose={onSuspensionClose}
        />
      )}

      {/* CRITICAL: Suspension Modal (z-10001) - Full overlay, countdown timer, blocks EVERYTHING */}
      {shouldShowSuspension && suspensionPenalty && onSuspensionClose && onLiftPenalty && (
        <>
          {console.log('🎯 About to render SuspensionModal with:', { 
            penaltyId: suspensionPenalty.id, 
            penaltyType: suspensionPenalty.penalty_type,
            userPoints 
          })}
          <SuspensionModal
            penalty={suspensionPenalty}
            userPoints={userPoints}
            onClose={onSuspensionClose}
            onLiftPenalty={onLiftPenalty}
            onPenaltyLifted={async () => {
              await onPenaltyLifted();
              onSuspensionClose();
            }}
          />
        </>
      )}

      {/* CRITICAL: Penalty Modal (z-10000) - Full overlay, blocks everything (warnings only) */}
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
