import { Clock, MapPin, Flame, Sparkles, Zap, Heart } from 'lucide-react';
import type { Offer } from '@/lib/types';
import { useFavorites } from '@/hooks/useFavorites';

interface OfferCardRedesignedProps {
  offer: Offer;
  onClick: (offer: Offer) => void;
  userLocation?: [number, number] | null;
}

export function OfferCardRedesigned({ offer, onClick, userLocation }: OfferCardRedesignedProps) {
  const { isFavorite, toggleFavorite } = useFavorites();

  const isNewOffer = (offer: Offer): boolean => {
    const createdAt = new Date(offer.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 2;
  };

  const isExpiringSoon = (offer: Offer): boolean => {
    if (!offer.expires_at) return false;
    const expiresAt = new Date(offer.expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry > 0 && hoursUntilExpiry <= 2;
  };

  const getTimeLeft = (offer: Offer): string => {
    if (!offer.expires_at) return '';
    const expiresAt = new Date(offer.expires_at);
    const now = new Date();
    const minutesLeft = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));
    
    if (minutesLeft < 60) return `${minutesLeft}m`;
    const hoursLeft = Math.floor(minutesLeft / 60);
    return `${hoursLeft}h`;
  };

  const getDiscountPercent = (originalPrice: number, smartPrice: number): number => {
    return Math.round(((originalPrice - smartPrice) / originalPrice) * 100);
  };

  const getDistance = (offer: Offer): string => {
    if (!userLocation || !offer.partner?.location?.latitude || !offer.partner?.location?.longitude) {
      return '';
    }
    
    const R = 6371; // Earth radius in km
    const dLat = (offer.partner.location.latitude - userLocation[0]) * Math.PI / 180;
    const dLon = (offer.partner.location.longitude - userLocation[1]) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLocation[0] * Math.PI / 180) *
      Math.cos(offer.partner.location.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  const discountPercent = getDiscountPercent(offer.original_price, offer.smart_price);
  const isNew = isNewOffer(offer);
  const expiring = isExpiringSoon(offer);
  const timeLeft = getTimeLeft(offer);
  const distance = getDistance(offer);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(offer.id);
  };

  return (
    <div
      onClick={() => onClick(offer)}
      className="
        relative flex flex-col 
        bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]
        rounded-xl overflow-hidden 
        border border-white/10 
        shadow-xl hover:shadow-2xl 
        hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-300 cursor-pointer group
        min-w-[160px] max-w-[180px] sm:min-w-[180px] sm:max-w-[200px]
      "
      style={{ height: '210px' }}
    >
      {/* Image Container */}
      <div className="relative h-[140px] overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
        <img
          src={offer.images[0] || '/placeholder-food.jpg'}
          alt={offer.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        
        {/* Badges Overlay - Top Left */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isNew && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#37E5AE]/95 backdrop-blur-sm animate-in slide-in-from-left">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">New</span>
            </div>
          )}
          {expiring && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/95 backdrop-blur-sm animate-pulse">
              <Flame className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">{timeLeft}</span>
            </div>
          )}
          {discountPercent >= 30 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/95 backdrop-blur-sm">
              <Zap className="w-3 h-3 text-white" />
              <span className="text-xs font-bold text-white">-{discountPercent}%</span>
            </div>
          )}
        </div>

        {/* Favorite Heart - Top Right */}
        <button
          onClick={handleFavoriteClick}
          className="
            absolute top-2 right-2
            w-8 h-8 rounded-full 
            flex items-center justify-center
            backdrop-blur-sm
            hover:scale-110 active:scale-95
            transition-all duration-200
            z-10
          "
        >
          <Heart 
            className={`w-4 h-4 ${
              isFavorite(offer.id) 
                ? 'fill-red-500 text-red-500' 
                : 'text-white/80 hover:text-white'
            }`}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-2.5 flex flex-col justify-between">
        {/* Title */}
        <h3 className="text-sm font-bold text-white line-clamp-1 leading-tight mb-1">
          {offer.title}
        </h3>
        
        {/* Partner Name */}
        <p className="text-xs text-gray-400 line-clamp-1 mb-1.5">
          {offer.partner?.business_name || 'Partner'}
        </p>

        {/* Distance + Time Row */}
        {(distance || timeLeft) && (
          <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
            {distance && (
              <div className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" />
                <span>{distance}</span>
              </div>
            )}
            {timeLeft && !expiring && (
              <div className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                <span>{timeLeft}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Price Section */}
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-[#37E5AE]">
            ₾{offer.smart_price.toFixed(2)}
          </span>
          {discountPercent > 0 && (
            <span className="text-xs text-gray-500 line-through">
              ₾{offer.original_price.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Ripple effect on tap */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
        <div className="
          absolute inset-0 
          bg-gradient-to-r from-transparent via-white/5 to-transparent 
          translate-x-[-100%] 
          group-hover:translate-x-[100%] 
          transition-transform duration-1000
        " />
      </div>
    </div>
  );
}
