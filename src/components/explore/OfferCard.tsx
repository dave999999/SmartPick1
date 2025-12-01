/**
 * OfferCard - Premium Compact Offer Display
 * 
 * Features:
 * - Distance badge
 * - Partner rating indicator
 * - Image with gradient overlay
 * - Price and savings display
 * - Countdown timer
 * - Intersection observer for map sync
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Star } from 'lucide-react';
import { Offer } from '@/lib/types';
import { calculateDistance, formatDistance } from '@/lib/maps/distance';

interface OfferCardProps {
  offer: Offer;
  userLocation: [number, number] | null;
  onClick: () => void;
  onInView?: () => void;
}

export function OfferCard({ offer, userLocation, onClick, onInView }: OfferCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate distance
  const distance = userLocation && offer.partner?.location
    ? calculateDistance(
        { lat: userLocation[0], lng: userLocation[1] },
        { lat: offer.partner.location.latitude, lng: offer.partner.location.longitude }
      )
    : null;

  // Calculate time remaining
  const getTimeRemaining = () => {
    const endTime = new Date(offer.pickup_end || '').getTime();
    const now = Date.now();
    const diff = endTime - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const timeRemaining = getTimeRemaining();
  const isExpiringSoon = timeRemaining !== 'Expired' && !timeRemaining.includes('h');

  // Intersection observer for map sync
  useEffect(() => {
    if (!cardRef.current || !onInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            onInView();
          }
        });
      },
      { threshold: [0.4] }
    );

    observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [onInView]);

  // Calculate savings
  const savings = offer.original_price && offer.smart_price
    ? ((offer.original_price - offer.smart_price) / offer.original_price) * 100
    : 0;

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer"
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={offer.images?.[0] || '/placeholder-food.jpg'}
          alt={offer.title}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Distance Badge */}
        {distance !== null && (
          <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-0.5 shadow-sm">
            <MapPin className="w-2.5 h-2.5 text-orange-500" />
            <span className="text-[10px] font-bold text-gray-900">
              {formatDistance(distance)}
            </span>
          </div>
        )}

        {/* Time Badge */}
        <div
          className={`absolute top-1.5 right-1.5 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-0.5 shadow-sm ${
            isExpiringSoon
              ? 'bg-red-500/95 text-white'
              : 'bg-white/95 text-gray-900'
          }`}
        >
          <Clock className="w-2.5 h-2.5" />
          <span className="text-[10px] font-bold">{timeRemaining}</span>
        </div>

        {/* Savings Badge */}
        {savings > 0 && (
          <div className="absolute bottom-1.5 left-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full px-2 py-0.5 shadow-sm">
            <span className="text-[10px] font-bold">-{Math.round(savings)}%</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-2 space-y-1.5">
        {/* Title */}
        <h3 className="font-bold text-xs text-gray-900 line-clamp-2 leading-tight">
          {offer.title}
        </h3>

        {/* Business Name with Rating */}
        {offer.partner && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600 flex-1 truncate">
              {offer.partner.business_name}
            </span>
            <div className="flex items-center gap-0.5 bg-green-50 rounded-full px-1 py-0.5">
              <Star className="w-2.5 h-2.5 text-green-600 fill-green-600" />
              <span className="text-[9px] font-bold text-green-700">4.5</span>
            </div>
          </div>
        )}

        {/* Price Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            {offer.smart_price ? (
              <>
                <span className="text-base font-bold text-orange-600">
                  ₾{offer.smart_price}
                </span>
                {offer.original_price && (
                  <span className="text-[10px] text-gray-400 line-through">
                    ₾{offer.original_price}
                  </span>
                )}
              </>
            ) : (
              <span className="text-base font-bold text-gray-900">
                ₾{offer.original_price || 0}
              </span>
            )}
          </div>

          {/* Quantity Available */}
          <div className="text-[10px] font-medium text-gray-500">
            {offer.quantity_available} left
          </div>
        </div>
      </div>
    </motion.div>
  );
}
