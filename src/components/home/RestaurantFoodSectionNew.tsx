/**
 * ✨ UNIFIED Restaurant/Food Section
 * Premium light design with consistent cards
 */

import type { Offer } from '@/lib/types';
import { OffersGridUnified } from './OffersGridUnified';
import { CategoryBar } from './CategoryBar';

interface RestaurantFoodSectionNewProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
}

export function RestaurantFoodSectionNew({ 
  offers, 
  onOfferClick,
  selectedCategory = '',
  onCategorySelect
}: RestaurantFoodSectionNewProps) {
  const filteredOffers = selectedCategory 
    ? offers.filter(offer => offer.category === selectedCategory)
    : offers;

  const newOffers = filteredOffers.filter(offer => {
    const createdAt = new Date(offer.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 1;
  });

  // Get category label for display
  const getCategoryLabel = (categoryValue: string) => {
    const categories: Record<string, string> = {
      'RESTAURANT': 'Restaurant',
      'FAST_FOOD': 'Fast Food',
      'BAKERY': 'Bakery',
      'DESSERTS_SWEETS': 'Desserts & Sweets',
      'CAFE': 'Cafe',
      'DRINKS_JUICE': 'Drinks & Juice',
      'GROCERY': 'Grocery',
      'MINI_MARKET': 'Mini Market',
      'MEAT_BUTCHER': 'Meat & Butcher',
      'FISH_SEAFOOD': 'Fish & Seafood',
      'ALCOHOL': 'Alcohol',
      'DRIVE': 'Drive Through'
    };
    return categories[categoryValue] || categoryValue;
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Category Filter Bar */}
      <CategoryBar
        selectedCategory={selectedCategory}
        onCategorySelect={onCategorySelect || (() => {})}
      />

      <div className="px-4 pt-4 pb-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900" style={{ fontSize: '16px', lineHeight: '24px' }}>
            All Offers
          </h2>
          <span className="text-gray-500" style={{ fontSize: '14px', lineHeight: '20px' }}>
            {filteredOffers.length} {filteredOffers.length === 1 ? 'offer' : 'offers'}
          </span>
        </div>

        {/* Show message if no offers in selected category */}
        {filteredOffers.length === 0 && selectedCategory ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 text-sm text-center">
              No offers available in {getCategoryLabel(selectedCategory)}
            </p>
          </div>
        ) : (
          /* Unified Offers Grid */
          <OffersGridUnified
            offers={filteredOffers}
            onOfferClick={onOfferClick}
            title=""
            showCount={false}
          />
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
