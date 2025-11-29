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
      animate={{ height: isExpanded ? 220 : 200 }}
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
          <span className="text-7xl">🍽️</span>
        </div>
      )}

      {/* Gradient Overlay - Darker for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      {/* Text Overlay Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
        {/* Time Badge - Top Right */}
        {timeRemaining && timeRemaining !== 'Expired' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="absolute top-[-140px] right-4"
          >
            <div className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg
              ${isExpiringSoon
                ? 'bg-orange-500/90 text-white'
                : 'bg-green-500/90 text-white'
              }
            `}>
              <Clock className="h-3.5 w-3.5" />
              <span>{timeRemaining}</span>
            </div>
          </motion.div>
        )}

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-lg font-bold text-white leading-tight mb-1.5 drop-shadow-lg"
        >
          {title}
        </motion.h3>

        {/* Description */}
        {description ? (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="text-sm text-white/95 leading-snug drop-shadow-md line-clamp-2"
          >
            {description}
          </motion.p>
        ) : (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="text-xs text-white/80 italic drop-shadow-md"
          >
            Ready for pickup. Limited stock.
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
