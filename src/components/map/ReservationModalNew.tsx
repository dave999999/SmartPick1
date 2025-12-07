/**
 * ReservationModalNew - Compact Beige Glass Modal (Reference Match)
 *
 * EXACT MATCH to reference design with:
 * - Beige-tinted frosted glass
 * - Ultra-compact spacing
 * - Dark map background visible
 */

import { useState, useEffect } from 'react';
import { Offer, User } from '@/lib/types';
import { createReservation } from '@/lib/api';
import { canUserReserve, getPenaltyDetails } from '@/lib/api/penalty';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { requestQueue } from '@/lib/requestQueue';
import { indexedDBManager, STORES } from '@/lib/indexedDB';
import { resolveOfferImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Clock, MapPin, Minus, Plus, Sparkles, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { PenaltyModal } from '@/components/PenaltyModal';
import { BuyPointsModal } from '@/components/wallet/BuyPointsModal';
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

  useEffect(() => {
    if (open) setQuantity(initialQuantity);
  }, [open, initialQuantity]);

  useEffect(() => {
    if (open && user) {
      checkPenaltyStatus();
      fetchUserPoints();
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
      {/* Dark backdrop showing map */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal centered */}
      <div className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none">
        <div className="relative w-full max-w-[320px] pointer-events-auto animate-in zoom-in-95 duration-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center text-gray-800 hover:bg-white shadow-lg transition-all active:scale-95"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {/* Beige Glass Card - EXACT REFERENCE MATCH */}
          <div className="bg-gradient-to-br from-[#D8C8B8]/85 via-[#C8B8A8]/80 to-[#B8A898]/75 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/30">
            {/* Content - Ultra Compact */}
            <div className="p-4 space-y-2.5">

              {/* TOP: Image + Title + Badge */}
              <div className="flex items-start gap-3">
                {/* Food Image - Square */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md flex-shrink-0 border-2 border-white/40">
                  {offer.images && offer.images.length > 0 && (
                    <img
                      src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 128, quality: 85 })}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                    />
                  )}
                </div>

                {/* Title + Badge */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-gray-900 leading-tight mb-0.5">
                    {offer.title}
                  </h3>
                  <p className="text-[11px] text-gray-700 font-medium mb-1.5">
                    {offer.partner?.business_name || offer.category}
                  </p>
                  {/* Orange Points Badge */}
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 shadow-sm">
                    <Sparkles className="w-3 h-3 text-white" />
                    <span className="text-[11px] font-bold text-white">Reserve with {POINTS_PER_UNIT} Points</span>
                  </div>
                </div>
              </div>

              {/* Price Display - Inline Style */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/50 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Pickup Price</p>
                    <p className="text-[22px] font-black text-gray-900">${offer.smart_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">Reserve with Points</p>
                    <p className="text-[22px] font-black text-orange-600">{totalPoints} pts</p>
                  </div>
                </div>
                <p className="text-[9px] text-gray-600 mt-1 text-center">Balance: <span className="font-bold text-teal-700">{userPoints} pts</span></p>
              </div>

              {/* Add Points Button - If needed */}
              {!hasEnoughPoints && (
                <button
                  onClick={() => setShowBuyPointsModal(true)}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  Add Points
                </button>
              )}

              {/* Quantity Selector - Inline Compact */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl px-3 py-2 border border-white/50 shadow-sm flex items-center justify-between">
                <button
                  onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                  className="w-7 h-7 rounded-full border-2 border-gray-400 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-[20px] font-black text-gray-900">{quantity}</span>
                  <p className="text-[8px] text-gray-500 font-medium">Max {maxQuantity} left</p>
                </div>
                <button
                  onClick={() => quantity < maxQuantity && setQuantity(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                  className="w-7 h-7 rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-30 disabled:bg-gray-300 transition-all active:scale-90 flex items-center justify-center shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
              </div>

              {/* Pickup Window + Location - Single Block */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/50 shadow-sm">
                {/* Pickup Window */}
                {pickupStart && pickupEnd && (
                  <>
                    <div className="px-3 py-2 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5 text-orange-600" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[8px] font-bold text-gray-600 uppercase tracking-wide">Pickup Window</p>
                        <p className="text-[12px] font-black text-gray-900">
                          {formatTime(pickupStart)} - {formatTime(pickupEnd)}
                        </p>
                      </div>
                    </div>
                    <div className="h-px bg-gray-300/40" />
                  </>
                )}

                {/* Location */}
                <div className="px-3 py-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-orange-600" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[8px] font-bold text-gray-600 uppercase tracking-wide">Location</p>
                    <p className="text-[12px] font-black text-gray-900">{partnerAddress}</p>
                  </div>
                </div>
              </div>

              {/* Reserve Button - Full Width Orange */}
              <button
                onClick={handleReserve}
                disabled={isReserving || !hasEnoughPoints || !isOnline}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[14px] font-bold shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isReserving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Reserving...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Reserve for {totalPoints} SmartPoints
                  </>
                )}
              </button>

              {/* Helper Text */}
              <p className="text-[9px] text-gray-600 text-center leading-relaxed font-medium">
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
