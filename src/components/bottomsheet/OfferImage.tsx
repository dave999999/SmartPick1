/**
 * OfferImage - Full-width rectangular product image with gradient overlay
 */

import { motion } from 'framer-motion';
import { resolveOfferImageUrl } from '@/lib/api';

interface OfferImageProps {
  imageUrl?: string;
  title: string;
  category: string;
  isExpanded: boolean;
}

export function OfferImage({
  imageUrl,
  title,
  category,
  isExpanded
}: OfferImageProps) {
  const resolvedUrl = imageUrl
    ? resolveOfferImageUrl(imageUrl, category, { width: 800, quality: 85 })
    : null;

  return (
    <motion.div
      animate={{ height: isExpanded ? 130 : 120 }}
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

      {/* Gradient Overlay */}
      <motion.div
        animate={{ height: isExpanded ? 64 : 48 }}
        transition={{ duration: 0.3 }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none"
      />
    </motion.div>
  );
}
