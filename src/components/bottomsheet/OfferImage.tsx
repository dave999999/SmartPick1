/**
 * OfferImage - Full-width rectangular product image with gradient overlay and info
 */

import { motion } from 'framer-motion';
import { resolveOfferImageUrl } from '@/lib/api';
import { Clock } from 'lucide-react';

interface OfferImageProps {
  imageUrl?: string;
  title: string;
  description?: string;
  timeRemaining?: string;
  isExpiringSoon?: boolean;
  category: string;
  isExpanded: boolean;
}

export function OfferImage({
  imageUrl,
  title,
  description,
  timeRemaining,
  isExpiringSoon,
  category,
  isExpanded
}: OfferImageProps) {
  const resolvedUrl = imageUrl
    ? resolveOfferImageUrl(imageUrl, category, { width: 800, quality: 85 })
    : null;

  return (
    <motion.div
      animate={{ height: isExpanded ? 170 : 160 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100"
    >
      {/* Product Image */}
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/images/Map.jpg';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-6xl">🍽️</span>
        </div>
      )}

      {/* Gradient Overlay - Subtle for clean look */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

      {/* Text Overlay Content */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 text-white z-10">
        {/* Time Badge - Top Right */}
        {timeRemaining && timeRemaining !== 'Expired' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="absolute top-[-110px] right-3"
          >
            <div className={`
              flex items-center gap-0.5 px-2 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md shadow-md
              ${isExpiringSoon
                ? 'bg-orange-500/90 text-white'
                : 'bg-green-500/90 text-white'
              }
            `}>
              <Clock className="h-3 w-3" />
              <span>{timeRemaining}</span>
            </div>
          </motion.div>
        )}

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-base font-bold text-white leading-tight mb-0.5 drop-shadow-lg"
        >
          {title}
        </motion.h3>

        {/* Description */}
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="text-xs text-white/90 leading-snug drop-shadow-md line-clamp-1"
          >
            {description}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
