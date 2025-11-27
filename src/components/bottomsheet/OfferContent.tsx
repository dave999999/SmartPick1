/**
 * OfferContent - Main content area with all sections
 * Includes: Title, Price, Balance, Reservation Cost, Quantity, Reserve Button
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Offer, User } from '@/lib/types';
import { Clock, AlertCircle } from 'lucide-react';
import { TitleSection } from './TitleSection';
import { PriceInfo } from './PriceInfo';
import { BalanceInfo } from './BalanceInfo';
import { PointsCost } from './PointsCost';
import { QuantitySelector } from './QuantitySelector';
import { ReserveButton } from './ReserveButton';
import { getUserPoints } from '@/lib/smartpoints-api';
import { checkUserPenalty, createReservation, getUserMaxSlots } from '@/lib/api';
import { checkRateLimit, checkServerRateLimit, recordClientAttempt } from '@/lib/rateLimiter-server';
import { getCSRFToken } from '@/lib/csrf';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BuyPointsModal } from '@/components/BuyPointsModal';

interface OfferContentProps {
  offer: Offer;
  user: User | null;
  isExpanded: boolean;
  onReserveSuccess?: () => void;
}

const POINTS_PER_UNIT = 5;
const DEBOUNCE_MS = 2000;

export function OfferContent({
  offer,
  user,
  isExpanded,
  onReserveSuccess
}: OfferContentProps) {
  const [quantity, setQuantity] = useState(1);
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [isReserving, setIsReserving] = useState(false);
  const [insufficientPoints, setInsufficientPoints] = useState(false);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);
  const [penaltyInfo, setPenaltyInfo] = useState<any>(null);
  const [countdown, setCountdown] = useState('');
  const [userMaxSlots, setUserMaxSlots] = useState(3);

  const isProcessingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const navigate = useNavigate();

  const maxQuantity = Math.min(3, offer.quantity_available); // Default max is 3
  const totalCost = POINTS_PER_UNIT * quantity;
  const totalPrice = offer.smart_price * quantity;

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!offer.expires_at) return '';
    const now = new Date();
    const end = new Date(offer.expires_at);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const timeRemaining = getTimeRemaining();
  const isExpired = timeRemaining === 'Expired';
  const isExpiringSoon = !isExpired && offer.expires_at && 
    (new Date(offer.expires_at).getTime() - new Date().getTime()) < 3600000; // Less than 1 hour

  // Load user data
  useEffect(() => {
    if (user) {
      loadPointsBalance();
      loadPenaltyInfo();
      loadUserMaxSlots();
      isProcessingRef.current = false;
    }
  }, [user, offer.id]);

  // Check insufficient points
  useEffect(() => {
    setInsufficientPoints(pointsBalance < totalCost);
  }, [pointsBalance, totalCost]);

  const loadPointsBalance = async () => {
    if (!user) return;
    try {
      const result = await getUserPoints(user.id);
      setPointsBalance(result?.balance || 0);
    } catch (error) {
      logger.error('Failed to load points balance:', error);
    }
  };

  const loadPenaltyInfo = async () => {
    if (!user) return;
    try {
      const info = await checkUserPenalty(user.id);
      setPenaltyInfo(info);
    } catch (error) {
      logger.error('Failed to load penalty info:', error);
    }
  };

  const loadUserMaxSlots = async () => {
    if (!user) return;
    try {
      const max = await getUserMaxSlots(user.id);
      setUserMaxSlots(max);
    } catch (error) {
      logger.error('Failed to load max slots:', error);
    }
  };

  const handleReserve = async () => {
    const callId = `reserve-${Date.now()}`;
    const now = Date.now();

    // Double-click protection
    if (isProcessingRef.current) {
      toast.error('⏳ Please wait, already processing...');
      return;
    }
    isProcessingRef.current = true;

    try {
      if (!offer || !user) {
        isProcessingRef.current = false;
        return;
      }

      // Time-based debounce
      const timeSinceLastClick = now - lastClickTimeRef.current;
      if (timeSinceLastClick < DEBOUNCE_MS && lastClickTimeRef.current > 0) {
        toast.error(`⏳ Please wait ${Math.ceil((DEBOUNCE_MS - timeSinceLastClick) / 1000)} more seconds...`);
        isProcessingRef.current = false;
        return;
      }
      lastClickTimeRef.current = now;

      // Rate limiting
      const serverRateLimit = await checkServerRateLimit('reservation', user.id);
      if (!serverRateLimit.allowed) {
        toast.error(serverRateLimit.message || 'Too many reservations. Please try again later.');
        isProcessingRef.current = false;
        return;
      }

      // CSRF protection
      const csrfToken = await getCSRFToken();
      if (!csrfToken) {
        toast.error('Security verification failed. Please try again.');
        isProcessingRef.current = false;
        return;
      }

      // Check penalty
      if (penaltyInfo?.isUnderPenalty) {
        toast.error(`You are under penalty. Time remaining: ${countdown}`);
        isProcessingRef.current = false;
        return;
      }

      // Check points balance
      if (pointsBalance < totalCost) {
        setInsufficientPoints(true);
        setShowBuyPointsModal(true);
        toast.error(`⚠️ You need ${totalCost} SmartPoints to reserve ${quantity} unit(s).`);
        isProcessingRef.current = false;
        return;
      }

      setIsReserving(true);
      logger.log('✅ Starting reservation process...');

      const reservation = await createReservation(offer.id, user.id, quantity);
      logger.log('✅ Reservation created:', reservation.id);

      const pointsDeducted = POINTS_PER_UNIT * quantity;
      const newBalance = pointsBalance - pointsDeducted;
      setPointsBalance(newBalance);

      toast.success(
        `✅ Reservation confirmed! ${pointsDeducted} SmartPoints deducted. New balance: ${newBalance}`
      );

      setIsReserving(false);
      isProcessingRef.current = false;

      if (onReserveSuccess) {
        onReserveSuccess();
      }

      navigate('/my-picks');

    } catch (error: any) {
      logger.error('❌ Reservation failed:', error);
      toast.error(error.message || 'Failed to create reservation. Please try again.');
      setIsReserving(false);
      isProcessingRef.current = false;
    }
  };

  const handleBuyPointsSuccess = () => {
    loadPointsBalance();
    setShowBuyPointsModal(false);
  };

  return (
    <motion.div
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="px-3.5 pb-3.5"
    >
      {/* Title Section - Always visible */}
      <TitleSection
        title={offer.title}
        description={offer.description}
        timeRemaining={timeRemaining}
        isExpiringSoon={isExpiringSoon}
        isExpanded={isExpanded}
      />

      {/* Expanded content - Only show when expanded */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-2.5 mt-2.5"
        >
          {/* Balance Info */}
          <BalanceInfo balance={pointsBalance} />

          {/* Pickup Price */}
          <PriceInfo
            smartPrice={offer.smart_price * quantity}
            originalPrice={offer.original_price * quantity}
          />

          {/* Reservation Cost - MAIN BLOCK */}
          <PointsCost cost={totalCost} />

          {/* Quantity Selector */}
          {maxQuantity > 1 && (
            <QuantitySelector
              quantity={quantity}
              maxQuantity={maxQuantity}
              availableStock={offer.quantity_available}
              onQuantityChange={setQuantity}
              disabled={isExpired || penaltyInfo?.isUnderPenalty}
            />
          )}

          {/* Alerts */}
          {insufficientPoints && (
            <Alert className="bg-orange-50 border-orange-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-sm">
                <strong>⚠️ Insufficient SmartPoints</strong>
                <p className="mt-1">You need {totalCost} points to reserve.</p>
                <button
                  onClick={() => setShowBuyPointsModal(true)}
                  className="mt-2 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Buy SmartPoints
                </button>
              </AlertDescription>
            </Alert>
          )}

          {isExpired && (
            <Alert className="bg-red-50 border-red-200 rounded-xl">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 text-sm">
                <strong>Expired</strong> - This offer is no longer available
              </AlertDescription>
            </Alert>
          )}

          {/* Reserve Button */}
          <ReserveButton
            onClick={handleReserve}
            disabled={isReserving || isExpired || offer.quantity_available === 0 || penaltyInfo?.isUnderPenalty || false}
            isLoading={isReserving}
            totalPrice={totalPrice}
          />
        </motion.div>
      )}

      {/* Buy Points Modal */}
      {user && (
        <BuyPointsModal
          open={showBuyPointsModal}
          onClose={() => setShowBuyPointsModal(false)}
          userId={user.id}
          currentBalance={pointsBalance}
          onSuccess={handleBuyPointsSuccess}
        />
      )}
    </motion.div>
  );
}
