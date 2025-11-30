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
import { Clock, MapPin, Minus, Plus, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { logger } from '@/lib/logger';
import { PenaltyModal } from '@/components/PenaltyModal';
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
}

export default function ReservationModalNew({
  offer,
  user,
  open,
  onClose,
  onReservationCreated,
}: ReservationModalProps) {
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const [quantity, setQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyData, setPenaltyData] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(0);

  // Check penalty status when modal opens
  useEffect(() => {
    if (open && user) {
      checkPenaltyStatus();
    }
  }, [open, user]);

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
  
  const pickupStart = offer.pickup_start || offer.pickup_window?.start || '';
  const pickupEnd = offer.pickup_end || offer.pickup_window?.end || '';
  const partnerAddress = offer.partner?.address || offer.partner?.location?.address || '';

  const isExpiringSoon = offer.expires_at && 
    new Date(offer.expires_at).getTime() - new Date().getTime() < 60 * 60 * 1000;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              <span>Reserve Offer</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Food Image */}
            {offer.images && offer.images.length > 0 && (
              <div className="relative h-48 w-full overflow-hidden rounded-xl">
                <img
                  src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 600, quality: 85 })}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
                />
              </div>
            )}

            {/* Title */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{offer.title}</h2>
              <p className="text-sm text-gray-600">{offer.partner?.business_name}</p>
            </div>

            {/* Expiring Soon Warning */}
            {isExpiringSoon && (
              <Alert className="bg-orange-50 border-orange-200">
                <Clock className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-700">
                  <strong>Hurry!</strong> {getTimeRemaining(offer.expires_at)}
                </AlertDescription>
              </Alert>
            )}

            {/* Description */}
            <p className="text-sm text-gray-700">{offer.description}</p>

            {/* Pricing */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Price per unit</span>
                <span className="text-xl font-bold text-green-600">{offer.smart_price.toFixed(2)} GEL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Original price</span>
                <span className="text-sm text-gray-400 line-through">{offer.original_price.toFixed(2)} GEL</span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="rounded-full bg-gray-200 hover:bg-gray-300"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <div className="text-2xl font-bold">{quantity}</div>
                  <div className="text-xs text-gray-500">MAX {maxQuantity}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="rounded-full bg-gray-200 hover:bg-gray-300"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm text-orange-500 font-medium">
                  {offer.quantity_available} available
                </span>
              </div>
            </div>

            {/* Pickup Info */}
            <div className="space-y-2">
              {pickupStart && pickupEnd && (
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pickup Window</p>
                    <p className="text-xs text-gray-600">
                      {formatTime(pickupStart)} - {formatTime(pickupEnd)}
                    </p>
                  </div>
                </div>
              )}
              {partnerAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{offer.partner?.business_name}</p>
                    <p className="text-xs text-gray-600">{partnerAddress}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-orange-600">
                  {totalPrice.toFixed(2)} GEL
                </span>
              </div>
              <p className="text-xs text-orange-600 mt-1">💳 Pay at pickup</p>
            </div>

            {/* Reserve Button */}
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-6 rounded-xl font-bold"
              onClick={handleReserve}
              disabled={isReserving || offer.quantity_available === 0 || !isOnline}
            >
              {isReserving ? 'Reserving...' : '🎫 Confirm Reservation'}
            </Button>
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
    </>
  );
}
