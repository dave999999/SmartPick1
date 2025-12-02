/**
 * OfferCardHorizontal - Large horizontal card for Best Sellers carousel
 */

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock } from 'lucide-react';
import { EnrichedOffer } from '@/lib/offerFilters';

interface OfferCardHorizontalProps {
  offer: EnrichedOffer;
  userLocation?: [number, number] | null;
  onClick: () => void;
}

export function OfferCardHorizontal({ offer, userLocation, onClick }: OfferCardHorizontalProps) {
  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';
  const discountPercent = offer.discount_percent || 0;
  
  // Calculate distance (simplified - you may have a utility function)
  const distance = userLocation && offer.partner?.latitude && offer.partner?.longitude
    ? calculateDistance(userLocation, [offer.partner.latitude, offer.partner.longitude])
    : null;

  // Pickup time estimate
  const pickupTime = '10-15 min'; // Placeholder

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="w-[200px] flex-shrink-0"
    >
      <div className="bg-white rounded-[18px] shadow-md overflow-hidden">
        {/* Image */}
        <div className="relative h-32 bg-gray-100">
          <img
            src={imageUrl}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
          
          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
              -{discountPercent}%
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          {/* Title */}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
            {offer.title}
          </h3>

          {/* Pricing */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-orange-600">
              {offer.smart_price.toFixed(2)}₾
            </span>
            <span className="text-xs text-gray-400 line-through">
              {offer.original_price.toFixed(2)}₾
            </span>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {distance && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{distance.toFixed(1)}km</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{pickupTime}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// Helper function (you may already have this)
function calculateDistance(from: [number, number], to: [number, number]): number {
  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
