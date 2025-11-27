/**
 * Friendly Penalty Modal Component
 * A warm, encouraging pause screen when user misses a pickup
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Gem, Heart, Sparkles, Coffee, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { UserPenalty, liftBanWithPoints, acknowledgePenalty } from '@/lib/api/penalty';
import { logger } from '@/lib/logger';
import { ForgivenessRequestModal } from './ForgivenessRequestModal';
import { BuyPointsModal } from './wallet/BuyPointsModal';
import { MissedPickupPopup } from './MissedPickupPopup';

interface PenaltyModalProps {
  penalty: UserPenalty & {
    users?: { name: string; email: string; reliability_score: number };
    partners?: { business_name: string };
    reservations?: { offer_title: string; pickup_date: string };
  };
  userPoints: number;
  onClose: () => void;
  onPenaltyLifted: () => void;
}

export function PenaltyModal({ penalty, userPoints, onClose, onPenaltyLifted }: PenaltyModalProps) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isLifting, setIsLifting] = useState(false);
  const [showForgivenessModal, setShowForgivenessModal] = useState(false);
  const [showBuyPointsModal, setShowBuyPointsModal] = useState(false);
  const [acknowledged, setAcknowledged] = useState(penalty?.acknowledged || false);

  const hasEnoughPoints = userPoints >= (penalty?.points_required || 0);

  // Live countdown timer
  useEffect(() => {
    if (!penalty?.suspended_until) return;

    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(penalty.suspended_until!);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Ban expired - refreshing...');
        setTimeout(() => {
          onPenaltyLifted();
        }, 1000);
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [penalty?.suspended_until, onPenaltyLifted]);

  const handleLiftWithPoints = async () => {
    if (!penalty?.id || !penalty?.user_id) return;
    
    if (!hasEnoughPoints) {
      toast.error('Not enough SmartPoints to lift this ban');
      return;
    }

    setIsLifting(true);
    try {
      const result = await liftBanWithPoints(penalty.id, penalty.user_id);

      if (result.success) {
        toast.success(`✅ Ban lifted! New balance: ${result.newBalance} SmartPoints`);
        await acknowledgePenalty(penalty.id, penalty.user_id);
        onPenaltyLifted();
      } else {
        toast.error(result.error || 'Failed to lift ban');
      }
    } catch (error) {
      logger.error('Error lifting ban:', error);
      toast.error('Failed to lift ban with points');
    } finally {
      setIsLifting(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!penalty?.id || !penalty?.user_id) return;
    
    const success = await acknowledgePenalty(penalty.id, penalty.user_id);
    if (success) {
      // For warnings, close modal immediately
      if (penalty.offense_number === 1) {
        toast.success('Warning acknowledged. Please be more careful with future reservations.');
        onClose();
        onPenaltyLifted(); // Refresh to clear penalty state
      } else {
        // For suspensions, just mark as acknowledged
        setAcknowledged(true);
        toast.info('Acknowledged. Please wait for your ban to expire or choose an option to lift it.');
      }
    }
  };

  const getPenaltyDescription = () => {
    switch (penalty?.offense_number) {
      case 1:
        return 'First warning - No suspension';
      case 2:
        return '1 hour suspension (100 pts to lift)';
      case 3:
        return '24 hour suspension (500 pts to lift)';
      case 4:
        return 'Permanent ban (admin review required)';
      default:
        return 'Suspended';
    }
  };

  const getNextOffenseWarning = () => {
    switch (penalty?.offense_number) {
      case 1:
        return '⚠️ Next offense: 1 hour ban (100 pts to lift)';
      case 2:
        return '⚠️ Next offense: 24 hour ban (500 pts to lift)';
      case 3:
        return '🔴 Next offense: PERMANENT BAN (admin review only)';
      case 4:
        return '🔴 Account permanently banned';
      default:
        return '';
    }
  };

  // Use new polished MissedPickupPopup for warnings (offenses 1-3)
  if (penalty?.offense_number >= 1 && penalty?.offense_number <= 3 && penalty?.penalty_type === 'warning') {
    return (
      <MissedPickupPopup
        missedCount={penalty.offense_number}
        maxChances={3}
        isOpen={true}
        onClose={handleAcknowledge}
      />
    );
  }

  // Compact friendly suspension (4th+ offense - after 3 warnings)
  return (
    <>
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-[400px] border-none shadow-xl p-0 max-h-[85vh] overflow-y-auto">
          <DialogTitle className="sr-only">Taking a Short Break</DialogTitle>
          <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-5">
            {/* Compact Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-200 rounded-xl flex items-center justify-center flex-shrink-0">
                <Coffee className="w-5 h-5 text-orange-700" />
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-lg font-bold text-gray-800 mb-0.5">
                  You're on a short break 😌
                </h2>
                <p className="text-xs text-gray-600">
                  Missed a pickup — you'll be back soon!
                </p>
              </div>
            </div>

            {/* Compact Timer */}
            {penalty?.suspended_until && penalty.offense_number < 4 && (
              <div className="bg-white/60 rounded-xl p-3 mb-4">
                <p className="text-xs text-gray-600 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Back in:</span>
                </p>
                <p className="text-2xl font-bold text-sky-700 font-mono tracking-tight">
                  {timeRemaining}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(penalty.suspended_until).toLocaleTimeString()}
                </p>
              </div>
            )}

            {/* Compact permanent review message */}
            {penalty?.offense_number === 4 && (
              <div className="bg-orange-100 rounded-xl p-4 border border-orange-300">
                <div className="flex items-start gap-3">
                  <ShoppingBag className="w-5 h-5 text-orange-700 flex-shrink-0" />
                  <div className="text-xs text-gray-700">
                    <p className="font-bold mb-1">Account needs review 📋</p>
                    <p className="mb-2">Let's chat about your pickups. We're here to help!</p>
                    <p className="text-gray-600">💬 support@smartpick.ge</p>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Options List */}
            {penalty?.offense_number && penalty.offense_number < 4 && (
              <div className="bg-white/60 rounded-xl p-4 mb-3">
                <p className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Get back faster:</span>
                </p>

                {/* Compact SmartPoints Option */}
                {penalty?.can_lift_with_points && (
                  <div className="mb-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Gem className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-xs text-gray-700">
                        <p className="font-semibold">Use {penalty?.points_required || 0} points → instant</p>
                        <p className="text-gray-600 mt-0.5">
                          Your balance: {userPoints} 
                          {!hasEnoughPoints && <span className="text-amber-700"> → need {(penalty?.points_required || 0) - userPoints} more</span>}
                        </p>
                      </div>
                    </div>
                    {hasEnoughPoints ? (
                      <Button
                        onClick={handleLiftWithPoints}
                        disabled={isLifting}
                        className="w-full h-9 text-xs bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-semibold rounded-lg"
                      >
                        {isLifting ? 'Lifting...' : `✨ Use ${penalty?.points_required} Points`}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          onClick={() => setShowBuyPointsModal(true)}
                          className="w-full h-9 text-xs bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold rounded-lg"
                        >
                          💳 Buy Points ({(penalty?.points_required || 0) - userPoints} needed)
                        </Button>
                        <Button
                          disabled
                          variant="outline"
                          className="w-full h-9 text-xs border-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                        >
                          Not enough points yet
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Compact Forgiveness Option */}
                {!penalty?.forgiveness_requested &&
                  penalty?.forgiveness_expires_at &&
                  new Date(penalty.forgiveness_expires_at) > new Date() && (
                    <div className="mb-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Heart className="w-4 h-4 text-pink-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 text-xs text-gray-700">
                          <p className="font-semibold">Ask partner for help</p>
                          <p className="text-gray-600 mt-0.5">If approved → instant lift, no points!</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setShowForgivenessModal(true)}
                        className="w-full h-9 text-xs border border-pink-300 text-pink-700 bg-white hover:bg-pink-50 font-semibold rounded-lg"
                        variant="outline"
                      >
                        💌 Request Forgiveness
                      </Button>
                    </div>
                  )}

                {/* Compact Forgiveness Pending */}
                {penalty?.forgiveness_requested && penalty?.forgiveness_status === 'pending' && (
                  <div className="mb-3 bg-amber-100/70 rounded-lg p-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                    <p className="text-xs text-amber-800 font-medium">
                      Request sent, waiting for response...
                    </p>
                  </div>
                )}

                {/* Compact Wait Option */}
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    <Clock className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-xs text-gray-700">
                      <p className="font-semibold">Or just wait</p>
                      <p className="text-gray-600 mt-0.5">Auto-ends in {timeRemaining}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      handleAcknowledge();
                      onClose();
                    }}
                    className="w-full h-9 text-xs border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-semibold rounded-lg"
                    variant="ghost"
                  >
                    I'll wait 😌
                  </Button>
                </div>
              </div>
            )}

            {/* Compact Context */}
            <div className="bg-blue-100/50 rounded-lg p-3 text-xs text-gray-700">
              <p className="mb-1">
                <strong>Why this break?</strong> You missed {penalty?.offense_number || 0} pickup{(penalty?.offense_number || 0) > 1 ? 's' : ''}. Helps keep offers fair.
              </p>
              <p className="text-amber-800 font-medium">
                💡 Next time: {getNextOffenseWarning().replace('⚠️', '').replace('🔴', '').replace('Next offense:', '').trim()}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgiveness Request Modal */}
      {showForgivenessModal && (
        <ForgivenessRequestModal
          penalty={penalty}
          onClose={() => setShowForgivenessModal(false)}
          onSuccess={() => {
            setShowForgivenessModal(false);
            toast.success('Forgiveness request sent to partner');
            onPenaltyLifted(); // Refresh penalty status
          }}
        />
      )}

      {/* Buy Points Modal */}
      {showBuyPointsModal && penalty?.user_id && (
        <BuyPointsModal
          isOpen={showBuyPointsModal}
          onClose={() => {
            setShowBuyPointsModal(false);
            onPenaltyLifted(); // Refresh to update points balance
          }}
          currentBalance={userPoints}
          userId={penalty.user_id}
          mode="user"
        />
      )}
    </>
  );
}
