import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, User, PenaltyInfo } from '@/lib/types';
import { createReservation, checkUserPenalty } from '@/lib/api';
import { checkRateLimit } from '@/lib/rateLimiter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveOfferImageUrl } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, MapPin, AlertCircle, Minus, Plus, Share2, Coins, Shield } from 'lucide-react';
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
      console.error('Error loading points balance:', error);
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
      console.error('Error loading penalty info:', error);
    }
  };

  const handleReserve = async () => {
    const now = Date.now();
    const callId = Math.random().toString(36).substring(7);

    console.log('🔵🔵🔵 FUNCTION ENTRY', callId, {
      timestamp: new Date().toISOString(),
      isProcessing: isProcessingRef.current,
      stackTrace: new Error().stack?.split('\n').slice(1, 4).join('\n')
    });

    // 🔒 CRITICAL: Set protection flag IMMEDIATELY before ANY checks
    // This prevents race condition where both clicks pass checks before flag is set
    if (isProcessingRef.current) {
      console.warn('⚠️⚠️⚠️ BLOCKED:', callId, 'Already processing');
      toast.error('⏳ Please wait, already processing...');
      return;
    }
    isProcessingRef.current = true; // Lock IMMEDIATELY

    console.log('✅ LOCK ACQUIRED', callId, 'at', new Date().toISOString());

    console.log('🔵 Reserve button clicked', callId, {
      timeSinceLastClick: now - lastClickTimeRef.current,
      quantity,
      pointsNeeded: POINTS_PER_UNIT * quantity
    });

    try {
      if (!offer || !user) {
        console.log('❌ No offer or user');
        isProcessingRef.current = false;
        return;
      }

      // LAYER 2: Time-based debounce protection
      const timeSinceLastClick = now - lastClickTimeRef.current;
      if (timeSinceLastClick < DEBOUNCE_MS && lastClickTimeRef.current > 0) {
        console.warn(`⚠️ BLOCKED: Too fast! ${timeSinceLastClick}ms since last click (minimum: ${DEBOUNCE_MS}ms)`);
        toast.error(`⏳ Please wait ${Math.ceil((DEBOUNCE_MS - timeSinceLastClick) / 1000)} more seconds...`);
        isProcessingRef.current = false;
        return;
      }
      lastClickTimeRef.current = now;

      // Rate limiting: 10 reservations per hour per user
      const rateLimit = await checkRateLimit('reservation', user.id);
      if (!rateLimit.allowed) {
        toast.error(rateLimit.message || 'Too many reservations. Please try again later.', {
          icon: <Shield className="w-4 h-4" />,
        });
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
      console.log('✅ Starting reservation process...');

      // NOTE: Points deduction is now handled internally by create_reservation_atomic
      // The database function deducts points based on quantity (5 points per unit)
      console.log('📝 Creating reservation (points will be deducted automatically)...');
      const reservation = await createReservation(offer.id, user.id, quantity);
      console.log('✅ Reservation created:', reservation.id);

      // Update local balance (deduct the points locally for immediate UI feedback)
      const pointsDeducted = POINTS_PER_UNIT * quantity;
      const newBalance = pointsBalance - pointsDeducted;
      setPointsBalance(newBalance);

      toast.success(
        `✅ Reservation confirmed! ${pointsDeducted} SmartPoints deducted (${quantity} × ${POINTS_PER_UNIT}). New balance: ${newBalance}`
      );

      // Reset locks before navigation (success path)
      console.log('🔄🔄🔄 SUCCESS - Resetting locks', callId);
      setIsReserving(false);
      isProcessingRef.current = false;

      onOpenChange(false);
      if (onSuccess) onSuccess();
      navigate(`/reservation/${reservation.id}`);
    } catch (error) {
      console.error('❌❌❌ ERROR - Resetting locks', callId, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reservation';
      toast.error(errorMessage);

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Offer Image */}
        {offer.images && offer.images.length > 0 && (
          <div className="relative h-64 w-full overflow-hidden rounded-lg -mt-6 -mx-6 mb-4">
            <img
              src={resolveOfferImageUrl(offer.images[0], offer.category)}
              alt={offer.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
            />
            <Badge className="absolute top-4 right-4 bg-mint-500 hover:bg-mint-600 text-white">
              {offer.category}
            </Badge>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="text-2xl">{offer.title}</DialogTitle>
          <DialogDescription className="text-base">
            {offer.partner?.business_name}
          </DialogDescription>

          {/* Social Share Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              Share:
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                handleShareFacebook();
              }}
            >
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-600"
              onClick={(e) => {
                e.stopPropagation();
                handleShareTwitter();
              }}
            >
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-600"
              onClick={(e) => {
                e.stopPropagation();
                handleShareInstagram();
              }}
            >
              <Instagram className="h-4 w-4 mr-2" />
              Instagram
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* SmartPoints Balance */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[#EFFFF8] to-[#C9F9E9] rounded-lg border border-[#4CC9A8]/30">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#4CC9A8]" />
              <div>
                <p className="text-xs text-gray-600">Your Balance</p>
                <p className="text-lg font-bold text-gray-900">{pointsBalance} SmartPoints</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">This will cost</p>
              <p className="text-lg font-bold text-[#4CC9A8]">{POINTS_PER_UNIT * quantity} Points</p>
              <p className="text-xs text-gray-500">{quantity} × {POINTS_PER_UNIT} pts/unit</p>
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
          <p className="text-gray-700">{offer.description}</p>

          {/* Pricing */}
          <div className="bg-mint-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Smart Price per unit</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-mint-600">{offer.smart_price} GEL</span>
                <span className="text-sm text-gray-400 line-through ml-2">
                  {offer.original_price} GEL
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Save {((1 - offer.smart_price / offer.original_price) * 100).toFixed(0)}% with SmartPick
            </p>
          </div>

          {/* Quantity Selector */}
          <div>
            <Label htmlFor="quantity" className="text-base font-medium">
              Select Quantity (Max 3 per offer)
            </Label>
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || penaltyInfo?.isUnderPenalty}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.max(1, Math.min(maxQuantity, val)));
                }}
                className="w-20 text-center text-lg font-semibold"
                min="1"
                max={maxQuantity}
                disabled={penaltyInfo?.isUnderPenalty}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity || penaltyInfo?.isUnderPenalty}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="ml-auto">
                {offer.quantity_available} available
              </Badge>
            </div>
          </div>

          {/* Total Price */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <span className="text-lg font-medium">Total Price</span>
            <span className="text-3xl font-bold text-mint-600">{totalPrice.toFixed(2)} GEL</span>
          </div>

          {/* Pickup Info */}
          <div className="space-y-3 border-t pt-4">
            {pickupTimes.start && pickupTimes.end && (
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5 text-mint-600" />
                <div>
                  <p className="font-medium">Pickup Window</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                  </p>
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    {timeRemaining}
                  </p>
                </div>
              </div>
            )}
            {offer.partner && (
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-5 h-5 text-mint-600" />
                <div>
                  <p className="font-medium">{offer.partner.business_name}</p>
                  {offer.partner.address && (
                    <p className="text-sm text-gray-600">{offer.partner.address}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reserve Button */}
          <Button
            className="w-full bg-mint-600 hover:bg-mint-700 text-lg py-6"
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

          <p className="text-xs text-gray-500 text-center">
            Your reservation will be held for 30 minutes. You'll receive a QR code for pickup.
            {penaltyInfo && penaltyInfo.penaltyCount > 0 && !penaltyInfo.isUnderPenalty && (
              <span className="block mt-1 text-orange-600 font-medium">
                ⚠️ You have {penaltyInfo.penaltyCount} missed pickup{penaltyInfo.penaltyCount > 1 ? 's' : ''}. 
                Missing this one will result in a penalty.
              </span>
            )}
          </p>
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

