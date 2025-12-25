/**
 * OfferListCard.tsx
 * Compact vertical card for horizontal scroll lists
 * Apple-inspired premium design with SmartPick branding
 */

import { Heart, Clock } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Helper to format time remaining
function formatTimeRemaining(expiresAt: string): string | null {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  // Show days + hours if days > 0
  if (days > 0) {
    return hours > 0 ? `${days}დ ${hours}სთ` : `${days}დ`;
  }
  // Show hours + minutes if hours > 0
  if (hours > 0) {
    return minutes > 0 ? `${hours}სთ ${minutes}წთ` : `${hours}სთ`;
  }
  // Show only minutes
  return `${minutes}წთ`;
}

export type OfferListCardProps = {
  title: string;
  imageUrl: string;
  priceNow: string;
  priceOld?: string;
  isFavorite?: boolean;
  metaLine?: string;
  expiresAt?: string;
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
  expiresAt,
  onClick,
  onToggleFavorite,
}: OfferListCardProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const timeRemaining = expiresAt ? formatTimeRemaining(expiresAt) : null;

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
        'w-full rounded-xl overflow-hidden',
        'transition-all duration-150 ease-out',
        onClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-2xl',
        onClick && 'active:scale-[0.98]'
      )}
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        transform: 'translateZ(0)'
      }}
    >
      {/* Image Section */}
      <div className="relative w-full pb-[100%] bg-gray-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
          }}
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

        {/* Time Remaining Badge - Bottom Right Corner */}
        {timeRemaining && (
          <div className="absolute bottom-0 right-0 z-10">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 backdrop-blur-md rounded-tl-md px-1.5 py-0.5 shadow-md border border-orange-200/60">
              <div className="flex items-center gap-0.5">
                <Clock size={8} className="text-orange-600" strokeWidth={2.5} />
                <span className="text-[9px] font-bold text-orange-600 leading-none">
                  {timeRemaining}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Text Section */}
      <div className="px-2 py-1.5 text-center">
        <h4 className="text-[12px] font-medium text-[#111827] line-clamp-1 leading-tight">
          {title}
        </h4>
      </div>
    </div>
  );
}
