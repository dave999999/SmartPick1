/**
 * CancellationCooldownCard.tsx
 * Super friendly card explaining why user cannot reserve right now
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, Heart, Sparkles } from 'lucide-react';

interface CancellationCooldownCardProps {
  isVisible: boolean;
  timeUntilUnlock: number; // milliseconds
  cancellationCount: number;
  unlockTime: Date | null;
}

export function CancellationCooldownCard({
  isVisible,
  timeUntilUnlock,
  cancellationCount,
  unlockTime,
}: CancellationCooldownCardProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeUntilUnlock);

  useEffect(() => {
    if (!isVisible || timeUntilUnlock <= 0) return;

    setTimeRemaining(timeUntilUnlock);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1000;
        return newTime > 0 ? newTime : 0;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, timeUntilUnlock]);

  if (!isVisible) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border-2 border-amber-200 p-4 md:p-6 shadow-lg">
            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/20 rounded-full blur-2xl -ml-12 -mb-12 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 space-y-4">
              {/* Header with Icon */}
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex-shrink-0 mt-1"
                >
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </motion.div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900">
                    Let's Take a Quick Break! 🌟
                  </h3>
                  <p className="text-sm text-amber-700 mt-1">
                    We noticed you've cancelled a few reservations recently
                  </p>
                </div>
              </div>

              {/* Why Message - Super Friendly */}
              <div className="bg-white/60 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Heart className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    We care about reliable partners and customers working together smoothly
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">
                    A quick 30-minute cooldown helps everyone have the best experience
                  </p>
                </div>
              </div>

              {/* Countdown Timer - Prominent */}
              <motion.div
                className="bg-white rounded-xl p-4 flex items-center justify-between border-2 border-amber-200"
                animate={{ boxShadow: ['0 0 0 rgba(251, 146, 60, 0)', '0 0 20px rgba(251, 146, 60, 0.3)', '0 0 0 rgba(251, 146, 60, 0)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-orange-500" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold tracking-wide">
                      You can reserve in
                    </p>
                    <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                      {minutes}:{seconds.toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Encouraging Message */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-200">
                <p className="text-sm font-medium text-blue-900">
                  💪 No worries! Come back soon and grab amazing deals
                </p>
              </div>

              {/* Cancellation Count Info */}
              <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-100/50 rounded-lg px-3 py-2">
                <span>Cancellations in last 30 min:</span>
                <span className="font-bold text-amber-900">{cancellationCount}/3</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
