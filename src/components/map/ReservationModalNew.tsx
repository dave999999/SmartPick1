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
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-gradient-to-b from-white via-orange-50/10 to-white shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-300">
          <DialogTitle className="sr-only">Reserve {offer.title}</DialogTitle>
          
          {/* Compact Header Row - Image Left, Details Right */}
          <div className="relative p-3 pb-2">
            <div className="flex items-start gap-2.5">
              {/* Left: Compact Image */}
              {offer.images && offer.images.length > 0 && (
                <img
                  src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 150, quality: 75 })}
                  alt={offer.title}
                  className="w-[70px] h-[70px] rounded-xl object-cover flex-shrink-0 shadow-md border border-gray-100"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                />
              )}
              
              {/* Right: Title, Partner, Price, Emotional Tag */}
              <div className="flex-1 min-w-0 space-y-0.5">
                <h2 className="text-[13px] font-bold text-gray-900 line-clamp-2 leading-tight">{offer.title}</h2>
                <p className="text-[10px] text-gray-600">{offer.partner?.business_name}</p>
                <p className="text-xl font-bold text-green-600 tracking-tight leading-none mt-1">{offer.smart_price.toFixed(2)} GEL</p>
                <p className="text-[9px] font-semibold text-orange-600 mt-1">Great pick! ✨</p>
              </div>
              
              {/* Close Button - Top Right */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="h-6 w-6 rounded-full hover:bg-gray-100 -mt-0.5 -mr-0.5 flex-shrink-0 transition-all"
              >
                <X className="w-3 h-3 text-gray-400" />
              </Button>
            </div>
          </div>

          <div className="px-3 pb-3 space-y-2.5">
            {/* SmartPoints Price Card - Super Compact */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-2.5 rounded-xl border border-green-200/50 shadow-sm">
              <p className="text-[10px] text-gray-700 leading-tight mb-2">
                <span className="font-semibold">Pickup Price: {offer.smart_price.toFixed(2)} GEL</span><br />
                You'll pay at pickup — reserving costs <span className="font-bold text-orange-600">{totalPoints} SmartPoints</span>.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-green-200/50">
                <span className="text-[10px] text-gray-600">
                  Your Balance: <span className="font-bold text-teal-600">{userPoints} Points</span>
                </span>
                <Button
                  size="sm"
                  onClick={() => setShowBuyPointsModal(true)}
                  className="h-5 px-2 py-0 text-[9px] font-semibold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-full shadow-sm"
                >
                  <Wallet className="w-2.5 h-2.5 mr-0.5" />
                  Add Points
                </Button>
              </div>
            </div>

            {/* Quantity Selector - Super Compact Single Line */}
            <div className="bg-gray-50 p-2 rounded-xl border border-gray-200/50">
              <div className="flex items-center justify-center gap-3 mb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="h-7 w-7 rounded-full bg-white hover:bg-orange-50 shadow-sm border border-gray-200 disabled:opacity-40 transition-all active:scale-95"
                >
                  <Minus className="h-3 w-3 text-gray-700" />
                </Button>
                <span className="text-2xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="h-7 w-7 rounded-full bg-white hover:bg-orange-50 shadow-sm border border-gray-200 disabled:opacity-40 transition-all active:scale-95"
                >
                  <Plus className="h-3 w-3 text-gray-700" />
                </Button>
              </div>
              <p className="text-[9px] text-center text-gray-600 font-medium">
                MAX {maxQuantity} – <span className="text-green-600 font-semibold">{offer.quantity_available} available</span> · Fresh batch just in! 🌾
              </p>
            </div>

            {/* Pickup Details Card - Tiny 2-Line Card */}
            <div className="bg-orange-50/40 p-2 rounded-xl border border-orange-200/30 space-y-1">
              {pickupStart && pickupEnd && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-orange-600 flex-shrink-0" />
                  <span className="text-[10px] text-gray-700 font-medium">
                    {formatTime(pickupStart)} - {formatTime(pickupEnd)}
                  </span>
                </div>
              )}
              {partnerAddress && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="text-[10px] text-gray-700 leading-tight">{partnerAddress}</span>
                </div>
              )}
            </div>

            {/* Friendly Microcopy Block - Shorter */}
            <div className="text-center py-1.5">
              <p className="text-[10px] text-gray-700 leading-snug">
                We'll hold this discount for you. ✨ You'll only pay the pickup price.
              </p>
            </div>

            {/* Reservation Button - Compact Height */}
            <div className="space-y-1.5">
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-sm py-2.5 rounded-xl font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] duration-200"
                onClick={handleReserve}
                disabled={isReserving || offer.quantity_available === 0 || !isOnline || userPoints < totalPoints}
              >
                {isReserving ? (
                  <span className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Reserving...
                  </span>
                ) : (
                  `🤝 Reserve for ${totalPoints} SmartPoints`
                )}
              </Button>
              {userPoints < totalPoints && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-1.5 text-center">
                  <p className="text-[10px] text-red-600 font-semibold">
                    Need {totalPoints - userPoints} more point{totalPoints - userPoints > 1 ? 's' : ''} to reserve
                  </p>
                </div>
              )}
              <p className="text-center text-[9px] text-gray-500 font-medium">
                Held for 1 hour ⏳✨
              </p>
            </div>
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
