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
  { value: 'BAKERY', label: 'Bakery', emoji: '🥐' },
  { value: 'CAFE', label: 'Cafe', emoji: '☕' },
  { value: 'RESTAURANT', label: 'Restaurant', emoji: '🍽️' },
  { value: 'FAST_FOOD', label: 'Fast Food', emoji: '🍔' },
  { value: 'ALCOHOL', label: 'Alcohol', emoji: '🍷' },
  { value: 'GROCERY', label: 'Grocery', emoji: '🛒' },
];

export function RestaurantFoodSection({ offers, onOfferClick }: RestaurantFoodSectionProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const isNewOffer = (offer: Offer): boolean => {
    const createdAt = new Date(offer.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 1;
  };

  const getDiscountPercent = (originalPrice: number, smartPrice: number): number => {
    return Math.round(((originalPrice - smartPrice) / originalPrice) * 100);
  };

  // Filter offers by selected category (null = show all)
  const filteredOffers = selectedCategory 
    ? offers.filter(offer => offer.partner?.business_type === selectedCategory)
    : offers;

  const newOffers = filteredOffers.filter(isNewOffer);

  type CardVariant = 'scroll' | 'grid';
  const renderOfferCard = (offer: Offer, variant: CardVariant) => {
    const discountPercent = getDiscountPercent(offer.original_price, offer.smart_price);

    return (
      <div
        key={offer.id}
        onClick={() => onOfferClick(offer)}
        className={`relative flex flex-col bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer group ${variant === 'scroll' ? 'min-w-[100px] max-w-[100px]' : 'w-full'}`}
      >
        {/* Image container - clean, no overlays */}
        <div className="relative h-20 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 rounded-t-2xl">
          {/* Background image only */}
          <img
            src={offer.images[0] || '/placeholder-food.jpg'}
            alt={offer.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>

        {/* Content area - dark theme with title and price */}
        <div className="p-2 bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-b-2xl">
          {/* Title */}
          <h3 className="text-[10px] font-semibold text-white line-clamp-1 leading-tight mb-1">
            {offer.title}
          </h3>
          
          {/* Price section */}
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-[#00cc66]">
              ₾{offer.smart_price.toFixed(2)}
            </span>
            {discountPercent > 0 && (
              <span className="text-[9px] text-gray-400 line-through">
                ₾{offer.original_price.toFixed(2)}
              </span>
            )}
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
    <div className="h-full overflow-y-auto px-4 pt-2 pb-4 bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a]">
      {/* Category Filter Icons */}
      <div className="mb-1">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 py-0.5">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(prev => prev === category.value ? null : category.value)}
              title={category.label}
              aria-label={`Filter by ${category.label}`}
              className={`flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full transition-all duration-300 shadow-sm ${
                selectedCategory === category.value
                  ? 'bg-[#3a3a3a] ring-2 ring-orange-500 shadow-lg shadow-orange-500/30 scale-105'
                  : 'bg-[#3a3a3a] hover:bg-[#4a4a4a] hover:scale-105 hover:shadow-md'
              }`}
            >
              <span className={`text-lg transition-transform ${
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
            <h2 className="text-base font-bold text-white">Just Added</h2>
            <span className="text-xs text-gray-400">{newOffers.length} new</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 mb-0">
            {newOffers.map((offer) => renderOfferCard(offer, 'scroll'))}
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <h2 className="text-base font-bold text-white">All Offers</h2>
          <span className="text-xs text-gray-400">{filteredOffers.length} total</span>
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

// Disabled virtual scrolling - causing issues with react-window
// Falling back to regular rendering for now

