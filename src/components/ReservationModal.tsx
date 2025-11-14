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
import { Badge } from '@/components/ui/badge';
import { resolveOfferImageUrl } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, MapPin, AlertCircle, Minus, Plus, Coins, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Facebook, Twitter, Instagram } from 'lucide-react';
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
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto p-0 gap-0">
        {/* Hidden DialogTitle for accessibility */}
        <DialogTitle className="sr-only">{offer.title}</DialogTitle>
        
        {/* Circular Overlapping Image Design - Reference Style */}
        <div className="relative">
          {/* Colored Background Section */}
          <div className="h-[140px] bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500" />
          
          {/* Circular Image - Overlapping/Merged Effect */}
          {offer.images && offer.images.length > 0 && (
            <div className="absolute left-1/2 top-[70px] -translate-x-1/2 z-10">
              <div className="relative">
                {/* White ring effect */}
                <div className="w-[200px] h-[200px] rounded-full bg-white p-2 shadow-2xl">
                  <img
                    src={resolveOfferImageUrl(offer.images[0], offer.category)}
                    alt={offer.title}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
                    }}
                  />
                </div>
                {/* Category badge on image */}
                <Badge className="absolute top-2 right-2 bg-white/95 text-gray-900 shadow-md hover:bg-white font-semibold px-3 py-1 text-xs">
                  {offer.category}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Content Area - Starts below circular image */}
        <div className="px-6 pb-6 pt-[110px] space-y-5 bg-white rounded-t-3xl -mt-4 relative z-0">
          {/* Clean Title Section - Reference Style */}
          <div className="text-center space-y-3">
            {/* Title with inline quantity controls */}
            <div className="flex items-center justify-center gap-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {offer.title}
              </h2>
              
              {/* Inline quantity selector */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1.5">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || penaltyInfo?.isUnderPenalty}
                  className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-base font-bold text-gray-900 min-w-[1.5rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity || penaltyInfo?.isUnderPenalty}
                  className="w-6 h-6 flex items-center justify-center text-gray-700 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center justify-center gap-1">
              <span className="text-yellow-500 text-base">⭐</span>
              <span className="text-sm font-semibold text-gray-900">4.9</span>
              <span className="text-xs text-gray-500">(3.3k)</span>
            </div>

            {/* Description */}
            {offer.description && (
              <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
                {offer.description}
              </p>
            )}
          </div>

          {/* Size/Quantity Options - Reference Style Pills */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((size) => {
                const isSelected = quantity === size;
                const isAvailable = size <= maxQuantity;
                const price = (offer.smart_price * size).toFixed(2);
                
                return (
                  <button
                    key={size}
                    onClick={() => isAvailable && setQuantity(size)}
                    disabled={!isAvailable || penaltyInfo?.isUnderPenalty}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all
                      ${isSelected 
                        ? 'border-mint-500 bg-mint-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                      ${!isAvailable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className={`w-8 h-8 rounded-full mb-2 flex items-center justify-center ${
                      isSelected ? 'bg-mint-500' : 'bg-gray-100'
                    }`}>
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                        {size}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      {size}-Piece{size > 1 ? 's' : ''}
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {price} GEL
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-center text-gray-500">
              {offer.quantity_available} left • Max {maxQuantity}
            </p>
          </div>

          {/* Balance & Points Section */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-medium">Balance</p>
                <p className="text-lg font-bold text-gray-900">{pointsBalance} pts</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600 font-medium">Cost</p>
              <p className="text-lg font-bold text-mint-600">{POINTS_PER_UNIT * quantity} pts</p>
            </div>
          </div>

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

          {/* Pickup Time - Minimal */}
          {pickupTimes.start && pickupTimes.end && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-orange-900">Pickup Window</p>
                <p className="text-sm font-bold text-orange-600">
                  {formatTime(pickupTimes.start)} — {formatTime(pickupTimes.end)}
                </p>
              </div>
              {!isExpired && (
                <Badge className="bg-green-500 text-white border-0 text-xs">
                  {timeRemaining}
                </Badge>
              )}
            </div>
          )}

          {/* Total Amount & Reserve Button - Reference Style */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
              <span className="text-base font-bold text-gray-900">Total Amount</span>
              <span className="text-2xl font-black text-mint-600">{totalPrice.toFixed(2)} GEL</span>
            </div>

            <Button
              onClick={handleReserve}
              disabled={isReserving || isExpired || offer.quantity_available === 0 || penaltyInfo?.isUnderPenalty || false}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {isReserving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Reserving...
                </>
              ) : isExpired ? (
                'Offer Expired'
              ) : offer.quantity_available === 0 ? (
                'Sold Out'
              ) : penaltyInfo?.isUnderPenalty ? (
                'Account Blocked'
              ) : (
                'Reserve Now'
              )}
            </Button>
          </div>

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


