import { logger } from '@/lib/logger';
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
  { id: 1, name: 'ინფო' },
  { id: 2, name: 'ფასები' },
  { id: 3, name: 'ვადა' },
  { id: 4, name: 'ფოტო' },
  { id: 5, name: 'მზადაა' },
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
    autoExpire6h: false,
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

    logger.debug('🎯 CreateOfferWizard submitting:', {
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

      logger.debug('📤 Sending FormData:', {
        offer_duration: formData.get('offer_duration'),
        custom_days: formData.get('custom_days')
      });

      await onSubmit(formData);
      
      // Clear draft on success
      localStorage.removeItem('offer_draft');
      handleClose();
    } catch (error) {
      // Error handling is done in parent, but ensure we don't close on error
      logger.error('Error submitting offer:', error);
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
          {/* Progress Header - Minimal */}
          <div className="sticky top-0 bg-white border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900 tracking-tight">
                ახალი შეთავაზება
              </DialogTitle>
            </DialogHeader>
            
            {/* Progress Steps - Clean */}
            <div className="mt-4 flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1 gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        currentStep > step.id
                          ? 'bg-teal-600 text-white'
                          : currentStep === step.id
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {currentStep > step.id ? <Check className="w-4 h-4" strokeWidth={2.5} /> : step.id}
                    </div>
                    <span className={`text-xs font-medium ${
                      currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 transition-all ${
                      currentStep > step.id ? 'bg-teal-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area - Spacious */}
          <div className="overflow-y-auto max-h-[calc(90vh-200px)] px-6 py-6 bg-white">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-2 block">
                    სათაური
                  </Label>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(e) => updateDraft('title', e.target.value)}
                    placeholder="შეიყვანეთ სათაური"
                    className="h-11 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                    autoFocus
                    maxLength={100}
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1.5">{errors.title}</p>}
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2 block">
                    აღწერა <span className="text-gray-400 text-xs">(არასავალდებულო)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={draft.description}
                    onChange={(e) => updateDraft('description', e.target.value)}
                    placeholder="დეტალური ინფორმაცია"
                    className="min-h-[100px] rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Pricing */}
            {currentStep === 2 && (
              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <Label htmlFor="quantity" className="text-sm font-medium text-gray-700 mb-2 block">
                    რაოდენობა
                  </Label>
                  
                  <div className="flex items-center space-x-2 mb-3 p-3 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="unlimited_quantity"
                      checked={draft.isUnlimitedQuantity}
                      onCheckedChange={(checked) => {
                        updateDraft('isUnlimitedQuantity', checked === true);
                        if (checked) {
                          updateDraft('quantity', '');
                        }
                      }}
                      className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                    />
                    <Label htmlFor="unlimited_quantity" className="text-sm cursor-pointer text-gray-900">
                      შეუზღუდავი
                    </Label>
                  </div>

                  {!draft.isUnlimitedQuantity && (
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="100"
                      value={draft.quantity}
                      onChange={(e) => updateDraft('quantity', e.target.value)}
                      placeholder="10"
                      className="h-11 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                      autoFocus
                    />
                  )}
                  {errors.quantity && <p className="text-red-500 text-xs mt-1.5">{errors.quantity}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="original_price" className="text-sm font-medium text-gray-700 mb-2 block">
                      ორიგინალური ფასი
                    </Label>
                    <div className="relative">
                      <Input
                        id="original_price"
                        type="number"
                        step="0.01"
                        min="0.50"
                        max="500"
                        value={draft.original_price}
                        onChange={(e) => updateDraft('original_price', e.target.value)}
                        placeholder="10.00"
                        className="h-11 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₾</span>
                    </div>
                    {errors.original_price && <p className="text-red-500 text-xs mt-1.5">{errors.original_price}</p>}
                  </div>

                  <div>
                    <Label htmlFor="smart_price" className="text-sm font-medium text-gray-700 mb-2 block">
                      სმარტ ფასი
                    </Label>
                    <div className="relative">
                      <Input
                        id="smart_price"
                        type="number"
                        step="0.01"
                        min="0.50"
                        max="500"
                        value={draft.smart_price}
                        onChange={(e) => updateDraft('smart_price', e.target.value)}
                        placeholder="6.00"
                        className="h-11 rounded-lg border-gray-200 focus:border-teal-500 focus:ring-teal-500 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₾</span>
                    </div>
                    {errors.smart_price && <p className="text-red-500 text-xs mt-1.5">{errors.smart_price}</p>}
                  </div>
                </div>

                {draft.original_price && draft.smart_price && calculateDiscount() > 0 && (
                  <div className="p-4 bg-teal-50 rounded-lg">
                    <p className="text-sm font-medium text-teal-900">
                      {calculateDiscount()}% ფასდაკლება
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Duration */}
            {currentStep === 3 && (
              <div className="space-y-6 max-w-md mx-auto">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    ხანგრძლივობა
                  </Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: '2_days', label: '2 დღე', days: 2 },
                      { value: '1_week', label: '1 კვირა', days: 7 },
                      { value: '2_weeks', label: '2 კვირა', days: 14 },
                      { value: '1_month', label: '1 თვე', days: 30 },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          updateDraft('offerDuration', option.value as any);
                          updateDraft('customDays', '');
                        }}
                        className={`p-4 rounded-lg border transition-all ${
                          draft.offerDuration === option.value
                            ? 'border-teal-600 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className={`text-2xl font-semibold ${
                            draft.offerDuration === option.value ? 'text-teal-600' : 'text-gray-700'
                          }`}>
                            {option.days}
                          </div>
                          <div className={`text-xs font-medium ${
                            draft.offerDuration === option.value ? 'text-teal-600' : 'text-gray-600'
                          }`}>
                            {option.label}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Duration */}
                  <button
                    type="button"
                    onClick={() => {
                      updateDraft('offerDuration', 'custom');
                      updateDraft('customDays', '');
                    }}
                    className={`w-full p-4 rounded-lg border transition-all text-left ${
                      draft.offerDuration === 'custom'
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`text-sm font-medium ${
                      draft.offerDuration === 'custom' ? 'text-teal-900' : 'text-gray-900'
                    }`}>
                      მორგებული (1-30 დღე)
                    </p>
                  </button>

                  {/* Custom Days Picker */}
                  {draft.offerDuration === 'custom' && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <Label className="text-sm font-medium text-gray-700 block">
                        რამდენი დღე?
                      </Label>
                      {isPickerExpanded ? (
                        <>
                          <div className="relative h-32 overflow-hidden rounded-lg bg-white">
                            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
                            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-10 bg-teal-50 border-y border-teal-200 pointer-events-none z-10" />
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
                                  className="h-10 w-full snap-center flex items-center justify-center text-lg font-medium text-gray-700"
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
                              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              დადასტურება - {draft.customDays} დღე
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 p-3 bg-white rounded-lg border border-teal-200 flex items-center justify-center">
                            <span className="text-xl font-semibold text-teal-600">{draft.customDays} დღე</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPickerExpanded(true)}
                            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                          >
                            შეცვლა
                          </button>
                        </div>
                      )}
                      {errors.customDays && (
                        <p className="text-red-500 text-xs">{errors.customDays}</p>
                      )}
                    </div>
                  )}
                </div>

                {is24HourBusiness && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="auto_expire_6h"
                      checked={draft.autoExpire6h}
                      onCheckedChange={(checked) => updateDraft('autoExpire6h', checked === true)}
                      className="data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                    />
                    <Label htmlFor="auto_expire_6h" className="text-sm cursor-pointer text-gray-700 flex-1">
                      ავტომატური ვადის გასვლა 12 საათში
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Image */}
            {currentStep === 4 && (
              <div className="space-y-4 max-w-md mx-auto">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    ფოტო
                  </Label>
                  
                  {draft.image ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-56 rounded-lg overflow-hidden">
                        <img
                          src={draft.image}
                          alt="Selected"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowImageModal(true);
                        }}
                        className="w-full h-11 rounded-lg"
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
                      className="w-full h-56 rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-500 bg-gray-50 hover:bg-teal-50 transition-all flex flex-col items-center justify-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-4xl">
                        📷
                      </div>
                      <p className="font-medium text-gray-700">აირჩიეთ სურათი</p>
                    </button>
                  )}
                  {errors.image && <p className="text-red-500 text-xs mt-2">{errors.image}</p>}
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="bg-gray-50 rounded-lg p-4">
                  {draft.image && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img src={draft.image} alt="Offer" className="w-full h-32 object-cover" />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">სათაური</span>
                      <span className="text-sm font-medium text-gray-900 text-right">{draft.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">რაოდენობა</span>
                      <span className="text-sm font-medium text-gray-900">
                        {draft.isUnlimitedQuantity ? 'შეუზღუდავი' : `${draft.quantity} ცალი`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ფასი</span>
                      <span className="text-sm font-medium text-gray-900">₾{draft.smart_price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ხანგრძლივობა</span>
                      <span className="text-sm font-medium text-gray-900">
                        {draft.offerDuration === '2_days' && '2 დღე'}
                        {draft.offerDuration === '1_week' && '1 კვირა'}
                        {draft.offerDuration === '2_weeks' && '2 კვირა'}
                        {draft.offerDuration === '1_month' && '1 თვე'}
                        {draft.offerDuration === 'custom' && `${draft.customDays} დღე`}
                      </span>
                    </div>
                    {calculateDiscount() > 0 && (
                      <div className="flex justify-between pt-3 border-t">
                        <span className="text-sm text-gray-600">ფასდაკლება</span>
                        <span className="text-sm font-semibold text-teal-600">{calculateDiscount()}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4">
            <div className="flex gap-3 max-w-md mx-auto">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="h-11 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  უკან
                </Button>
              )}
              
              <Button
                type="button"
                onClick={currentStep === 5 ? handleSubmit : handleNext}
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    იქმნება...
                  </>
                ) : currentStep === 5 ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    შექმნა
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

      {/* Image Library Modal */}
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
