import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Gift, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';

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
  // Enhanced details for better UX
  offerTitle?: string;
  offerImage?: string;
  originalPrice?: number;
  paidPrice?: number;
  quantity?: number;
}

export default function PickupSuccessModal({
  open,
  onClose,
  savedAmount,
  pointsEarned,
  newAchievements = [],
  availableRewardsCount = 0,
  offerTitle,
  offerImage,
  originalPrice,
  paidPrice,
  quantity = 1
}: PickupSuccessModalProps) {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  // Debug logging
  useEffect(() => {
    logger.debug('[PickupSuccessModal] render:', { open, savedAmount, pointsEarned });
  }, [open, savedAmount, pointsEarned]);

  const handleClose = () => {
    onClose();
    navigate('/');
  };
  
  // Prevent click propagation when clicking inside modal
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <Dialog open={open} onOpenChange={handleClose} modal>
      <DialogContent
        className="max-w-[380px] p-0 overflow-hidden bg-white/80 backdrop-blur-[28px] border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[24px] z-[100000]"
        onInteractOutside={(e) => {
          // Prevent outside interactions from reaching sheets/overlays behind
          e.preventDefault();
          // Radix passes a custom event that supports stopPropagation
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(e as any).stopPropagation?.();
        }}
        onEscapeKeyDown={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {/* Step 1: Success Celebration with Enhanced Details */}
        {step === 1 && (
          <div className="p-6 text-center space-y-5 animate-in fade-in zoom-in duration-500">
            <DialogTitle className="sr-only">გილოცავთ!</DialogTitle>
            
            {/* Success Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative text-6xl animate-bounce">🎉</div>
            </div>
            
            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                გილოცავთ!
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                შეკვეთა წარმატებით აიღეთ
              </p>
            </div>

            {/* Offer Details Card (if available) */}
            {offerImage && offerTitle && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 border-2 border-gray-100 shadow-lg">
                <div className="flex items-center gap-4">
                  {/* Offer Image */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                    <img 
                      src={offerImage} 
                      alt={offerTitle}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Offer Info */}
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1">
                      {offerTitle}
                    </h3>
                    {quantity && quantity > 1 && (
                      <p className="text-xs text-gray-500">
                        რაოდენობა: {quantity}x
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            {originalPrice && paidPrice && (
              <div className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm rounded-2xl p-5 border-2 border-blue-200/50 shadow-md space-y-3">
                {/* Original Price */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 font-medium">
                    თავდაპირველი ფასი
                  </span>
                  <span className="text-base font-bold text-gray-400 line-through">
                    {(originalPrice * quantity).toFixed(2)} ₾
                  </span>
                </div>

                {/* Paid Price */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-blue-200/50">
                  <span className="text-sm text-gray-700 font-semibold">
                    გადახდილი თანხა
                  </span>
                  <span className="text-lg font-black text-blue-600">
                    {paidPrice.toFixed(2)} ₾
                  </span>
                </div>

                {/* Savings Highlight */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 -mx-1">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Sparkles className="h-5 w-5 text-white animate-pulse" />
                    <span className="text-sm font-bold text-white uppercase tracking-wide">
                      დაზოგეთ
                    </span>
                  </div>
                  <div className="text-4xl font-black text-white drop-shadow-lg">
                    {savedAmount.toFixed(2)} ₾
                  </div>
                  <div className="text-xs text-green-50 mt-1 font-medium">
                    {((savedAmount / (originalPrice * quantity)) * 100).toFixed(0)}% ფასდაკლება
                  </div>
                </div>
              </div>
            )}

            {/* Simple Savings (fallback if no price details) */}
            {(!originalPrice || !paidPrice) && savedAmount > 0 && (
              <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm rounded-xl p-5 border border-green-200/50 shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">
                    დაზოგეთ
                  </span>
                </div>
                <div className="text-4xl font-black text-green-600">
                  {savedAmount.toFixed(2)} ₾
                </div>
              </div>
            )}

            {/* Points Earned */}
            {pointsEarned > 0 && (
              <div className="bg-gradient-to-r from-amber-50/80 to-yellow-50/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200/50">
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">
                    +{pointsEarned} ქულა
                  </span>
                  <span className="text-xs text-amber-600">
                    მიღებული
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button 
                onClick={handleViewAchievements}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-6 rounded-2xl shadow-lg hover:shadow-xl transition-all text-base h-auto"
              >
                <Trophy className="mr-2 h-5 w-5" />
                შეამოწმეთ მიღწევები
              </Button>

              <Button 
                onClick={handleClose}
                variant="outline"
                className="w-full border-2 border-gray-200 bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80 hover:border-gray-300 font-medium shadow-sm text-base h-auto py-4 rounded-2xl"
              >
                დახურვა
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
