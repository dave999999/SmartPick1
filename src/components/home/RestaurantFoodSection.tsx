import { Heart } from 'lucide-react';
import { useState } from 'react';
import type { Offer } from '@/lib/types';
import { useFavorites } from '@/hooks/useFavorites';
import { toast } from 'sonner';

interface RestaurantFoodSectionProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
}

const CATEGORIES = [
  { value: 'ALL', label: 'All', emoji: '✨' },
  { value: 'BAKERY', label: 'Bakery', emoji: '🥐' },
  { value: 'CAFE', label: 'Cafe', emoji: '☕' },
  { value: 'RESTAURANT', label: 'Restaurant', emoji: '🍽️' },
  { value: 'FAST_FOOD', label: 'Fast Food', emoji: '🍔' },
  { value: 'ALCOHOL', label: 'Alcohol', emoji: '🍷' },
  { value: 'GROCERY', label: 'Grocery', emoji: '🛒' },
];

export function RestaurantFoodSection({ offers, onOfferClick }: RestaurantFoodSectionProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const isNewOffer = (offer: Offer): boolean => {
    const createdAt = new Date(offer.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 1;
  };

  const getDiscountPercent = (originalPrice: number, smartPrice: number): number => {
    return Math.round(((originalPrice - smartPrice) / originalPrice) * 100);
  };

  // Filter offers by selected category
  const filteredOffers = selectedCategory === 'ALL' 
    ? offers 
    : offers.filter(offer => offer.partner?.business_type === selectedCategory);

  const newOffers = filteredOffers.filter(isNewOffer);

  type CardVariant = 'scroll' | 'grid';
  const renderOfferCard = (offer: Offer, variant: CardVariant) => {
    const discountPercent = getDiscountPercent(offer.original_price, offer.smart_price);

    return (
      <div
        key={offer.id}
        onClick={() => onOfferClick(offer)}
        className={`relative flex flex-col bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer group ${variant === 'scroll' ? 'min-w-[100px] max-w-[100px]' : 'w-full'}`}
      >
        {/* Image container with overlays */}
        <div className="relative h-20 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Background image */}
          <img
            src={offer.images[0] || '/placeholder-food.jpg'}
            alt={offer.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Top right corner - heart only */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const isNowFavorite = toggleFavorite(offer.id, 'offer');
              toast.success(isNowFavorite ? '❤️ Added to favorites!' : '💔 Removed from favorites', {
                duration: 2000,
              });
            }}
            className="absolute top-2 right-2 p-1.5 backdrop-blur-sm bg-black/20 hover:bg-black/30 rounded-full transition-all shadow-lg hover:scale-110 active:scale-95"
          >
            <Heart 
              className={`w-3 h-3 transition-colors ${isFavorite(offer.id, 'offer') ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </button>

          {/* Top left - discount badge only (if discount exists) */}
          {discountPercent > 0 && (
            <div className="absolute top-1.5 left-1.5 backdrop-blur-sm bg-red-500/50 text-white px-1.5 py-0.5 rounded shadow-md">
              <span className="text-[10px] font-extrabold leading-none">-{discountPercent}%</span>
            </div>
          )}

          {/* Bottom - minimal price display without box */}
          <div className="absolute bottom-1.5 left-1.5">
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-extrabold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                ₾{offer.smart_price.toFixed(2)}
              </span>
              {discountPercent > 0 && (
                <span className="text-[9px] text-white/75 line-through drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                  ₾{offer.original_price.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content area - minimal */}
        <div className="p-1.5">
          {/* Title */}
          <h3 className="text-[10px] font-bold text-gray-900 line-clamp-1 leading-tight">
            {offer.title}
          </h3>
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
    <div className="h-full overflow-y-auto px-4 pt-2 pb-4">
      {/* Category Filter Icons */}
      <div className="mb-1">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 py-0.5">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              title={category.label}
              className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300 shadow-sm ${
                selectedCategory === category.value
                  ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg scale-105 ring-2 ring-teal-200'
                  : 'bg-white hover:bg-gradient-to-br hover:from-gray-50 hover:to-gray-100 hover:scale-105 hover:shadow-md'
              }`}
            >
              <span className={`text-base transition-transform ${
                selectedCategory === category.value ? 'scale-105' : ''
              }`}>
                {category.emoji}
              </span>
            </button>
          ))}
        </div>
      </div>

      {newOffers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <h2 className="text-base font-bold text-gray-900">Just Added</h2>
            <span className="text-xs text-gray-500">{newOffers.length} new</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 mb-0">
            {newOffers.map((offer) => renderOfferCard(offer, 'scroll'))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <h2 className="text-base font-bold text-gray-900">All Offers</h2>
          <span className="text-xs text-gray-500">{filteredOffers.length} total</span>
        </div>
        <div className="grid gap-2 sm:gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 100px))' }}>
          {filteredOffers.map((offer) => renderOfferCard(offer, 'grid'))}
        </div>
      </div>
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
