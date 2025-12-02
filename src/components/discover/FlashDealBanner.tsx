/**
 * FlashDealBanner - Hero banner for time-limited flash deals
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, Clock } from 'lucide-react';
import { EnrichedOffer } from '@/lib/offerFilters';

interface FlashDealBannerProps {
  offer: EnrichedOffer;
  onClick: () => void;
}

export function FlashDealBanner({ offer, onClick }: FlashDealBannerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const endTime = offer.pickup_end_time
        ? new Date(offer.pickup_end_time)
        : new Date(now.getTime() + 60 * 60 * 1000); // Default 1 hour

      const diff = endTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        return 'Expired';
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      return `${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [offer]);

  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';
  const discountPercent = offer.discount_percent || 0;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full"
    >
      <div className="relative h-40 bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 rounded-[20px] border border-orange-200 shadow-md overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grain.png')] opacity-10 mix-blend-overlay" />
        
        <div className="relative h-full grid grid-cols-[60%_40%] gap-4 p-4">
          {/* Left: Text Content */}
          <div className="flex flex-col justify-center">
            {/* Flash Deal Badge */}
            <div className="flex items-center gap-1.5 mb-2">
              <div className="px-2.5 py-0.5 bg-orange-500 rounded-full flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wide">
                  Flash Deal
                </span>
              </div>
              {timeLeft && (
                <div className="flex items-center gap-1 text-red-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Ends in {timeLeft}</span>
                </div>
              )}
            </div>

            {/* Product Title */}
            <h3 className="text-lg font-bold text-gray-900 leading-tight mb-2 line-clamp-2">
              {offer.title}
            </h3>

            {/* Pricing */}
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-extrabold text-orange-600 leading-none">
                {offer.smart_price.toFixed(2)}₾
              </span>
              <span className="text-base text-gray-400 line-through">
                {offer.original_price.toFixed(2)}₾
              </span>
            </div>

            {/* Quantity/Pack Info */}
            {offer.quantity && (
              <p className="text-xs text-gray-500 mt-1">
                {offer.quantity} {offer.unit || 'pcs'}
              </p>
            )}
          </div>

          {/* Right: Product Image */}
          <div className="relative flex items-center justify-center">
            {/* Discount Badge */}
            {discountPercent > 0 && (
              <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-md z-10">
                -{discountPercent}%
              </div>
            )}
            
            <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg">
              <img
                src={imageUrl}
                alt={offer.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
