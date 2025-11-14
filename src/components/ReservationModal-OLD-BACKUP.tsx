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
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto p-0">
        {/* Hero Image - Reduced height by 50%, modern gradient overlay */}
        {offer.images && offer.images.length > 0 && (
          <div className="relative h-36 w-full overflow-hidden rounded-t-lg">
            <img
              src={resolveOfferImageUrl(offer.images[0], offer.category)}
              alt={offer.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
            />
            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <Badge className="absolute top-3 right-3 bg-mint-500 hover:bg-mint-600 text-white text-xs px-2 py-1 shadow-md">
              {offer.category}
            </Badge>
          </div>
        )}

        {/* Content Area with padding */}
        <div className="px-5 pb-5 pt-4 space-y-4">
          {/* Title + Partner */}
          <div className="mb-1">
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1.5">
              {offer.title}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 text-mint-600" />
              <span>{offer.partner?.business_name}</span>
            </div>
          </div>

          {/* Social Share - Minimalist Icons Only */}
          <div className="flex items-center gap-2 pb-3 mb-1 border-b border-gray-100">
            <span className="text-xs text-gray-500">Share:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShareFacebook();
              }}
              className="p-1.5 rounded-full hover:bg-blue-50 transition-colors"
              aria-label="Share on Facebook"
            >
              <Facebook className="h-4 w-4 text-gray-400 hover:text-blue-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShareTwitter();
              }}
              className="p-1.5 rounded-full hover:bg-sky-50 transition-colors"
              aria-label="Share on Twitter"
            >
              <Twitter className="h-4 w-4 text-gray-400 hover:text-sky-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShareInstagram();
              }}
              className="p-1.5 rounded-full hover:bg-pink-50 transition-colors"
              aria-label="Share on Instagram"
            >
              <Instagram className="h-4 w-4 text-gray-400 hover:text-pink-600" />
            </button>
          </div>
          {/* Wallet + Points Info Card - Compact Modern Design */}
          <div className="bg-[#EFFFF8] rounded-xl p-3 border border-mint-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-mint-100 rounded-lg p-1.5">
                  <Coins className="w-4 h-4 text-mint-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Your Balance</p>
                  <p className="text-sm font-bold text-gray-900">{pointsBalance} SmartPoints</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">This costs</p>
                <p className="text-sm font-bold text-mint-600">{POINTS_PER_UNIT * quantity} pts</p>
              </div>
            </div>
          </div>

          {/* Insufficient Points Warning */}
          {insufficientPoints && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>⚠️ Insufficient SmartPoints</strong>
                <p className="mt-1">
                  You need {POINTS_PER_UNIT * quantity} SmartPoints to reserve {quantity} unit(s) ({POINTS_PER_UNIT} pts each).
                  Buy 100 points for ₾1 to continue.
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowBuyPointsModal(true)}
                  className="mt-2 bg-orange-600 hover:bg-orange-700"
                >
                  Buy SmartPoints Now
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Expired Offer Warning */}
          {isExpired && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>This offer has expired</strong>
                <p className="mt-1">
                  This offer is no longer available for reservation. Please browse other active offers.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Penalty Warning */}
          {!isExpired && penaltyInfo?.isUnderPenalty && (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>Account Penalty Active</strong>
                <p className="mt-1">
                  You missed {penaltyInfo.penaltyCount} pickup{penaltyInfo.penaltyCount > 1 ? 's' : ''}.
                  Reservations are blocked for: <strong>{countdown}</strong>
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Expiring Soon Warning */}
          {!isExpired && isExpiringSoon && (
            <Alert className="bg-orange-50 border-orange-200">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Hurry!</strong> This offer expires soon: {timeRemaining}
              </AlertDescription>
            </Alert>
          )}

          {/* Description */}
          {offer.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{offer.description}</p>
          )}

          {/* Smart Price Section - Clean Modern Design */}
          <div className="bg-gradient-to-br from-mint-50 to-mint-100/30 rounded-xl p-3.5 border border-mint-200/50">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-gray-600">Smart Price</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-mint-600">{offer.smart_price} GEL</span>
                <span className="text-sm text-gray-400 line-through">
                  {offer.original_price} GEL
                </span>
              </div>
            </div>
            <p className="text-xs text-mint-700 font-medium mt-1.5">
              Save {((1 - offer.smart_price / offer.original_price) * 100).toFixed(0)}% with SmartPick
            </p>
          </div>

          {/* Quantity Selector - Modern Pill Style */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Select Quantity</span>
              <Badge variant="outline" className="text-xs bg-gray-50">
                {offer.quantity_available} left
              </Badge>
            </div>
            <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-full p-1.5 max-w-[200px] mx-auto">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || penaltyInfo?.isUnderPenalty}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-mint-50 hover:border-mint-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Minus className="h-4 w-4 text-gray-600" />
              </button>
              <span className="text-xl font-bold text-gray-900 w-8 text-center">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity || penaltyInfo?.isUnderPenalty}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-mint-50 hover:border-mint-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            <p className="text-xs text-center text-gray-500 mt-1.5">Max 3 per offer</p>
          </div>

          {/* How SmartPick Works - Subtle Info Card */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-start gap-2">
              <div className="bg-mint-100 rounded-full p-1 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-mint-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-0.5">How SmartPick works</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Reserve now → Pick up within 1 hour → Show your QR code in store
                </p>
              </div>
            </div>
          </div>

          {/* Total Price - Clean Bold Design */}
          <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border-2 border-gray-200">
            <span className="text-base font-medium text-gray-700">Total Price</span>
            <span className="text-2xl font-bold text-mint-600">{totalPrice.toFixed(2)} GEL</span>
          </div>

          {/* Pickup Window - Compact Modern Design */}
          {pickupTimes.start && pickupTimes.end && (
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-semibold text-gray-700">Pickup Window</span>
                </div>
                <Badge className="bg-mint-500 text-white text-xs px-2 py-0.5">
                  {timeRemaining}
                </Badge>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-1.5">
                {formatTime(pickupTimes.start)} — {formatTime(pickupTimes.end)}
              </p>
              {offer.partner && (
                <p className="text-xs text-gray-600 mt-1">{offer.partner.business_name}</p>
              )}
            </div>
          )}

          {/* Reserve Button - Full Width Modern */}
          <Button
            className="w-full bg-mint-600 hover:bg-mint-700 text-white text-base font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            onClick={handleReserve}
            disabled={
              isReserving ||
              isExpired ||
              offer.quantity_available === 0 ||
              penaltyInfo?.isUnderPenalty ||
              false
            }
          >
            {isReserving
              ? 'Creating Reservation...'
              : isExpired
              ? 'Offer Expired'
              : penaltyInfo?.isUnderPenalty
              ? `Blocked - ${countdown}`
              : 'Reserve Now'}
          </Button>

          {/* Footer Hint */}
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500">
              Your reservation will be held for 1 hour.
            </p>
            {penaltyInfo && penaltyInfo.penaltyCount > 0 && !penaltyInfo.isUnderPenalty && (
              <p className="text-xs text-orange-600 font-medium">
                ⚠️ You have {penaltyInfo.penaltyCount} missed pickup{penaltyInfo.penaltyCount > 1 ? 's' : ''}.
                Missing this one will result in a penalty.
              </p>
            )}
          </div>
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


