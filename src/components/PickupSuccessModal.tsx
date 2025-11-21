import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Gift, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
}

interface PickupSuccessModalProps {
  open: boolean;
  onClose: () => void;
  savedAmount: number;
  pointsEarned: number;
  newAchievements?: Achievement[];
  availableRewardsCount?: number;
}

export default function PickupSuccessModal({
  open,
  onClose,
  savedAmount,
  pointsEarned,
  newAchievements = [],
  availableRewardsCount = 0
}: PickupSuccessModalProps) {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleClose = () => {
    onClose();
    navigate('/');
  };

  // Fire confetti when modal opens
  useEffect(() => {
    if (open) {
      setStep(1);
      // Confetti burst
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [open]);

  // Auto-advance to step 2 after 2.5 seconds
  useEffect(() => {
    if (open && step === 1) {
      const timer = setTimeout(() => {
        if (newAchievements.length > 0) {
          setStep(2);
        } else if (availableRewardsCount > 0) {
          setStep(3);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [open, step, newAchievements.length, availableRewardsCount]);

  const handleContinue = () => {
    if (step === 1) {
      if (newAchievements.length > 0) {
        setStep(2);
      } else if (availableRewardsCount > 0) {
        setStep(3);
      } else {
        onClose();
        navigate('/');
      }
    } else if (step === 2) {
      if (availableRewardsCount > 0) {
        setStep(3);
      } else {
        onClose();
        navigate('/');
      }
    } else {
      onClose();
      navigate('/');
    }
  };

  const handleViewAchievements = () => {
    onClose();
    navigate('/profile', { state: { tab: 'achievements' } });
  };

  const handleClaimRewards = () => {
    onClose();
    navigate('/rewards');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-br from-white via-mint-50/30 to-emerald-50/50">
        {/* Step 1: Success Celebration */}
        {step === 1 && (
          <div className="p-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <DialogTitle className="sr-only">Pickup Success</DialogTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="relative text-7xl animate-bounce">🎉</div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 animate-in slide-in-from-bottom-4 duration-700">
                Congratulations!
              </h2>
              <p className="text-lg text-gray-700 font-medium animate-in slide-in-from-bottom-4 duration-700 delay-100">
                Order Picked Up Successfully
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 border-2 border-green-200 shadow-lg animate-in slide-in-from-bottom-4 duration-700 delay-200">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                <span className="text-sm font-semibold text-green-800">You Saved</span>
              </div>
              <div className="text-4xl font-black text-green-600">
                {savedAmount.toFixed(2)} GEL
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleViewAchievements}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                size="lg"
              >
                <Trophy className="mr-2 h-5 w-5" />
                Check Your Achievements
              </Button>

              <Button 
                onClick={handleClose}
                variant="ghost"
                className="w-full text-gray-600 hover:text-gray-900 font-medium"
                size="lg"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Achievement Unlocked */}
        {step === 2 && newAchievements.length > 0 && (
          <div className="p-8 text-center space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <DialogTitle className="sr-only">Achievement Unlocked</DialogTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-3xl animate-pulse"></div>
              <Trophy className="relative h-16 w-16 text-amber-500 mx-auto animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                ⭐ New Achievement{newAchievements.length > 1 ? 's' : ''} Unlocked!
              </h2>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {newAchievements.map((achievement, index) => (
                <div 
                  key={achievement.id}
                  className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-200 shadow-md animate-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{achievement.icon}</div>
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-900">{achievement.title}</h3>
                      <p className="text-sm text-gray-600">{achievement.description}</p>
                      <Badge className="mt-2 bg-amber-500 text-white">
                        +{achievement.points} Points
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleViewAchievements}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-5 rounded-xl"
              >
                View All Achievements
              </Button>
              <Button 
                onClick={availableRewardsCount > 0 ? handleContinue : handleClose}
                variant="outline"
                className="flex-1 py-5 rounded-xl border-2"
              >
                {availableRewardsCount > 0 ? 'Next' : 'Close'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Rewards Available */}
        {step === 3 && availableRewardsCount > 0 && (
          <div className="p-8 text-center space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <DialogTitle className="sr-only">Rewards Available</DialogTitle>
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
              <Gift className="relative h-16 w-16 text-purple-500 mx-auto animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                🎁 Rewards Available!
              </h2>
              <p className="text-gray-600">
                You have unlocked new rewards ready to claim
              </p>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
              <div className="text-5xl font-black text-purple-600 mb-2">
                {availableRewardsCount}
              </div>
              <p className="text-sm text-purple-700 font-medium">
                Reward{availableRewardsCount > 1 ? 's' : ''} waiting for you
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleClaimRewards}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-5 rounded-xl"
              >
                <Gift className="mr-2 h-5 w-5" />
                Claim Rewards
              </Button>
              <Button 
                onClick={handleClose}
                variant="outline"
                className="flex-1 py-5 rounded-xl border-2"
              >
                Later
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
