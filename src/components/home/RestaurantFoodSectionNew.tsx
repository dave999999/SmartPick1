/**
 * REFACTORED: Premium Dark Restaurant/Food Section (Bottom Sheet Content)
 * Clean offer grid with category filtering
 */

import type { Offer } from '@/lib/types';
import { OfferCard } from './OfferCard';
import { CategoryBar } from './CategoryBar';
import { useState } from 'react';

interface RestaurantFoodSectionNewProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  isExpanded?: boolean;
}

export function RestaurantFoodSectionNew({ offers, onOfferClick, isExpanded = false }: RestaurantFoodSectionNewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const filteredOffers = selectedCategory 
    ? offers.filter(offer => offer.category === selectedCategory)
    : offers;

  const newOffers = filteredOffers.filter(offer => {
    const createdAt = new Date(offer.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 1;
  });

  if (offers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sp-text-muted">No offers available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-sp-surface1">
      {/* Category Filter Bar */}
      <CategoryBar
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* Just Added Section */}
        {newOffers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-sp-text-primary">Just Added</h2>
              <span className="text-[13px] text-sp-text-secondary">{newOffers.length} new</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
              {newOffers.map((offer) => (
                <div key={offer.id} className="snap-start">
                  <OfferCard offer={offer} onClick={onOfferClick} variant="scroll" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Offers Section */}
        <div>
          {isExpanded && (
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-sp-text-primary">All Offers</h2>
              <span className="text-[13px] text-sp-text-secondary">{filteredOffers.length} total</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {filteredOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} onClick={onOfferClick} variant="grid" />
            ))}
          </div>
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
