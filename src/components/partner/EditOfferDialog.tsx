/**
 * Edit Offer Dialog Component
 * Extracted from PartnerDashboard - handles offer editing
 */

import { useState } from 'react';
import { Offer, Partner } from '@/lib/types';
import { offerDataSchema, validateData, getValidationErrorMessage } from '@/lib/schemas';
import { updateOffer, resolveOfferImageUrl } from '@/lib/api';
import { calculatePickupEndTime } from '@/lib/utils/businessHours';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/i18n';
import ImageLibraryModal from '@/components/ImageLibraryModal';
import { logger } from '@/lib/logger';

interface EditOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: Offer | null;
  partner: Partner | null;
  autoExpire6h: boolean;
  onSuccess: () => void;
}

export function EditOfferDialog({
  open,
  onOpenChange,
  offer,
  partner,
  autoExpire6h,
  onSuccess,
}: EditOfferDialogProps) {
  const { t } = useI18n();
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedLibraryImage, setSelectedLibraryImage] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<(string | File)[]>([]);

  const handleClose = () => {
    onOpenChange(false);
    setSelectedLibraryImage(null);
    setImageFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!offer) return;

    const formData = new FormData(e.currentTarget);

    try {
      // Validate form data with Zod schema for security
      const rawData = {
        title: (formData.get('title') as string)?.trim(),
        description: (formData.get('description') as string)?.trim(),
        original_price: parseFloat(formData.get('original_price') as string),
        smart_price: parseFloat(formData.get('smart_price') as string),
        quantity: parseInt(formData.get('quantity') as string),
        auto_expire_6h: autoExpire6h,
      };

      const validationResult = validateData(offerDataSchema, rawData);
      
      if (!validationResult.success) {
        const errorMsg = getValidationErrorMessage(validationResult.errors);
        toast.error(errorMsg);
        return;
      }

      const { title, description, original_price: originalPrice, smart_price: smartPrice, quantity } = validationResult.data;

      // Images are library URLs only (custom uploads removed)
      let processedImages = imageFiles.filter((img): img is string => typeof img === 'string');
      if (processedImages.length === 0 && selectedLibraryImage) {
        processedImages = [selectedLibraryImage];
      }

      // Use processed images if new ones were selected, otherwise keep existing
      const imageUrls = (processedImages.length > 0)
        ? processedImages
        : (offer.images || []);

      // Compute pickup times automatically based on business hours
      const now = new Date();
      const pickupStart: Date = now;
      const pickupEnd: Date = calculatePickupEndTime(partner, autoExpire6h);

      const updates = {
        title,
        description,
        category: partner?.business_type || offer.category,
        images: imageUrls,
        original_price: originalPrice,
        smart_price: smartPrice,
        quantity_total: quantity,
        quantity_available: quantity,
        pickup_start: pickupStart.toISOString(),
        pickup_end: pickupEnd.toISOString(),
        expires_at: pickupEnd.toISOString(),
      };

      await updateOffer(offer.id, updates);
      toast.success(t('partner.dashboard.toast.offerUpdated'));
      handleClose();
      onSuccess();
    } catch (error) {
      logger.error('Error updating offer:', error);
      toast.error(t('partner.dashboard.toast.offerUpdateFailed'));
    }
  };

  if (!offer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-3xl">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Edit className="w-5 h-5 text-teal-600" />
              Edit Offer
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">Update your offer details</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="text-base">📝</span>
                <span>Basic Details</span>
              </div>

              <div>
                <Label htmlFor="edit_title" className="text-sm text-gray-600">
                  Title / დასახელება
                </Label>
                <Input
                  id="edit_title"
                  name="title"
                  required
                  defaultValue={offer.title}
                  className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>

              <div>
                <Label htmlFor="edit_description" className="text-sm text-gray-600">
                  Description / აღწერა
                </Label>
                <Textarea
                  id="edit_description"
                  name="description"
                  required
                  defaultValue={offer.description}
                  className="mt-1.5 min-h-[80px] rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Pricing & Quantity */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <span className="text-base">💰</span>
                <span>Pricing & Quantity</span>
              </div>

              {/* Quantity */}
              <div>
                <Label htmlFor="edit_quantity" className="text-sm text-gray-600">Quantity *</Label>
                <Input
                  id="edit_quantity"
                  name="quantity"
                  type="number"
                  required
                  min="1"
                  defaultValue={offer.quantity_total}
                  className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                />
              </div>

              {/* Prices - Side by Side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit_original_price" className="text-sm text-gray-600">Original Price (₾)</Label>
                  <Input
                    id="edit_original_price"
                    name="original_price"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={offer.original_price}
                    className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_smart_price" className="text-sm text-gray-600">Smart Price (₾)</Label>
                  <Input
                    id="edit_smart_price"
                    name="smart_price"
                    type="number"
                    step="0.01"
                    required
                    defaultValue={offer.smart_price}
                    className="mt-1.5 rounded-xl border-gray-200 focus:border-teal-500 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Current Image Preview - Compact */}
            {offer.images && offer.images.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Current Image</Label>
                <div className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-gray-200">
                  <img
                    src={resolveOfferImageUrl(offer.images[0], offer.category, { width: 400, quality: 80 })}
                    alt="Current offer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Choose Image Button */}
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-medium text-sm transition-all duration-300 hover:shadow-lg"
            >
              📷 Choose New Image
            </button>

            {selectedLibraryImage && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-teal-500">
                <img
                  src={selectedLibraryImage}
                  alt="Selected"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-teal-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  ✓ New image
                </div>
              </div>
            )}

            {/* Action Buttons - Sticky Footer */}
            <div className="sticky bottom-0 bg-white pt-4 pb-2 -mx-6 px-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="rounded-xl border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  Update Offer
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Library Modal */}
      <ImageLibraryModal
        open={showImageModal}
        category={partner?.business_type || 'RESTAURANT'}
        partnerId={partner?.id}
        onSelect={(url) => {
          setSelectedLibraryImage(url);
          setImageFiles([url]);
        }}
        onClose={() => setShowImageModal(false)}
      />
    </>
  );
}
