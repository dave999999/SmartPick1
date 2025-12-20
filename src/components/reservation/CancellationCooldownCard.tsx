/**
 * CancellationCooldownCard.tsx
 * Apple-style elegant cooldown card with acknowledgment checkbox
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface CancellationCooldownCardProps {
  isVisible: boolean;
  timeUntilUnlock: number; // milliseconds
  cancellationCount: number;
  unlockTime: Date | null;
  resetCooldownUsed?: boolean;
  resetCount?: number; // How many times user has reset cooldown
  userPoints?: number; // Current user points balance
  onResetCooldown?: () => Promise<{ success: boolean; message: string }>;
  onLiftWithPoints?: () => Promise<{ success: boolean; message: string; pointsSpent?: number }>;
  isResetting?: boolean;
}

export function CancellationCooldownCard({
  isVisible,
  timeUntilUnlock,
  cancellationCount,
  unlockTime,
  resetCooldownUsed = false,
  resetCount = 0,
  userPoints = 0,
  onResetCooldown,
  onLiftWithPoints,
  isResetting = false,
}: CancellationCooldownCardProps) {
  const { t } = useI18n();
  const [timeRemaining, setTimeRemaining] = useState(timeUntilUnlock);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showResetMessage, setShowResetMessage] = useState(false);

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
  
  // Calculate cost for paid lift: 50 points per previous reset
  const pointsCost = resetCount * 50;
  const isFirstTime = resetCount === 0;
  const canAffordLift = userPoints >= pointsCost;

  const handleResetCooldown = async () => {
    if (!onResetCooldown || !hasAcknowledged) return;

    const result = await onResetCooldown();
    setResetResult(result);
    setShowResetMessage(true);

    // Auto hide message after 3 seconds
    setTimeout(() => {
      setShowResetMessage(false);
    }, 3000);
  };
  
  const handleLiftWithPoints = async () => {
    if (!onLiftWithPoints) return;

    const result = await onLiftWithPoints();
    setResetResult(result as any);
    setShowResetMessage(true);

    // Auto hide message after 3 seconds
    setTimeout(() => {
      setShowResetMessage(false);
    }, 3000);
  };

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
          {/* Apple-style minimalist card - Compact for small screens */}
          <div className="relative overflow-hidden rounded-3xl bg-white border border-gray-200/40 shadow-2xl p-4">
            {/* Subtle top shine */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

            {/* Content */}
            <div className="relative z-10 space-y-3">
              {/* Alert Banner - Compact */}
              <div className="flex items-center justify-center gap-2 bg-red-50/50 border border-red-200/40 rounded-xl px-3 py-2">
                <span className="text-lg">⚠️</span>
                <p className="text-xs font-semibold text-red-700">
                  {t('cooldownCard.alertBanner')}
                </p>
              </div>

              {/* Message - Compact */}
              <div className="text-center px-1">
                <p className="text-[13px] text-gray-700 font-medium leading-snug">
                  {t('cooldownCard.headerMessage')}
                </p>
              </div>

              {/* Countdown Timer - Hero but Compact */}
              <motion.div
                className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-3 text-center shadow-lg"
                animate={{ 
                  boxShadow: [
                    '0 6px 20px rgba(251, 146, 60, 0.25)',
                    '0 8px 24px rgba(251, 146, 60, 0.35)',
                    '0 6px 20px rgba(251, 146, 60, 0.25)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <p className="text-[10px] text-orange-100 uppercase font-semibold tracking-wider mb-1 opacity-90">
                  {t('cooldownCard.canReserveIn')}
                </p>
                <div className="flex items-baseline justify-center gap-0.5">
                  <Clock className="w-5 h-5 text-white mb-0.5" />
                  <p className="text-5xl font-black text-white tabular-nums tracking-tight">
                    {minutes}
                  </p>
                  <span className="text-3xl font-black text-white/80 mx-0.5">:</span>
                  <p className="text-5xl font-black text-white tabular-nums tracking-tight">
                    {seconds.toString().padStart(2, '0')}
                  </p>
                </div>
              </motion.div>

              {/* Info bar - Compact */}
              <div className="flex items-center justify-between bg-gray-50/60 rounded-lg px-3 py-2 border border-gray-200/40">
                <span className="text-xs font-medium text-gray-600">{t('cooldownCard.cancellations')}</span>
                <span className="text-xs font-bold text-orange-600">{cancellationCount}/3</span>
              </div>

              {/* Acknowledgment Checkbox - Only for first-time free reset */}
              {isFirstTime && (
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50/60 transition-all cursor-pointer group border border-transparent hover:border-gray-200/40">
                  <div className="flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={hasAcknowledged}
                      onChange={(e) => setHasAcknowledged(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-gray-300 text-orange-500 focus:ring-2 focus:ring-orange-500/30 focus:ring-offset-0 cursor-pointer transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                    {t('cooldownCard.acknowledgment')}
                  </p>
                </label>
              )}

              {/* Encouraging message - Compact */}
              <div className="text-center pt-1">
                <p className="text-xs text-gray-500 font-medium">
                  {t('cooldownCard.encouragingMessage')}
                </p>
              </div>

              {/* FREE Reset Button - First time only */}
              {isFirstTime && onResetCooldown && (
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleResetCooldown}
                    disabled={!hasAcknowledged || isResetting}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      hasAcknowledged && !isResetting
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 active:scale-98'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isResetting ? t('cooldownCard.resetting') : t('cooldownCard.resetButton')}
                  </button>
                </div>
              )}

              {/* PAID Lift Button - 2nd+ times */}
              {!isFirstTime && onLiftWithPoints && (
                <div className="pt-2 space-y-2">
                  <div className="bg-blue-50/60 border border-blue-200/40 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs font-semibold text-blue-700">
                      💰 {t('cooldownCard.liftCostMessage', { cost: pointsCost })}
                    </p>
                    <p className="text-[10px] text-blue-600 mt-0.5">
                      {t('cooldownCard.yourBalance')}: {userPoints} {t('cooldownCard.points')}
                    </p>
                  </div>
                  
                  <button
                    onClick={handleLiftWithPoints}
                    disabled={!canAffordLift || isResetting}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
                      canAffordLift && !isResetting
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 active:scale-98'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isResetting 
                      ? t('cooldownCard.lifting') 
                      : canAffordLift 
                        ? `${t('cooldownCard.liftButton')} (${pointsCost} ${t('cooldownCard.points')})`
                        : t('cooldownCard.insufficientPoints')
                    }
                  </button>
                </div>
              )}
              
              {/* Result Message - Shows for both free and paid */}
              <AnimatePresence>
                {showResetMessage && resetResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={`p-2.5 rounded-lg text-xs text-center font-semibold ${
                      resetResult.success
                        ? 'bg-green-50/80 text-green-700 border border-green-200/40'
                        : 'bg-red-50/80 text-red-700 border border-red-200/40'
                    }`}
                  >
                    {resetResult.message}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
