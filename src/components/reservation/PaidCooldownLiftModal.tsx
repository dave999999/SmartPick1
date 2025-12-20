/**
 * PaidCooldownLiftModal.tsx
 * Modal for lifting cooldown by paying points (2nd+ cooldown)
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Coins, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEffect, useState } from 'react';

interface PaidCooldownLiftModalProps {
  isVisible: boolean;
  timeUntilUnlock: number;
  resetCount: number;
  userPoints: number;
  onLiftWithPoints: () => Promise<{ success: boolean; message: string }>;
  isLifting: boolean;
}

export function PaidCooldownLiftModal({
  isVisible,
  timeUntilUnlock,
  resetCount,
  userPoints,
  onLiftWithPoints,
  isLifting,
}: PaidCooldownLiftModalProps) {
  const { t } = useI18n();
  const [countdown, setCountdown] = useState('');

  // Calculate cost: resetCount * 50
  const pointsCost = resetCount * 50;
  const canAfford = userPoints >= pointsCost;

  // Update countdown every second
  useEffect(() => {
    if (!isVisible) return;

    const updateCountdown = () => {
      const remaining = Math.max(0, timeUntilUnlock);
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeUntilUnlock, isVisible]);

  const handleLift = async () => {
    const result = await onLiftWithPoints();
    if (result.success) {
      // Modal will close automatically when cooldown is cleared
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="w-6 h-6" />
                  <span className="text-lg font-semibold">
                    {t('cooldownCard.title')}
                  </span>
                </div>
                <p className="text-sm opacity-90">
                  {t('cooldownCard.subtitle')}
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Countdown Timer */}
                <div className="bg-orange-100 rounded-2xl p-5 text-center">
                  <p className="text-sm text-orange-700 font-medium mb-2">
                    {t('cooldownCard.timeRemaining')}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-6 h-6 text-orange-600" />
                    <span className="text-4xl font-bold text-orange-600 tabular-nums">
                      {countdown}
                    </span>
                  </div>
                </div>

                {/* Cost Display */}
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-900">
                        {t('cooldownCard.liftCostMessage', { cost: pointsCost })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <Coins className="w-5 h-5" />
                      <span>{pointsCost}</span>
                    </div>
                  </div>
                </div>

                {/* User Balance */}
                <div className="flex items-center justify-between text-sm px-1">
                  <span className="text-gray-600">
                    {t('cooldownCard.yourBalance')}:
                  </span>
                  <span className={`font-semibold ${canAfford ? 'text-gray-900' : 'text-red-600'}`}>
                    {userPoints} {t('cooldownCard.points')}
                  </span>
                </div>

                {/* Lift Button */}
                <button
                  onClick={handleLift}
                  disabled={!canAfford || isLifting}
                  className={`
                    w-full py-4 rounded-2xl font-semibold text-white text-base
                    transition-all duration-300 flex items-center justify-center gap-2
                    ${canAfford && !isLifting
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 active:scale-[0.98] shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  {isLifting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('cooldownCard.lifting')}
                    </>
                  ) : !canAfford ? (
                    <>
                      <Coins className="w-5 h-5" />
                      {t('cooldownCard.insufficientPoints')}
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      {t('cooldownCard.liftButton')} ({pointsCost} {t('cooldownCard.points')})
                    </>
                  )}
                </button>

                {/* Info Text */}
                <p className="text-xs text-center text-gray-500 leading-relaxed">
                  {t('cooldownCard.earnMoreInfo')} 🎁
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
