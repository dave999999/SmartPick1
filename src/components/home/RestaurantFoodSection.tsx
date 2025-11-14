import { Star, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Offer } from '@/lib/types';

interface RestaurantFoodSectionProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
}

export function RestaurantFoodSection({ offers, onOfferClick }: RestaurantFoodSectionProps) {
  const isNewOffer = (offer: Offer): boolean => {
    const createdAt = new Date(offer.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 1;
  };

  const isExpiringSoon = (offer: Offer): boolean => {
    if (!offer.expires_at) return false;
    const expiresAt = new Date(offer.expires_at);
    const now = new Date();
    const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 0 && hoursDiff < 2;
  };

  const getDiscountPercent = (originalPrice: number, smartPrice: number): number => {
    return Math.round(((originalPrice - smartPrice) / originalPrice) * 100);
  };

  const newOffers = offers.filter(isNewOffer);
  const regularOffers = offers.filter(offer => !isNewOffer(offer));

  const renderOfferCard = (offer: Offer, showNewBadge: boolean) => {
    const discountPercent = getDiscountPercent(offer.original_price, offer.smart_price);
    const isLowStock = offer.quantity_available <= 5;

    return (
      <div
        key={offer.id}
        onClick={() => onOfferClick(offer)}
        className="relative flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group min-w-[180px]"
      >
        {/* Image container with all info overlaid */}
        <div className="relative h-40 overflow-hidden">
          {/* Background image */}
          <img
            src={offer.images[0] || '/placeholder-food.jpg'}
            alt={offer.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Dark gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40" />
          
          {/* Top left - Title */}
          <div className="absolute top-2 left-2 right-2">
            <h3 className="text-sm font-bold text-white drop-shadow-lg line-clamp-2 mb-1">
              {offer.title}
            </h3>
          </div>
          
          {/* Top right - Rating */}
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-bold text-white">4.8</span>
          </div>
          
          {/* Top badges (NEW, ENDING SOON, etc) */}
          <div className="absolute top-10 left-2 flex flex-col gap-1">
            {showNewBadge && (
              <Badge className="bg-mint-500 text-white text-xs px-2 py-0.5 font-semibold w-fit">
                 NEW
              </Badge>
            )}
            {isExpiringSoon(offer) && (
              <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5 font-semibold animate-pulse w-fit">
                 ENDING SOON
              </Badge>
            )}
          </div>
          
          {/* Top right corner - Discount badge */}
          {discountPercent > 0 && (
            <div className="absolute top-10 right-2">
              <Badge className="bg-red-500 text-white text-xs px-2 py-1 font-bold">
                -{discountPercent}%
              </Badge>
            </div>
          )}
          
          {/* Bottom left - Price */}
          <div className="absolute bottom-2 left-2 flex flex-col">
            <span className="text-xs text-white/70 line-through">₾{offer.original_price.toFixed(2)}</span>
            <span className="text-xl font-bold text-white drop-shadow-lg">₾{offer.smart_price.toFixed(2)}</span>
          </div>
          
          {/* Bottom right - Low stock badge */}
          {isLowStock && (
            <div className="absolute bottom-2 right-12">
              <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 font-semibold">
                Only {offer.quantity_available} left!
              </Badge>
            </div>
          )}
          
          {/* Favorite heart - bottom right corner */}
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="absolute bottom-2 right-2 p-1.5 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full transition-colors z-10"
          >
            <Heart className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  };

  if (offers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No offers available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      {newOffers.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl"></span>
            <h2 className="text-3xl font-bold text-gray-900">Just Added</h2>
            <Badge className="bg-mint-500 text-white font-semibold">
              {newOffers.length} new
            </Badge>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
            {newOffers.map((offer) => renderOfferCard(offer, true))}
          </div>
        </div>
      )}
      {regularOffers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-gray-900">All Available Offers</h2>
            <span className="text-sm text-gray-500">{regularOffers.length} offers</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {regularOffers.map((offer) => renderOfferCard(offer, false))}
          </div>
        </div>
      )}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
