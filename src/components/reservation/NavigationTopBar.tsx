/**
 * NavigationTopBar - Google Maps style navigation header
 * Shows during active navigation with live updates
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigationTopBarProps {
  isActive: boolean;
  partnerName: string;
  distance?: number; // in meters
  eta?: number; // in minutes
  onClose: () => void;
}

export function NavigationTopBar({
  isActive,
  partnerName,
  distance,
  eta,
  onClose,
}: NavigationTopBarProps) {
  const formatDistance = (meters?: number) => {
    if (!meters) return '...';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[90] bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200 safe-top"
        >
          <div className="px-3 py-2.5 flex items-center justify-between max-w-md mx-auto">
            {/* Left Icon */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Navigating to
                </p>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                  {partnerName}
                </h3>
              </div>
            </div>

            {/* Right: Distance + ETA */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold text-blue-600 tabular-nums">
                  {formatDistance(distance)}
                </p>
                <p className="text-[9px] sm:text-[10px] text-gray-500 font-medium">
                  {eta ? `~${eta} min` : '...'}
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-gray-100 flex-shrink-0"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
              </Button>
            </div>
          </div>

          {/* Progress Bar Animation */}
          <motion.div
            className="h-0.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            style={{ originX: 0 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
