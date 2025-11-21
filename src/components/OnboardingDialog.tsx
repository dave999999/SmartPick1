/**
 * Onboarding Dialog - Post-signup tutorial to boost conversion
 * Shows 3-step interactive tutorial with animations
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MapPin, Coins, QrCode, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
  tips?: string[];
}

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
  userName?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Browse Offers',
    description: 'Explore amazing food deals on the map or in the list view',
    icon: <MapPin className="h-12 w-12 text-teal-500" />,
    tips: [
      '🗺️ Use the map to find nearby offers',
      '🔍 Filter by cuisine, price, or distance',
      '⭐ Check ratings and reviews',
    ],
  },
  {
    title: 'Reserve with SmartPoints',
    description: 'SmartPoints are your currency - no real money needed!',
    icon: <Coins className="h-12 w-12 text-orange-500" />,
    tips: [
      '🎁 You started with 100 points',
      '💰 Earn more with every purchase',
      '🎯 Refer friends for bonus points',
    ],
  },
  {
    title: 'Show QR & Pick Up',
    description: 'Get your food and earn rewards instantly',
    icon: <QrCode className="h-12 w-12 text-purple-500" />,
    tips: [
      '📱 Show QR code when arrive at location',
      '🍽️ Enjoy your meal at special prices',
      '🌟 Earn loyalty points automatically',
    ],
  },
];

export function OnboardingDialog({ open, onComplete, userName = 'there' }: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;
  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setIsAnimating(false);
    }
  }, [open]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md p-0 gap-0 bg-gradient-to-br from-white via-teal-50 to-orange-50 border-2 border-teal-200 overflow-hidden [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Welcome to SmartPick</DialogTitle>
        <DialogDescription className="sr-only">Learn how to use SmartPick in 3 easy steps</DialogDescription>
        <div className="relative">
          {/* Header */}
          <div className="relative p-6 pb-4">
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Skip tutorial"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome, {userName}! 🎉
              </h2>
              <p className="text-sm text-gray-600">
                Let's get you started with SmartPick
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div 
            className={cn(
              "px-6 py-8 min-h-[400px] transition-all duration-300",
              isAnimating && "opacity-0 scale-95"
            )}
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-orange-500 rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative bg-white rounded-full p-6 shadow-xl">
                  {step.icon}
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>
              <p className="text-gray-600 text-lg">
                {step.description}
              </p>
            </div>

            {/* Tips */}
            {step.tips && (
              <div className="space-y-3">
                {step.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-100 transform transition-all duration-300 hover:scale-105"
                    style={{
                      animation: `slideInUp 0.5s ease-out ${index * 0.1}s both`,
                    }}
                  >
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <span className="text-gray-700 text-sm flex-1">{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Last Step - Special CTA */}
            {isLastStep && (
              <div className="mt-6 p-4 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl text-white text-center">
                <p className="text-sm font-medium mb-2">🎁 Welcome Bonus</p>
                <p className="text-2xl font-bold">100 SmartPoints</p>
                <p className="text-xs opacity-90 mt-1">Ready to use on your first order!</p>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div 
            className="p-6 pt-0 flex items-center justify-between gap-4"
            style={{
              paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))'
            }}
          >
            {/* Back Button */}
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex-1 max-w-[120px]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            {/* Step Indicators */}
            <div className="flex gap-2">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentStep
                      ? "w-8 bg-gradient-to-r from-teal-500 to-emerald-500"
                      : index < currentStep
                      ? "w-2 bg-teal-500"
                      : "w-2 bg-gray-300"
                  )}
                />
              ))}
            </div>

            {/* Next/Complete Button */}
            <Button
              onClick={handleNext}
              className="flex-1 max-w-[120px] bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold shadow-lg"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
