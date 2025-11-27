/**
 * REFACTORED: Premium Dark Offer Card
 * Clean gradient card with glass morphism
 */

import { Offer } from '@/lib/types';

interface OfferCardProps {
  offer: Offer;
  onClick: (offer: Offer) => void;
  variant?: 'scroll' | 'grid';
}

export function OfferCard({ offer, onClick, variant = 'grid' }: OfferCardProps) {
  const discountPercent = Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);

  return (
    <div
      onClick={() => onClick(offer)}
      className={`
        relative flex flex-col 
        bg-white 
        rounded-xl overflow-hidden 
        border border-gray-200
        hover:shadow-md
        transition-all duration-200 
        cursor-pointer group
        ${variant === 'scroll' ? 'min-w-[110px] max-w-[110px]' : 'w-full'}
      `}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={offer.images[0] || '/placeholder-food.jpg'}
          alt={offer.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div 
            className="absolute top-2 left-2 px-2 py-1 rounded-md"
            style={{ backgroundColor: '#FF5252' }}
          >
            <span className="text-xs font-bold text-white">
              -{discountPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1">
        {/* Title */}
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
          {offer.title}
        </h3>
        
        {/* Partner */}
        {offer.partner && (
          <p className="text-xs text-gray-500 truncate">
            {offer.partner.business_name}
          </p>
        )}
        
        {/* Price Row */}
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-base font-bold" style={{ color: '#4CAF50' }}>
            ₾ {offer.smart_price.toFixed(2)}
          </span>
          {offer.original_price > offer.smart_price && (
            <span className="text-xs text-gray-400 line-through">
              ₾{offer.original_price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Animation for image fade-in
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-in;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}
