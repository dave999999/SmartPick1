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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 border border-amber-200 p-3 shadow-md">
            {/* Animated background elements - more subtle */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-200/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-orange-200/10 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 space-y-2">
              {/* Top message - compact */}
              <div className="text-center">
                <p className="text-xs text-amber-700 font-medium">
                  working together smoothly
                </p>
              </div>

              {/* Why Message - compact single line */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">
                    A quick 30-minute cooldown helps everyone have the best experience
                  </p>
                </div>
              </div>

              {/* Countdown Timer - Centered and Prominent */}
              <motion.div
                className="bg-white rounded-xl p-2.5 text-center border border-amber-200 my-1"
                animate={{ boxShadow: ['0 0 0 rgba(251, 146, 60, 0)', '0 0 12px rgba(251, 146, 60, 0.25)', '0 0 0 rgba(251, 146, 60, 0)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <p className="text-xs text-amber-700 uppercase font-semibold tracking-wider mb-0.5">
                  You can reserve in
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <Clock className="w-5 h-5 text-orange-500" />
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </p>
                </div>
              </motion.div>

              {/* Encouraging Message */}
              <div className="text-center">
                <p className="text-xs font-medium text-blue-900">
                  💪 No worries! Come back soon and grab amazing deals
                </p>
              </div>

              {/* Cancellation Count Info */}
              <div className="flex items-center justify-center gap-1 text-xs text-amber-700 bg-amber-100/40 rounded-lg px-2.5 py-1.5">
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
