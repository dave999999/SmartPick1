/**
 * ReservationModalNew - EXACT 1:1 Reference Match
 * Beige compact glass modal over dark map background
 */

import { useState, useEffect } from 'react';
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
import { CancellationCooldownCard } from '@/components/reservation/CancellationCooldownCard';
import { supabase } from '@/lib/supabase';

interface ReservationModalProps {
  offer: Offer;
  user: User | null;
  open: boolean;
  onClose: () => void;
  onReservationCreated: (reservationId: string) => void;
  initialQuantity?: number;
}

export default function ReservationModalNew({
  offer,
  user,
  open,
  onClose,
  onReservationCreated,
  initialQuantity = 1,
}: ReservationModalProps) {
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const [quantity, setQuantity] = useState(initialQuantity);
  const [isReserving, setIsReserving] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyData, setPenaltyData] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);
  
  // Cooldown state
  const cooldown = useReservationCooldown(user);

  useEffect(() => {
    if (open) setQuantity(initialQuantity);
  }, [open, initialQuantity]);

  useEffect(() => {
    if (open && user) {
      checkPenaltyStatus();
      fetchUserPoints();
      cooldown.refetch();
    }
  }, [open, user]);

  const fetchUserPoints = async () => {
    if (!user) return;
    try {
      const userId = (user as any).id || user.id;
      const { data: points, error } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', userId)
        .single();
      if (!error) setUserPoints(points?.balance || 0);
    } catch (error) {
      logger.error('Exception fetching user points:', error);
      setUserPoints(0);
    }
  };

  const checkPenaltyStatus = async () => {
    if (!user) return;
    try {
      const result = await canUserReserve(user.id);
      if (!result.can_reserve && result.penalty_id) {
        const penalty = await getPenaltyDetails(result.penalty_id);
        const { data: points } = await supabase
          .from('user_points')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        setPenaltyData(penalty);
        setUserPoints(points?.balance || 0);
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
      try {
        const errorMessage = error instanceof Error ? error.message : '';
        const errorData = JSON.parse(errorMessage);
        if (errorData.type === 'PENALTY_BLOCKED') {
          setPenaltyData(errorData.penalty);
          if (user) {
            const { data: points } = await supabase
              .from('user_points')
              .select('balance')
              .eq('user_id', user.id)
              .single();
            setUserPoints(points?.balance || 0);
          }
          setShowPenaltyModal(true);
          return;
        }
      } catch {}
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reservation';
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

          {/* COOLDOWN CARD - Show if user is in cooldown (positioned above modal) */}
          {cooldown.isInCooldown && (
            <div className="absolute -top-24 left-0 right-0 z-20 px-2 pointer-events-auto">
              <CancellationCooldownCard
                isVisible={true}
                timeUntilUnlock={cooldown.timeUntilUnlock}
                cancellationCount={cooldown.cancellationCount}
                unlockTime={cooldown.unlockTime}
              />
            </div>
          )}

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

              {/* PRICE + BALANCE ROW - Side by Side */}
              <div
                className="rounded-[20px] p-3 border border-white/40"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(15px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  {/* Left: Price */}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-0.5">Pickup Price</p>
                    <p className="text-[18px] font-black text-gray-900">₾{offer.smart_price.toFixed(2)}</p>
                  </div>
                  {/* Right: Add Points */}
                  <button
                    onClick={() => setShowBuyPointsModal(true)}
                    className="px-3 py-1 rounded-full text-[12px] font-semibold shadow-sm transition-all active:scale-95"
                    style={{
                      background: 'rgba(204,252,235,0.5)',
                      border: '1px solid rgba(22,220,168,0.3)',
                      color: '#0A8A5E',
                    }}
                  >
                    Add Points
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  {/* Balance */}
                  <p className="text-[12px] text-gray-700">
                    Balance: <span className="font-bold text-teal-700">{userPoints} pts</span>
                  </p>

                  {/* Reserve Badge */}
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, #FF8A00 0%, #FF4E00 100%)',
                      boxShadow: '0 2px 8px rgba(255,80,0,0.3)',
                    }}
                  >
                    <img src="/icons/button.png" alt="" className="w-4 h-4" />
                    <span className="text-[11px] font-medium text-white">{totalPoints} pts</span>
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
                  <p className="text-[10px] text-gray-600 font-medium">Max {maxQuantity} left</p>
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
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-0.5">Pickup Window</p>
                        <p className="text-[14px] font-black text-gray-900">
                          {formatTime(pickupStart)} - {formatTime(pickupEnd)}
                        </p>
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
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mb-0.5">Location</p>
                    <p className="text-[14px] font-black text-gray-900">{partnerAddress}</p>
                  </div>
                </div>
              </div>

              {/* RESERVE BUTTON - Final Cosmic Orange */}
              <button
                onClick={handleReserve}
                disabled={isReserving || !hasEnoughPoints || !isOnline || cooldown.isInCooldown}
                className="w-full h-[56px] rounded-[28px] text-white text-[16px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(90deg, #FF8A00 0%, #FF4E00 100%)',
                  boxShadow: '0 6px 16px rgba(255,120,0,0.35), 0 10px 30px rgba(0,0,0,0.18)',
                }}
                title={cooldown.isInCooldown ? 'You are in cooldown period - try again in ' + Math.ceil(cooldown.timeUntilUnlock / 1000) + ' seconds' : ''}
              >
                {isReserving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Reserving...
                  </>
                ) : cooldown.isInCooldown ? (
                  <>
                    <Clock className="w-5 h-5" />
                    In cooldown
                  </>
                ) : (
                  <>
                    <img src="/icons/button.png" alt="" className="w-12 h-12" />
                    Reserve price now
                  </>
                )}
              </button>

              {/* Helper Text */}
              <p className="text-[11px] text-gray-700 text-center font-medium leading-relaxed">
                Reserve now, pay on pickup. Your discount is guaranteed.
              </p>
            </div>
          </div>
        </div>
      </div>

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
