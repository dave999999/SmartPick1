import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useI18n } from '@/lib/i18n';
import { 
  TrendingUp,
  ArrowRight,
  Plus,
  Bell,
  QrCode
} from 'lucide-react';

interface PartnerOnboardingTourProps {
  open: boolean;
  onComplete: (dontShowAgain: boolean) => void;
  partnerName?: string;
}

const steps = [
  {
    id: 1,
    icon: Plus,
    color: 'teal',
    content: (name: string | undefined, t: (key: string) => string) => (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
            <Plus className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
              {t('partner.onboarding.step1.title')}{name ? `, ${name}` : ''}
            </h2>
            <p className="text-gray-600 text-base leading-relaxed max-w-md mx-auto font-light">
              {t('partner.onboarding.step1.text')}
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    icon: Bell,
    color: 'blue',
    content: (_name: string | undefined, t: (key: string) => string) => (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <Bell className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {t('partner.onboarding.step2.title')}
          </h3>
        </div>
        
        <div className="space-y-2.5 max-w-md mx-auto">
          <div className="flex gap-3 items-start bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center font-medium text-white text-xs">
              1
            </div>
            <p className="text-sm text-gray-700 pt-0.5 font-light">{t('partner.onboarding.step2.bullet1')}</p>
          </div>
          
          <div className="flex gap-3 items-start bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center font-medium text-white text-xs">
              2
            </div>
            <p className="text-sm text-gray-700 pt-0.5 font-light">{t('partner.onboarding.step2.bullet2')}</p>
          </div>
          
          <div className="flex gap-3 items-start bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center font-medium text-white text-xs">
              3
            </div>
            <p className="text-sm text-gray-700 pt-0.5 font-light">{t('partner.onboarding.step2.bullet3')}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100/50 mt-3">
            <p className="text-xs text-gray-700 leading-relaxed font-light">
              {t('partner.onboarding.step2.note')}
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 3,
    icon: QrCode,
    color: 'emerald',
    content: (_name: string | undefined, t: (key: string) => string) => (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <QrCode className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
              {t('partner.onboarding.step3.title')}
            </h2>
            <p className="text-gray-600 text-base leading-relaxed max-w-md mx-auto font-light">
              {t('partner.onboarding.step3.text')}
            </p>
          </div>
        </div>
      </div>
    )
  }
];

export default function PartnerOnboardingTour({ open, onComplete, partnerName }: PartnerOnboardingTourProps) {
  const { t } = useI18n();
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

  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={handleSkip}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <VisuallyHidden>
          <DialogTitle>{t('partner.onboarding.ariaLabel')}</DialogTitle>
        </VisuallyHidden>
        
        {/* Progress bar */}
        <div className="h-0.5 bg-gray-100 flex">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`flex-1 transition-all duration-500 ease-out ${
                index <= currentStep ? 'bg-teal-600' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>

        {/* Step indicator badge */}
        <div className="absolute top-6 right-6 z-10">
          <div className="bg-gray-100/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-gray-600">
            {currentStep + 1} / {steps.length}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-10 pb-8">
          <div className="min-h-[340px] flex items-center justify-center">
            <div className="w-full">
              {step.content(partnerName, t)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50/30 px-8 py-5 space-y-4">
          {/* Don't show again */}
          <div className="flex items-center space-x-2.5">
            <Checkbox
              id="dontShowAgain"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
              className="border-gray-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
            />
            <Label
              htmlFor="dontShowAgain"
              className="text-sm text-gray-600 cursor-pointer select-none font-light"
            >
              {t('partner.onboarding.dontShowAgain')}
            </Label>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isFirstStep}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-5 py-2 disabled:opacity-40 rounded-xl font-light"
            >
              {t('partner.onboarding.back')}
            </Button>

            <Button
              onClick={handleNext}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 shadow-lg shadow-teal-600/25 rounded-xl font-medium transition-all duration-200 hover:shadow-xl hover:shadow-teal-600/30"
            >
              {isLastStep ? t('partner.onboarding.getStarted') : t('partner.onboarding.next')}
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
