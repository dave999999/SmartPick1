import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadPartnerImage, deletePartnerImage, getPartnerImages, setCoverImage } from '@/lib/api/media';
import { MAX_PARTNER_IMAGES, MAX_FILE_SIZE_MB } from '@/lib/constants';
import { usePartnerData } from '@/hooks/usePartnerData';
import { getCurrentUser } from '@/lib/api';

/**
 * GALLERY MODAL - OFFER IMAGE LIBRARY
 * 
 * PURPOSE:
 * Partners upload product photos here and select them when creating offers.
 * This is the centralized image library for all offer creation.
 * 
 * SECURITY:
 * - 2MB file size limit
 * - 15 images per partner maximum
 * - Magic number validation
 * - Rate limiting (10 uploads/hour)
 * - File type validation (JPEG, PNG, WebP only)
 * 
 * DESIGN:
 * - Glassmorphism with frosted blur (Apple-style)
 * - 1:1 image grid (square product photos)
 * - Real-time quota display
 * - Smooth animations
 * 
 * MODES:
 * - browse: Manage images (default)
 * - select: Choose image for new offer (called from CreateOfferWizard)
 */

interface GalleryModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  mode?: 'browse' | 'select'; // browse = manage, select = pick for offer
  onSelect?: (imageUrl: string) => void;
}

export function GalleryModal({ open, onClose, partnerId, mode = 'browse', onSelect }: GalleryModalProps) {
  const [images, setImages] = useState<string[]>([]);
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaMax, setQuotaMax] = useState(MAX_PARTNER_IMAGES);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get current user and partner data for cover image
  const [userId, setUserId] = useState<string | null>(null);
  const { partner } = usePartnerData(userId || '');
  
  useEffect(() => {
    getCurrentUser().then(({ user }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Load images when modal opens
  useEffect(() => {
    if (open && partnerId) {
      loadImages();
    }
  }, [open, partnerId]);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const { images: loadedImages, quota_used, quota_max } = await getPartnerImages(partnerId);
      setImages(loadedImages);
      setQuotaUsed(quota_used);
      setQuotaMax(quota_max);
    } catch (error) {
      console.error('Failed to load images:', error);
      toast.error('ვერ მოხერხდა სურათების ჩატვირთვა');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = () => {
    if (quotaUsed >= quotaMax) {
      toast.error(`მაქსიმუმ ${quotaMax} სურათი შეგიძლიათ ატვირთოთ`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check quota before uploading
    const availableSlots = quotaMax - quotaUsed;
    if (files.length > availableSlots) {
      toast.error(`თქვენ შეგიძლიათ ატვირთოთ მხოლოდ ${availableSlots} სურათი`);
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      // Check file size
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: მაქსიმალური ზომა ${MAX_FILE_SIZE_MB}MB`);
        failCount++;
        continue;
      }

      const result = await uploadPartnerImage(file, partnerId);
      
      if (result.success && result.url) {
        successCount++;
        setImages(prev => [result.url!, ...prev]);
        setQuotaUsed(prev => prev + 1);
      } else {
        failCount++;
        toast.error(result.error || `${file.name}: ატვირთვა ვერ მოხერხდა`);
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`✅ ${successCount} სურათი ატვირთულია`);
    }

    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (imageUrl: string) => {
    if (isDeleting) return;

    // Confirm deletion
    if (!confirm('დარწმუნებული ხართ რომ გსურთ სურათის წაშლა?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deletePartnerImage(imageUrl, partnerId);
      
      if (result.success) {
        setImages(prev => prev.filter(img => img !== imageUrl));
        setQuotaUsed(prev => Math.max(0, prev - 1));
        setSelectedImage(null);
        toast.success('სურათი წაშლილია');
      } else {
        toast.error(result.error || 'წაშლა ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('წაშლა ვერ მოხერხდა');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetCover = async (imageUrl: string) => {
    try {
      const result = await setCoverImage(partnerId, imageUrl);
      if (result.success) {
        toast.success('ფოტო დაყენებულია როგორც მთავარი');
        // Reload partner data to update cover
        await loadImages();
      } else {
        toast.error(result.error || 'დაყენება ვერ მოხერხდა');
      }
    } catch (error) {
      console.error('Set cover error:', error);
      toast.error('დაყენება ვერ მოხერხდა');
    }
  };

  const handleImageClick = (imageUrl: string) => {
    if (mode === 'select') {
      onSelect?.(imageUrl);
      onClose();
    } else {
      setSelectedImage(imageUrl);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center"
      >
        {/* MODAL CONTAINER */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-4xl sm:max-h-[85vh] bg-white/95 backdrop-blur-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl border border-white/20 overflow-hidden flex flex-col"
          style={{ height: 'calc(100vh - 60px)', maxHeight: '85vh' }}
        >
          {/* HEADER - Sticky */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 sm:px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">პროდუქტის ფოტოები</h2>
                <p className="text-sm text-gray-500 mt-0.5">შეთავაზებებისთვის</p>
                
                {/* Quota Display */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-semibold text-gray-700">
                      {quotaUsed} / {quotaMax}
                    </div>
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  
                  {/* Visual Progress Bar */}
                  <div className="flex-1 max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        quotaUsed >= quotaMax 
                          ? 'bg-red-500' 
                          : quotaUsed >= quotaMax * 0.8 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(quotaUsed / quotaMax) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUpload}
                  disabled={quotaUsed >= quotaMax || isUploading}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-all ${
                    quotaUsed >= quotaMax || isUploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-emerald-500/30'
                  }`}
                >
                  <Upload className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
                  {isUploading ? 'ტვირთვა...' : 'ატვირთვა'}
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Quota Warning */}
            {quotaUsed >= quotaMax && (
              <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-xs text-red-700">
                  თქვენ მიაღწიეთ მაქსიმალურ ლიმიტს. წაშალეთ ძველი სურათები ახლების ასატვირთად.
                </p>
              </div>
            )}
            
            {/* Info Banner */}
            {mode === 'select' && (
              <div className="mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  აირჩიეთ სურათი თქვენი შეთავაზებისთვის
                </p>
              </div>
            )}
          </div>

          {/* IMAGE GRID */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {isLoading ? (
              <LoadingState />
            ) : images.length === 0 ? (
              <EmptyState onUpload={handleUpload} quotaReached={quotaUsed >= quotaMax} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {images.map((imageUrl, index) => {
                  const cleanUrl = imageUrl.split('?')[0];
                  const isCover = partner?.cover_image_url === cleanUrl;
                  
                  return (
                    <ImageCard
                      key={imageUrl}
                      imageUrl={imageUrl}
                      index={index}
                      isCover={isCover}
                      onClick={() => handleImageClick(imageUrl)}
                      onSetCover={() => handleSetCover(imageUrl)}
                      mode={mode}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* IMAGE ZOOM MODAL */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedImage(null)}
                className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative max-w-4xl w-full"
                >
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full h-auto rounded-2xl shadow-2xl"
                  />
                  <button
                    onClick={() => handleDelete(selectedImage)}
                    disabled={isDeleting}
                    className={`absolute top-4 right-4 flex items-center gap-2 rounded-xl px-4 py-2 font-semibold shadow-lg transition-colors ${
                      isDeleting
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? 'იშლება...' : 'წაშლა'}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// IMAGE CARD COMPONENT
function ImageCard({
  imageUrl,
  index,
  isCover,
  onClick,
  onSetCover,
  mode,
}: {
  imageUrl: string;
  index: number;
  isCover: boolean;
  onClick: () => void;
  onSetCover: () => void;
  mode: 'browse' | 'select';
}) {
  const [imageError, setImageError] = useState(false);
  const [showSetCover, setShowSetCover] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onMouseEnter={() => setShowSetCover(true)}
      onMouseLeave={() => setShowSetCover(false)}
      className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer shadow-md hover:shadow-xl transition-shadow group"
    >
      {imageError ? (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-gray-400" />
        </div>
      ) : (
        <img 
          src={imageUrl} 
          alt="Product" 
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      )}
      
      {/* Cover Badge - Top Left */}
      {isCover && (
        <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 z-10">
          <Star className="w-3 h-3 fill-current" />
          <span>მთავარი</span>
        </div>
      )}
      
      {/* Set as Cover Button - Top Left (only in browse mode, always visible on mobile, hover on desktop) */}
      {mode === 'browse' && !isCover && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: showSetCover ? 1 : 0.95, x: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            onSetCover();
          }}
          className="absolute top-2 left-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-1.5 z-10 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Star className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">მთავარ ფოტოდ დაყენება</span>
          <span className="sm:hidden">მთავარი</span>
        </motion.button>
      )}
    </motion.div>
  );
}

// LOADING STATE
function LoadingState() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"
        />
      ))}
    </div>
  );
}

// EMPTY STATE
function EmptyState({ onUpload, quotaReached }: { onUpload: () => void; quotaReached: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
        <ImageIcon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">სურათები არ არის</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        {quotaReached 
          ? 'თქვენ მიაღწიეთ მაქსიმალურ ლიმიტს'
          : 'ატვირთეთ სურათები და გამოიყენეთ შეთავაზებების შექმნისას'
        }
      </p>
      {!quotaReached && (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-emerald-500/30 transition-shadow"
        >
          <Upload className="w-5 h-5" />
          სურათის ატვირთვა
        </button>
      )}
      
      {/* Security & Limits Info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl max-w-md">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">📋 ატვირთვის მოთხოვნები:</h4>
        <ul className="text-xs text-gray-600 space-y-1 text-left">
          <li>• მაქსიმუმ {MAX_PARTNER_IMAGES} სურათი</li>
          <li>• მაქსიმალური ზომა: {MAX_FILE_SIZE_MB}MB</li>
          <li>• ფორმატები: JPEG, PNG, WebP</li>
          <li>• რეკომენდებული: 1:1 თანაფარდობა</li>
        </ul>
      </div>
    </motion.div>
  );
}
