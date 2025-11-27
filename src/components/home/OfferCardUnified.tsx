/**
 * ✨ UNIFIED OFFER CARD - Premium Light Design
 * 
 * Following strict specifications:
 * - Fixed 140px image height
 * - Consistent 12px padding
 * - 16px border radius
 * - Title: 2 lines max
 * - Partner: 1 line max
 * - Uniform card heights
 * - Professional spacing
 * - Light mode only
 */

import { Offer } from '@/lib/types';
import { resolveOfferImageUrl } from '@/lib/api';

interface OfferCardUnifiedProps {
  offer: Offer;
  onClick: (offer: Offer) => void;
}

export function OfferCardUnified({ offer, onClick }: OfferCardUnifiedProps) {
  // Calculate discount percentage
  const discountPercent = offer.original_price > offer.smart_price
    ? Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100)
    : 0;

  // Resolve image URL
  const imageUrl = offer.images?.[0] 
    ? resolveOfferImageUrl(offer.images[0], offer.category, { width: 400, quality: 85 })
    : '/images/Map.jpg';

  return (
    <div
      onClick={() => onClick(offer)}
      className="
        relative flex flex-col
        bg-white
        rounded-2xl
        overflow-hidden
        border border-black/[0.06]
        shadow-[0_2px_6px_rgba(0,0,0,0.04)]
        hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]
        hover:-translate-y-0.5
        active:translate-y-0
        transition-all duration-200
        cursor-pointer
        group
      "
      style={{
        overflow: 'hidden',
        overflowX: 'hidden',
        overflowY: 'hidden'
      }}
    >
      {/* Image Container - Fixed 140px height */}
      <div 
        className="relative w-full bg-gradient-to-br from-gray-50 to-gray-100"
        style={{ height: '140px' }}
      >
        <img
          src={imageUrl}
          alt={offer.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
          }}
        />

        {/* Discount Badge - Top Left */}
        {discountPercent > 0 && (
          <div 
            className="absolute flex items-center justify-center"
            style={{
              top: '8px',
              left: '8px',
              padding: '2px 6px',
              backgroundColor: '#EF4444',
              borderRadius: '6px'
            }}
          >
            <span 
              className="text-white font-semibold"
              style={{ fontSize: '12px', lineHeight: '16px' }}
            >
              -{discountPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Content Section - 12px padding on all sides */}
      <div 
        className="flex flex-col"
        style={{ padding: '12px' }}
      >
        {/* Title - Max 2 lines */}
        <h3 
          className="font-semibold text-gray-900 line-clamp-2"
          style={{ 
            fontSize: '14px',
            lineHeight: '18px',
            minHeight: '36px'
          }}
        >
          {offer.title}
        </h3>

        {/* Partner Name - Max 1 line */}
        <p 
          className="text-gray-500 truncate"
          style={{ 
            fontSize: '12px',
            lineHeight: '16px',
            marginTop: '2px',
            minHeight: '16px'
          }}
        >
          {offer.partner?.business_name || 'Partner'}
        </p>

        {/* Price Section */}
        <div 
          className="flex items-center"
          style={{ marginTop: '8px' }}
        >
          {/* Price Icon */}
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-600"
            style={{ marginRight: '4px', flexShrink: 0 }}
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>

          {/* Current Price */}
          <span 
            className="font-semibold"
            style={{ 
              fontSize: '15px',
              color: '#059669',
              lineHeight: '20px'
            }}
          >
            {offer.smart_price.toFixed(2)}
          </span>

          {/* Original Price */}
          {offer.original_price > offer.smart_price && (
            <span 
              className="line-through"
              style={{ 
                fontSize: '12px',
                color: '#9CA3AF',
                marginLeft: '6px',
                lineHeight: '16px'
              }}
            >
              {offer.original_price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
