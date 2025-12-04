/**
 * FeaturedOfferCard.tsx
 * Large featured card - Reference UI match (horizontal layout)
 */

import { Heart } from 'lucide-react';
import { Offer, Partner } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface FeaturedOfferCardProps {
  offer: Offer;
  partner?: Partner;
  onClick: () => void;
}

export function FeaturedOfferCard({ offer, partner, onClick }: FeaturedOfferCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  
  const discount = offer.original_price 
    ? Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Image Section */}
        <div className="relative flex-shrink-0">
          <div className="w-[100px] h-[100px] rounded-xl overflow-hidden bg-gray-100">
            <img
              src={offer.images?.[0] || '/images/placeholder-food.jpg'}
              alt={offer.title}
              className="w-full h-full object-cover"
            />
          </div>
          
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
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/95 backdrop-blur-sm shadow-md flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          >
            <Heart 
              className={cn(
                "w-3 h-3",
                isFavorite ? "fill-orange-500 text-orange-500" : "text-gray-600 fill-none"
              )}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Details Section */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Title & Status */}
          <div className="space-y-0.5">
            <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-2 leading-tight">
              {offer.title}
            </h3>
            <p className="text-[12px] text-gray-500 italic">
              Now
            </p>
          </div>

          {/* Price & Button */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-bold text-gray-900">
                ₦{Math.round(offer.smart_price).toLocaleString()}
              </span>
              {discount > 0 && (
                <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                  {discount}% off
                </span>
              )}
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="w-full h-8 bg-white border-2 border-orange-500 text-orange-500 text-[13px] font-semibold rounded-lg hover:bg-orange-50 active:bg-orange-100 transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
