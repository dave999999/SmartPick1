/**
 * PaidCooldownLiftModal.tsx
 * Modal for lifting cooldown by paying points (2nd+ cooldown)
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Coins, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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

  // Calculate cost: 100 points for 4th cancellation
  const pointsCost = 100;
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
    try {
      const result = await onLiftWithPoints();
      
      if (result.success) {
        toast.success('შეზღუდვა მოიხსნა! 100 ქულა გადახდილია', {
          description: 'შეგიძლიათ ახალი რეზერვაციის გაკეთება',
          duration: 4000,
        });
        
        // Trigger wallet refresh to update balance
        window.dispatchEvent(new CustomEvent('smartpointsRefresh', { 
          detail: { reason: 'Cooldown lifted with points' } 
        }));
        
        // Modal will close automatically when cooldown is cleared
      } else {
        toast.error('შეცდომა', {
          description: result.message || 'ვერ მოხერხდა შეზღუდვის მოხსნა',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error lifting cooldown:', error);
      toast.error('შეცდომა', {
        description: 'ვერ მოხერხდა შეზღუდვის მოხსნა',
        duration: 4000,
      });
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
            <div className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header - Orange gradient like cooldown card */}
              <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 px-6 py-5 text-center">
                <div className="text-5xl mb-3">⏱️ 😊</div>
                <h3 className="text-xl font-bold text-white mb-1">
                  მე-4 გაუქმება
                </h3>
                <p className="text-sm text-white/90">
                  1-საათიანი შესვენება ავტომატურად გამოიყენა
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Countdown Timer */}
                <div className="bg-amber-50 rounded-xl p-4 text-center border-2 border-amber-200">
                  <p className="text-sm text-amber-700 font-medium mb-2">
                    დარჩენილი დრო
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span className="text-3xl font-bold text-amber-600 tabular-nums">
                      {countdown}
                    </span>
                  </div>
                </div>

                {/* Cost Display - Emerald green */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-900">
                        მოხსენი შეზღუდვა {pointsCost} ქულით
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-700 font-bold text-lg">
                      <Coins className="w-5 h-5" />
                      <span>{pointsCost}</span>
                    </div>
                  </div>
                </div>

                {/* User Balance */}
                <div className="flex items-center justify-between text-sm px-1">
                  <span className="text-gray-600">
                    შენი ბალანსი:
                  </span>
                  <span className={`font-bold ${canAfford ? 'text-gray-900' : 'text-red-600'}`}>
                    {userPoints} ქულა
                  </span>
                </div>

                {/* Lift Button */}
                <button
                  onClick={handleLift}
                  disabled={!canAfford || isLifting}
                  className={`
                    w-full py-4 rounded-xl font-bold text-base
                    transition-all duration-200 flex items-center justify-center gap-2
                    ${canAfford && !isLifting
                      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {isLifting ? (
                    <>
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      მიმდინარეობს...
                    </>
                  ) : !canAfford ? (
                    <>
                      <Coins className="w-5 h-5" />
                      არასაკმარისი ბალანსი
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      შეზღუდვის მოხსნა ({pointsCost} ქულა)
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
