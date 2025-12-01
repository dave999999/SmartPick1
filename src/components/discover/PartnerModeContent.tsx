/**
 * PartnerModeContent - Partner-Specific Carousel View
 * 
 * Shows offers from a single partner in a beautiful carousel:
 * - Partner header (name, location, tagline)
 * - Partner info row (rating, distance, walking time)
 * - Horizontal swipeable carousel
 * - Large partner offer cards
 * - Pagination dots
 * - "See all offers" button
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, Clock, ExternalLink } from 'lucide-react';
import { Offer, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { calculateDistance, formatDistance } from '@/lib/maps/distance';
import { PartnerOfferCard } from './PartnerOfferCard';

interface PartnerModeContentProps {
  offers: Offer[];
  partnerId: string | null;
  user: User | null;
  userLocation: [number, number] | null;
  onOfferClick: (offer: Offer, index: number) => void;
  onMapCenter?: (location: { lat: number; lng: number }) => void;
  onBackToDiscover: () => void;
}

export function PartnerModeContent({
  offers,
  partnerId,
  user,
  userLocation,
  onOfferClick,
  onMapCenter,
  onBackToDiscover,
}: PartnerModeContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  // Get partner info from first offer
  const partner = offers[0]?.partner;

  // Calculate distance and walking time
  const distanceInfo = useMemo(() => {
    if (!userLocation || !partner?.location) return null;

    const distanceMeters = calculateDistance(
      { lat: userLocation[0], lng: userLocation[1] },
      { lat: partner.location.latitude, lng: partner.location.longitude }
    );

    // Estimate walking time (average speed: 1.4 m/s or ~5 km/h)
    const walkingTimeMinutes = Math.round(distanceMeters / (1.4 * 60));

    return {
      distance: formatDistance(distanceMeters),
      walkingTime: walkingTimeMinutes,
    };
  }, [userLocation, partner]);

  // Handle carousel navigation
  const handleNext = () => {
    if (currentIndex < offers.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Handle swipe
  const handleSwipe = (swipeDirection: number) => {
    if (swipeDirection > 0) {
      handlePrevious();
    } else {
      handleNext();
    }
  };

  // Center map on partner
  const handleViewOnMap = () => {
    if (partner?.location) {
      onMapCenter?.({
        lat: partner.location.latitude,
        lng: partner.location.longitude,
      });
    }
  };

  // Empty state
  if (!partner || offers.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-3">😢</div>
        <h3 className="text-base font-bold text-gray-900 mb-2">
          No active offers
        </h3>
        <p className="text-xs text-gray-600 mb-4">
          This partner has no offers right now. Check back later!
        </p>
        <Button
          onClick={onBackToDiscover}
          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white h-9 text-sm"
        >
          Browse Other Offers
        </Button>
      </div>
    );
  }

  const currentOffer = offers[currentIndex];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Partner Header */}
      <div className="px-4 py-3 border-b border-gray-100 space-y-1">
        <h2 className="text-lg font-bold text-gray-900">
          {partner.business_name}
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>{partner.location?.district || 'Tbilisi'}</span>
          <span>•</span>
          <span>Great picks here ✨</span>
        </div>
      </div>

      {/* Partner Info Row */}
      <div className="px-4 py-2 border-b border-gray-50 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-green-600 fill-green-600" />
            <span className="font-bold">4.8</span>
            <span className="text-gray-400">(240)</span>
          </div>

          {/* Distance & Time */}
          {distanceInfo && (
            <>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{distanceInfo.distance}</span>
              </div>
              <span className="text-gray-300">•</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{distanceInfo.walkingTime} min</span>
              </div>
            </>
          )}
        </div>

        {/* View on Map Button */}
        <button
          onClick={handleViewOnMap}
          className="flex items-center gap-1 text-xs text-orange-600 font-medium hover:text-orange-700 transition-colors"
        >
          <span>View on map</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Carousel Container */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col items-center justify-center px-4 py-6 space-y-4">
          {/* Card Carousel */}
          <div className="relative w-full max-w-md">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={{
                  enter: (direction: number) => ({
                    x: direction > 0 ? 300 : -300,
                    opacity: 0,
                  }),
                  center: {
                    x: 0,
                    opacity: 1,
                  },
                  exit: (direction: number) => ({
                    x: direction < 0 ? 300 : -300,
                    opacity: 0,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  type: 'spring',
                  damping: 30,
                  stiffness: 300,
                }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = Math.abs(offset.x) * velocity.x;
                  if (swipe > 10000) {
                    handleSwipe(offset.x);
                  }
                }}
                className="w-full"
              >
                <PartnerOfferCard
                  offer={currentOffer}
                  userLocation={userLocation}
                  onClick={() => onOfferClick(currentOffer, currentIndex)}
                  user={user}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Pagination Dots */}
          {offers.length > 1 && (
            <div className="flex items-center gap-2">
              {offers.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`rounded-full transition-all ${
                    idx === currentIndex
                      ? 'w-8 h-2 bg-orange-500'
                      : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Offer Counter */}
          <div className="text-xs text-gray-500">
            Offer {currentIndex + 1} of {offers.length}
          </div>

          {/* See All Offers Button */}
          {offers.length > 3 && (
            <Button
              onClick={onBackToDiscover}
              variant="outline"
              className="text-xs border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              See all {offers.length} offers from this partner
            </Button>
          )}
        </div>
      </div>

      {/* Swipe Hint */}
      <div className="px-4 py-2 text-center">
        <p className="text-xs text-gray-400">
          ← Swipe to browse →
        </p>
      </div>
    </div>
  );
}
