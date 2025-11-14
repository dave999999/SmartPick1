import { Offer } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resolveOfferImageUrl } from '@/lib/api';
import { MapPin, Clock, Heart, Tag, TrendingDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PartnerOffersModalProps {
  partnerName: string;
  partnerAddress?: string;
  offers: Offer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfferClick: (offer: Offer) => void;
}

export default function PartnerOffersModal({
  partnerName,
  partnerAddress,
  offers,
  open,
  onOpenChange,
  onOfferClick,
}: PartnerOffersModalProps) {
  if (!offers || offers.length === 0) return null;

  // Calculate discount percentage
  const getDiscountPercent = (originalPrice: number, smartPrice: number) => {
    return Math.round(((originalPrice - smartPrice) / originalPrice) * 100);
  };

  // Check if offer is expiring soon (within 2 hours)
  const isExpiringSoon = (offer: Offer) => {
    const expiresAt = (offer as any).expires_at;
    if (!expiresAt) return false;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return diff > 0 && diff < 2 * 60 * 60 * 1000;
  };

  // Get time remaining
  const getTimeRemaining = (offer: Offer) => {
    const expiresAt = (offer as any).expires_at;
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl bg-white">
        {/* Modern Partner Header with solid mint background */}
        <DialogHeader className="px-5 pt-5 pb-5 bg-mint-600 text-white space-y-0 relative">
          {/* Close Button - Top Right */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Partner Name */}
          <DialogTitle className="text-2xl font-bold text-white mb-3 pr-10">{partnerName}</DialogTitle>
          
          {/* Address with icon */}
          {partnerAddress && (
            <div className="flex items-start gap-2 text-white mb-4">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{partnerAddress}</p>
            </div>
          )}
          
          {/* Info Row - Rating, Hours, Offers Count */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Rating Badge */}
            <div className="inline-flex items-center gap-1.5 bg-white/25 rounded-lg px-3 py-1.5">
              <svg className="w-4 h-4 fill-yellow-300" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
              <span className="text-sm font-bold text-white">4.8</span>
            </div>

            {/* Business Hours Badge */}
            <div className="inline-flex items-center gap-1.5 bg-white/25 rounded-lg px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-white" />
              <span className="text-sm font-medium text-white">Open 24h</span>
            </div>

            {/* Offers count badge */}
            <div className="inline-flex items-center gap-1.5 bg-white/25 rounded-lg px-3 py-1.5">
              <Tag className="w-3.5 h-3.5 text-white" />
              <span className="text-sm font-medium text-white">
                {offers.length} {offers.length === 1 ? 'Offer' : 'Offers'}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Offers Grid */}
        <div className="overflow-y-auto px-5 py-5 bg-gray-50" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="grid grid-cols-2 gap-4">
            {offers.map((offer) => {
              const imageUrl = offer.images && offer.images.length > 0
                ? resolveOfferImageUrl(offer.images[0], offer.category)
                : '/placeholder.png';

              const discountPercent = getDiscountPercent(offer.original_price, offer.smart_price);
              const expiringSoon = isExpiringSoon(offer);
              const timeLeft = getTimeRemaining(offer);
              const lowStock = offer.quantity_available <= 3;

              return (
                <div
                  key={offer.id}
                  onClick={() => {
                    onOfferClick(offer);
                    onOpenChange(false);
                  }}
                  className="cursor-pointer group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Food Image Card */}
                  <div className="relative w-full h-[150px] bg-gray-100 overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={offer.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
                      }}
                    />

                    {/* Gradient overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>

                    {/* Discount Badge - Top Left */}
                    {discountPercent > 0 && (
                      <div className="absolute top-2 left-2 bg-red-500 rounded-lg px-2 py-1 flex items-center gap-1 shadow-md">
                        <TrendingDown className="w-3 h-3 text-white" />
                        <span className="text-xs font-bold text-white">-{discountPercent}%</span>
                      </div>
                    )}

                    {/* Time Badge - Top Right (if expiring soon) */}
                    {expiringSoon && timeLeft && (
                      <div className="absolute top-2 right-2 bg-orange-500 rounded-lg px-2 py-1 flex items-center gap-1 shadow-md animate-pulse">
                        <Clock className="w-3 h-3 text-white" />
                        <span className="text-xs font-bold text-white">{timeLeft}</span>
                      </div>
                    )}

                    {/* Heart Icon - Bottom Right */}
                    <button
                      className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded-full p-2 hover:bg-white hover:scale-110 transition-all shadow-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Heart className="w-4 h-4 text-gray-700 hover:text-red-500 transition-colors" />
                    </button>
                  </div>

                  {/* Food Details */}
                  <div className="p-3">
                    {/* Food Title */}
                    <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 leading-tight min-h-[36px]">
                      {offer.title}
                    </h3>
                    
                    {/* Price Section */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-bold text-mint-600">
                          {offer.smart_price.toFixed(2)}
                        </span>
                        <span className="text-xs font-medium text-gray-600">GEL</span>
                      </div>
                      {offer.original_price > offer.smart_price && (
                        <span className="text-xs text-gray-400 line-through font-medium">
                          {offer.original_price.toFixed(2)} GEL
                        </span>
                      )}
                    </div>
                    
                    {/* Stock Badge */}
                    <Badge 
                      variant={lowStock ? "destructive" : "secondary"}
                      className="text-xs font-semibold"
                    >
                      {lowStock ? '🔥 ' : ''}{offer.quantity_available} left
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


