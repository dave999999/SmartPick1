/**
 * SuspensionModal - Professional suspension screen with countdown and lift options
 * Matches app design: warm, friendly, no blame
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Gem, Heart, Coffee, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import { useCountdown } from '@/hooks/useCountdown';
import { logger } from '@/lib/logger';
import { BuyPointsModal as BuyPointsModalWallet } from '@/components/wallet/BuyPointsModal';

interface SuspensionModalProps {
  penalty: {
    id: string;
    user_id: string;
    offense_number: number;
    penalty_type: '1hour' | '5hour' | '24hour' | 'permanent';
    suspended_until: string;
    can_lift_with_points?: boolean;
  };
  userPoints: number;
  onLiftPenalty: (penaltyId: string, userId: string) => Promise<{ success: boolean; newBalance?: number; error?: string }>;
  onClose: () => void;
  onPenaltyLifted: () => Promise<void>;
}

/**
 * Calculate points needed to lift suspension based on offense number
 */
function calculateLiftPoints(offenseNumber: number): number {
  if (offenseNumber === 4) return 100;   // 1-hour suspension
  if (offenseNumber === 5) return 500;   // 5-hour suspension
  if (offenseNumber >= 6) return 1000;   // 24-hour+ suspension
  return 0;
}

/**
 * Get suspension duration text in hours
 */
function getSuspensionDuration(penaltyType: string): string {
  if (penaltyType === '1hour') return '1';
  if (penaltyType === '5hour') return '5';
  if (penaltyType === '24hour') return '24';
  return '∞';
}

export function SuspensionModal({
  penalty,
  userPoints,
  onLiftPenalty,
  onClose,
  onPenaltyLifted
}: SuspensionModalProps) {
  const { t } = useI18n();
  const countdown = useCountdown(penalty.suspended_until);
  
  const [isLifting, setIsLifting] = useState(false);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);

  const pointsNeeded = calculateLiftPoints(penalty.offense_number);
  const hasEnoughPoints = userPoints >= pointsNeeded;
  const suspensionDuration = getSuspensionDuration(penalty.penalty_type);

  // Auto-close when countdown expires (but not on initial render)
  useEffect(() => {
    // Don't close on first render - wait for countdown to initialize
    if (countdown.isExpired && countdown.totalSeconds === 0) {
      // Only close if we've been counting and reached zero
      // Not if we just started with zero
      const timer = setTimeout(async () => {
        if (countdown.isExpired) {
          logger.info('[Suspension] Countdown expired, deactivating penalty and closing modal');
          
          // Deactivate the penalty in database
          try {
            const { supabase } = await import('@/lib/supabase');
            await supabase
              .from('user_penalties')
              .update({ is_active: false })
              .eq('id', penalty.id);
            logger.info('[Suspension] Penalty deactivated automatically');
          } catch (error) {
            logger.error('[Suspension] Failed to deactivate penalty:', error);
          }
          
          toast.success(t('suspension.expired'));
          await onPenaltyLifted(); // Refresh app state
          onClose();
        }
      }, 2000); // Wait 2 seconds for hook to initialize
      
      return () => clearTimeout(timer);
    }
  }, [countdown.isExpired, countdown.totalSeconds, onClose, t, penalty.id, onPenaltyLifted]);

  const handleLiftWithPoints = async () => {
    if (!hasEnoughPoints) {
      toast.error(t('suspension.lift.insufficient'));
      setShowBuyPointsModal(true);
      return;
    }

    setIsLifting(true);
    try {
      const result = await onLiftPenalty(penalty.id, penalty.user_id);
      
      if (result.success) {
        toast.success(t('suspension.lift.success'));
        await onPenaltyLifted();
        onClose();
      } else {
        toast.error(result.error || 'Failed to lift suspension');
      }
    } catch (error) {
      logger.error('[Suspension] Failed to lift:', error);
      toast.error('An error occurred');
    } finally {
      setIsLifting(false);
    }
  };

  const getNextConsequence = () => {
    if (penalty.offense_number === 4) return t('suspension.warning.consequence.5hour');
    if (penalty.offense_number === 5) return t('suspension.warning.consequence.24hour');
    return t('suspension.warning.consequence.permanent');
  };

  // Progress bar percentage (time elapsed)
  const totalDuration = penalty.offense_number === 4 ? 3600 : penalty.offense_number === 5 ? 18000 : 86400;
  const progress = countdown.totalSeconds > 0 ? ((totalDuration - countdown.totalSeconds) / totalDuration) * 100 : 100;

  return (
    <Dialog open={true} onOpenChange={() => {/* Prevent closing - must wait or lift */}}>
      <DialogContent className="max-w-[400px] border-none shadow-xl p-0 max-h-[85vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogTitle className="sr-only">{t('suspension.dialogTitle')}</DialogTitle>
        
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-3">
              {t('suspension.title')}
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {penalty.offense_number === 4 && t('suspension.explanation.4th')}
              {penalty.offense_number === 5 && t('suspension.explanation.5th')}
              {penalty.offense_number >= 6 && t('suspension.explanation.6th')}
            </p>
          </div>

          {/* Compact Timer */}
          <div className="bg-white/60 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span>⏳ {t('suspension.timeRemaining')}</span>
            </p>
            <p className="text-3xl font-bold text-orange-700 font-mono tracking-tight">
              {countdown.formatted}
            </p>
          </div>

          {/* Good News Section */}
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-800 mb-1">
              {t('suspension.goodNews')}
            </p>
            <p className="text-xs text-gray-700 mb-2">
              {t('suspension.canContinue')}
            </p>

            {/* User Balance Display */}
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-2 mb-2 border border-purple-200">
              <div className="flex items-center gap-1.5">
                <Gem className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-[10px] text-gray-600 leading-none">{t('suspension.balance.current')}</p>
                  <p className="text-base font-bold text-gray-800 leading-tight">{userPoints} ქულა</p>
                </div>
              </div>
              <button
                onClick={() => setShowBuyPointsModal(true)}
                className="bg-white hover:bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-medium border border-purple-200 transition-colors"
              >
                + ქულები
              </button>
            </div>
            
            {/* Lift with points option */}
            {penalty.can_lift_with_points && hasEnoughPoints && (
              <button
                onClick={handleLiftWithPoints}
                disabled={isLifting}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                <Gem className="w-4 h-4" />
                {t('suspension.lift.button')} • {pointsNeeded} ქულა
              </button>
            )}

            {/* Insufficient points message */}
            {penalty.can_lift_with_points && !hasEnoughPoints && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-medium text-red-700 mb-0.5">
                      {t('suspension.lift.insufficient')}
                    </p>
                    <p className="text-red-600">
                      {t('suspension.balance.need')}: {pointsNeeded} ქულა
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>


        </div>
      </DialogContent>

      {/* Buy Points Modal */}
      {showBuyPointsModal && (
        <BuyPointsModalWallet
          isOpen={showBuyPointsModal}
          onClose={() => setShowBuyPointsModal(false)}
          currentBalance={userPoints}
          userId={penalty.user_id}
          mode="user"
        />
      )}
    </Dialog>
  );
}
