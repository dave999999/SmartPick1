/**
 * OfferListCard.tsx
 * Compact vertical card for horizontal scroll lists
 * Apple-inspired premium design with SmartPick branding
 */

import { Heart } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type OfferListCardProps = {
  title: string;
  imageUrl: string;
  priceNow: string;
  priceOld?: string;
  isFavorite?: boolean;
  metaLine?: string;
  onClick?: () => void;
  onToggleFavorite?: () => void;
};

export function OfferListCard({
  title,
  imageUrl,
  priceNow,
  priceOld,
  isFavorite: initialFavorite = false,
  metaLine,
  onClick,
  onToggleFavorite,
}: OfferListCardProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  const handleCardClick = () => {
    onClick?.();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = !isFavorite;
    setIsFavorite(newState);
    onToggleFavorite?.();
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'w-full',
        'bg-white rounded-xl overflow-hidden',
        'shadow-sm',
        'transition-all duration-150 ease-out',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-md',
        onClick && 'active:scale-[0.98] active:shadow-sm'
      )}
    >
      {/* Image Section */}
      <div className="relative w-full pb-[100%] bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />

        {/* Price Tag - Bottom Left Corner */}
        <div className="absolute bottom-0 left-0 z-10">
          <div className="bg-white/95 backdrop-blur-md rounded-tr-md px-1.5 py-0.5 shadow-md">
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] font-bold text-[#111827]">
                {priceNow}
              </span>
              {priceOld && (
                <span className="text-[8px] text-gray-400 line-through">
                  {priceOld}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Text Section */}
      <div className="px-2 py-2 text-center">
        <h4 className="text-[12px] font-medium text-[#111827] line-clamp-1 leading-tight">
          {title}
        </h4>
      </div>
    </div>
  );
}
