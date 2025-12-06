/**
 * SpecialOfferCard.tsx
 * Pixel-perfect recreation of the reference Special Offer Card UI
 * Glass morphism design with exact measurements from screenshot
 */

import React from 'react';

// 🎨 Design Tokens - Exact colors and shadows from reference
const TOKENS = {
  colors: {
    priceOrange: '#FF8A00',
    gradientStart: '#FF8A00',
    gradientEnd: '#FF5A00',
    badgeGradientStart: '#FF7A00',
    badgeGradientEnd: '#FF4E00',
    oldPriceGray: '#9CA3AF',
  },
  shadows: {
    card: '0 8px 32px rgba(0, 0, 0, 0.12)',
    image: '0 4px 12px rgba(0, 0, 0, 0.15)',
    button: '0 4px 16px rgba(255, 138, 0, 0.3)',
  },
};

interface SpecialOfferCardProps {
  title: string;
  imageUrl: string;
  currentPrice: number;
  originalPrice: number;
  discountPercent: number;
  distance?: string;
  eta?: string;
  onReserve?: () => void;
}

export function SpecialOfferCard({
  title,
  imageUrl,
  currentPrice,
  originalPrice,
  discountPercent,
  distance = '0.8 km',
  eta = '1.5 km away',
  onReserve,
}: SpecialOfferCardProps) {
  return (
    <div
      className="relative rounded-3xl p-4 border border-white/20"
      style={{
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: TOKENS.shadows.card,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Product Image - Exact 1:1 square with drop shadow */}
        <div
          className="flex-shrink-0 rounded-2xl overflow-hidden"
          style={{
            width: '76px',
            height: '76px',
            boxShadow: TOKENS.shadows.image,
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Stack */}
        <div className="flex-1 flex flex-col gap-1.5">
          {/* Title */}
          <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">
            {title}
          </h3>

          {/* Price Row */}
          <div className="flex items-baseline gap-2">
            <span
              className="text-[22px] font-bold leading-none"
              style={{ color: TOKENS.colors.priceOrange }}
            >
              ${currentPrice}
            </span>
            <div
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white leading-none"
              style={{
                background: `linear-gradient(135deg, ${TOKENS.colors.badgeGradientStart} 0%, ${TOKENS.colors.badgeGradientEnd} 100%)`,
              }}
            >
              {discountPercent}% off
            </div>
          </div>

          {/* Old Price + Distance */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className="line-through font-medium"
              style={{ color: TOKENS.colors.oldPriceGray }}
            >
              ${originalPrice}
            </span>
            <span className="text-gray-500">• {eta}</span>
          </div>
        </div>

        {/* Reserve Button - Positioned absolute to align right */}
        <button
          onClick={onReserve}
          className="absolute bottom-4 right-4 px-5 py-2 rounded-full text-white text-sm font-semibold transition-transform active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${TOKENS.colors.gradientStart} 0%, ${TOKENS.colors.gradientEnd} 100%)`,
            boxShadow: TOKENS.shadows.button,
          }}
        >
          Reserve Now
        </button>
      </div>
    </div>
  );
}

// 📱 Mobile-Optimized Version (iPhone SE and small screens)
export function SpecialOfferCardMobile({
  title,
  imageUrl,
  currentPrice,
  originalPrice,
  discountPercent,
  distance = '0.8 km',
  eta = '1.5 km away',
  onReserve,
}: SpecialOfferCardProps) {
  return (
    <div
      className="relative rounded-2xl p-3 border border-white/20"
      style={{
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: TOKENS.shadows.card,
      }}
    >
      <div className="flex items-start gap-2.5">
        {/* Product Image - Slightly smaller for mobile */}
        <div
          className="flex-shrink-0 rounded-xl overflow-hidden"
          style={{
            width: '64px',
            height: '64px',
            boxShadow: TOKENS.shadows.image,
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content Stack */}
        <div className="flex-1 flex flex-col gap-1">
          {/* Title */}
          <h3 className="text-[14px] font-semibold text-gray-900 leading-tight">
            {title}
          </h3>

          {/* Price Row */}
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-[20px] font-bold leading-none"
              style={{ color: TOKENS.colors.priceOrange }}
            >
              ${currentPrice}
            </span>
            <div
              className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white leading-none"
              style={{
                background: `linear-gradient(135deg, ${TOKENS.colors.badgeGradientStart} 0%, ${TOKENS.colors.badgeGradientEnd} 100%)`,
              }}
            >
              {discountPercent}% off
            </div>
          </div>

          {/* Old Price + Distance */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span
              className="line-through font-medium"
              style={{ color: TOKENS.colors.oldPriceGray }}
            >
              ${originalPrice}
            </span>
            <span className="text-gray-500">• {eta}</span>
          </div>
        </div>

        {/* Reserve Button - Compact for mobile */}
        <button
          onClick={onReserve}
          className="absolute bottom-3 right-3 px-4 py-1.5 rounded-full text-white text-[13px] font-semibold transition-transform active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${TOKENS.colors.gradientStart} 0%, ${TOKENS.colors.gradientEnd} 100%)`,
            boxShadow: TOKENS.shadows.button,
          }}
        >
          Reserve Now
        </button>
      </div>
    </div>
  );
}

export default SpecialOfferCard;
