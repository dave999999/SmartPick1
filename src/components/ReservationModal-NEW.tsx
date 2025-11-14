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
import { logger } from '@/lib/logger';
import { resolveOfferImageUrl } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { updateMetaTags } from '@/lib/social-share';
import { getUserPoints } from '@/lib/smartpoints-api';
import { BuyPointsModal } from './BuyPointsModal';
import { useI18n } from '@/lib/i18n';

// Import new modular components
import HeaderImage from './reservation/HeaderImage';
import TitleSection from './reservation/TitleSection';
import WalletCard from './reservation/WalletCard';
import PriceQuantityCard from './reservation/PriceQuantityCard';
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
  const { t } = useI18n();
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
      const penalty = await checkUserPenalty(user.id);
      setPenaltyInfo(penalty);
    } catch (error) {
      logger.error('Error loading penalty info:', error);
    }
  };

  const handleReserve = async () => {
    if (!offer || !user) return;

    // Synchronous double-click protection
    const now = Date.now();
    if (isProcessingRef.current) {
      logger.warn('Reserve clicked while already processing');
      return;
    }
    if (now - lastClickTimeRef.current < DEBOUNCE_MS) {
      logger.warn(`Reserve clicked too quickly (${now - lastClickTimeRef.current}ms since last click)`);
      toast.error('Please wait before trying again');
      return;
    }

    // Check client-side rate limit (lightweight, immediate feedback)
    const clientRateLimitCheck = checkRateLimit(user.id);
    if (!clientRateLimitCheck.allowed) {
      logger.error('Client rate limit exceeded', { 
        userId: user.id,
        minuteCount: clientRateLimitCheck.minuteCount,
        hourCount: clientRateLimitCheck.hourCount,
        reason: clientRateLimitCheck.reason
      });
      toast.error(clientRateLimitCheck.message);
      return;
    }

    isProcessingRef.current = true;
    lastClickTimeRef.current = now;
    setIsReserving(true);

    try {
      // Fetch CSRF token for this request
      const csrf = await getCSRFToken();
      
      // Server-side rate limit check (before reservation creation)
      const serverRateLimitCheck = await checkServerRateLimit(user.id, csrf.token);
      if (!serverRateLimitCheck.success || !serverRateLimitCheck.allowed) {
        logger.error('Server rate limit exceeded', { 
          userId: user.id,
          serverResponse: serverRateLimitCheck
        });
        recordClientAttempt(user.id); // Record attempt for client tracking
        toast.error(serverRateLimitCheck.message || 'Too many reservation attempts. Please try again later.');
        return;
      }

      // Check points balance before proceeding
      const totalNeeded = POINTS_PER_UNIT * quantity;
      const currentPoints = await getUserPoints(user.id);
      const currentBalance = currentPoints?.balance ?? 0;
      
      if (currentBalance < totalNeeded) {
        setInsufficientPoints(true);
        setPointsBalance(currentBalance);
        toast.error('Insufficient SmartPoints balance');
        return;
      }

      const reservation = await createReservation(
        offer.id,
        user.id,
        quantity,
        csrf.token
      );

      // Record successful attempt
      recordClientAttempt(user.id);

      setPointsBalance(prev => prev - totalNeeded);
      toast.success('Reservation created successfully!');
      onSuccess?.();
      onOpenChange(false);
      
      // Navigate to the reservation detail page
      navigate(`/reservation/${reservation.id}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error creating reservation:', error);
      toast.error(`Failed to create reservation: ${errorMessage}`);
    } finally {
      setIsReserving(false);
      isProcessingRef.current = false;
    }
  };

  const handleShareFacebook = () => {
    if (!offer) return;
    const shareUrl = `${window.location.origin}/offer/${offer.id}`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank', 'width=600,height=400');
    toast.success('Opening Facebook share...');
  };

  const handleShareTwitter = () => {
    if (!offer) return;
    const shareUrl = `${window.location.origin}/offer/${offer.id}`;
    const text = `Check out this SmartPick: ${offer.title}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    toast.success('Opening Twitter share...');
  };

  const handleShareInstagram = () => {
    if (!offer) return;
    const shareUrl = `${window.location.origin}/offer/${offer.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied! Open Instagram and paste it in your story or bio.');
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
  };

  if (!offer) return null;

  const imageUrl = resolveOfferImageUrl(offer);
  const isExpired = new Date() > new Date(offer.valid_until);
  const isUnderPenalty = penaltyInfo?.isUnderPenalty ?? false;
  const totalCost = POINTS_PER_UNIT * quantity;
  const totalPrice = offer.smart_price * quantity;

  // Format pickup window times
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const pickupStart = new Date(offer.pickup_time_start);
  const pickupEnd = new Date(offer.pickup_time_end);
  const startTimeStr = formatTime(pickupStart);
  const endTimeStr = formatTime(pickupEnd);

  // Calculate countdown for pickup window
  const now = new Date();
  const diffMs = pickupEnd.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const pickupCountdown = diffMs > 0 ? `${diffHours}h ${diffMinutes}m left` : 'Expired';

  const isDisabled = isReserving || isExpired || isUnderPenalty || insufficientPoints;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 max-h-[95vh] overflow-y-auto">
          {/* Header Image */}
          <HeaderImage
            imageUrl={imageUrl}
            title={offer.title}
            categoryName={offer.categories?.name || 'Food'}
          />

          {/* Content Container */}
          <div className="px-5 pb-5 pt-4 space-y-4">
            {/* Title Section */}
            <TitleSection
              title={offer.title}
              partnerName={offer.partners?.store_name || 'Unknown'}
              onShareFacebook={handleShareFacebook}
              onShareTwitter={handleShareTwitter}
              onShareInstagram={handleShareInstagram}
            />

            {/* Wallet Card */}
            <WalletCard balance={pointsBalance} cost={totalCost} />

            {/* Alerts */}
            {insufficientPoints && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('insufficientPoints')}
                  <button
                    onClick={() => setShowBuyPointsModal(true)}
                    className="ml-2 underline font-medium hover:no-underline"
                  >
                    {t('buyPoints')}
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {isExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t('offerExpired')}</AlertDescription>
              </Alert>
            )}

            {isUnderPenalty && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('penaltyActive')} {countdown}
                </AlertDescription>
              </Alert>
            )}

            {/* Product Description */}
            {offer.description && (
              <div className="text-sm text-gray-600 leading-relaxed">
                {offer.description}
              </div>
            )}

            {/* Price & Quantity Card */}
            <PriceQuantityCard
              smartPrice={offer.smart_price}
              originalPrice={offer.original_price}
              quantity={quantity}
              maxQuantity={3}
              availableStock={offer.quantity_available}
              onQuantityChange={handleQuantityChange}
              disabled={isDisabled}
            />

            {/* SmartPick Info Hint */}
            <SmartPickHint />

            {/* Total Price */}
            <div className="flex items-center justify-between py-3 border-t border-gray-200">
              <span className="text-base font-semibold text-gray-700">{t('totalPrice')}</span>
              <span className="text-2xl font-bold text-gray-900">
                {totalPrice.toFixed(2)} GEL
              </span>
            </div>

            {/* Pickup Window */}
            <PickupWindowCard
              startTime={startTimeStr}
              endTime={endTimeStr}
              countdown={pickupCountdown}
              partnerAddress={offer.partners?.address || 'Location not available'}
            />

            {/* Reserve Button */}
            <ReserveButton
              onClick={handleReserve}
              disabled={isDisabled}
              isLoading={isReserving}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Buy Points Modal */}
      <BuyPointsModal
        open={showBuyPointsModal}
        onOpenChange={setShowBuyPointsModal}
        currentBalance={pointsBalance}
        onPurchaseSuccess={loadPointsBalance}
      />
    </>
  );
}
