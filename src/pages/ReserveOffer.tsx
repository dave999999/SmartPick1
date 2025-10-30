import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Offer, PenaltyInfo } from '@/lib/types';
import { getOfferById, createReservation, getCurrentUser, checkUserPenalty } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowLeft, Clock, MapPin, AlertCircle, Minus, Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

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
    } catch (error) {
      console.error('Error loading offer:', error);
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
      console.error('Error loading penalty info:', error);
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

      const reservation = await createReservation(offer.id, user.id, quantity);
  toast.success(t('toast.reservationCreated'));
      navigate(`/reservation/${reservation.id}`);
    } catch (error) {
      console.error('Error creating reservation:', error);
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/') }>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('header.backToOffers')}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          {offer.images && offer.images.length > 0 && (
            <div className="relative h-64 w-full overflow-hidden rounded-t-lg">
              <img
                src={offer.images[0]}
                alt={offer.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-2xl">{offer.title}</CardTitle>
            <CardDescription>{offer.partner?.business_name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Penalty Warning */}
            {penaltyInfo?.isUnderPenalty && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <strong>Account Penalty Active</strong>
                  <p className="mt-1">
                    You missed {penaltyInfo.penaltyCount} pickup{penaltyInfo.penaltyCount > 1 ? 's' : ''}. 
                    Reservations are blocked for: <strong>{countdown}</strong>
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Expiring Soon Warning */}
            {isExpiringSoon && (
              <Alert className="bg-orange-50 border-orange-200">
                <Clock className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>Hurry!</strong> This offer expires soon: {getTimeRemaining(offer.expires_at)}
                </AlertDescription>
              </Alert>
            )}

            <p className="text-gray-700">{offer.description}</p>

            {/* Pricing */}
            <div className="bg-mint-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('offer.smartPricePerUnit')}</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-mint-600">{offer.smart_price} GEL</span>
                  <span className="text-sm text-gray-400 line-through ml-2">
                    {offer.original_price} GEL
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Save {((1 - offer.smart_price / offer.original_price) * 100).toFixed(0)}% with SmartPick
              </p>
            </div>

            {/* Quantity Selector */}
            <div>
              <Label htmlFor="quantity" className="text-base font-medium">
                {t('offer.selectQuantity')}
              </Label>
              <div className="flex items-center gap-3 mt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || penaltyInfo?.isUnderPenalty}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setQuantity(Math.max(1, Math.min(maxQuantity, val)));
                  }}
                  className="w-20 text-center text-lg font-semibold"
                  min="1"
                  max={maxQuantity}
                  disabled={penaltyInfo?.isUnderPenalty}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity || penaltyInfo?.isUnderPenalty}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-500">
                  {offer.quantity_available} available
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <span className="text-lg font-medium">Total Price</span>
              <span className="text-3xl font-bold text-mint-600">{totalPrice.toFixed(2)} GEL</span>
            </div>

            {/* Pickup Info */}
            <div className="space-y-3 border-t pt-4">
              {pickupStart && pickupEnd && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-5 h-5 text-mint-600" />
                  <div>
                    <p className="font-medium">Pickup Window</p>
                    <p className="text-sm text-gray-600">
                      {formatTime(pickupStart)} - {formatTime(pickupEnd)}
                    </p>
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      {getTimeRemaining(offer.expires_at)}
                    </p>
                  </div>
                </div>
              )}
              {offer.partner && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-5 h-5 text-mint-600" />
                  <div>
                    <p className="font-medium">{offer.partner.business_name}</p>
                    {partnerAddress && (
                      <p className="text-sm text-gray-600">{partnerAddress}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reserve Button */}
            <Button
              className="w-full bg-mint-600 hover:bg-mint-700 text-lg py-6"
              onClick={handleReserve}
              disabled={
                isReserving || 
                offer.quantity_available === 0 || 
                penaltyInfo?.isUnderPenalty ||
                false
              }
            >
              {isReserving 
                ? 'Creating Reservation...' 
                : penaltyInfo?.isUnderPenalty 
                ? `Blocked - ${countdown}` 
                : 'Confirm Reservation'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Your reservation will be held for 30 minutes. You'll receive a QR code for pickup.
              {penaltyInfo && penaltyInfo.penaltyCount > 0 && !penaltyInfo.isUnderPenalty && (
                <span className="block mt-1 text-orange-600 font-medium">
                  ⚠️ You have {penaltyInfo.penaltyCount} missed pickup{penaltyInfo.penaltyCount > 1 ? 's' : ''}. 
                  Missing this one will result in a penalty.
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}