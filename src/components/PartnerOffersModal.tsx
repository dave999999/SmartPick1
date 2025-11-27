import { Offer } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
      <DialogContent className="max-w-[400px] max-h-[500px] p-0 gap-0 overflow-hidden rounded-[20px] bg-white border-0 shadow-2xl">
        {/* Compact Partner Header */}
        <DialogHeader className="px-4 pt-4 pb-3 bg-gradient-to-br from-teal-500 to-mint-500 text-white space-y-0 relative">
          {/* Close Button - Top Right */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Partner Name */}
          <DialogTitle className="text-lg font-bold text-white mb-1 pr-8 truncate">{partnerName}</DialogTitle>
          <DialogDescription className="sr-only">
            Browse available offers from {partnerName}
          </DialogDescription>
          
          {/* Address with icon */}
          {partnerAddress && (
            <div className="flex items-start gap-1.5 text-white/90 mb-2">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p className="text-xs truncate">{partnerAddress}</p>
            </div>
          )}
          
          {/* Compact Info Row */}
          <div className="flex items-center gap-2">
            {/* Rating */}
            <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1">
              <svg className="w-3 h-3 fill-yellow-300" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
              </svg>
              <span className="text-xs font-bold text-white">4.8</span>
            </div>

            {/* Hours */}
            <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1">
              <Clock className="w-3 h-3 text-white" />
              <span className="text-xs font-medium text-white">Open 24h</span>
            </div>

            {/* Offers count */}
            <div className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1">
              <Tag className="w-3 h-3 text-white" />
              <span className="text-xs font-medium text-white">
                {offers.length} {offers.length === 1 ? 'Offer' : 'Offers'}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Compact Offers List */}
        <div className="overflow-y-auto px-4 py-3 bg-white" style={{ maxHeight: '350px' }}>
          <div className="space-y-2">
            {offers.map((offer) => {
              const imageUrl = offer.images && offer.images.length > 0
                ? resolveOfferImageUrl(offer.images[0], offer.category, { width: 200, quality: 80 })
                : '/placeholder.png';

              const discountPercent = getDiscountPercent(offer.original_price, offer.smart_price);
              const timeLeft = getTimeRemaining(offer);
              const lowStock = offer.quantity_available <= 3;

              return (
                <div
                  key={offer.id}
                  onClick={() => {
                    onOfferClick(offer);
                    onOpenChange(false);
                  }}
                  className="cursor-pointer flex gap-3 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-[#FF5722] p-2"
                >
                  {/* Compact Image */}
                  <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imageUrl}
                      alt={offer.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
                      }}
                    />

                    {/* Discount Badge */}
                    {discountPercent > 0 && (
                      <div className="absolute top-1 left-1 bg-[#EF4444] rounded px-1.5 py-0.5">
                        <span className="text-[10px] font-bold text-white">-{discountPercent}%</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 py-0.5">
                    {/* Title */}
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">
                      {offer.title}
                    </h3>
                    
                    {/* Price Row */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-bold text-[#FF5722]">
                        {offer.smart_price.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">GEL</span>
                      {offer.original_price > offer.smart_price && (
                        <span className="text-xs text-gray-400 line-through">
                          {offer.original_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    {/* Time & Stock Row */}
                    <div className="flex items-center gap-2 text-xs">
                      {timeLeft && timeLeft !== 'Expired' && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">{timeLeft}</span>
                        </div>
                      )}
                      <span className={`font-medium ${lowStock ? 'text-red-500' : 'text-gray-500'}`}>
                        {offer.quantity_available} left
                      </span>
                    </div>
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


