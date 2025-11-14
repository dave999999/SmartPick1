import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, User, PenaltyInfo } from '@/lib/types';
import { createReservation, checkUserPenalty } from '@/lib/api';
import { checkRateLimit } from '@/lib/rateLimiter';
import { checkServerRateLimit, recordClientAttempt } from '@/lib/rateLimiter-server';
import { getCSRFToken } from '@/lib/csrf';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { resolveOfferImageUrl } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Shield, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { updateMetaTags, generateShareUrls } from '@/lib/social-share';
import { getUserPoints } from '@/lib/smartpoints-api';
import { BuyPointsModal } from './BuyPointsModal';

// Import modular reservation components (v2.0 - Unified Design)
import HeaderImage from './reservation/HeaderImage';
import TitleSection from './reservation/TitleSection';
import UnifiedPriceCard from './reservation/UnifiedPriceCard';
import SmartPickHint from './reservation/SmartPickHint';
import PickupWindowCard from './reservation/PickupWindowCard';
import ReserveButton from './reservation/ReserveButton';

interface ReservationModalProps {
  offer: Offer | null;
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ReservationModal({
  offer,
  user,
  open,
  onOpenChange,
  onSuccess,
}: ReservationModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);
  const [penaltyInfo, setPenaltyInfo] = useState<PenaltyInfo | null>(null);
  const [countdown, setCountdown] = useState('');
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);
  const [insufficientPoints, setInsufficientPoints] = useState(false);
  const navigate = useNavigate();

  // Use ref for immediate synchronous double-click protection
  const isProcessingRef = useRef(false);
  const lastClickTimeRef = useRef(0);

  // Swipe-to-close state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);

  const POINTS_PER_UNIT = 5; // 5 points per unit (quantity-based pricing)
  const DEBOUNCE_MS = 2000; // 2 second debounce

  useEffect(() => {
    if (open && user) {
      loadPenaltyInfo();
      loadPointsBalance();
      // Reset processing flag when modal opens
      isProcessingRef.current = false;
    }
    // Update meta tags for social sharing when modal opens
    if (open && offer) {
      updateMetaTags(offer);
    }
  }, [open, user, offer]);

  // Update insufficient points check (quantity-based: 5 points per unit)
  useEffect(() => {
    const totalNeeded = POINTS_PER_UNIT * quantity;
    setInsufficientPoints(pointsBalance < totalNeeded);
  }, [pointsBalance, quantity]);

  // Swipe-to-close handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - dragStartY.current;
    
    // Only allow downward dragging
    if (delta > 0) {
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // If dragged down more than 150px, close the modal
    if (dragY > 150) {
      onOpenChange(false);
    }
    
    // Reset position
    setDragY(0);
  };

  // Reset drag state when modal closes
  useEffect(() => {
    if (!open) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [open]);

  const loadPointsBalance = async () => {
    if (!user) return;
    try {
      const userPoints = await getUserPoints(user.id);
      const balance = userPoints?.balance ?? 0;
      setPointsBalance(balance);
      const totalNeeded = POINTS_PER_UNIT * quantity;
      setInsufficientPoints(balance < totalNeeded);
    } catch (error) {
      logger.error('Error loading points balance:', error);
    }
  };

  useEffect(() => {
    if (penaltyInfo?.isUnderPenalty && penaltyInfo.penaltyUntil) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = penaltyInfo.penaltyUntil!.getTime() - now.getTime();
        
        if (diff <= 0) {
          setCountdown('Penalty lifted!');
          loadPenaltyInfo(); // Reload to clear penalty
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [penaltyInfo]);

  const loadPenaltyInfo = async () => {
    if (!user) return;
    try {
      const info = await checkUserPenalty(user.id);
      setPenaltyInfo(info);
    } catch (error) {
      logger.error('Error loading penalty info:', error);
    }
  };

  const handleReserve = async () => {
    const now = Date.now();
    const callId = Math.random().toString(36).substring(7);

    logger.log('🔵🔵🔵 FUNCTION ENTRY', callId, {
      timestamp: new Date().toISOString(),
      isProcessing: isProcessingRef.current,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });

    // 🔒 CRITICAL: Set protection flag IMMEDIATELY before ANY checks
    // This prevents race condition where both clicks pass checks before flag is set
    if (isProcessingRef.current) {
      logger.warn('⚠️⚠️⚠️ BLOCKED:', callId, 'Already processing');
      toast.error('⏳ Please wait, already processing...');
      return;
    }
    isProcessingRef.current = true; // Lock IMMEDIATELY

    logger.log('✅ LOCK ACQUIRED', callId, 'at', new Date().toISOString());

    logger.log('🔵 Reserve button clicked', callId, {
      timeSinceLastClick: now - lastClickTimeRef.current,
      quantity,
      pointsNeeded: POINTS_PER_UNIT * quantity
    });

    try {
      if (!offer || !user) {
        logger.log('❌ No offer or user');
        isProcessingRef.current = false;
        return;
      }

      // LAYER 2: Time-based debounce protection
      const timeSinceLastClick = now - lastClickTimeRef.current;
      if (timeSinceLastClick < DEBOUNCE_MS && lastClickTimeRef.current > 0) {
        logger.warn(`⚠️ BLOCKED: Too fast! ${timeSinceLastClick}ms since last click (minimum: ${DEBOUNCE_MS}ms)`);
        toast.error(`⏳ Please wait ${Math.ceil((DEBOUNCE_MS - timeSinceLastClick) / 1000)} more seconds...`);
        isProcessingRef.current = false;
        return;
      }
      lastClickTimeRef.current = now;

      // SERVER-SIDE Rate limiting: 10 reservations per hour per user
      // First check client-side for fast feedback
      const clientRateLimit = await checkRateLimit('reservation', user.id);
      if (!clientRateLimit.allowed) {
        toast.error(clientRateLimit.message || 'Too many reservations. Please try again later.', {
          icon: <Shield className="w-4 h-4" />,
        });
        isProcessingRef.current = false;
        return;
      }

      // Then check server-side (authoritative)
      const serverRateLimit = await checkServerRateLimit('reservation', user.id);
      if (!serverRateLimit.allowed) {
        toast.error(serverRateLimit.message || 'Too many reservations. Please try again later.', {
          icon: <Shield className="w-4 h-4" />,
        });
        recordClientAttempt('reservation', user.id); // Sync client cache
        isProcessingRef.current = false;
        return;
      }

      // CSRF Protection: Get token for sensitive operation
      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        toast.error('Security verification failed. Please try again.');
        isProcessingRef.current = false;
        return;
      }

      if (penaltyInfo?.isUnderPenalty) {
        toast.error(`You are under penalty. Time remaining: ${countdown}`);
        isProcessingRef.current = false;
        return;
      }

      // Check SmartPoints balance (quantity-based: 5 points per unit)
      const totalPointsNeeded = POINTS_PER_UNIT * quantity;
      if (pointsBalance < totalPointsNeeded) {
        setInsufficientPoints(true);
        setShowBuyPointsModal(true);
        toast.error(`⚠️ You need ${totalPointsNeeded} SmartPoints to reserve ${quantity} unit(s) (${POINTS_PER_UNIT} pts each). Buy more to continue!`);
        isProcessingRef.current = false;
        return;
      }

      setIsReserving(true);
      logger.log('✅ Starting reservation process...');

      // NOTE: Points deduction is now handled internally by create_reservation_atomic
      // The database function deducts points based on quantity (5 points per unit)
      logger.log('📝 Creating reservation (points will be deducted automatically)...');
      const reservation = await createReservation(offer.id, user.id, quantity);
      logger.log('✅ Reservation created:', reservation.id);

      // Update local balance (deduct the points locally for immediate UI feedback)
      const pointsDeducted = POINTS_PER_UNIT * quantity;
      const newBalance = pointsBalance - pointsDeducted;
      setPointsBalance(newBalance);

      toast.success(
        `✅ Reservation confirmed! ${pointsDeducted} SmartPoints deducted (${quantity} × ${POINTS_PER_UNIT}). New balance: ${newBalance}`
      );

      // Reset locks before navigation (success path)
      logger.log('🔄🔄🔄 SUCCESS - Resetting locks', callId);
      setIsReserving(false);
      isProcessingRef.current = false;

      onOpenChange(false);
      if (onSuccess) onSuccess();
      navigate(`/reservation/${reservation.id}`);
    } catch (error) {
      logger.error('❌❌❌ ERROR - Resetting locks', callId, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reservation';
      
      // Enhanced error message with retry button
      toast.error(errorMessage, {
        description: 'Something went wrong. Please try again.',
        action: {
          label: 'Retry',
          onClick: () => handleReserve(),
        },
        duration: 5000,
      });

      // Reset locks on error
      setIsReserving(false);
      isProcessingRef.current = false;
    }
  };

  const handleBuyPointsSuccess = (newBalance: number) => {
    setPointsBalance(newBalance);
    setInsufficientPoints(false);
    setShowBuyPointsModal(false);
    toast.success(`🎉 Success! You now have ${newBalance} SmartPoints`);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff <= 0) return 'Expired';
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getPickupTimes = (offer: Offer) => {
    const start = offer.pickup_start || offer.pickup_window?.start || '';
    const end = offer.pickup_end || offer.pickup_window?.end || '';
    return { start, end };
  };

  const handleShareFacebook = () => {
    if (!offer) return;
    // Use the dedicated offer URL for proper Open Graph meta tags
    const offerUrl = `${window.location.origin}/reserve/${offer.id}`;
    const shareUrls = generateShareUrls(offer, offerUrl);
    window.open(shareUrls.facebook, '_blank', 'width=600,height=400');
    toast.success('Opening Facebook share dialog...');
  };

  const handleShareTwitter = () => {
    if (!offer) return;
    // Use the dedicated offer URL for proper Open Graph meta tags
    const offerUrl = `${window.location.origin}/reserve/${offer.id}`;
    const shareUrls = generateShareUrls(offer, offerUrl);
    window.open(shareUrls.twitter, '_blank', 'width=600,height=400');
    toast.success('Opening Twitter share dialog...');
  };

  const handleShareInstagram = () => {
    // Instagram doesn't have a direct web sharing API
    // We'll copy the link and show instructions
    if (!offer) return;

    // Use the dedicated offer URL
    const offerUrl = `${window.location.origin}/reserve/${offer.id}`;

    // Try to copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(offerUrl)
        .then(() => {
          toast.success('Link copied! Open Instagram app and paste in your story or post.');
        })
        .catch(() => {
          toast.info('Please copy this link to share on Instagram: ' + offerUrl);
        });
    } else {
      toast.info('Please copy this link to share on Instagram: ' + offerUrl);
    }
  };

  if (!offer) return null;

  const pickupTimes = getPickupTimes(offer);
  const totalPrice = offer.smart_price * quantity;
  const maxQuantity = Math.min(3, offer.quantity_available); // Enforce 3-unit max
  const timeRemaining = getTimeRemaining(offer.expires_at);
  const isExpired = offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now();
  const isExpiringSoon = offer.expires_at &&
    new Date(offer.expires_at).getTime() - new Date().getTime() < 60 * 60 * 1000; // Less than 1 hour

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        ref={modalRef}
        className="max-w-lg max-h-[95vh] overflow-y-auto p-0 bg-transparent border-none shadow-none"
        style={{
          transform: `translate(-50%, calc(-50% + ${dragY}px))`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          opacity: isDragging ? Math.max(0.5, 1 - dragY / 400) : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Hidden DialogTitle for accessibility */}
        <DialogTitle className="sr-only">{offer.title}</DialogTitle>
        
        {/* Drag Handle Indicator */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 w-12 h-1 bg-gray-300 rounded-full" />
        
        {/* Close Button - Near Instagram Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-[214px] right-6 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 shadow-md transition-all duration-200 hover:scale-110"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>
        
        {/* Header Image Component */}
        {offer.images && offer.images.length > 0 && (
          <HeaderImage
            imageUrl={resolveOfferImageUrl(offer.images[0], offer.category)}
            title={offer.title}
            categoryName={offer.category}
          />
        )}

        {/* Content Area with padding - white background starts here */}
        <div className="px-5 pb-5 pt-24 space-y-3 bg-white rounded-b-xl shadow-xl">
          {/* Title Section Component */}
          <TitleSection
            title={offer.title}
            description={offer.description}
            partnerName={offer.partner?.business_name || 'Unknown'}
            partnerAddress={offer.partner?.address}
            onShareFacebook={handleShareFacebook}
            onShareTwitter={handleShareTwitter}
            onShareInstagram={handleShareInstagram}
          />

          {/* Unified Price Card - Balance + Price + Quantity in ONE */}
          <UnifiedPriceCard
            balance={pointsBalance}
            cost={POINTS_PER_UNIT * quantity}
            smartPrice={offer.smart_price}
            originalPrice={offer.original_price}
            quantity={quantity}
            maxQuantity={maxQuantity}
            availableStock={offer.quantity_available}
            onQuantityChange={setQuantity}
            disabled={penaltyInfo?.isUnderPenalty || false}
          />

          {/* Smart Context-Aware Alerts - Only show when relevant */}
          {insufficientPoints && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>⚠️ Insufficient SmartPoints</strong>
                <p className="mt-1">
                  You need {POINTS_PER_UNIT * quantity} more points.
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowBuyPointsModal(true)}
                  className="mt-2 bg-orange-600 hover:bg-orange-700"
                >
                  Buy SmartPoints
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {isExpired && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Expired</strong> - This offer is no longer available
              </AlertDescription>
            </Alert>
          )}

          {!isExpired && penaltyInfo?.isUnderPenalty && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Account Penalty</strong> - Blocked for: {countdown}
              </AlertDescription>
            </Alert>
          )}

          {!isExpired && isExpiringSoon && !penaltyInfo?.isUnderPenalty && (
            <Alert className="bg-orange-50 border-orange-200">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Hurry!</strong> Expires in {timeRemaining}
              </AlertDescription>
            </Alert>
          )}

          {/* Collapsible SmartPick Info Hint */}
          <SmartPickHint />

          {/* Pickup Window Card Component */}
          {pickupTimes.start && pickupTimes.end && (
            <PickupWindowCard
              startTime={formatTime(pickupTimes.start)}
              endTime={formatTime(pickupTimes.end)}
              countdown={timeRemaining}
              is24Hours={offer.partner?.open_24h || false}
              businessHours={offer.partner?.open_24h ? null : (
                offer.partner?.opening_time && offer.partner?.closing_time
                  ? { open: offer.partner.opening_time, close: offer.partner.closing_time }
                  : null
              )}
            />
          )}

          {/* Reserve Button Component with Total Price */}
          <ReserveButton
            onClick={handleReserve}
            disabled={isReserving || isExpired || offer.quantity_available === 0 || penaltyInfo?.isUnderPenalty || false}
            isLoading={isReserving}
            totalPrice={totalPrice}
          />

          {/* Penalty warning if applicable */}
          {penaltyInfo && penaltyInfo.penaltyCount > 0 && !penaltyInfo.isUnderPenalty && (
            <div className="text-center -mt-2">
              <p className="text-xs text-orange-600 font-medium">
                ⚠️ {penaltyInfo.penaltyCount} missed pickup{penaltyInfo.penaltyCount > 1 ? 's' : ''}. Don't miss this one!
              </p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Buy SmartPoints Modal */}
      {user && (
        <BuyPointsModal
          open={showBuyPointsModal}
          onClose={() => setShowBuyPointsModal(false)}
          userId={user.id}
          currentBalance={pointsBalance}
          onSuccess={handleBuyPointsSuccess}
        />
      )}
    </Dialog>
  );
}


