import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Offer } from '@/lib/types';
import { getOfferById, createReservation, getCurrentUser } from '@/lib/api';
import { canUserReserve, getPenaltyDetails, getUserCooldownStatus } from '@/lib/api/penalty';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { requestQueue } from '@/lib/requestQueue';
import { indexedDBManager, STORES } from '@/lib/indexedDB';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { resolveOfferImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Clock, MapPin, AlertCircle, Minus, Plus, Bell } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { updateMetaTags } from '@/lib/social-share';
import { logger } from '@/lib/logger';
import { PenaltyModal } from '@/components/PenaltyModal'; // NEW: Import penalty modal
import { CooldownSheet } from '@/components/reservation/CooldownSheet'; // NEW: Import cooldown sheet
import { supabase } from '@/lib/supabase'; // NEW: For getting user points
import { useReservationCooldown } from '@/hooks/useReservationCooldown'; // CRITICAL: Cooldown hook with dialogs
import { CancellationCooldownCard } from '@/components/reservation/CancellationCooldownCard';
import { PaidCooldownLiftModal } from '@/components/reservation/PaidCooldownLiftModal';
import { motion } from 'framer-motion';

export default function ReserveOffer() {
  const { offerId } = useParams<{ offerId: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isReserving, setIsReserving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { t } = useI18n();
  const isOnline = useOnlineStatus();
  const { subscribeToPush, isSupported: pushSupported } = usePushNotifications();
  
  // CRITICAL: Use the cooldown hook that handles dialogs
  const cooldown = useReservationCooldown(user, true);
  
  // DEBUG: Log cooldown state
  useEffect(() => {
    console.log('[ReserveOffer] Cooldown state:', {
      isInCooldown: cooldown.isInCooldown,
      cancellationCount: cooldown.cancellationCount,
      resetCount: cooldown.resetCount,
      userId: user?.id
    });
  }, [cooldown.isInCooldown, cooldown.cancellationCount, cooldown.resetCount, user?.id]);

  // CRITICAL: Show warning dialog automatically on page load if count is 3 or 4
  useEffect(() => {
    console.log('[ReserveOffer] Dialog trigger check:', {
      user: !!user,
      offer: !!offer,
      count: cooldown.cancellationCount,
      shouldShow: (cooldown.cancellationCount === 3 || cooldown.cancellationCount === 4)
    });
    
    if (user && offer && (cooldown.cancellationCount === 3 || cooldown.cancellationCount === 4)) {
      console.log('[ReserveOffer] ✅ AUTO-SHOWING COOLDOWN WARNING DIALOG');
      setShowCooldownWarning(true);
    } else {
      console.log('[ReserveOffer] ❌ NOT showing dialog', {
        reason: !user ? 'no user' : !offer ? 'no offer' : 'count not 3 or 4'
      });
    }
  }, [user, offer, cooldown.cancellationCount]);
  
  // Penalty modal state (new system)
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyData, setPenaltyData] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(0);
  
  // Cooldown modal state (friendly 1-hour timeout)
  const [showCooldownSheet, setShowCooldownSheet] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  
  // Business closed dialog state
  const [showClosedDialog, setShowClosedDialog] = useState(false);
  const [businessOpenTime, setBusinessOpenTime] = useState<string>('');
  const [timeUntilOpen, setTimeUntilOpen] = useState<string>('');
  
  // Cooldown warning dialog state (shown BEFORE reservation when count=3 or 4)
  const [showCooldownWarning, setShowCooldownWarning] = useState(false);
  const [agreedToCooldownRisk, setAgreedToCooldownRisk] = useState(false);
  
  // Countdown timer for business opening
  useEffect(() => {
    if (!showClosedDialog || !businessOpenTime) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = businessOpenTime.split(':').map(Number);
      const openTime = new Date();
      openTime.setHours(hours, minutes, 0, 0);
      
      // If opening time is earlier than now, it means tomorrow
      if (openTime <= now) {
        openTime.setDate(openTime.getDate() + 1);
      }
      
      const diff = openTime.getTime() - now.getTime();
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hoursLeft > 0) {
        setTimeUntilOpen(`${hoursLeft} საათი ${minutesLeft} წუთში`);
      } else if (minutesLeft > 0) {
        setTimeUntilOpen(`${minutesLeft} წუთ ${secondsLeft} წამში`);
      } else if (secondsLeft > 0) {
        setTimeUntilOpen(`${secondsLeft} წამში`);
      } else {
        setTimeUntilOpen('ახლავე იხსნება');
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [showClosedDialog, businessOpenTime]);

  useEffect(() => {
    loadOffer();
    loadUser();
    checkPenaltyStatus();
    checkCooldownStatus(); // NEW: Check cooldown on page load
  }, [offerId]);

  const loadUser = async () => {
    try {
      const { user } = await getCurrentUser();
      setUser(user);
    } catch (error) {
      logger.error('Error loading user:', error);
    }
  };

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
    } catch (error: any) {
      logger.error('Error loading offer:', error);
      
      // Show specific error message for expired offers
      const errorMsg = error?.message || '';
      if (errorMsg.includes('expired') || errorMsg.includes('pickup window') || errorMsg.includes('ended')) {
        toast.error(t('toast.offerExpired') || 'This offer has expired or is no longer available');
      } else {
        toast.error(t('toast.failedLoadOffer'));
      }
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  // Check new penalty system
  const checkPenaltyStatus = async () => {
    try {
      const { user } = await getCurrentUser();
      if (!user) return;
      
      const result = await canUserReserve(user.id);
      
      if (!result.can_reserve && result.penalty_id) {
        const penalty = await getPenaltyDetails(result.penalty_id);
        
        // Check if user is a partner
        const { data: partnerProfile } = await supabase
          .from('partners')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'APPROVED')
          .maybeSingle();
        
        // Get user points from correct table
        const tableName = partnerProfile?.id ? 'partner_points' : 'user_points';
        const { data: points } = await supabase
          .from(tableName)
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setPenaltyData(penalty);
        setUserPoints(points?.balance || 0);
        setShowPenaltyModal(true);
      }
    } catch (error) {
      logger.error('Error checking penalty status:', error);
    }
  };

  // Check cooldown status (3+ cancels in 30min = 1hr timeout)
  const checkCooldownStatus = async () => {
    try {
      const { user } = await getCurrentUser();
      if (!user) return;
      
      const cooldownStatus = await getUserCooldownStatus(user.id);
      
      if (cooldownStatus.inCooldown && cooldownStatus.cooldownUntil) {
        setCooldownUntil(cooldownStatus.cooldownUntil);
        setShowCooldownSheet(true);
      }
    } catch (error) {
      logger.error('Error checking cooldown status:', error);
    }
  };

  const handleReserve = async () => {
    if (!offer) return;

    console.log('[ReserveOffer] handleReserve called - Current count:', cooldown.cancellationCount, 'Agreed:', agreedToCooldownRisk);

    try {
      setIsReserving(true);
      const { user } = await getCurrentUser();
      if (!user) {
        toast.error(t('toast.signInToReserve'));
        navigate('/');
        return;
      }

      // Check if business is closed BEFORE making API call (to avoid rate limit)
      const pickupStart = offer.pickup_start || offer.pickup_window?.start;
      if (pickupStart && new Date(pickupStart) > new Date()) {
        const pickupDate = new Date(pickupStart);
        const hours = pickupDate.getHours();
        const minutes = pickupDate.getMinutes();
        const openTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        setBusinessOpenTime(openTime);
        setShowClosedDialog(true);
        setIsReserving(false);
        return;
      }

      // At count 3 or 4, user must agree to warning first
      if ((cooldown.cancellationCount === 3 || cooldown.cancellationCount === 4) && !agreedToCooldownRisk) {
        console.log('[ReserveOffer] Blocking reservation - user has not agreed to warning');
        setShowCooldownWarning(true);
        setIsReserving(false);
        return;
      }

      // Block completely at count >= 5
      if (cooldown.cancellationCount >= 5) {
        toast.error('თქვენ ამოწურეთ დღევანდელი გაუქმების ლიმიტი. სცადეთ ხვალ.');
        setIsReserving(false);
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

      // If we reach here, proceed with reservation
      await proceedWithReservation();
      
    } catch (error: any) {
      logger.error('Error creating reservation:', error);
      setIsReserving(false);
      // Handle specific errors...
      if (error.message?.includes('rate limit')) {
        toast.error(t('toast.rateLimitExceeded'));
      } else if (error.message?.includes('penalty') || error.message?.includes('suspended')) {
        // Extract penalty data from error message
        try {
          const penaltyMatch = error.message.match(/penalty_data=(\{.*\})/);
          if (penaltyMatch) {
            const data = JSON.parse(penaltyMatch[1]);
            setPenaltyData(data);
            setShowPenaltyModal(true);
          } else {
            toast.error(error.message);
          }
        } catch (parseError) {
          toast.error(error.message);
        }
      } else if (error.message?.includes('cooldown')) {
        // Extract cooldown time from error
        const timeMatch = error.message.match(/until (.+)$/);
        if (timeMatch) {
          setCooldownUntil(new Date(timeMatch[1]));
          setShowCooldownSheet(true);
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error(error.message || t('toast.reservationFailed'));
      }
    }
  };

  // Function to actually create the reservation (after all checks pass)
  const proceedWithReservation = async () => {
    if (!offer) return;

    const { user } = await getCurrentUser();
    if (!user) return;

    try {
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
          const userReservations = allReservations.filter(r => r.customer_id === reservation.customer_id);
          
          if (userReservations.length === 1) { // First reservation
            setTimeout(async () => {
              const subscribed = await subscribeToPush(reservation.customer_id);
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
      
      // NEW: Check if it's a penalty error
      try {
        const errorMessage = error instanceof Error ? error.message : '';
        const errorData = JSON.parse(errorMessage);
        if (errorData.type === 'PENALTY_BLOCKED') {
          const penaltyDetails = errorData.penalty;
          
          // Get user points
          const { user } = await getCurrentUser();
          if (user) {
            const { data: points } = await supabase
              .from('user_points')
              .select('balance')
              .eq('user_id', user.id)
              .single();
            setUserPoints(points?.balance || 0);
          }
          
          // Check if it's a suspension (4th+) or warning (1st-3rd)
          const isSuspension = ['1hour', '5hour', '24hour', 'permanent'].includes(penaltyDetails.penalty_type);
          
          if (isSuspension) {
            // Show SuspensionModal for 4th+ offense
            setSuspensionPenalty(penaltyDetails);
            setShowSuspensionModal(true);
          } else {
            // Show MissedPickupPopup for 1st-3rd offense
            setPenaltyData(penaltyDetails);
            setShowPenaltyModal(true);
          }
          return;
        }
      } catch {
        // Not a penalty error, continue with regular error handling
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create reservation';
      
      // Check if business is closed
      if (errorMessage.startsWith('BUSINESS_CLOSED:')) {
        const openTime = errorMessage.split(':').slice(1).join(':'); // Extract HH:MM
        setBusinessOpenTime(openTime);
        setShowClosedDialog(true);
        return;
      }
      
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
  
  // Check if business operates 24 hours (either flag or same pickup times)
  const is24HourBusiness = () => {
    if (offer.partner?.open_24h) return true;
    if (!pickupStart || !pickupEnd) return false;
    const startTime = new Date(pickupStart);
    const endTime = new Date(pickupEnd);
    const diffMinutes = Math.abs(endTime.getTime() - startTime.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Less than 5 minutes difference means 24/7
  };
  
  // Get partner address - support both flat and nested structures
  const partnerAddress = offer.partner?.address || offer.partner?.location?.address || '';

  const isExpiringSoon = offer.expires_at && 
    new Date(offer.expires_at).getTime() - new Date().getTime() < 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-white safe-area">
      {/* DEBUG BANNER */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 border-b-2 border-yellow-400 p-2 text-xs text-center">
          Count: {cooldown.cancellationCount} | Agreed: {agreedToCooldownRisk ? 'YES' : 'NO'} | Dialog: {showCooldownWarning ? 'OPEN' : 'CLOSED'}
        </div>
      )}
      
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
                disabled={quantity <= 1}
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
                  disabled={false}
                  className="text-4xl font-bold text-gray-900 mb-1 bg-transparent text-center w-20 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg"
                />
                <div className="text-xs text-gray-500 uppercase tracking-wider">MAX {maxQuantity}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
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
                  {is24HourBusiness() ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
                        OPEN 24/7
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {formatTime(pickupStart)} - {formatTime(pickupEnd)}
                    </p>
                  )}
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
              !isOnline ||
              // Disable if count 3/4 and user hasn't agreed
              ((cooldown.cancellationCount === 3 || cooldown.cancellationCount === 4) && !agreedToCooldownRisk) ||
              // Disable completely at count >= 5
              cooldown.cancellationCount >= 5
            }
          >
            {cooldown.cancellationCount >= 5 
              ? '🚫 დღევანდელი ლიმიტი ამოწურულია'
              : isReserving 
                ? t('reservation.creating') 
                : '🎫 Reserve for Free'}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            {t('reservation.heldNotice')}
          </p>
        </div>
      </div>
      
      {/* NEW: Penalty Modal */}
      {showPenaltyModal && penaltyData && (
        <PenaltyModal
          penalty={penaltyData}
          userPoints={userPoints}
          onClose={() => setShowPenaltyModal(false)}
          onPenaltyLifted={() => {
            setShowPenaltyModal(false);
            checkPenaltyStatus(); // Refresh penalty status
          }}
        />
      )}
      
      {/* NEW: Cooldown Sheet (Friendly 1-hour timeout) */}
      {showCooldownSheet && cooldownUntil && (
        <CooldownSheet
          isOpen={showCooldownSheet}
          onClose={() => setShowCooldownSheet(false)}
          cooldownUntil={cooldownUntil}
        />
      )}
      
      {/* CRITICAL: Cooldown Dialogs with Lift Options */}
      {/* DEBUG: Show what's being checked */}
      {console.log('[ReserveOffer] Checking dialog conditions:', {
        isInCooldown: cooldown.isInCooldown,
        count: cooldown.cancellationCount,
        shouldShowCount3: cooldown.isInCooldown && cooldown.cancellationCount === 3,
        shouldShowCount4: cooldown.isInCooldown && cooldown.cancellationCount === 4,
        shouldShowCount5: cooldown.isInCooldown && cooldown.cancellationCount >= 5
      })}
      
      {/* 3 cancellations: FREE lift with checkbox */}
      {cooldown.isInCooldown && cooldown.cancellationCount === 3 ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
          {console.log('[ReserveOffer] Rendering count=3 dialog')}
          <div className="pointer-events-auto">
            <CancellationCooldownCard
              isVisible={true}
              timeUntilUnlock={cooldown.timeUntilUnlock}
              cancellationCount={cooldown.cancellationCount}
              unlockTime={cooldown.unlockTime}
              resetCooldownUsed={cooldown.resetCooldownUsed}
              resetCount={cooldown.resetCount}
              userPoints={userPoints}
              onResetCooldown={cooldown.resetCooldown}
              isResetting={cooldown.resetLoading}
            />
          </div>
        </div>
      ) : null}

      {/* 4 cancellations: Must pay 100 points to lift */}
      {cooldown.isInCooldown && cooldown.cancellationCount === 4 && (
        <PaidCooldownLiftModal
          isVisible={true}
          timeUntilUnlock={cooldown.timeUntilUnlock}
          resetCount={1}
          userPoints={userPoints}
          onLiftWithPoints={cooldown.liftCooldownWithPoints}
          isLifting={cooldown.resetLoading}
        />
      )}
      
      {/* 5+ cancellations: Blocked until tomorrow - NO LIFT OPTION */}
      {cooldown.isInCooldown && cooldown.cancellationCount >= 5 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto max-w-sm w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header - Red gradient */}
            <div className="bg-gradient-to-br from-red-500 via-red-400 to-pink-500 px-6 py-5 text-center">
              <div className="text-5xl mb-3">🌙 😴</div>
              <h3 className="text-xl font-bold text-white mb-1">
                დღეს საკმარისია! 🙏
              </h3>
              <p className="text-sm text-white/90">
                დაისვენეთ და ხვალ გააგრძელეთ
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-sm text-red-900 leading-relaxed">
                  <strong>5 გაუქმება ერთ დღეში</strong> ზედმეტად ბევრია. 
                  <br /><br />
                  პარტნიორებს სჭირდებათ სტაბილურობა და თქვენც გჭირდებათ დასვენება! 💙
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="text-center mb-3">
                  <div className="text-3xl mb-2">🌅</div>
                  <p className="text-sm font-semibold text-blue-900">
                    ხვალ ახალი დღეა!
                  </p>
                </div>
                <p className="text-xs text-blue-800 text-center">
                  შეგიძლიათ კვლავ დაიწყოთ სწორი ფეხით და დააგროვოთ ქულები 🎯
                </p>
              </div>

              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all"
              >
                შეთავაზებების ნახვა
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cooldown Warning Dialog - Shown BEFORE reservation at count 3 or 4 */}
      <Dialog open={showCooldownWarning} onOpenChange={(open) => {
        setShowCooldownWarning(open);
        if (!open) {
          setAgreedToCooldownRisk(false); // Reset checkbox when closing
          setIsReserving(false);
        }
      }}>
        <DialogContent className="max-w-[340px] rounded-2xl p-0 border-none bg-white shadow-2xl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-3 text-center">
              <div className="text-5xl mb-3">
                {cooldown.cancellationCount === 4 ? '🚨' : '⚠️'}
              </div>
              <DialogTitle className="text-lg font-bold text-gray-900 mb-2">
                {cooldown.cancellationCount === 4 ? 'ბოლო შესაძლებლობა!' : 'გააფრთხილება'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Warning about cancellation consequences
              </DialogDescription>
            </div>

            {/* Content */}
            <div className="px-6 pb-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-gray-800 leading-relaxed">
                  {cooldown.cancellationCount === 4 ? (
                    <>
                      <strong className="text-red-600">დღეს უკვე 4-ჯერ გააუქმეთ რეზერვაცია.</strong>
                      <br /><br />
                      თუ ამ რეზერვაციასაც გააუქმებთ, მეხუთე გაუქმების შემდეგ დაიბლოკებით მთელი დღის განმავლობაში.
                      <br /><br />
                      💰 შეზღუდვის მოხსნა დაგიჯდებათ 100 ქულა.
                    </>
                  ) : (
                    <>
                      <strong className="text-amber-700">დღეს უკვე 3-ჯერ გააუქმეთ რეზერვაცია.</strong>
                      <br /><br />
                      თუ ამ რეზერვაციასაც გააუქმებთ, დაგეკისრებათ შეზღუდვა, რომლის უფასოდ მოხსნა შეგიძლიათ მხოლოდ ერთხელ.
                      <br /><br />
                      💡 მეორე შეზღუდვის მოსახსნელად დაგჭირდებათ 100 ქულა.
                    </>
                  )}
                </p>
              </div>

              {/* Checkbox - User must agree */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={agreedToCooldownRisk}
                  onChange={(e) => setAgreedToCooldownRisk(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 leading-relaxed">
                  ვეთანხმები და მესმის, რომ ამ რეზერვაციის გაუქმების შემთხვევაში დამეკისრება შეზღუდვა
                </span>
              </label>

              {/* Buttons */}
              <div className="flex flex-col gap-2.5 pt-2">
                <motion.button
                  onClick={async () => {
                    if (!agreedToCooldownRisk) return;
                    setShowCooldownWarning(false);
                    setIsReserving(true);
                    try {
                      await proceedWithReservation();
                    } catch (error) {
                      logger.error('Error proceeding with reservation:', error);
                    }
                  }}
                  disabled={!agreedToCooldownRisk}
                  whileTap={{ scale: agreedToCooldownRisk ? 0.98 : 1 }}
                  className={`w-full h-12 font-semibold text-[15px] rounded-xl shadow-lg transition-all ${
                    agreedToCooldownRisk
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  ✅ დავეთანხმე, გავაგრძელებ
                </motion.button>
                <motion.button
                  onClick={() => {
                    setShowCooldownWarning(false);
                    setAgreedToCooldownRisk(false);
                    setIsReserving(false);
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-10 bg-transparent hover:bg-gray-50 text-gray-600 font-medium text-[14px] rounded-xl transition-colors"
                >
                  უკან დაბრუნება
                </motion.button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
      
      {/* Business Closed Dialog */}
      <Dialog open={showClosedDialog} onOpenChange={setShowClosedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-4 shadow-lg">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-xl font-semibold">ბიზნესი ჯერ დახურულია</DialogTitle>
            <DialogDescription className="text-center text-base pt-2 text-gray-600">
              პარტნიორი მალე დაიწყებს შეკვეთების მიღებას
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Countdown timer */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-5 text-center border border-teal-100">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Bell className="w-5 h-5 text-teal-600 animate-pulse" />
                <p className="text-sm font-medium text-teal-900">გაიხსნება</p>
              </div>
              <p className="text-3xl font-bold text-teal-600 mb-1">{timeUntilOpen}</p>
              <p className="text-sm text-gray-600">({businessOpenTime}-დან)</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5"></div>
                <p className="text-sm text-gray-700 flex-1">
                  შეთავაზება ხელმისაწვდომი იქნება როდესაც ბიზნესი გაიხსნება
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5"></div>
                <p className="text-sm text-gray-700 flex-1">
                  შეგიძლიათ დააკვირდეთ სხვა შეთავაზებებს
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => setShowClosedDialog(false)}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-medium"
            >
              გასაგებია
            </Button>
            <Button 
              onClick={() => {
                setShowClosedDialog(false);
                navigate('/');
              }}
              variant="ghost"
              className="w-full h-11 text-gray-600 hover:text-gray-900 font-medium"
            >
              სხვა შეთავაზებების ნახვა
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


