/**
 * PartnerOfferCard - Large Carousel Card for Partner Mode
 * 
 * Larger, more detailed card for partner-specific carousel:
 * - 16:9 image aspect ratio
 * - Larger text (16px title, 14px description)
 * - Full description preview
 * - Prominent "Reserve Now" button
 * - Same badges (time, discount, distance)
 */

import { motion } from 'framer-motion';
import { MapPin, Clock, Star } from 'lucide-react';
import { Offer, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { calculateDistance, formatDistance } from '@/lib/maps/distance';

interface PartnerOfferCardProps {
  offer: Offer;
  userLocation: [number, number] | null;
  onClick: () => void;
  user: User | null;
}

export function PartnerOfferCard({ offer, userLocation, onClick, user }: PartnerOfferCardProps) {
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

  // Calculate savings
  const savings = offer.original_price && offer.smart_price
    ? ((offer.original_price - offer.smart_price) / offer.original_price) * 100
    : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-white rounded-2xl shadow-xl overflow-hidden"
    >
      {/* Image Section (16:9) */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={offer.images?.[0] || '/placeholder-food.jpg'}
          alt={offer.title}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Distance Badge */}
        {distance !== null && (
          <div className="absolute top-2 left-2 bg-white/95 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm">
            <MapPin className="w-3 h-3 text-orange-500" />
            <span className="text-xs font-bold text-gray-900">
              {formatDistance(distance)}
            </span>
          </div>
        )}

        {/* Time Badge */}
        <div
          className={`absolute top-2 right-2 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1 shadow-sm ${
            isExpiringSoon
              ? 'bg-red-500/95 text-white'
              : 'bg-white/95 text-gray-900'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span className="text-xs font-bold">{timeRemaining}</span>
        </div>

        {/* Savings Badge */}
        {savings > 0 && (
          <div className="absolute bottom-2 left-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full px-3 py-1 shadow-md">
            <span className="text-sm font-bold">Save {Math.round(savings)}%</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-bold text-base text-gray-900 leading-tight">
          {offer.title}
        </h3>

        {/* Description */}
        {offer.description && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {offer.description}
          </p>
        )}

        {/* Price Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            {offer.smart_price ? (
              <>
                <span className="text-2xl font-bold text-orange-600">
                  ₾{offer.smart_price}
                </span>
                {offer.original_price && (
                  <span className="text-sm text-gray-400 line-through">
                    ₾{offer.original_price}
                  </span>
                )}
              </>
            ) : (
              <span className="text-2xl font-bold text-gray-900">
                ₾{offer.original_price || 0}
              </span>
            )}
          </div>

          {/* Quantity Available */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1">
            <span className="text-xs font-medium text-gray-600">
              {offer.quantity_available === 1 ? 'Only 1 left!' : `${offer.quantity_available} left`}
            </span>
          </div>
        </div>

        {/* Pickup Time */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>
            Pickup: {new Date(offer.pickup_start || '').toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })} - {new Date(offer.pickup_end || '').toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Reserve Button */}
        <Button
          onClick={onClick}
          disabled={!user}
          className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base rounded-xl shadow-lg shadow-orange-500/30 transition-all"
        >
          {user ? 'Reserve Now' : 'Sign In to Reserve'}
        </Button>

        {/* Additional Info */}
        <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
          <Star className="w-3 h-3 fill-gray-400" />
          <span>Reserved 12 times today</span>
        </div>
      </div>
    </motion.div>
  );
}
