/**
 * Penalty Modal Component
 * Shows when user has an active penalty and tries to make a reservation
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Clock, Gem, Heart, Timer, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { UserPenalty, liftBanWithPoints, acknowledgePenalty } from '@/lib/api/penalty';
import { logger } from '@/lib/logger';
import { ForgivenessRequestModal } from './ForgivenessRequestModal';

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
  }, [penalty.suspended_until, onPenaltyLifted]);

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
      setAcknowledged(true);
      toast.info('Acknowledged. Please wait for your ban to expire or choose an option to lift it.');
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

  // Warning screen (1st offense)
  if (penalty?.offense_number === 1) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg">
          <div className="text-center space-y-6">
            <div className="bg-yellow-50 rounded-lg p-6">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                ⚠️ Missed Reservation Warning
              </h2>
              <p className="text-gray-600 mt-2">
                You did not pick up your reservation within the time window
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 text-left">
              <h3 className="font-semibold text-lg mb-2">This is your FIRST warning</h3>
              <p className="text-gray-700">
                <strong>No penalty applied this time.</strong> Please be more careful with future reservations.
              </p>
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p>• Make sure to arrive during the pickup window</p>
                <p>• Cancel reservations you can't fulfill</p>
                <p>• Communicate with partners if you're running late</p>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-red-700 font-semibold">
                🔔 Next missed pickup will result in a 1 hour suspension
              </p>
            </div>

            <Button onClick={handleAcknowledge} className="w-full" size="lg">
              I Understand - Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Suspension screen (2nd, 3rd, 4th offense)
  return (
    <>
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="text-center space-y-6">
            {/* Header */}
            <div className="bg-red-50 rounded-lg p-6">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                🚫 Account Suspended - Cannot Reserve
              </h2>
              <p className="text-gray-600 mt-2">
                Your account is temporarily suspended due to missed pickup
              </p>
            </div>

            {/* Live Countdown */}
            {penalty?.suspended_until && penalty.offense_number < 4 && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6">
                <Clock className="w-12 h-12 text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">Suspension ends in:</p>
                <p className="text-4xl font-bold text-orange-600 font-mono">
                  {timeRemaining}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(penalty.suspended_until).toLocaleString()}
                </p>
              </div>
            )}

            {/* Permanent ban message */}
            {penalty?.offense_number === 4 && (
              <div className="bg-gray-900 text-white rounded-lg p-6">
                <h3 className="text-xl font-bold mb-2">🔒 Permanent Ban</h3>
                <p>Your account has been permanently banned due to repeated missed reservations.</p>
                <p className="mt-4 text-sm">Contact support at support@smartpick.ge to appeal.</p>
              </div>
            )}

            <Separator />

            {/* Lift ban options (2nd & 3rd offense only) */}
            {penalty?.offense_number && penalty.offense_number < 4 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">🔓 Lift Ban Options:</h3>

                {/* Option 1: Pay with points */}
                {penalty?.can_lift_with_points && (
                  <Card className={hasEnoughPoints ? 'border-green-500 bg-green-50' : 'border-gray-300'}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-yellow-100 rounded-full p-3">
                          <Gem className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="font-semibold text-lg">1️⃣ Pay with SmartPoints</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            💎 {penalty?.points_required || 0} SmartPoints → Instant unban
                          </p>
                          <p className="text-sm mt-2">
                            Your balance: <span className="font-bold">{userPoints} points</span>
                            {hasEnoughPoints ? (
                              <span className="text-green-600 ml-2">✅ Sufficient</span>
                            ) : (
                              <span className="text-red-600 ml-2">
                                ❌ Need {(penalty?.points_required || 0) - userPoints} more
                              </span>
                            )}
                          </p>
                          <Button
                            onClick={handleLiftWithPoints}
                            disabled={!hasEnoughPoints || isLifting}
                            className="mt-4 w-full"
                            variant={hasEnoughPoints ? 'default' : 'secondary'}
                          >
                            {isLifting
                              ? 'Processing...'
                              : hasEnoughPoints
                              ? `Pay ${penalty?.points_required || 0} Points to Lift Ban`
                              : 'Not Enough Points'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Option 2: Request forgiveness */}
                {!penalty?.forgiveness_requested &&
                  penalty?.forgiveness_expires_at &&
                  new Date(penalty.forgiveness_expires_at) > new Date() && (
                    <Card className="border-blue-500 bg-blue-50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="bg-blue-100 rounded-full p-3">
                            <Heart className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="font-semibold text-lg">2️⃣ Request Partner Forgiveness</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              🤝 Ask partner to forgive this offense
                            </p>
                            <p className="text-sm mt-2">
                              If granted: <span className="font-bold text-green-600">Penalty removed, no points cost</span>
                            </p>
                            <Button
                              onClick={() => setShowForgivenessModal(true)}
                              className="mt-4 w-full"
                              variant="outline"
                            >
                              Request Forgiveness
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Forgiveness pending */}
                {penalty?.forgiveness_requested && penalty?.forgiveness_status === 'pending' && (
                  <Card className="border-yellow-500 bg-yellow-50">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-yellow-600" />
                        <p className="text-sm">
                          ⏳ Forgiveness request pending - waiting for partner response
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Option 3: Wait */}
                <Card className="border-gray-300">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gray-100 rounded-full p-3">
                        <Timer className="w-6 h-6 text-gray-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-lg">3️⃣ Wait it Out</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          ⏱️ Your ban expires automatically in {timeRemaining}
                        </p>
                        <Button
                          onClick={() => {
                            handleAcknowledge();
                            onClose();
                          }}
                          className="mt-4 w-full"
                          variant="ghost"
                        >
                          I'll Wait
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Separator />

            {/* Penalty Info */}
            <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2">
              <p className="text-gray-700">
                <strong>Current penalty:</strong> {getPenaltyDescription()}
              </p>
              <p className="text-red-600">
                <strong>{getNextOffenseWarning()}</strong>
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
    </>
  );
}
