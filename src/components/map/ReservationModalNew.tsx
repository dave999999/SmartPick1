/**
 * ReservationModalNew - EXACT 1:1 Reference Match
 * Beige compact glass modal over dark map background
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Offer, User } from '@/lib/types';
import { createReservation } from '@/lib/api';
import { canUserReserve, getPenaltyDetails } from '@/lib/api/penalty';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useReservationCooldown } from '@/hooks/useReservationCooldown';
import { requestQueue } from '@/lib/requestQueue';
import { indexedDBManager, STORES } from '@/lib/indexedDB';
import { resolveOfferImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Clock, MapPin, Minus, Plus, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { PenaltyModal } from '@/components/PenaltyModal';
import { BuyPointsModal } from '@/components/wallet/BuyPointsModal';
import { EarnPointsSheet } from '@/components/wallet/EarnPointsSheet';
import { CancellationCooldownCard } from '@/components/reservation/CancellationCooldownCard';
import { PaidCooldownLiftModal } from '@/components/reservation/PaidCooldownLiftModal';
import { supabase } from '@/lib/supabase';

interface ReservationModalProps {
  offer: Offer;
  user: User | null;
  open: boolean;
  onClose: () => void;
  onReservationCreated: (reservationId: string) => void;
  initialQuantity?: number;
  userBalance?: number; // Pass from parent to avoid redundant API calls
}

export default function ReservationModalNew({
  offer,
  user,
  open,
  onClose,
  onReservationCreated,
  initialQuantity = 1,
  userBalance = 0,
}: ReservationModalProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isReserving, setIsReserving] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyData, setPenaltyData] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(userBalance);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);
  const [showEarnPointsSheet, setShowEarnPointsSheet] = useState(false);
  
  // Cooldown state - only check when modal is open
  const cooldown = useReservationCooldown(user, open);

  useEffect(() => {
    if (open) {
      setQuantity(initialQuantity);
      // Always fetch fresh points when modal opens
      if (user) {
        fetchUserPoints();
        checkPenaltyStatus();
      }
    }
  }, [open, initialQuantity, user]);

  // Update local points when prop changes (but fresh fetch takes priority)
  useEffect(() => {
    if (userBalance !== undefined && !open) {
      setUserPoints(userBalance);
    }
  }, [userBalance, open]);

  const fetchUserPoints = async () => {
    if (!user) return;
    try {
      const userId = (user as any).id || user.id;
      
      // Check if user is a partner
      const { data: partnerProfile } = await supabase
        .from('partners')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'APPROVED')
        .maybeSingle();
      
      // Use partner_points if partner, otherwise user_points
      const tableName = partnerProfile?.id ? 'partner_points' : 'user_points';
      const { data: points, error } = await supabase
        .from(tableName)
        .select('balance')
        .eq('user_id', userId)
        .maybeSingle();
      if (!error && points) setUserPoints(points.balance || 0);
    } catch (error) {
      logger.error('Exception fetching user points:', error);
    }
  };

  const checkPenaltyStatus = async () => {
    if (!user) return;
    try {
      const result = await canUserReserve(user.id);
      if (!result.can_reserve && result.penalty_id) {
        const penalty = await getPenaltyDetails(result.penalty_id);
        setPenaltyData(penalty);
        setShowPenaltyModal(true);
      }
    } catch (error) {
      logger.error('Error checking penalty status:', error);
    }
  };

  const handleReserve = async () => {
    if (!user) {
      toast.error(t('toast.signInToReserve'));
      onClose();
      return;
    }
    
    // Check if user has enough points - open earn points sheet if not
    if (!hasEnoughPoints) {
      setShowEarnPointsSheet(true);
      return;
    }
    
    if (quantity > offer.quantity_available) {
      toast.error(t('toast.notEnoughQuantity'));
      return;
    }
    if (quantity > 3) {
      toast.error(t('toast.maxUnits'));
      return;
    }

    try {
      setIsReserving(true);
      if (!isOnline) {
        const requestId = await requestQueue.queueReservation({
          offerId: offer.id,
          quantity,
          userId: user.id,
          offerDetails: {
            title: offer.title,
            partner_id: offer.partner_id,
            smart_price: offer.smart_price,
          },
        });
        await indexedDBManager.put(STORES.RESERVATIONS, {
          id: requestId,
          offer_id: offer.id,
          customer_id: user.id,
          quantity,
          status: 'pending_sync',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          offer_title: offer.title,
          smart_price: offer.smart_price,
        });
        toast.success('📝 Reservation queued for sync');
        onClose();
        return;
      }

      const reservation = await createReservation(offer.id, user.id, quantity);
      await indexedDBManager.put(STORES.RESERVATIONS, reservation);
      toast.success(t('toast.reservationCreated'));
      onReservationCreated(reservation.id);
      onClose();
    } catch (error) {
      logger.error('Error creating reservation:', error);
      
      // 🛡️ If offer expired, invalidate cache to remove it from UI immediately
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('expired')) {
        logger.warn('🗑️ Offer expired - invalidating cache to remove from UI');
        queryClient.invalidateQueries({ queryKey: ['offers'] });
        toast.error(t('toast.offerExpired') || 'This offer has expired and has been removed');
        onClose();
        return;
      }
      
      try {
        const errorData = JSON.parse(errorMessage);
        if (errorData.type === 'PENALTY_BLOCKED') {
          setPenaltyData(errorData.penalty);
          if (user) {
            // Check if user is a partner
            const { data: partnerProfile } = await supabase
              .from('partners')
              .select('id')
              .eq('user_id', user.id)
              .eq('status', 'APPROVED')
              .maybeSingle();
            
            const tableName = partnerProfile?.id ? 'partner_points' : 'user_points';
            const { data: points } = await supabase
              .from(tableName)
              .select('balance')
              .eq('user_id', user.id)
              .maybeSingle();
            setUserPoints(points?.balance || 0);
          }
          setShowPenaltyModal(true);
          return;
        }
      } catch {}
      toast.error(errorMessage);
    } finally {
      setIsReserving(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if business operates 24 hours (either flag or same pickup times)
  const is24HourBusiness = (start: string, end: string, partner?: any) => {
    // Check explicit flag first
    if (partner?.open_24h) return true;
    if (!start || !end) return false;
    
    // Format both times to compare - if they're the same when displayed, it's 24/7
    const startFormatted = formatTime(start);
    const endFormatted = formatTime(end);
    
    // If formatted times are identical, it's 24/7 operation
    return startFormatted === endFormatted;
  };

  const maxQuantity = Math.min(3, offer.quantity_available);
  const POINTS_PER_UNIT = 5;
  const totalPoints = POINTS_PER_UNIT * quantity;
  const hasEnoughPoints = userPoints >= totalPoints;

  const pickupStart = offer.pickup_start || offer.pickup_window?.start || '';
  const pickupEnd = offer.pickup_end || offer.pickup_window?.end || '';
  const partnerAddress = offer.partner?.address || offer.partner?.location?.address || 'SmartPick Kitchen';

  if (!open) return null;

  return (
    <>
      {/* Dark Backdrop - Map Visible */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px]" onClick={onClose} />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[51] flex items-center justify-center p-3 pointer-events-none">
        <div className="relative w-full max-w-[300px] pointer-events-auto animate-in zoom-in-95 duration-200">

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-white flex items-center justify-center text-gray-900 shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* MAIN CARD - Transparent Glass */}
          <div
            className="relative overflow-hidden rounded-[32px] shadow-[0_10px_60px_rgba(0,0,0,0.25)] border border-white/20"
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
            }}
          >
            {/* Content - EXACT SPACING */}
            <div className="p-5 space-y-3">

              {/* TOP: Image + Title + Reserve Badge */}
              <div className="flex items-start gap-3">
                {/* Food Image 72x72 */}
                <div
                  className="w-[72px] h-[72px] rounded-[20px] overflow-hidden flex-shrink-0 border-2 border-white/40"
                  style={{
                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  }}
                >
                  {offer.images && offer.images.length > 0 && (
                    <img
                      src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 144, quality: 90 })}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                    />
                  )}
                </div>

                {/* Title Stack */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-[17px] font-semibold text-gray-900 leading-tight mb-1">
                    {offer.title}
                  </h3>
                  <p className="text-[13px] text-gray-700 font-medium">
                    {offer.partner?.business_name || offer.category}
                  </p>
                </div>
              </div>

              {/* PRICE + POINTS CARD - Professional Clean Design */}
              <div
                className="rounded-[20px] overflow-hidden border border-white/40"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(15px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                {/* Price Section - Top */}
                <div className="px-4 pt-4 pb-3">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {t('reservation.pickupPrice')}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-[32px] font-black text-gray-900 leading-none">
                        ₾{offer.smart_price.toFixed(2)}
                      </span>
                      {offer.original_price && offer.original_price > offer.smart_price && (
                        <span className="text-[15px] font-medium text-gray-400 line-through">
                          ₾{offer.original_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {offer.original_price && offer.original_price > offer.smart_price && (
                      <div className="px-2.5 py-1 rounded-full bg-green-50 border border-green-300">
                        <span className="text-[11px] font-extrabold text-green-700">
                          -{Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Points Section - Bottom with subtle background */}
                <div className="px-4 py-3 bg-gray-50/60 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Cost */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[18px] font-bold text-orange-600">{totalPoints}</span>
                      <span className="text-[11px] font-semibold text-orange-500">points</span>
                    </div>
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-300" />
                    
                    {/* Balance with Add Button */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-medium text-gray-500">{t('reservation.balance')}:</span>
                        <span className="text-[15px] font-bold text-gray-900">{userPoints}</span>
                        <span className="text-[11px] font-medium text-gray-500">points</span>
                      </div>
                      <button
                        onClick={() => setShowBuyPointsModal(true)}
                        className="w-6 h-6 rounded-full bg-teal-500 hover:bg-teal-600 flex items-center justify-center transition-all active:scale-90"
                        title={t('reservation.addPoints')}
                      >
                        <span className="text-white text-[16px] font-bold leading-none">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUANTITY SELECTOR - Centered Capsule */}
              <div
                className="flex items-center justify-between rounded-[28px] px-4 py-2.5 border border-white/40"
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  backdropFilter: 'blur(15px)',
                  boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.05)',
                }}
              >
                <button
                  onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-9 h-9 rounded-full border-2 border-gray-400 flex items-center justify-center text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                >
                  <Minus className="w-4 h-4" strokeWidth={3} />
                </button>

                <div className="flex-1 text-center">
                  <span className="text-[16px] font-semibold text-gray-900">{quantity}</span>
                  <p className="text-[10px] text-gray-600 font-medium">{t('reservation.maxLeft').replace('{count}', maxQuantity.toString())}</p>
                </div>

                <button
                  onClick={() => quantity < maxQuantity && setQuantity(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #FF8A00 0%, #FF5A00 100%)',
                  }}
                >
                  <Plus className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>

              {/* PICKUP INFO BLOCK */}
              <div
                className="rounded-[24px] overflow-hidden border border-white/40"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(15px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                {/* Pickup Window */}
                {pickupStart && pickupEnd && (
                  <>
                    <div className="px-4 py-2.5 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-100">
                        <Clock className="w-4 h-4 text-orange-600" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-0.5">{t('reservation.pickupWindow')}</p>
                        {is24HourBusiness(pickupStart, pickupEnd, offer.partner) ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black bg-green-100 text-green-800 border border-green-300">
                            {t('reservation.open24_7')}
                          </span>
                        ) : (
                          <p className="text-[14px] font-black text-gray-900">
                            {formatTime(pickupStart)} - {formatTime(pickupEnd)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="h-px bg-gray-300/40" />
                  </>
                )}

                {/* Location */}
                <div className="px-4 py-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-orange-100">
                    <MapPin className="w-4 h-4 text-orange-600" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-0.5">{t('reservation.location')}</p>
                    <p className="text-[14px] font-black text-gray-900">{partnerAddress}</p>
                  </div>
                </div>
              </div>

              {/* RESERVE BUTTON - Final Cosmic Orange */}
              <button
                onClick={handleReserve}
                disabled={isReserving || !isOnline || cooldown.isInCooldown}
                className="w-full h-[56px] rounded-[28px] text-white text-[16px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(90deg, #FF8A00 0%, #FF4E00 100%)',
                  boxShadow: '0 6px 16px rgba(255,120,0,0.35), 0 10px 30px rgba(0,0,0,0.18)',
                }}
                title={cooldown.isInCooldown ? 'You are in cooldown period - try again in ' + Math.ceil(cooldown.timeUntilUnlock / 1000) + ' seconds' : ''}
              >
                {isReserving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('reservation.reserving')}
                  </>
                ) : cooldown.isInCooldown ? (
                  <>
                    <Clock className="w-5 h-5" />
                    {t('reservation.inCooldown')}
                  </>
                ) : (
                  <>
                    <img src="/icons/button.png" alt="" className="w-12 h-12" />
                    {t('reservation.reserveNow')}
                  </>
                )}
              </button>

              {/* Helper Text */}
              <p className="text-[11px] text-gray-700 text-center font-medium leading-relaxed">
                {t('reservation.helperText')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* COOLDOWN MODALS - Show different modal based on resetCount */}
      {cooldown.isInCooldown && cooldown.resetCount === 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto">
            <CancellationCooldownCard
              isVisible={true}
              timeUntilUnlock={cooldown.timeUntilUnlock}
              cancellationCount={cooldown.cancellationCount}
              unlockTime={cooldown.unlockTime}
              resetCooldownUsed={cooldown.resetCooldownUsed}
              resetCount={cooldown.resetCount}
              userPoints={user?.smart_points || 0}
              onResetCooldown={cooldown.resetCooldown}
              isResetting={cooldown.resetLoading}
            />
          </div>
        </div>
      )}

      {cooldown.isInCooldown && cooldown.resetCount >= 1 && (
        <PaidCooldownLiftModal
          isVisible={true}
          timeUntilUnlock={cooldown.timeUntilUnlock}
          resetCount={cooldown.resetCount}
          userPoints={user?.smart_points || 0}
          onLiftWithPoints={cooldown.liftCooldownWithPoints}
          isLifting={cooldown.resetLoading}
        />
      )}

      {/* Modals */}
      {showPenaltyModal && penaltyData && (
        <PenaltyModal
          penalty={penaltyData}
          userPoints={userPoints}
          onClose={() => setShowPenaltyModal(false)}
          onPenaltyLifted={() => {
            setShowPenaltyModal(false);
            checkPenaltyStatus();
          }}
        />
      )}

      {/* Earn Points Sheet */}
      <EarnPointsSheet
        isOpen={showEarnPointsSheet}
        onClose={() => setShowEarnPointsSheet(false)}
        onBuyPoints={() => {
          setShowEarnPointsSheet(false);
          setShowBuyPointsModal(true);
        }}
      />

      {/* Buy Points Modal */}
      {showBuyPointsModal && user && (
        <BuyPointsModal
          isOpen={showBuyPointsModal}
          onClose={() => {
            setShowBuyPointsModal(false);
            fetchUserPoints();
          }}
          currentBalance={userPoints}
          userId={user.id}
        />
      )}
    </>
  );
}
