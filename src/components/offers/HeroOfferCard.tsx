/**
 * HeroOfferCard.tsx
 * Premium hero card for Today's Special Offer section
 * Inspired by world-class food delivery apps with SmartPick branding
 */

import { Heart } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export type HeroOfferCardProps = {
  title: string;
  subtitle?: string;
  imageUrl: string;
  priceNow: string;
  priceOld?: string;
  discountLabel?: string;
  ctaLabel?: string;
  onClick?: () => void;
  onCtaClick?: () => void;
};

export function HeroOfferCard({
  title,
  subtitle,
  imageUrl,
  priceNow,
  priceOld,
  discountLabel,
  ctaLabel = 'Reserve Now',
  onClick,
  onCtaClick,
}: HeroOfferCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleCardClick = () => {
    onClick?.();
  };

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCtaClick?.();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'relative bg-white rounded-[20px] overflow-hidden',
        'shadow-[0_12px_30px_rgba(15,23,42,0.12)]',
        'transition-all duration-150 ease-out',
        onClick && 'cursor-pointer active:scale-[0.98] active:shadow-[0_8px_20px_rgba(15,23,42,0.08)]'
      )}
    >
      <div className="flex min-h-[140px]">
        {/* Left: Image Block */}
        <div className="relative flex-shrink-0 w-[140px] self-stretch">
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
            }}
          />
          
          {/* Favorite Icon Overlay */}
          <div
            onClick={handleFavoriteClick}
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
                'w-3.5 h-3.5',
                isFavorite ? 'fill-[#FF7A1A] text-[#FF7A1A]' : 'text-gray-600 fill-none'
              )}
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Right: Content Column */}
        <div className="flex-1 flex flex-col justify-between min-w-0 p-2">
          {/* Title & Status */}
          <div>
            <h3 className="text-[13px] font-semibold text-[#111827] line-clamp-2 leading-tight mb-0.5">
              {title}
            </h3>
            <p className="text-[10px] text-[#6B7280] italic">
              Now
            </p>
          </div>

          {/* Price & Discount */}
          <div className="space-y-0">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-[#111827]">
                {priceNow}
              </span>
              {discountLabel && (
                <span className="text-[9px] font-semibold text-white bg-[#FF7A1A] px-1.5 py-0.5 rounded-full">
                  {discountLabel}
                </span>
              )}
            </div>
            {priceOld && (
              <span className="text-[11px] text-[#9CA3AF] line-through">
                {priceOld}
              </span>
            )}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleCtaClick}
            className={cn(
              'w-full h-7 rounded-lg',
              'bg-[#FF7A1A] text-white',
              'text-[12px] font-semibold',
              'shadow-[0_4px_12px_rgba(255,122,26,0.3)]',
              'transition-all duration-150 ease-out',
              'hover:bg-[#FF8A35] hover:shadow-[0_6px_16px_rgba(255,122,26,0.4)]',
              'active:scale-95 active:shadow-[0_2px_8px_rgba(255,122,26,0.3)]'
            )}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
