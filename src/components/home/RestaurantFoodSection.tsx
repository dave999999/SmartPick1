import { MapPin, Clock, TrendingDown, Star, Heart } from 'lucide-react';
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

  const getTimeAgo = (offer: Offer): string => {
    const createdAt = new Date(offer.created_at);
    const now = new Date();
    const minutesDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
    if (minutesDiff < 60) return `${minutesDiff}m ago`;
    const hoursDiff = Math.floor(minutesDiff / 60);
    if (hoursDiff < 24) return `${hoursDiff}h ago`;
    const daysDiff = Math.floor(hoursDiff / 24);
    return `${daysDiff}d ago`;
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
        className="relative flex flex-col bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group w-full"
      >
        <div className="relative h-52 overflow-hidden">
          <img
            src={offer.images[0] || '/placeholder-food.jpg'}
            alt={offer.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {showNewBadge && (
              <Badge className="bg-mint-500 text-white text-xs px-2 py-0.5 font-semibold">
                 NEW
              </Badge>
            )}
            {isExpiringSoon(offer) && (
              <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5 font-semibold animate-pulse">
                 ENDING SOON
              </Badge>
            )}
            {isLowStock && (
              <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 font-semibold">
                🔥 Only {offer.quantity_available} left!
              </Badge>
            )}
          </div>
          {discountPercent > 0 && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-red-500 text-white text-xs px-2 py-1 font-bold flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                -{discountPercent}%
              </Badge>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">
            {offer.title}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{offer.partner?.business_name || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-gray-400 line-through">₾{offer.original_price.toFixed(2)}</span>
              <span className="text-2xl font-bold text-mint-600">₾{offer.smart_price.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>{getTimeAgo(offer)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-700">4.8</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Heart className="w-5 h-5 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          </div>
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
    <div className="h-full overflow-y-auto px-5 py-6">
      {newOffers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl"></span>
            <h2 className="text-2xl font-bold text-gray-900">Just Added</h2>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">All Available Offers</h2>
            <span className="text-sm text-gray-500">{regularOffers.length} offers</span>
          </div>
          <div className="flex flex-col gap-4">
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
