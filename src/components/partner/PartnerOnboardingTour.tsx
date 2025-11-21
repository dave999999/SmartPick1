import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  QrCode, 
  Package, 
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Camera,
  Clock
} from 'lucide-react';

interface PartnerOnboardingTourProps {
  open: boolean;
  onComplete: (dontShowAgain: boolean) => void;
  partnerName?: string;
}

const steps = [
  {
    id: 1,
    title: "Welcome Partner! 🎉",
    icon: Sparkles,
    content: (name?: string) => (
      <div className="text-center space-y-4">
        <div className="inline-block bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6">
          <Sparkles className="w-16 h-16 text-teal-500 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome, {name || 'Partner'}!
        </h2>
        <p className="text-gray-600">Quick 30-second tour of your dashboard</p>
        
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-teal-300 transition-colors">
            <Plus className="w-8 h-8 text-teal-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">Create Offers</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-amber-300 transition-colors">
            <QrCode className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">Scan QR</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 hover:border-emerald-300 transition-colors">
            <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-gray-700">Track Stats</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    title: "Create Offers 📦",
    icon: Plus,
    content: () => (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 hover:border-teal-300 transition-colors">
          <div className="flex gap-4">
            <div className="bg-teal-100 rounded-xl p-3 flex-shrink-0">
              <Plus className="w-7 h-7 text-teal-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Add Your First Offer</h3>
              <p className="text-sm text-gray-600">Click the "+ Create Offer" button to list food items at discounted prices.</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full font-medium">Photos</span>
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">Smart Price</span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">Quantity</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <Package className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-900 font-semibold mb-1">Offer Slots</p>
              <p className="text-sm text-amber-800">
                Each offer uses one slot. You start with 5 slots. Earn more by completing pickups!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    title: "Scan QR Codes 📱",
    icon: QrCode,
    content: () => (
      <div className="space-y-3">
        <div className="flex gap-3 items-start">
          <div className="bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">1</div>
          <div>
            <p className="font-semibold text-gray-900">Customer shows QR code</p>
            <p className="text-sm text-gray-600">When they arrive for pickup</p>
          </div>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">2</div>
          <div>
            <p className="font-semibold text-gray-900">Open QR Scanner</p>
            <p className="text-sm text-gray-600">Click "Scan QR" button or enter code manually</p>
          </div>
        </div>
        
        <div className="flex gap-3 items-start">
          <div className="bg-teal-500 text-white w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">3</div>
          <div>
            <p className="font-semibold text-gray-900">Confirm pickup</p>
            <p className="text-sm text-gray-600">System marks order complete & you earn points!</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border-2 border-teal-200 mt-4">
          <div className="flex gap-3 items-center">
            <Camera className="w-6 h-6 text-teal-600" />
            <div>
              <p className="text-sm font-semibold text-teal-900">Two scan options:</p>
              <p className="text-xs text-teal-700">📷 Camera scan or ✍️ Manual code entry</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    title: "Track Performance 📊",
    icon: TrendingUp,
    content: () => (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Analytics Dashboard</h3>
              <p className="text-sm text-emerald-100">Monitor your success</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-2xl font-bold">Live</p>
              <p className="text-xs text-emerald-100">Active offers</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-2xl font-bold">Real-time</p>
              <p className="text-xs text-emerald-100">Reservations</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">View daily revenue & sales trends</p>
          </div>
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">See which items are most popular</p>
          </div>
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Track pickup completion rates</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 5,
    title: "You're Ready! 🚀",
    icon: CheckCircle2,
    content: () => (
      <div className="text-center space-y-4">
        <div className="inline-block bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">All Set!</h2>
        <p className="text-gray-600">Time to create your first offer</p>
        
        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 space-y-2 text-left">
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Click "+ Create Offer" to start</p>
          </div>
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Use QR scanner when customers arrive</p>
          </div>
          <div className="flex gap-2 items-start">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Check analytics to track your growth</p>
          </div>
          <div className="flex gap-2 items-start">
            <Clock className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">Set pickup windows that work for you</p>
          </div>
        </div>
      </div>
    )
  }
];

export default function PartnerOnboardingTour({ open, onComplete, partnerName }: PartnerOnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(dontShowAgain);
    }
  };

  const handleSkip = () => {
    onComplete(dontShowAgain);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Dialog open={open} onOpenChange={handleSkip}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 pb-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium text-teal-600">Step {currentStep + 1}</span>
              <span className="text-gray-400">of {steps.length}</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip tour
            </Button>
          </div>

          {/* Step content with smooth transition */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {step.content(partnerName)}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-8 py-4 space-y-3">
          {/* Don't show again checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label
              htmlFor="dontShowAgain"
              className="text-sm text-gray-600 cursor-pointer select-none"
            >
              Don't show this tutorial again
            </Label>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={isFirstStep}
            className="text-gray-600"
          >
            Back
          </Button>

          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-8 bg-teal-500' 
                    : index < currentStep 
                      ? 'w-1.5 bg-teal-300' 
                      : 'w-1.5 bg-gray-300'
                }`}
              />
            ))}
          </div>

            <Button
              onClick={handleNext}
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
            >
              {isLastStep ? (
                <>
                  Get Started
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
