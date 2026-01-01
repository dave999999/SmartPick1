import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EnrichedOffer } from '@/lib/offerFilters';

interface Props {
  offer: EnrichedOffer;
  onClick: () => void;
  onInView?: () => void;
}

export const OfferCard: React.FC<Props> = ({ offer, onClick, onInView }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection observer for map sync
  useEffect(() => {
    if (!onInView) return;
    
    const element = cardRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            onInView();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(element);
    
    return () => {
      try {
        observer.disconnect();
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [onInView]);

  const discountPercent = offer.discount_percent || 
    Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-32 bg-gray-100">
        {offer.images?.[0] ? (
          <img
            src={offer.images[0]}
            alt={offer.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            🎁
          </div>
        )}
        <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
          <span className="text-white text-xs font-bold">
            {discountPercent}% OFF
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-1">
        <h4 className="font-bold text-sm line-clamp-2">{offer.title}</h4>
        <p className="text-xs text-gray-600 line-clamp-1">
          {offer.partner?.business_name || 'Partner'}
        </p>
        
        {offer.distance && (
          <p className="text-xs text-gray-400">
            📍 {offer.distance.toFixed(1)} km • {offer.eta} min
          </p>
        )}

        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-lg font-bold text-orange-600">
            {offer.smart_price}₾
          </span>
          <span className="text-sm text-gray-400 line-through">
            {offer.original_price}₾
          </span>
        </div>
      </div>
    </motion.div>
  );
};
