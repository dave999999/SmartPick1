/**
 * ProductCardHorizontal.tsx
 * Small vertical card for horizontal scroll - Reference UI match
 */

import { Heart } from 'lucide-react';
import { Offer, Partner } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ProductCardHorizontalProps {
  offer: Offer;
  partner?: Partner;
  onClick: () => void;
}

export function ProductCardHorizontal({ offer, partner, onClick }: ProductCardHorizontalProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 snap-start w-[108px] cursor-pointer"
    >
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Image Container */}
        <div className="relative w-full aspect-square bg-gray-100">
          <img
            src={offer.images?.[0] || '/images/placeholder-food.jpg'}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
          
          {/* Favorite Button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                setIsFavorite(!isFavorite);
              }
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur-sm shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          >
            <Heart 
              className={cn(
                "w-3.5 h-3.5",
                isFavorite ? "fill-orange-500 text-orange-500" : "text-gray-600 fill-none"
              )}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Details - CENTERED */}
        <div className="px-2 py-2.5 text-center space-y-1">
          <h4 className="text-[13px] font-medium text-gray-900 line-clamp-2 leading-tight min-h-[34px]">
            {offer.title}
          </h4>
          <p className="text-[14px] font-bold text-gray-900">
            ₦{Math.round(offer.smart_price).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
