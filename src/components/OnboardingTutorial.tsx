import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { 
  MapPin, 
  ShoppingBag, 
  Clock, 
  Star, 
  Coins, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Percent,
  Zap
} from 'lucide-react';

interface OnboardingTutorialProps {
  open: boolean;
  onComplete: () => void;
  userName?: string;
  userId?: string;
}

const steps = [
  {
    id: 1,
    title: "Welcome! 👋",
    icon: Sparkles,
    content: (name?: string) => (
      <div className="text-center space-y-4">
        <div className="inline-block bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6">
          <Sparkles className="w-16 h-16 text-teal-500 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Hey {name || 'there'}!
        </h2>
        <p className="text-gray-600">Quick 30-second tour</p>
        
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-teal-300 transition-colors">
            <Percent className="w-8 h-8 text-teal-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">50-70% OFF</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-amber-300 transition-colors">
            <Star className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">Earn Points</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-emerald-300 transition-colors">
            <ShoppingBag className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">Easy Pickup</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Find Deals 🗺️",
    icon: MapPin,
    content: () => (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-teal-300 transition-colors">
          <div className="flex gap-4">
            <div className="bg-teal-100 rounded-xl p-3 flex-shrink-0">
              <MapPin className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Interactive Map</h3>
              <p className="text-sm text-gray-600">Browse all live deals on the map. Each pin is a restaurant offering amazing discounts.</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">Live Offers</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Limited Time</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Reserve ⚡",
    icon: Zap,
    content: () => (
      <div className="space-y-3">
        <div className="flex gap-3 items-start">
          <div className="bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
          <div>
            <p className="font-semibold text-gray-900">Tap any offer</p>
            <p className="text-sm text-gray-600">See photos, details, and pickup times</p>
          </div>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
          <div>
            <p className="font-semibold text-gray-900">Reserve instantly</p>
            <p className="text-sm text-gray-600">One tap to confirm — you'll get a QR code</p>
          </div>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
          <div>
            <p className="font-semibold text-gray-900">Pick up & enjoy!</p>
            <p className="text-sm text-gray-600">Show QR code during pickup window</p>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Tip:</span> Always check the pickup time window on each offer
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Earn Points 💎",
    icon: Coins,
    content: () => (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">SmartPoints</h3>
              <p className="text-sm text-amber-100">Rewards with every order</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-2xl font-bold">10 pts</p>
              <p className="text-xs text-amber-100">Per ₾1 spent</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-2xl font-bold">500 pts</p>
              <p className="text-xs text-amber-100">Signup bonus</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 text-center">
          Redeem points for free offers • Unlock achievements • Earn streak bonuses
        </p>
      </div>
    )
  },
  {
    id: 5,
    title: "Ready! 🚀",
    icon: CheckCircle2,
    content: () => (
      <div className="text-center space-y-4">
        <div className="inline-block bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">You're All Set!</h2>
        <p className="text-gray-600">Time to discover your first deal</p>
        
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 space-y-2 text-left">
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Check pickup time windows</p>
          </div>
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Show QR code at pickup</p>
          </div>
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Earn points with every order</p>
          </div>
        </div>
      </div>
    )
  }
];

export default function OnboardingTutorial({ open, onComplete, userName, userId }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as completed in database
      if (userId) {
        try {
          await supabase
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', userId);
        } catch (error) {
          console.error('Failed to mark onboarding as completed:', error);
        }
      }
      onComplete();
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md max-h-[85vh] overflow-y-auto p-0 bg-gradient-to-b from-white via-[#FAFFFE] to-[#F0FFF9]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Progress Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b border-gray-100">
          <div className="h-1 bg-gray-100">
            <div 
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-teal-100 w-8 h-8 rounded-full flex items-center justify-center">
                <step.icon className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Step {currentStep + 1} of {steps.length}</p>
                <h3 className="font-semibold text-gray-900 text-sm">{step.title}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {step.content(userName)}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-6 safe-area-bottom" style={{ paddingTop: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep 
                      ? 'w-8 bg-teal-500' 
                      : index < currentStep
                      ? 'w-2 bg-teal-300'
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-semibold px-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Get Started!
                  <Sparkles className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
