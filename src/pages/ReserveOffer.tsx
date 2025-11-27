import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Offer, PenaltyInfo } from '@/lib/types';
import { getOfferById, createReservation, getCurrentUser, checkUserPenalty } from '@/lib/api';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { requestQueue } from '@/lib/requestQueue';
import { indexedDBManager, STORES } from '@/lib/indexedDB';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { resolveOfferImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Clock, MapPin, AlertCircle, Minus, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { updateMetaTags } from '@/lib/social-share';
import { logger } from '@/lib/logger';

export default function ReserveOffer() {
  const { offerId } = useParams<{ offerId: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [penaltyInfo, setPenaltyInfo] = useState<PenaltyInfo | null>(null);
  const [countdown, setCountdown] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const { subscribeToPush, isSupported: pushSupported } = usePushNotifications();

  useEffect(() => {
    loadOffer();
    loadPenaltyInfo();
  }, [offerId]);

  useEffect(() => {
    if (penaltyInfo?.isUnderPenalty && penaltyInfo.penaltyUntil) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = penaltyInfo.penaltyUntil!.getTime() - now.getTime();
        
        if (diff <= 0) {
          setCountdown(t('penalty.lifted'));
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

  const loadOffer = async () => {
    if (!offerId) return;

    try {
      setIsLoading(true);
      const data = await getOfferById(offerId);
      setOffer(data);
      // Update meta tags for social sharing
      if (data) {
        updateMetaTags(data);
      }
    } catch (error) {
      logger.error('Error loading offer:', error);
  toast.error(t('toast.failedLoadOffer'));
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPenaltyInfo = async () => {
    try {
      const { user } = await getCurrentUser();
      if (!user) {
        toast.error(t('toast.signInToReserve'));
        navigate('/');
        return;
      }

      const info = await checkUserPenalty(user.id);
      setPenaltyInfo(info);
    } catch (error) {
      logger.error('Error loading penalty info:', error);
    }
  };

  const handleReserve = async () => {
    if (!offer) return;

    if (penaltyInfo?.isUnderPenalty) {
      toast.error(`${t('toast.underPenalty')} ${countdown}`);
      return;
    }

    try {
      setIsReserving(true);
      const { user } = await getCurrentUser();
      if (!user) {
        toast.error(t('toast.signInToReserve'));
        navigate('/');
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

      // Check if online - queue if offline
      if (!isOnline) {
        // Queue the reservation for later
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

        // Create optimistic reservation in IndexedDB
        const optimisticReservation = {
          id: requestId,
          offer_id: offer.id,
          customer_id: user.id,
          quantity,
          status: 'pending_sync',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
          offer_title: offer.title,
          smart_price: offer.smart_price,
        };

        await indexedDBManager.put(STORES.RESERVATIONS, optimisticReservation);
        
        toast.success('📝 Reservation queued for sync');
        navigate('/my-picks');
        return;
      }

      // Online - create reservation immediately
      const reservation = await createReservation(offer.id, user.id, quantity);
      
      // Cache the reservation
      await indexedDBManager.put(STORES.RESERVATIONS, reservation);
      
      // Request push notification permission after first successful reservation
      if (pushSupported) {
        try {
          // Check if this is user's first reservation
          const allReservations = await indexedDBManager.getAll(STORES.RESERVATIONS) as unknown as import('@/lib/types').Reservation[];
          const userReservations = allReservations.filter(r => r.customer_id === user.id);
          
          if (userReservations.length === 1) { // First reservation
            setTimeout(async () => {
              const subscribed = await subscribeToPush(user.id);
              if (subscribed) {
                toast.success('🔔 Push notifications enabled! We\'ll notify you about nearby offers');
              }
            }, 1500); // Small delay so user sees reservation success first
          }
        } catch (error) {
          logger.error('Failed to request push permission', error);
          // Silently fail - don't disrupt reservation flow
        }
      }
      
      toast.success(t('toast.reservationCreated'));
      
      // Delay to ensure database transaction is committed and RLS policies can see the new row
      // Partners reserving other partners' offers need this because of RLS policy evaluation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      navigate(`/reservation/${reservation.id}`);
    } catch (error) {
      logger.error('Error creating reservation:', error);
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
    
    if (diff <= 0) return t('timer.expired');
    if (hours > 0) return `${hours}h ${minutes}m ${t('timer.left') ?? 'left'}`;
    return `${minutes}m ${t('timer.left') ?? 'left'}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t('offer.loading')}</p>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">{t('offer.notFound')}</p>
      </div>
    );
  }

  const totalPrice = offer.smart_price * quantity;
  const maxQuantity = Math.min(3, offer.quantity_available); // Enforce 3-unit max
  
  // Get pickup times - support both flat and nested structures
  const pickupStart = offer.pickup_start || offer.pickup_window?.start || '';
  const pickupEnd = offer.pickup_end || offer.pickup_window?.end || '';
  
  // Get partner address - support both flat and nested structures
  const partnerAddress = offer.partner?.address || offer.partner?.location?.address || '';

  const isExpiringSoon = offer.expires_at && 
    new Date(offer.expires_at).getTime() - new Date().getTime() < 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-white safe-area">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('header.backToOffers')}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-md pb-24">
        {/* Food Image Card */}
        {offer.images && offer.images.length > 0 && (
          <div className="relative h-72 w-full overflow-hidden rounded-3xl mb-6 shadow-2xl">
            <img
              src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 800, quality: 85 })}
              alt={offer.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          </div>
        )}

        {/* Content Card */}
        <div className="space-y-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{offer.title}</h1>
            <p className="text-gray-600">{offer.partner?.business_name}</p>
          </div>

          {/* Penalty Warning */}
          {penaltyInfo?.isUnderPenalty && (
            <Alert className="bg-red-500/20 border-red-500/50 mb-4">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                <strong>{t('penalty.accountPenaltyActive')}</strong>
                <p className="mt-1">
                  {t('penalty.missedPrefix')} {penaltyInfo.penaltyCount} {t('penalty.missedSuffix')}
                  {' '}{t('penalty.blockedFor')} <strong>{countdown}</strong>
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Expiring Soon Warning */}
          {isExpiringSoon && (
            <Alert className="bg-orange-500/20 border-orange-500/50 mb-4">
              <Clock className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-orange-300">
                <strong>{t('offer.hurry')}</strong> {t('map.showingAvailable')}: {getTimeRemaining(offer.expires_at)}
              </AlertDescription>
            </Alert>
          )}

          <p className="text-gray-700 mb-6">{offer.description}</p>

          {/* Pricing Card */}
          <div className="bg-gray-50 p-5 rounded-2xl mb-4 border border-gray-200">
            {/* Top Bar: Balance & Current Price */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">₾</span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Your Balance</p>
                  <p className="text-xl font-bold text-gray-900">4,386</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Current Price</p>
                <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-2xl font-bold" style={{color: '#4CAF50'}}>{offer.smart_price.toFixed(2)}</span>
                  <span className="text-sm text-gray-500">GEL</span>
                </div>
              </div>
            </div>
            
            {/* Bottom: Cost & Original Price */}
            <div className="flex items-start justify-between gap-8">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Cost</p>
                <p className="text-2xl font-bold text-orange-500">{quantity * 5} points</p>
              </div>
              
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-500 mb-1">Original Price</p>
                <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-xl font-bold text-gray-400 line-through">{offer.original_price.toFixed(2)}</span>
                  <span className="text-sm text-gray-400">GEL</span>
                </div>
              </div>
            </div>
            <div className="text-center bg-blue-50 text-blue-600 text-xs px-3 py-2 rounded-lg mt-4">
              💳 Pay at pickup
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="bg-gray-50 p-5 rounded-2xl mb-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || penaltyInfo?.isUnderPenalty}
                className="min-w-[44px] min-h-[44px] rounded-full bg-gray-200 hover:bg-gray-300 text-gray-900"
                aria-label="Decrease quantity"
              >
                <Minus className="h-5 w-5" />
              </Button>
              <div className="text-center relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.max(1, Math.min(maxQuantity, val)));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur(); // Dismiss keyboard
                    }
                  }}
                  disabled={penaltyInfo?.isUnderPenalty}
                  className="text-4xl font-bold text-gray-900 mb-1 bg-transparent text-center w-20 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg"
                />
                <div className="text-xs text-gray-500 uppercase tracking-wider">MAX {maxQuantity}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity || penaltyInfo?.isUnderPenalty}
                className="min-w-[44px] min-h-[44px] rounded-full bg-gray-200 hover:bg-gray-300 text-gray-900"
                aria-label="Increase quantity"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-orange-500 font-medium">
                {offer.quantity_available} {t('offer.availableSuffix')}
              </span>
            </div>
          </div>

          {/* Pickup Info */}
          <div className="space-y-3 mb-6">
            {pickupStart && pickupEnd && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t('label.pickupWindow')}</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(pickupStart)} - {formatTime(pickupEnd)}
                  </p>
                  <p className="text-xs font-medium mt-1" style={{color: '#4CAF50'}}>
                    ⏱ {getTimeRemaining(offer.expires_at)}
                  </p>
                </div>
              </div>
            )}
            {offer.partner && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" style={{color: '#4CAF50'}} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{offer.partner.business_name}</p>
                  {partnerAddress && (
                    <p className="text-sm text-gray-600">{partnerAddress}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reserve Button */}
          <Button
            className="w-full bg-orange-500 hover:bg-orange-600 text-white text-lg py-7 rounded-2xl font-bold shadow-lg mb-3"
            onClick={handleReserve}
            disabled={
              isReserving || 
              offer.quantity_available === 0 || 
              penaltyInfo?.isUnderPenalty ||
              !isOnline
            }
          >
            {isReserving 
              ? t('reservation.creating') 
              : penaltyInfo?.isUnderPenalty 
              ? `${t('reservation.blocked')} ${countdown}` 
              : '🎫 Reserve for Free'}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            {t('reservation.heldNotice')}
            {penaltyInfo && penaltyInfo.penaltyCount > 0 && !penaltyInfo.isUnderPenalty && (
              <span className="block mt-1 text-orange-500 font-medium">
                ⚠️ {t('reservation.penaltyWarningPrefix')} {penaltyInfo.penaltyCount} {t('reservation.penaltyWarningSuffix')}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}


