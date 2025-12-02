/**
 * OfferCardGrid - Compact grid card for All Offers section
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
import { EnrichedOffer } from '@/lib/offerFilters';

interface OfferCardGridProps {
  offer: EnrichedOffer;
  userLocation?: [number, number] | null;
  onClick: () => void;
}

export function OfferCardGrid({ offer, userLocation, onClick }: OfferCardGridProps) {
  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';
  const discountPercent = offer.discount_percent || 0;
  
  // Calculate distance (simplified)
  const distance = userLocation && offer.partner?.latitude && offer.partner?.longitude
    ? calculateDistance(userLocation, [offer.partner.latitude, offer.partner.longitude])
    : null;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="w-full text-left"
    >
      <div className="bg-white rounded-[16px] shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-100">
          <img
            src={imageUrl}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
          
          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
              -{discountPercent}%
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2.5 space-y-1.5">
          {/* Title */}
          <h3 className="text-[13px] font-semibold text-gray-900 line-clamp-2 min-h-[2.4rem]">
            {offer.title}
          </h3>

          {/* Pricing */}
          <div className="flex items-baseline gap-1">
            <span className="text-base font-bold text-orange-600">
              {offer.smart_price.toFixed(2)}₾
            </span>
            <span className="text-[11px] text-gray-400 line-through">
              {offer.original_price.toFixed(2)}₾
            </span>
          </div>

          {/* Meta Info */}
          {distance && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <MapPin className="w-3 h-3" />
              <span>{distance.toFixed(1)}km away</span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// Helper function
function calculateDistance(from: [number, number], to: [number, number]): number {
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
