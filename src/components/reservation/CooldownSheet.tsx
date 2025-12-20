/**
 * CooldownSheet.tsx - Friendly 30-min Cooldown Message
 * 
 * Shows when user has 3+ cancellations in 30 minutes
 * Cute, compact, human-friendly design
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface CooldownSheetProps {
  isOpen: boolean;
  onClose: () => void;
  cooldownUntil: Date;
}

export function CooldownSheet({ isOpen, onClose, cooldownUntil }: CooldownSheetProps) {
  const [timeRemaining, setTimeRemaining] = useState<{
    minutes: number;
    seconds: number;
  }>({ minutes: 0, seconds: 0 });
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = cooldownUntil.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining({ minutes: 0, seconds: 0 });
        onClose();
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining({ minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, cooldownUntil, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end">
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="w-full bg-white rounded-t-[24px] p-6 pb-safe"
          >
            {/* Header */}
            <div className="text-center mb-4">
              <div className="flex justify-center mb-3">
                <div className="text-[64px]">⏱️</div>
              </div>
              <h2 className="text-[20px] font-bold text-gray-900">
                Take a Breather! 😊
              </h2>
              <p className="text-[13px] text-gray-600 mt-2">
                You've made 3 cancellations in a short time. <br />
                To protect our partners, let's take 1 hour to think carefully about your next pick.
              </p>
            </div>

            {/* Countdown Timer */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-[16px] p-6 mb-5 text-center">
              <p className="text-[12px] text-gray-600 mb-2">Come back in</p>
              <div className="text-[48px] font-black text-blue-600 font-mono tracking-tight">
                {String(timeRemaining.minutes).padStart(2, '0')}
                <span className="text-[32px] mx-1">:</span>
                {String(timeRemaining.seconds).padStart(2, '0')}
              </div>
              <p className="text-[12px] text-gray-500 mt-2">minutes</p>
            </div>

            {/* Friendly Message */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-[12px] p-4 mb-5 border border-amber-200">
              <div className="flex gap-3">
                <div className="text-[20px] flex-shrink-0">💡</div>
                <div className="text-[13px] text-gray-700">
                  <strong>Pro Tip:</strong> Take time to research offers carefully. 
                  Quality picks over quick cancels! 🎯
                </div>
              </div>
            </div>

            {/* Action Button */}
            <motion.button
              onClick={onClose}
              whileTap={{ scale: 0.98 }}
              className="w-full h-11 bg-gradient-to-br from-gray-900 to-gray-800 hover:from-black hover:to-gray-900 text-white font-semibold text-[15px] rounded-xl transition-all shadow-lg"
            >
              Got It, I'll Wait ✨
            </motion.button>

            {/* Subtitle */}
            <p className="text-[12px] text-gray-500 text-center mt-3">
              You can browse other offers while you wait
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CooldownSheet;
