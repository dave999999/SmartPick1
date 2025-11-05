import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Offer, User, PenaltyInfo } from '@/lib/types';
import { createReservation, checkUserPenalty } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveOfferImageUrl } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, MapPin, AlertCircle, Minus, Plus, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Facebook, Twitter, Instagram } from 'lucide-react';
import { updateMetaTags, generateShareUrls } from '@/lib/social-share';

interface ReservationModalProps {
  offer: Offer | null;
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function ReservationModal({
  offer,
  user,
  open,
  onOpenChange,
  onSuccess,
}: ReservationModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);
  const [penaltyInfo, setPenaltyInfo] = useState<PenaltyInfo | null>(null);
  const [countdown, setCountdown] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (open && user) {
      loadPenaltyInfo();
    }
    // Update meta tags for social sharing when modal opens
    if (open && offer) {
      updateMetaTags(offer);
    }
  }, [open, user, offer]);

  useEffect(() => {
    if (penaltyInfo?.isUnderPenalty && penaltyInfo.penaltyUntil) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = penaltyInfo.penaltyUntil!.getTime() - now.getTime();
        
        if (diff <= 0) {
          setCountdown('Penalty lifted!');
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

  const loadPenaltyInfo = async () => {
    if (!user) return;
    try {
      const info = await checkUserPenalty(user.id);
      setPenaltyInfo(info);
    } catch (error) {
      console.error('Error loading penalty info:', error);
    }
  };

  const handleReserve = async () => {
    if (!offer || !user) return;

    if (penaltyInfo?.isUnderPenalty) {
      toast.error(`You are under penalty. Time remaining: ${countdown}`);
      return;
    }

    try {
      setIsReserving(true);
      const reservation = await createReservation(offer.id, user.id, quantity);
      toast.success('Reservation created successfully!');
      onOpenChange(false);
      if (onSuccess) onSuccess();
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
    if (!dateString) return '';
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

  const getPickupTimes = (offer: Offer) => {
    const start = offer.pickup_start || offer.pickup_window?.start || '';
    const end = offer.pickup_end || offer.pickup_window?.end || '';
    return { start, end };
  };

  const handleShareFacebook = () => {
    if (!offer) return;
    const shareUrls = generateShareUrls(offer, window.location.href);
    window.open(shareUrls.facebook, '_blank', 'width=600,height=400');
    toast.success('Opening Facebook share dialog...');
  };

  const handleShareTwitter = () => {
    if (!offer) return;
    const shareUrls = generateShareUrls(offer, window.location.href);
    window.open(shareUrls.twitter, '_blank', 'width=600,height=400');
    toast.success('Opening Twitter share dialog...');
  };

  const handleShareInstagram = () => {
    // Instagram doesn't have a direct web sharing API
    // We'll copy the link and show instructions
    if (!offer) return;

    // Try to copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast.success('Link copied! Open Instagram app and paste in your story or post.');
        })
        .catch(() => {
          toast.info('Please copy this link to share on Instagram: ' + window.location.href);
        });
    } else {
      toast.info('Please copy this link to share on Instagram: ' + window.location.href);
    }
  };

  if (!offer) return null;

  const pickupTimes = getPickupTimes(offer);
  const totalPrice = offer.smart_price * quantity;
  const maxQuantity = Math.min(3, offer.quantity_available); // Enforce 3-unit max
  const timeRemaining = getTimeRemaining(offer.expires_at);
  const isExpired = offer.expires_at && new Date(offer.expires_at).getTime() <= Date.now();
  const isExpiringSoon = offer.expires_at &&
    new Date(offer.expires_at).getTime() - new Date().getTime() < 60 * 60 * 1000; // Less than 1 hour

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Offer Image */}
        {offer.images && offer.images.length > 0 && (
          <div className="relative h-64 w-full overflow-hidden rounded-lg -mt-6 -mx-6 mb-4">
            <img
              src={resolveOfferImageUrl(offer.images[0], offer.category)}
              alt={offer.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg'; }}
            />
            <Badge className="absolute top-4 right-4 bg-mint-500 hover:bg-mint-600 text-white">
              {offer.category}
            </Badge>
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="text-2xl">{offer.title}</DialogTitle>
          <DialogDescription className="text-base">
            {offer.partner?.business_name}
          </DialogDescription>

          {/* Social Share Buttons */}
          <div className="flex items-center gap-2 pt-3 border-t">
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              Share:
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                handleShareFacebook();
              }}
            >
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-600"
              onClick={(e) => {
                e.stopPropagation();
                handleShareTwitter();
              }}
            >
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-600"
              onClick={(e) => {
                e.stopPropagation();
                handleShareInstagram();
              }}
            >
              <Instagram className="h-4 w-4 mr-2" />
              Instagram
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expired Offer Warning */}
          {isExpired && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <strong>This offer has expired</strong>
                <p className="mt-1">
                  This offer is no longer available for reservation. Please browse other active offers.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Penalty Warning */}
          {!isExpired && penaltyInfo?.isUnderPenalty && (
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
          {!isExpired && isExpiringSoon && (
            <Alert className="bg-orange-50 border-orange-200">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-900">
                <strong>Hurry!</strong> This offer expires soon: {timeRemaining}
              </AlertDescription>
            </Alert>
          )}

          {/* Description */}
          <p className="text-gray-700">{offer.description}</p>

          {/* Pricing */}
          <div className="bg-mint-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Smart Price per unit</span>
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
              Select Quantity (Max 3 per offer)
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
              <Badge variant="outline" className="ml-auto">
                {offer.quantity_available} available
              </Badge>
            </div>
          </div>

          {/* Total Price */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <span className="text-lg font-medium">Total Price</span>
            <span className="text-3xl font-bold text-mint-600">{totalPrice.toFixed(2)} GEL</span>
          </div>

          {/* Pickup Info */}
          <div className="space-y-3 border-t pt-4">
            {pickupTimes.start && pickupTimes.end && (
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-5 h-5 text-mint-600" />
                <div>
                  <p className="font-medium">Pickup Window</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(pickupTimes.start)} - {formatTime(pickupTimes.end)}
                  </p>
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    {timeRemaining}
                  </p>
                </div>
              </div>
            )}
            {offer.partner && (
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-5 h-5 text-mint-600" />
                <div>
                  <p className="font-medium">{offer.partner.business_name}</p>
                  {offer.partner.address && (
                    <p className="text-sm text-gray-600">{offer.partner.address}</p>
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
              isExpired ||
              offer.quantity_available === 0 ||
              penaltyInfo?.isUnderPenalty ||
              false
            }
          >
            {isReserving
              ? 'Creating Reservation...'
              : isExpired
              ? 'Offer Expired'
              : penaltyInfo?.isUnderPenalty
              ? `Blocked - ${countdown}`
              : 'Reserve Now'}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

