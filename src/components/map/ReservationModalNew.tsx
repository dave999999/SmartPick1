/**
 * ReservationModal - In-page reservation flow
 * 
 * Opens as a modal/bottom-sheet on homepage instead of navigating to separate page.
 * After successful reservation, enters Navigation Mode.
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
        <DialogContent className="max-w-[420px] p-0 gap-0 overflow-hidden bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05),0_-2px_10px_rgba(0,0,0,0.03)] rounded-t-[32px] border-0 animate-in slide-in-from-bottom-4 duration-300 sm:rounded-t-[32px]">
          <DialogTitle className="sr-only">Reserve {offer.title}</DialogTitle>
          
          {/* Handle / Dragger */}
          <div className="flex justify-center pt-4 pb-3">
            <div className="w-10 h-1 bg-gray-300 rounded-full"></div>
          </div>
          
          <div className="px-6 pb-8 space-y-6">
            {/* 1. HEADER AREA - Product Photo + Details */}
            <div className="flex items-center gap-4">
              {/* Product Photo */}
              {offer.images && offer.images.length > 0 && (
                <div className="w-20 h-20 flex-shrink-0 rounded-[18px] overflow-hidden">
                  <img
                    src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 160, quality: 80 })}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                  />
                </div>
              )}
              
              {/* Product Details */}
              <div className="flex-grow">
                <h1 className="text-xl font-extrabold text-gray-900 leading-snug mb-1">{offer.title}</h1>
                <p className="text-sm text-gray-500 mb-2">{offer.partner?.business_name}</p>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-gray-900">{offer.smart_price.toFixed(2)} ₾</span>
                  <span className="text-xs font-semibold text-green-600">Great pick! ✨</span>
                </div>
              </div>
            </div>

            {/* 2. PICKUP & COST SECTION */}
            <div className="text-sm space-y-3">
              {/* Pickup Price Row */}
              <div className="flex justify-between items-center pb-3 border-b border-[#EAEAEA]">
                <span className="text-gray-600">Pickup price</span>
                <span className="font-semibold text-gray-900">{totalPrice.toFixed(2)} ₾</span>
              </div>
              {/* Reservation Cost Row */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reservation cost</span>
                <span className="font-semibold text-orange-500">{totalPoints} SmartPoints</span>
              </div>
            </div>

            {/* 3. BALANCE SECTION */}
            <div className="bg-[#E8F8ED] rounded-[18px] p-4 flex justify-between items-center">
              <p className="text-sm font-medium text-gray-800">
                Your balance: <span className="font-bold">{userPoints}</span> points
              </p>
              <Button
                onClick={() => setShowBuyPointsModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-3 rounded-full h-auto transition-all"
              >
                Add Points
              </Button>
            </div>

            {/* 4. QUANTITY SELECTOR */}
            <div className="flex justify-between items-center w-full bg-white rounded-[18px] border border-gray-200 shadow-sm p-3">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-all p-0"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-lg font-bold text-gray-900 w-6 text-center">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="w-8 h-8 rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-all p-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <span className="text-xs font-medium text-green-600">
                MAX {maxQuantity} — {offer.quantity_available} available
              </span>
            </div>

            {/* 5. PICKUP TIME + LOCATION */}
            <div className="space-y-4 p-4 bg-white rounded-[18px] border border-gray-200 shadow-sm">
              {/* Pickup Time */}
              {pickupStart && pickupEnd && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">
                    Pickup time: <span className="font-semibold text-gray-900">{formatTime(pickupStart)} – {formatTime(pickupEnd)}</span>
                  </span>
                </div>
              )}
              
              {/* Address */}
              {partnerAddress && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700">
                    Address: <span className="font-semibold text-gray-900">{partnerAddress}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 6. DESCRIPTION TEXT */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 text-center">
                We'll hold this discount for you. You'll only pay the pickup price.
              </p>
            </div>

            {/* 7. MAIN CTA BUTTON */}
            <Button
              className="w-full py-4 text-lg font-bold text-white bg-gradient-to-r from-[#FF8A00] to-[#FF6A00] hover:opacity-90 rounded-[28px] shadow-lg shadow-orange-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-orange-500/50"
              onClick={handleReserve}
              disabled={isReserving || offer.quantity_available === 0 || !isOnline || userPoints < totalPoints}
            >
              {isReserving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Reserving...
                </span>
              ) : (
                `Reserve for ${totalPoints} SmartPoints`
              )}
            </Button>
            
            {userPoints < totalPoints && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center mt-2">
                <p className="text-xs text-red-600 font-semibold">
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
