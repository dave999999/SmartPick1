/**
 * OfferHeader - Sticky navigation header with arrows and close button
 */

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface OfferHeaderProps {
  title: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose: () => void;
  isExpanded: boolean;
}

export function OfferHeader({
  title,
  onPrevious,
  onNext,
  onClose,
  isExpanded
}: OfferHeaderProps) {
  return (
    <motion.div
      animate={{
        backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.98)' : 'rgba(255, 255, 255, 0)',
        backdropFilter: isExpanded ? 'blur(10px)' : 'blur(0px)',
      }}
      transition={{ duration: 0.2 }}
      className="sticky top-0 z-20 flex items-center justify-center px-2 py-1"
    >
      {/* Center Title */}
      <motion.h2
        animate={{
          opacity: isExpanded ? 1 : 0,
          y: isExpanded ? 0 : -10
        }}
        transition={{ duration: 0.2 }}
        className="text-center text-sm font-semibold text-gray-900 truncate"
      >
        {title}
      </motion.h2>
    </motion.div>
  );
}
