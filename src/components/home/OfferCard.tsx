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
        bg-gradient-to-br from-sp-surface2 to-sp-surface1 
        rounded-[18px] overflow-hidden 
        border border-sp-border-soft 
        shadow-[0_18px_40px_rgba(0,0,0,0.55)]
        hover:shadow-[0_22px_48px_rgba(0,0,0,0.65)] 
        hover:scale-[1.01] 
        transition-all duration-300 
        cursor-pointer group
        ${variant === 'scroll' ? 'min-w-[110px] max-w-[110px]' : 'w-full'}
      `}
    >
      {/* Image */}
      <div className="relative h-[110px] overflow-hidden bg-sp-surface1">
        <img
          src={offer.images[0] || '/placeholder-food.jpg'}
          alt={offer.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-0 animate-fade-in"
          onLoad={(e) => e.currentTarget.classList.add('opacity-100')}
        />
        
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="
            absolute top-2 left-2 
            px-2 py-1 
            bg-gradient-to-r from-sp-danger to-sp-accent-orange 
            rounded-md 
            shadow-lg
          ">
            <span className="text-[11px] font-bold text-white">
              -{discountPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-2">
        {/* Title */}
        <h3 className="text-[15px] font-semibold text-sp-text-primary line-clamp-2 leading-tight">
          {offer.title}
        </h3>
        
        {/* Partner & Distance */}
        {offer.partner && (
          <div className="flex items-center gap-1.5 text-sp-text-secondary">
            <span className="text-[12px] truncate">
              {offer.partner.business_name}
            </span>
          </div>
        )}
        
        {/* Price Row */}
        <div className="flex items-baseline gap-2">
          <span className="text-[17px] font-bold text-sp-success">
            ₾{offer.smart_price.toFixed(2)}
          </span>
          {offer.original_price > offer.smart_price && (
            <span className="text-[13px] text-sp-text-muted line-through">
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
