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

interface CreateOfferWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
  is24HourBusiness: boolean;
  businessType: string;
}

interface OfferDraft {
  title: string;
  description: string;
  quantity: string;
  original_price: string;
  smart_price: string;
  image: string;
  autoExpire6h: boolean;
}

const STEPS = [
  { id: 1, name: 'Basic Info', icon: '📝' },
  { id: 2, name: 'Pricing', icon: '💰' },
  { id: 3, name: 'Image', icon: '📷' },
  { id: 4, name: 'Review', icon: '✓' },
];

export default function CreateOfferWizard({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  is24HourBusiness,
  businessType,
}: CreateOfferWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showImageModal, setShowImageModal] = useState(false);
  const [draft, setDraft] = useState<OfferDraft>({
    title: '',
    description: '',
    quantity: '',
    original_price: '',
    smart_price: '',
    image: '',
    autoExpire6h: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      if (!draft.title.trim()) newErrors.title = 'Title is required';
      if (draft.title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters';
      if (draft.title.trim().length > 100) newErrors.title = 'Title must not exceed 100 characters';
      // Description is optional - no validation needed
    } else if (step === 2) {
      const quantity = Number(draft.quantity);
      const originalPrice = Number(draft.original_price);
      const smartPrice = Number(draft.smart_price);

      if (!draft.quantity || quantity < 1) newErrors.quantity = 'Quantity must be at least 1';
      if (quantity > 100) newErrors.quantity = 'Maximum 100 items per offer';
      
      if (!draft.original_price || originalPrice <= 0) newErrors.original_price = 'Original price is required';
      if (originalPrice < 0.50) newErrors.original_price = 'Minimum price is ₾0.50';
      if (originalPrice > 500) newErrors.original_price = 'Maximum price is ₾500';
      
      if (!draft.smart_price || smartPrice <= 0) newErrors.smart_price = 'Smart price is required';
      if (smartPrice < 0.50) newErrors.smart_price = 'Minimum price is ₾0.50';
      if (smartPrice > 500) newErrors.smart_price = 'Maximum price is ₾500';
      if (smartPrice >= originalPrice) {
        newErrors.smart_price = 'Smart price must be less than original price';
      }
    } else if (step === 3) {
      if (!draft.image) newErrors.image = 'Please select an image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
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
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', draft.title.trim());
      formData.append('description', draft.description.trim());
      formData.append('quantity', draft.quantity);
      formData.append('original_price', draft.original_price);
      formData.append('smart_price', draft.smart_price);
      formData.append('images', draft.image);
      formData.append('auto_expire_6h', draft.autoExpire6h.toString());

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
      autoExpire6h: true,
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
          className="max-w-lg max-h-[90vh] overflow-hidden rounded-3xl p-0 bg-white shadow-2xl"
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
          {/* Progress Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 sm:p-6" style={{ backgroundColor: '#ffffff' }}>
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
                Create New Offer
              </DialogTitle>
            </DialogHeader>
            
            {/* Progress Stepper */}
            <div className="mt-4 flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-bold transition-all ${
                        currentStep > step.id
                          ? 'bg-emerald-500 text-white'
                          : currentStep === step.id
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 scale-110'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {currentStep > step.id ? <Check className="w-4 h-4" /> : step.icon}
                    </div>
                    <span className={`text-[10px] sm:text-xs mt-1 font-medium ${currentStep >= step.id ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {step.name}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-2 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="overflow-y-auto max-h-[calc(90vh-220px)] px-4 sm:px-6 py-4 bg-white" style={{ backgroundColor: '#ffffff' }}>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-semibold text-gray-700">
                    Offer Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={draft.title}
                    onChange={(e) => updateDraft('title', e.target.value)}
                    placeholder="e.g., Fresh Croissants (min 3 characters)"
                    className="mt-2 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
                    autoFocus
                    maxLength={100}
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                  {!errors.title && (
                    <p className={`text-xs mt-1 ${draft.title.length < 3 ? 'text-amber-600 font-medium' : draft.title.length > 100 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                      {draft.title.length}/100 characters {draft.title.length < 3 && '(minimum 3)'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                    Description <span className="text-gray-400 text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={draft.description}
                    onChange={(e) => updateDraft('description', e.target.value)}
                    placeholder="Describe your offer in detail... (optional)"
                    className="mt-2 min-h-[120px] rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white text-gray-900 placeholder:text-gray-400 resize-none"
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                  <p className="text-xs mt-1 text-gray-500">
                    {draft.description.length} characters
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Pricing */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quantity" className="text-sm font-semibold text-gray-700">
                    Quantity Available <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={draft.quantity}
                    onChange={(e) => updateDraft('quantity', e.target.value)}
                    placeholder="10"
                    className="mt-2 rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white"
                    autoFocus
                  />
                  {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                  {!errors.quantity && <p className="text-xs text-gray-500 mt-1">Max 100 items per offer</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="original_price" className="text-sm font-semibold text-gray-700">
                      Original Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="original_price"
                        type="number"
                        step="0.01"
                        min="0.50"
                        max="500"
                        value={draft.original_price}
                        onChange={(e) => updateDraft('original_price', e.target.value)}
                        placeholder="10.00"
                        className="rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₾</span>
                    </div>
                    {errors.original_price && <p className="text-red-500 text-xs mt-1">{errors.original_price}</p>}
                    {!errors.original_price && <p className="text-[10px] text-gray-500 mt-1">₾0.50 - ₾500</p>}
                  </div>

                  <div>
                    <Label htmlFor="smart_price" className="text-sm font-semibold text-slate-700">
                      Smart Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="smart_price"
                        type="number"
                        step="0.01"
                        min="0.50"
                        max="500"
                        value={draft.smart_price}
                        onChange={(e) => updateDraft('smart_price', e.target.value)}
                        placeholder="6.00"
                        className="rounded-xl border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 bg-white pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₾</span>
                    </div>
                    {errors.smart_price && <p className="text-red-500 text-xs mt-1">{errors.smart_price}</p>}
                    {!errors.smart_price && <p className="text-[10px] text-gray-500 mt-1">₾0.50 - ₾500</p>}
                  </div>
                </div>

                {draft.original_price && draft.smart_price && calculateDiscount() > 0 && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <p className="text-sm font-semibold text-emerald-700">
                      💰 {calculateDiscount()}% discount - Great deal!
                    </p>
                  </div>
                )}

                {is24HourBusiness && (
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <Checkbox
                      id="auto_expire_6h"
                      checked={draft.autoExpire6h}
                      onCheckedChange={(checked) => updateDraft('autoExpire6h', checked === true)}
                    />
                    <Label htmlFor="auto_expire_6h" className="text-xs cursor-pointer text-gray-700">
                      Auto-expire in 12 hours (24h business)
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Image Selection */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">
                    Product Image <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500 mt-1 mb-3">Choose an appetizing photo that represents your offer</p>
                  
                  {draft.image ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg">
                        <img
                          src={draft.image}
                          alt="Selected"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1 shadow-md">
                          <Check className="w-3 h-3" /> Selected
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
                        Change Image
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
                        <p className="font-semibold text-gray-700 group-hover:text-emerald-600">Click to Choose Image</p>
                        <p className="text-xs text-gray-500 mt-1">Select from our curated library</p>
                      </div>
                    </button>
                  )}
                  {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                </div>

                {/* Scheduling removed per updated requirements */}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-lg">✓</span> Review Your Offer
                  </h3>
                  
                  {/* Image Preview */}
                  {draft.image && (
                    <div className="mb-4 rounded-xl overflow-hidden">
                      <img src={draft.image} alt="Offer" className="w-full h-40 object-cover" />
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-emerald-100">
                      <span className="text-gray-600 font-medium">Title:</span>
                      <span className="text-gray-900 font-semibold text-right flex-1 ml-3">{draft.title}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Quantity:</span>
                      <span className="text-gray-900 font-semibold">{draft.quantity} items</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Original Price:</span>
                      <span className="text-gray-900 font-semibold">₾{draft.original_price}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Smart Price:</span>
                      <span className="text-emerald-600 font-bold">₾{draft.smart_price}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 font-medium">Discount:</span>
                      <span className="text-teal-600 font-bold">{calculateDiscount()}% OFF</span>
                    </div>
                  </div>

                  {/* Scheduling removed */}
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Click "Create Offer" to publish this offer to customers
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 sm:p-6" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))', backgroundColor: '#ffffff' }}>
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="rounded-xl border-gray-300 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              
              <Button
                type="button"
                onClick={currentStep === 4 ? handleSubmit : handleNext}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg hover:shadow-emerald-200 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : currentStep === 4 ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Offer
                  </>
                ) : (
                  <>
                    Next
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
