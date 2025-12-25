import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import ImageLibraryModal from '@/components/ImageLibraryModal';
import { toast } from 'sonner';
import { usePartnerData } from '@/hooks/usePartnerData';
import { getCurrentUser } from '@/lib/api';

interface CreateOfferWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
  is24HourBusiness: boolean;
  businessType: string;
  businessHours?: {
    is_24_7?: boolean;
    open?: string;
    close?: string;
  };
}

interface OfferDraft {
  title: string;
  description: string;
  quantity: string;
  original_price: string;
  smart_price: string;
  image: string;
  autoExpire6h: boolean;
  isUnlimitedQuantity: boolean;
  offerDuration: '2_days' | '1_week' | '2_weeks' | '1_month' | 'custom';
  customDays: string;
}

const STEPS = [
  { id: 1, name: 'ძირითადი ინფო', icon: '📝' },
  { id: 2, name: 'ფასები', icon: '💰' },
  { id: 3, name: 'ხანგრძლივობა', icon: '📅' },
  { id: 4, name: 'სურათი', icon: '📷' },
  { id: 5, name: 'შემოწმება', icon: '✓' },
];

export default function CreateOfferWizard({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  is24HourBusiness,
  businessType,
  businessHours,
}: CreateOfferWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isPickerExpanded, setIsPickerExpanded] = useState(true);
  const [draft, setDraft] = useState<OfferDraft>({
    title: '',
    description: '',
    quantity: '',
    original_price: '',
    smart_price: '',
    image: '',
    isUnlimitedQuantity: false,
    offerDuration: '1_week',
    customDays: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get current user and partner data
  const [userId, setUserId] = useState<string | null>(null);
  const { partner } = usePartnerData(userId || '');
  
  useEffect(() => {
    getCurrentUser().then(({ user }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Reset custom days picker when custom duration is selected
  useEffect(() => {
    if (draft.offerDuration === 'custom' && !draft.customDays) {
      setIsPickerExpanded(true);
      // Reset scroll position when custom is first selected
      setTimeout(() => {
        const container = document.querySelector('.overflow-y-auto.snap-y');
        if (container) {
          container.scrollTop = 0;
        }
      }, 100);
    }
  }, [draft.offerDuration, draft.customDays]);

  // Auto-save draft every 10 seconds
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      if (draft.title || draft.description) {
        localStorage.setItem('offer_draft', JSON.stringify(draft));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [draft, open]);

  // Load draft on mount
  useEffect(() => {
    if (open) {
      const savedDraft = localStorage.getItem('offer_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setDraft(parsed);
        } catch (e) {
          // Invalid draft, ignore
        }
      }
    }
  }, [open]);

  const updateDraft = <K extends keyof OfferDraft>(field: K, value: OfferDraft[K]) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!draft.title.trim()) newErrors.title = 'სათაური აუცილებელია';
      if (draft.title.trim().length < 3) newErrors.title = 'სათაური უნდა შეიცავდეს მინიმუმ 3 სიმბოლოს';
      if (draft.title.trim().length > 100) newErrors.title = 'სათაური არ უნდა აღემატებოდეს 100 სიმბოლოს';
      // Description is optional - no validation needed
    } else if (step === 2) {
      const quantity = Number(draft.quantity);
      const originalPrice = Number(draft.original_price);
      const smartPrice = Number(draft.smart_price);

      // Skip quantity validation if unlimited is selected
      if (!draft.isUnlimitedQuantity) {
        if (!draft.quantity || quantity < 1) newErrors.quantity = 'რაოდენობა მინიმუმ 1 უნდა იყოს';
        if (quantity > 100) newErrors.quantity = 'მაქსიმუმ 100 ერთეული შეთავაზებაზე';
      }
      
      if (!draft.original_price || originalPrice <= 0) newErrors.original_price = 'ორიგინალური ფასი აუცილებელია';
      if (originalPrice < 0.50) newErrors.original_price = 'მინიმალური ფასი არის ₾0.50';
      if (originalPrice > 500) newErrors.original_price = 'მაქსიმალური ფასი არის ₾500';
      
      if (!draft.smart_price || smartPrice <= 0) newErrors.smart_price = 'სმარტ ფასი აუცილებელია';
      if (smartPrice < 0.50) newErrors.smart_price = 'მინიმალური ფასი არის ₾0.50';
      if (smartPrice > 500) newErrors.smart_price = 'მაქსიმალური ფასი არის ₾500';
      if (smartPrice >= originalPrice) {
        newErrors.smart_price = 'სმარტ ფასი უნდა იყოს ნაკლები ორიგინალურ ფასზე';
      }
    } else if (step === 3) {
      // Validate custom duration if selected
      if (draft.offerDuration === 'custom') {
        const days = Number(draft.customDays);
        if (!draft.customDays || days < 1) newErrors.customDays = 'მინიმუმ 1 დღე';
        if (days > 30) newErrors.customDays = 'მაქსიმუმ 30 დღე';
      }
    } else if (step === 4) {
      if (!draft.image) newErrors.image = 'გთხოვთ აირჩიოთ სურათი';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    } else {
      // Scroll to first error
      const firstErrorElement = document.querySelector('.text-red-500');
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate ALL steps before submitting
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      toast.error('გთხოვთ შეავსოთ ყველა სავალდებულო ველი');
      return;
    }

    console.log('🎯 CreateOfferWizard submitting:', {
      offerDuration: draft.offerDuration,
      customDays: draft.customDays,
      is24HourBusiness
    });

    try {
      const formData = new FormData();
      formData.append('title', draft.title.trim());
      formData.append('description', draft.description.trim());
      // Use 999 for unlimited quantity
      formData.append('quantity', draft.isUnlimitedQuantity ? '999' : draft.quantity);
      formData.append('original_price', draft.original_price);
      formData.append('smart_price', draft.smart_price);
      formData.append('images', draft.image);
      formData.append('offer_duration', draft.offerDuration);
      if (draft.offerDuration === 'custom') {
        formData.append('custom_days', draft.customDays);
      }

      console.log('📤 Sending FormData:', {
        offer_duration: formData.get('offer_duration'),
        custom_days: formData.get('custom_days')
      });

      await onSubmit(formData);
      
      // Clear draft on success
      localStorage.removeItem('offer_draft');
      handleClose();
    } catch (error) {
      // Error handling is done in parent, but ensure we don't close on error
      console.error('Error submitting offer:', error);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setDraft({
      title: '',
      description: '',
      quantity: '',
      original_price: '',
      smart_price: '',
      image: '',
      isUnlimitedQuantity: false,
      offerDuration: '1_week',
      customDays: '',
    });
    setErrors({});
    setShowImageModal(false);
    onClose();
  };

  const calculateDiscount = () => {
    if (draft.original_price && draft.smart_price) {
      const original = Number(draft.original_price);
      const smart = Number(draft.smart_price);
      if (original > 0) {
        return Math.round(((original - smart) / original) * 100);
      }
    }
    return 0;
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          // Only allow closing via explicit close button, not backdrop click
          // Don't close if image modal is open or during submission
          if (!nextOpen && !isSubmitting && !showImageModal) {
            handleClose();
          }
        }}
        modal={true}
      >
        <DialogContent 
          className="max-w-[90vw] sm:max-w-lg max-h-[90vh] overflow-hidden rounded-3xl p-0 bg-white shadow-2xl"
          style={{ backgroundColor: '#ffffff' }}
          onPointerDownOutside={(e) => {
            // Prevent closing when clicking outside during submission or when image modal is open
            if (isSubmitting || showImageModal) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing with ESC during submission
            if (isSubmitting) {
              e.preventDefault();
            }
            // If image modal is open, close it instead
            if (showImageModal) {
              e.preventDefault();
              setShowImageModal(false);
            }
          }}
        >
          {/* Progress Header - Compact */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-2" style={{ backgroundColor: '#ffffff' }}>
            <DialogHeader>
              <DialogTitle className="text-sm sm:text-base font-bold text-gray-900">
                ახალი შეთავაზების შექმნა
              </DialogTitle>
            </DialogHeader>
            
            {/* Progress Stepper - Apple Style */}
            <div className="mt-2 flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-base font-semibold transition-all duration-300 ${
                        currentStep > step.id
                          ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md'
                          : currentStep === step.id
                          ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg scale-105 ring-2 ring-emerald-100'
                          : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                    >
                      {currentStep > step.id ? <Check className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} /> : step.icon}
                    </div>
                    <span className={`text-[8px] sm:text-[10px] mt-1 font-semibold transition-colors ${
                      currentStep >= step.id ? 'text-emerald-600' : 'text-gray-400'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-1 flex-1 mx-1 rounded-full transition-all duration-300 ${
                      currentStep > step.id ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area - Compact */}
          <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-3 py-2 bg-white" style={{ backgroundColor: '#ffffff' }}>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="title" className="text-xs font-semibold text-gray-700">
                    შეთავაზების სათაური <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(e) => updateDraft('title', e.target.value)}
                    placeholder="მაგ., ახალი კრუასანები (მინ. 3 სიმბოლო)"
                    className="mt-1.5 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-sm h-9"
                    autoFocus
                    maxLength={100}
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                  {!errors.title && (
                    <p className={`text-xs mt-1 ${draft.title.length < 3 ? 'text-amber-600 font-medium' : draft.title.length > 100 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {draft.title.length}/100 სიმბოლო {draft.title.length < 3 && '(მინიმუმ 3)'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs font-semibold text-gray-700">
                    აღწერა <span className="text-gray-400 text-[10px]">(არასავალდებულო)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={draft.description}
                    onChange={(e) => updateDraft('description', e.target.value)}
                    placeholder="დეტალურად აღწერეთ თქვენი შეთავაზება... (არასავალდებულო)"
                    className="mt-1.5 min-h-[80px] rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-gray-900 placeholder:text-gray-400 resize-none text-sm"
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                  <p className="text-xs mt-1 text-gray-500">
                    {draft.description.length} სიმბოლო
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Pricing */}
            {currentStep === 2 && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="quantity" className="text-xs font-semibold text-gray-700">
                    ხელმისაწვდომი რაოდენობა {!draft.isUnlimitedQuantity && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {/* Unlimited Quantity Toggle */}
                  <div className="flex items-center space-x-2 mt-1.5 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <Checkbox
                      id="unlimited_quantity"
                      checked={draft.isUnlimitedQuantity}
                      onCheckedChange={(checked) => {
                        updateDraft('isUnlimitedQuantity', checked === true);
                        if (checked) {
                          updateDraft('quantity', '');
                        }
                      }}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 h-4 w-4"
                    />
                    <div className="flex-1">
                      <Label htmlFor="unlimited_quantity" className="text-xs font-semibold cursor-pointer text-gray-900 flex items-center gap-1">
                        ♾️ შეუზღუდავი რაოდენობა
                      </Label>
                      <p className="text-[9px] text-gray-600 mt-0.5">იდეალური მთელი დღის განმავლობაში გაყიდვისთვის</p>
                    </div>
                  </div>

                  {/* Quantity Input - Only show if not unlimited */}
                  {!draft.isUnlimitedQuantity && (
                    <>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max="100"
                        value={draft.quantity}
                        onChange={(e) => updateDraft('quantity', e.target.value)}
                        placeholder="10"
                        className="mt-1.5 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-sm h-9"
                        autoFocus
                      />
                      {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                      {!errors.quantity && <p className="text-xs text-gray-500 mt-1">მაქს 100 ერთეული შეთავაზებაზე</p>}
                    </>
                  )}
                  
                  {/* Show unlimited badge when selected */}
                  {draft.isUnlimitedQuantity && (
                    <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-sm font-semibold shadow-lg">
                      <span>♾️</span>
                      <span>შეუზღუდავი რაოდენობა</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="original_price" className="text-xs font-semibold text-gray-700">
                      ორიგინალური ფასი <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="original_price"
                        type="number"
                        step="0.01"
                        min="0.50"
                        max="500"
                        value={draft.original_price}
                        onChange={(e) => updateDraft('original_price', e.target.value)}
                        placeholder="10.00"
                        className="rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white pr-7 text-sm h-9"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₾</span>
                    </div>
                    {errors.original_price && <p className="text-red-500 text-[10px] mt-0.5">{errors.original_price}</p>}
                    {!errors.original_price && <p className="text-[9px] text-gray-500 mt-0.5">₾0.50 - ₾500</p>}
                  </div>

                  <div>
                    <Label htmlFor="smart_price" className="text-xs font-semibold text-slate-700">
                      სმარტ ფასი <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="smart_price"
                        type="number"
                        step="0.01"
                        min="0.50"
                        max="500"
                        value={draft.smart_price}
                        onChange={(e) => updateDraft('smart_price', e.target.value)}
                        placeholder="6.00"
                        className="rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white pr-7 text-sm h-9"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₾</span>
                    </div>
                    {errors.smart_price && <p className="text-red-500 text-[10px] mt-0.5">{errors.smart_price}</p>}
                    {!errors.smart_price && <p className="text-[9px] text-gray-500 mt-0.5">₾0.50 - ₾500</p>}
                  </div>
                </div>

                {draft.original_price && draft.smart_price && calculateDiscount() > 0 && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm font-semibold text-emerald-700">
                      💰 {calculateDiscount()}% ფასდაკლება - შესანიშნავი შეთავაზება!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Offer Duration */}
            {currentStep === 3 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-900 mb-1 block">
                    📅 შეთავაზების ხანგრძლივობა
                  </Label>
                  <p className="text-[10px] text-gray-500 mb-2">
                    {is24HourBusiness 
                      ? 'შეთავაზება იქნება აქტიური 24/7 არჩეული პერიოდის განმავლობაში'
                      : 'შეთავაზება იქნება ხილვადი მხოლოდ თქვენი სამუშაო საათების განმავლობაში'}
                  </p>
                  
                  {/* Quick Duration Options */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[
                      { value: '2_days', label: '2 დღე', days: 2, gradient: 'from-blue-500 to-blue-600' },
                      { value: '1_week', label: '1 კვირა', days: 7, gradient: 'from-emerald-500 to-emerald-600' },
                      { value: '2_weeks', label: '2 კვირა', days: 14, gradient: 'from-purple-500 to-purple-600' },
                      { value: '1_month', label: '1 თვე', days: 30, gradient: 'from-orange-500 to-orange-600' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          updateDraft('offerDuration', option.value as any);
                          updateDraft('customDays', '');
                        }}
                        className={`group relative overflow-hidden p-2.5 rounded-xl border-2 transition-all duration-300 ${
                          draft.offerDuration === option.value
                            ? 'border-transparent shadow-md scale-[1.01]'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {draft.offerDuration === option.value && (
                          <div className={`absolute inset-0 bg-gradient-to-br ${option.gradient} opacity-10`} />
                        )}
                        <div className="relative flex flex-col items-center justify-center gap-1">
                          <div className={`text-xl font-bold transition-all ${
                            draft.offerDuration === option.value ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {option.days}
                          </div>
                          <div className={`text-xs font-semibold transition-colors ${
                            draft.offerDuration === option.value ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {option.label}
                          </div>
                          {draft.offerDuration === option.value && (
                            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow">
                              <span className="text-white text-[10px] font-bold">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Duration Option */}
                  <button
                    type="button"
                    onClick={() => {
                      updateDraft('offerDuration', 'custom');
                      updateDraft('customDays', '');
                    }}
                    className={`w-full p-2.5 rounded-xl border-2 transition-all duration-300 ${
                      draft.offerDuration === 'custom'
                        ? 'border-transparent bg-gradient-to-br from-indigo-50 to-purple-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        draft.offerDuration === 'custom'
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`text-base ${
                          draft.offerDuration === 'custom' ? 'text-white' : ''
                        }`}>🎯</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-xs font-semibold ${
                          draft.offerDuration === 'custom' ? 'text-indigo-900' : 'text-gray-900'
                        }`}>
                          მორგებული ხანგრძლივობა
                        </p>
                        <p className="text-[10px] text-gray-500">1-დან 30 დღემდე</p>
                      </div>
                      {draft.offerDuration === 'custom' && (
                        <div className="w-5 h-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-white text-[10px] font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Custom Days Picker - Scrollable */}
                  {draft.offerDuration === 'custom' && (
                    <div className="mt-2 p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 space-y-2">
                      <Label className="text-xs font-semibold text-indigo-900 block text-center">
                        რამდენი დღით გსურთ? <span className="text-red-500">*</span>
                      </Label>
                      {isPickerExpanded ? (
                        <>
                          <div className="relative h-32 overflow-hidden rounded-lg bg-white/60">
                            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
                            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 bg-indigo-100/30 border-y-2 border-indigo-300 pointer-events-none z-10" />
                            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                            <div 
                              className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide px-4"
                              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                              onScroll={(e) => {
                                const container = e.currentTarget;
                                const scrollTop = container.scrollTop;
                                const itemHeight = 40;
                                const selectedIndex = Math.round(scrollTop / itemHeight);
                                const newValue = (selectedIndex + 1).toString();
                                if (newValue !== draft.customDays && selectedIndex >= 0 && selectedIndex < 30) {
                                  updateDraft('customDays', newValue);
                                }
                              }}
                            >
                              {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  className="h-10 w-full snap-center flex items-center justify-center text-lg font-bold text-gray-700 hover:text-indigo-600 transition-colors"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    updateDraft('customDays', day.toString());
                                    setIsPickerExpanded(false);
                                  }}
                                >
                                  {day} დღე
                                </button>
                              ))}
                            </div>
                          </div>
                          {draft.customDays && (
                            <button
                              type="button"
                              onClick={() => setIsPickerExpanded(false)}
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              დადასტურება - {draft.customDays} დღე
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 p-3 bg-white rounded-lg border-2 border-indigo-300 flex items-center justify-center">
                            <span className="text-2xl font-bold text-indigo-600">{draft.customDays} დღე</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPickerExpanded(true)}
                            className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 transition-colors"
                          >
                            შეცვლა
                          </button>
                        </div>
                      )}
                      {errors.customDays && (
                        <p className="text-red-500 text-[10px] flex items-center gap-1 justify-center">
                          <span>⚠️</span>
                          {errors.customDays}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {is24HourBusiness && (
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <Checkbox
                      id="auto_expire_6h"
                      checked={draft.autoExpire6h}
                      onCheckedChange={(checked) => updateDraft('autoExpire6h', checked === true)}
                      className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <Label htmlFor="auto_expire_6h" className="text-xs cursor-pointer text-gray-800 leading-relaxed flex-1">
                      <span className="font-semibold">ავტომატური ვადის გასვლა 12 საათში</span>
                      <br />
                      <span className="text-gray-600">24 საათიანი ბიზნესისთვის</span>
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Image Selection */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    პროდუქტის სურათი <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500 mt-1 mb-3">აირჩიეთ მომხიბლავი ფოტო, რომელიც წარმოადგენს თქვენს შეთავაზებას</p>
                  
                  {draft.image ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg">
                        <img
                          src={draft.image}
                          alt="Selected"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 shadow-md">
                          <Check className="w-3 h-3" /> არჩეულია
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImageModal(true);
                        }}
                        className="w-full rounded-xl border-gray-300 hover:bg-gray-50"
                      >
                        სურათის შეცვლა
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowImageModal(true);
                      }}
                      className="w-full h-48 rounded-2xl border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50 hover:bg-emerald-50 transition-all duration-200 flex flex-col items-center justify-center gap-3 group"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                        <span className="text-3xl">📷</span>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-700 group-hover:text-emerald-600">დააწკაპუნეთ სურათის ასარჩევად</p>
                        <p className="text-xs text-gray-500 mt-1">აირჩიეთ ჩვენი ბიბლიოთეკიდან</p>
                      </div>
                    </button>
                  )}
                  {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                </div>

                {/* Scheduling removed per updated requirements */}
              </div>
            )}

            {/* Step 5: Review - Compact for small screens */}
            {currentStep === 5 && (
              <div className="space-y-2">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-2.5 border border-emerald-200">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5 text-sm">
                    <span>✓</span> გადახედეთ შეთავაზება
                  </h3>
                  
                  {/* Image Preview - Compact */}
                  {draft.image && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      <img src={draft.image} alt="Offer" className="w-full h-24 object-cover" />
                    </div>
                  )}

                  {/* Details - Compact with better wrapping */}
                  <div className="space-y-0 text-xs">
                    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-emerald-100">
                      <span className="text-gray-600 text-[11px] shrink-0">სათაური:</span>
                      <span className="text-gray-900 font-semibold text-right text-[11px] line-clamp-2 break-words">{draft.title}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100">
                      <span className="text-gray-600 text-[11px] shrink-0">რაოდენობა:</span>
                      <span className="text-gray-900 font-semibold text-[11px]">
                        {draft.isUnlimitedQuantity ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-[10px]">
                            <span>♾️</span>
                            <span>უსაზღვრო</span>
                          </span>
                        ) : (
                          `${draft.quantity} ერთეული`
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100">
                      <span className="text-gray-600 text-[11px] shrink-0">ორიგინალი:</span>
                      <span className="text-gray-900 font-semibold text-[11px]">₾{draft.original_price}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100">
                      <span className="text-gray-600 text-[11px] shrink-0">სმარტ ფასი:</span>
                      <span className="text-emerald-600 font-bold text-[11px]">₾{draft.smart_price}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100">
                      <span className="text-gray-600 text-[11px] shrink-0">ხანგრძლივობა:</span>
                      <span className="text-purple-600 font-semibold text-[11px]">
                        {draft.offerDuration === '2_days' && '2 დღე'}
                        {draft.offerDuration === '1_week' && '1 კვირა'}
                        {draft.offerDuration === '2_weeks' && '2 კვირა'}
                        {draft.offerDuration === '1_month' && '1 თვე'}
                        {draft.offerDuration === 'custom' && `${draft.customDays} დღე`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 py-1.5">
                      <span className="text-gray-600 text-[11px] shrink-0">ფასდაკლება:</span>
                      <span className="text-teal-600 font-bold text-[11px]">{calculateDiscount()}%</span>
                    </div>
                  </div>
                </div>

                {/* Scheduling Info */}
                {!is24HourBusiness && (() => {
                  const now = new Date();
                  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  const openTime = businessHours?.open || '09:00';
                  const closeTime = businessHours?.close || '22:00';
                  const isOpen = currentTime >= openTime && currentTime <= closeTime;
                  
                  if (!isOpen) {
                    // Business is closed - calculate when offer will go live
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const goesLiveDate = `${tomorrow.getDate()}.${tomorrow.getMonth() + 1}`;
                    
                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] leading-relaxed">
                        <div className="flex items-start gap-1.5">
                          <span className="text-amber-600 text-base shrink-0">⏰</span>
                          <div className="space-y-1">
                            <p className="text-amber-900 font-semibold">
                              თქვენი ბიზნესი ამჟამად დახურულია
                            </p>
                            <p className="text-amber-700">
                              შეთავაზება გაგზავნილი იქნება <span className="font-bold">{goesLiveDate} {openTime}-ზე</span>
                            </p>
                            <p className="text-amber-700">
                              და იმოქმედებს <span className="font-bold">{draft.offerDuration === 'custom' ? draft.customDays : draft.offerDuration === '2_days' ? '2' : draft.offerDuration === '1_week' ? '7' : draft.offerDuration === '2_weeks' ? '14' : '30'} დღე</span> თქვენი სამუშაო საათების განმავლობაში ({openTime}-{closeTime})
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <p className="text-[10px] text-gray-500 text-center px-1 leading-snug">
                  შეთავაზების შესაქმნელად დააჭირეთ ქვემოთ
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions - Compact */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-3 py-2" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))', backgroundColor: '#ffffff' }}>
            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="rounded-xl border-gray-300 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  უკან
                </Button>
              )}
              
              <Button
                type="button"
                onClick={currentStep === 5 ? handleSubmit : handleNext}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg hover:shadow-emerald-200 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    იქმნება...
                  </>
                ) : currentStep === 5 ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    შეთავაზების შექმნა
                  </>
                ) : (
                  <>
                    შემდეგი
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Library Modal - Higher z-index to appear above wizard */}
      {showImageModal && (
        <ImageLibraryModal
          open={showImageModal}
          category={businessType || 'RESTAURANT'}
          partnerId={partner?.id}
          onSelect={(url) => {
            updateDraft('image', url);
            setShowImageModal(false);
          }}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </>
  );
}
