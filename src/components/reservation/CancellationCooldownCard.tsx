/**
 * CancellationCooldownCard.tsx
 * Apple-style elegant cooldown card with acknowledgment checkbox
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2 } from 'lucide-react';

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
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

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
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-sm"
        >
          {/* Apple-style elegant card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-50 border border-gray-200/60 shadow-xl p-4">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 via-transparent to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 space-y-3">
              {/* Header - Compact */}
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  working together smoothly
                </p>
                <p className="text-sm text-gray-700 font-medium leading-snug">
                  A 30-minute cooldown helps everyone have the best experience
                </p>
              </div>

              {/* Countdown Timer - Elegant and Prominent */}
              <motion.div
                className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3 text-center border border-orange-200/50"
                animate={{ boxShadow: ['0 0 0 rgba(251, 146, 60, 0)', '0 0 16px rgba(251, 146, 60, 0.2)', '0 0 0 rgba(251, 146, 60, 0)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <p className="text-xs text-orange-700 uppercase font-semibold tracking-wider mb-1">
                  You can reserve in
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </p>
                </div>
              </motion.div>

              {/* Info bar - Compact */}
              <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-100/50 rounded-lg px-3 py-2 border border-gray-200/50">
                <span className="font-medium">Cancellations:</span>
                <span className="font-semibold text-orange-600">{cancellationCount}/3</span>
              </div>

              {/* Acknowledgment Checkbox - Apple Style */}
              <label className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50/80 transition-colors cursor-pointer group">
                <div className="flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={hasAcknowledged}
                    onChange={(e) => setHasAcknowledged(e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-gray-300 text-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 cursor-pointer transition-colors"
                  />
                </div>
                <p className="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900">
                  I understand and won't cancel reservations repeatedly
                </p>
              </label>

              {/* Encouraging message */}
              <div className="text-center pt-1">
                <p className="text-xs text-gray-600 font-medium">
                  Come back soon and grab amazing deals 🎉
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
