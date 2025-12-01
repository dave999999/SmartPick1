/**
 * FloatingReservationCard - Compact top card after reservation
 * Shows immediately after reservation with slide-in animation
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Navigation, QrCode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reservation } from '@/lib/types';
import { resolveOfferImageUrl } from '@/lib/api';

interface FloatingReservationCardProps {
  reservation: Reservation;
  distance?: number; // in meters
  eta?: number; // in minutes
  onNavigate: () => void;
  onViewQR: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onCancel: () => void;
}

export function FloatingReservationCard({
  reservation,
  distance,
  eta,
  onNavigate,
  onViewQR,
  onMinimize,
  onClose,
  onCancel,
}: FloatingReservationCardProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(reservation.expires_at);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [reservation.expires_at]);

  const isExpiringSoon = timeRemaining !== 'Expired' && 
    new Date(reservation.expires_at).getTime() - new Date().getTime() < 5 * 60 * 1000;

  const formatDistance = (meters?: number) => {
    if (!meters) return 'Calculating...';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -120, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-16 left-0 right-0 z-[100] px-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[calc(100%-2rem)] sm:max-w-md"
      >
        <div className="bg-white rounded-[20px] shadow-2xl shadow-orange-500/10 border border-orange-100/50 overflow-hidden">
          {/* Success Banner */}
          <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-white text-xs sm:text-sm font-bold">🎉 Reservation Confirmed!</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6 text-white hover:bg-white/20 rounded-full flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Main Content */}
          <div className="p-3 space-y-2.5">
            {/* Partner Info with Thumbnail */}
            <div className="flex items-center gap-2.5">
              {reservation.offer?.images?.[0] && (
                <img
                  src={resolveOfferImageUrl(
                    reservation.offer.images[0],
                    reservation.offer.category,
                    { width: 80, quality: 75 }
                  )}
                  alt={reservation.offer.title}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-md border border-gray-100 flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {reservation.partner?.business_name}
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-600 truncate">
                  {reservation.offer?.title}
                </p>
                <p className="text-[11px] sm:text-xs text-orange-600 font-semibold">
                  {reservation.quantity} {reservation.quantity > 1 ? 'items' : 'item'} reserved
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Pickup Window */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-2 border border-blue-100/50">
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-blue-600 flex-shrink-0" />
                  <span className="text-[9px] font-semibold text-blue-900 uppercase tracking-wide">
                    Pickup
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-900 leading-tight">
                  {new Date(reservation.offer?.pickup_start || '').toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {' - '}
                  {new Date(reservation.offer?.pickup_end || '').toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Distance + ETA */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-2 border border-green-100/50">
                <div className="flex items-center gap-1 mb-0.5">
                  <MapPin className="w-3 h-3 text-green-600 flex-shrink-0" />
                  <span className="text-[9px] font-semibold text-green-900 uppercase tracking-wide">
                    Distance
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-gray-900 leading-tight">
                  {formatDistance(distance)} • {eta ? `~${eta} min` : '...'}
                </p>
              </div>
            </div>

            {/* Countdown Timer */}
            <div
              className={`rounded-xl p-2 border flex items-center justify-between ${
                isExpiringSoon
                  ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'
                  : 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
              }`}
            >
              <span className="text-[10px] sm:text-xs font-medium text-gray-700">
                Expires in:
              </span>
              <span
                className={`text-sm sm:text-base font-bold tabular-nums ${
                  isExpiringSoon ? 'text-orange-600' : 'text-purple-600'
                }`}
              >
                {timeRemaining}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <Button
                onClick={onViewQR}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-md h-9 sm:h-11 font-bold text-xs sm:text-sm transition-all active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                View QR
              </Button>
              <Button
                onClick={onNavigate}
                variant="outline"
                className="border-2 border-orange-500 text-orange-600 hover:bg-orange-50 rounded-xl h-9 sm:h-11 font-bold text-xs sm:text-sm transition-all active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                Navigate
              </Button>
            </div>

            {/* Friendly Message */}
            <p className="text-center text-[9px] sm:text-[10px] text-gray-500 font-medium pt-0.5">
              Great pick! We'll guide you there 🚶‍♂️
            </p>

            {/* Cancel Button */}
            {showCancelConfirm ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl"
              >
                <p className="text-[10px] sm:text-xs text-red-900 mb-2 font-medium">
                  Cancel this reservation? ⚠️ You will lose your SmartPoints as penalty.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelConfirm(false)}
                    className="h-8 text-[10px] sm:text-xs flex-1 rounded-lg"
                  >
                    Keep It
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setShowCancelConfirm(false);
                      onCancel();
                    }}
                    className="h-8 text-[10px] sm:text-xs flex-1 rounded-lg bg-red-600 hover:bg-red-700"
                  >
                    Yes, Cancel
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCancelConfirm(true)}
                className="mt-3 w-full text-center text-[10px] sm:text-xs text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Cancel Reservation
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
