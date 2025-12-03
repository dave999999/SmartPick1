/**
 * ReservationModalNew - Apple-Grade Premium Offer Details Sheet
 * 
 * DESIGN SPECIFICATIONS:
 * - Ultra-compact iOS Wallet/Apple Card aesthetic
 * - Glossy frosted glass cards with subtle gradients
 * - 35% reduced white space for optimal mobile density
 * - Premium haptic feedback and micro-animations
 * - Perfectly responsive for 360px-428px screens
 * 
 * VISUAL IDENTITY:
 * - Apple Wallet card styling
 * - Apple Maps place card layout
 * - Apple Music gradient CTA button
 * - SF Pro Display typography equivalent
 * 
 * Opens as a bottom sheet on homepage, enters Navigation Mode after reservation.
 */

import { useState, useEffect } from 'react';
import { Offer, User } from '@/lib/types';
import { createReservation, getCurrentUser } from '@/lib/api';
import { canUserReserve, getPenaltyDetails } from '@/lib/api/penalty';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { requestQueue } from '@/lib/requestQueue';
import { indexedDBManager, STORES } from '@/lib/indexedDB';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { resolveOfferImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Clock, MapPin, Minus, Plus, X, Wallet } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { PenaltyModal } from '@/components/PenaltyModal';
import { BuyPointsModal } from '@/components/wallet/BuyPointsModal';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

  // Sync quantity when modal opens with new initialQuantity
  useEffect(() => {
    if (open) {
      setQuantity(initialQuantity);
    }
  }, [open, initialQuantity]);

  // Fetch user points and check penalty status when modal opens
  useEffect(() => {
    if (open && user) {
      checkPenaltyStatus();
      fetchUserPoints();
    }
  }, [open, user]);

  const fetchUserPoints = async () => {
    if (!user) {
      logger.warn('No user provided to fetchUserPoints');
      return;
    }
    
    try {
      // Try to get the actual user ID - could be user.id or (user as any).id
      const userId = (user as any).id || user.id;
      logger.log('Fetching points for user:', { userId, userObject: user });
      
      const { data: points, error } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        logger.error('Supabase error fetching user points:', error);
        setUserPoints(0);
        return;
      }
      
      logger.log('Raw points data from DB:', points);
      const balance = points?.balance || 0;
      logger.log('User points balance parsed:', balance, 'Type:', typeof balance);
      setUserPoints(balance);
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
        
        // Get user points
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

      // Check if online - queue if offline
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

        const optimisticReservation = {
          id: requestId,
          offer_id: offer.id,
          customer_id: user.id,
          quantity,
          status: 'pending_sync',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          offer_title: offer.title,
          smart_price: offer.smart_price,
        };

        await indexedDBManager.put(STORES.RESERVATIONS, optimisticReservation);
        
        toast.success('📝 Reservation queued for sync');
        onClose();
        return;
      }

      // Online - create reservation
      const reservation = await createReservation(offer.id, user.id, quantity);
      
      // Cache the reservation
      await indexedDBManager.put(STORES.RESERVATIONS, reservation);
      
      toast.success(t('toast.reservationCreated'));
      
      // Enter navigation mode
      onReservationCreated(reservation.id);
      onClose();
    } catch (error) {
      logger.error('Error creating reservation:', error);
      
      // Check if penalty error
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
      } catch {
        // Not a penalty error
      }
      
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

  const totalPrice = offer.smart_price * quantity;
  const maxQuantity = Math.min(3, offer.quantity_available);
  const POINTS_PER_UNIT = 5;
  const totalPoints = POINTS_PER_UNIT * quantity;
  
  const pickupStart = offer.pickup_start || offer.pickup_window?.start || '';
  const pickupEnd = offer.pickup_end || offer.pickup_window?.end || '';
  const partnerAddress = offer.partner?.address || offer.partner?.location?.address || '';

  const isExpiringSoon = offer.expires_at && 
    new Date(offer.expires_at).getTime() - new Date().getTime() < 60 * 60 * 1000;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[420px] p-0 gap-0 overflow-hidden bg-[#F8F8F8] shadow-[0_-4px_24px_rgba(0,0,0,0.08),0_-2px_8px_rgba(0,0,0,0.04)] rounded-t-[28px] border-0 animate-in slide-in-from-bottom-4 duration-300 sm:rounded-t-[28px]">
          <DialogTitle className="sr-only">Reserve {offer.title}</DialogTitle>
          
          {/* Apple-style Drag Handle */}
          <div className="flex justify-center pt-3 pb-2 bg-white/60 backdrop-blur-xl">
            <div className="w-9 h-1 bg-[#D1D1D6] rounded-full" />
          </div>
          
          <div className="px-4 pb-3 space-y-3">
            {/* 1. COMPACT HEADER - Apple Wallet Style */}
            <div className="bg-white/95 backdrop-blur-xl rounded-[12px] p-3 flex items-start gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Thumbnail Image */}
              {offer.images && offer.images.length > 0 && (
                <div className="w-16 h-16 flex-shrink-0 rounded-[10px] overflow-hidden shadow-sm">
                  <img
                    src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 128, quality: 85 })}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                  />
                </div>
              )}
              
              {/* Title & Subtext */}
              <div className="flex-1 min-w-0">
                <h1 className="text-[17px] font-semibold text-[#1B1B1B] leading-tight mb-0.5 tracking-tight line-clamp-1">
                  {offer.title}
                </h1>
                <p className="text-[13px] text-[#888] mb-1.5 line-clamp-1">
                  {offer.partner?.business_name}
                </p>
                <div className="inline-flex items-baseline gap-1.5">
                  <span className="text-[20px] font-semibold text-[#1B1B1B] tracking-tight">
                    {offer.smart_price.toFixed(2)} ₾
                  </span>
                </div>
              </div>
            </div>

            {/* 2. PRICE CARDS - Frosted Glass Apple Style */}
            <div className="grid grid-cols-2 gap-2">
              {/* Pickup Price Card */}
              <div 
                className="bg-white/65 backdrop-blur-[22px] rounded-[14px] p-3 border border-white/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(247,247,247,0.7))' }}
              >
                <p className="text-[12px] text-[#888] mb-1 font-medium">Pickup price</p>
                <p className="text-[17px] font-semibold text-[#1B1B1B] tracking-tight">
                  {totalPrice.toFixed(2)} ₾
                </p>
              </div>
              
              {/* Reservation Cost Card */}
              <div 
                className="bg-white/65 backdrop-blur-[22px] rounded-[14px] p-3 border border-white/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(247,247,247,0.7))' }}
              >
                <p className="text-[12px] text-[#888] mb-1 font-medium">Reserve with</p>
                <p className="text-[17px] font-semibold text-[#FF8800] tracking-tight">
                  {totalPoints} Points
                </p>
              </div>
            </div>

            {/* 3. BALANCE CARD - Apple Wallet Mint Gradient */}
            <div 
              className="rounded-[14px] p-3 flex justify-between items-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#D9FCEB]/60"
              style={{ background: 'linear-gradient(135deg, #D9FCEB 0%, #ffffff 100%)' }}
            >
              <p className="text-[14px] font-medium text-[#1B1B1B]">
                Balance: <span className="font-semibold">{userPoints}</span> pts
              </p>
              <button
                onClick={() => setShowBuyPointsModal(true)}
                className="bg-[#21C58F] hover:bg-[#1FB581] text-white text-[13px] font-semibold px-3 py-1.5 rounded-full h-auto transition-all active:scale-95 shadow-sm"
              >
                Add Points
              </button>
            </div>

            {/* 4. QUANTITY SELECTOR - iOS Compact Stepper */}
            <div className="flex justify-between items-center bg-white/95 backdrop-blur-xl rounded-[14px] px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-7 h-7 rounded-full border border-[#E2E2E2] text-[#555] hover:bg-[#F8F8F8] disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90 flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
                <span className="text-[17px] font-semibold text-[#1B1B1B] w-5 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="w-7 h-7 rounded-full bg-[#FF8800] text-white hover:bg-[#E86F00] disabled:opacity-30 disabled:bg-[#EAEAEA] transition-all active:scale-90 flex items-center justify-center shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
              <span className="text-[11px] font-medium text-[#21C58F]">
                Max {maxQuantity} • {offer.quantity_available} left
              </span>
            </div>

            {/* 5. PICKUP INFO - Apple Maps Place Card Style */}
            <div 
              className="rounded-[14px] p-3 space-y-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              style={{ background: 'linear-gradient(135deg, #ffffff, #f9f9f9)' }}
            >
              {/* Pickup Time */}
              {pickupStart && pickupEnd && (
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#FF8800] flex-shrink-0" strokeWidth={2.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#888] font-medium uppercase tracking-wide mb-0.5">
                      Pickup window
                    </p>
                    <p className="text-[14px] font-semibold text-[#1B1B1B] tracking-tight">
                      {formatTime(pickupStart)} – {formatTime(pickupEnd)}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Divider */}
              {pickupStart && pickupEnd && partnerAddress && (
                <div className="h-px bg-[#EAEAEA]" />
              )}
              
              {/* Address */}
              {partnerAddress && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#FF8800] flex-shrink-0" strokeWidth={2.5} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#888] font-medium uppercase tracking-wide mb-0.5">
                      Location
                    </p>
                    <p className="text-[14px] font-semibold text-[#1B1B1B] leading-tight line-clamp-2">
                      {partnerAddress}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 6. HELPER TEXT */}
            <p className="text-[12px] text-[#B1B1B1] text-center px-2 leading-relaxed">
              Reserve now, pay on pickup. Your discount is guaranteed.
            </p>
          </div>
          
          {/* 7. FLOATING FOOTER CTA - Apple Music Gradient Style */}
          <div className="sticky bottom-0 bg-gradient-to-t from-[#F8F8F8] via-[#F8F8F8] to-transparent pt-2 pb-3 px-4">
            <button
              onClick={handleReserve}
              disabled={isReserving || offer.quantity_available === 0 || !isOnline || userPoints < totalPoints}
              className="w-full h-[52px] rounded-full text-[17px] font-semibold text-white bg-gradient-to-r from-[#FF8800] to-[#E86F00] hover:opacity-90 shadow-[0_6px_22px_rgba(255,136,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-150 active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 focus:outline-none"
              style={{ 
                boxShadow: isReserving ? 'none' : '0 6px 22px rgba(255,136,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)'
              }}
            >
              {isReserving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Reserving...
                </span>
              ) : (
                `Reserve for ${totalPoints} SmartPoints`
              )}
            </button>
            
            {userPoints < totalPoints && (
              <div className="mt-2 bg-[#FFF0F0] border border-[#FFD7D7] rounded-[12px] px-3 py-2 text-center">
                <p className="text-[12px] text-[#FF3B30] font-semibold">
                  Need {totalPoints - userPoints} more point{totalPoints - userPoints > 1 ? 's' : ''} to reserve
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Penalty Modal */}
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

      {/* Buy Points Modal */}
      {showBuyPointsModal && user && (
        <BuyPointsModal
          isOpen={showBuyPointsModal}
          onClose={() => {
            setShowBuyPointsModal(false);
            fetchUserPoints(); // Refresh balance after purchase
          }}
          currentBalance={userPoints}
          userId={user.id}
        />
      )}
    </>
  );
}
