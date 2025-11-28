/**
 * ✨ UNIFIED OFFERS GRID - Professional Layout
 * 
 * Responsive grid with perfect spacing:
 * - 2-3 cards per row (responsive)
 * - 16px gap between cards
 * - All cards same height
 * - Clean, professional appearance
 */

import type { Offer } from '@/lib/types';
import { OfferCardUnified } from './OfferCardUnified';

interface OffersGridUnifiedProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  title?: string;
  showCount?: boolean;
}

export function OffersGridUnified({ 
  offers, 
  onOfferClick,
  title = 'All Offers',
  showCount = true 
}: OffersGridUnifiedProps) {
  
  if (offers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400 text-sm">No offers available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 
            className="font-semibold text-gray-900"
            style={{ fontSize: '16px', lineHeight: '24px' }}
          >
            {title}
          </h2>
          {showCount && (
            <span 
              className="text-gray-500"
              style={{ fontSize: '14px', lineHeight: '20px' }}
            >
              {offers.length} {offers.length === 1 ? 'offer' : 'offers'}
            </span>
          )}
        </div>
      )}

      {/* Grid Layout - 2 offers per row with fixed card size */}
      <div className="grid grid-cols-2 gap-3 w-full" style={{ maxWidth: '360px' }}>
        {offers.map((offer) => (
          <OfferCardUnified
            key={offer.id}
            offer={offer}
            onClick={onOfferClick}
          />
        ))}
      </div>
    </div>
  );
}
