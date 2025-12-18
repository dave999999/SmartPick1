import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * GALLERY MODAL - OFFER IMAGE LIBRARY
 * 
 * PURPOSE:
 * Partners upload product photos here and select them when creating offers.
 * This is the centralized image library for all offer creation.
 * 
 * DESIGN:
 * - Glassmorphism with frosted blur (Apple-style)
 * - 1:1 image grid (square product photos)
 * - Tag-based organization (pizza, bakery, drinks, etc.)
 * - Favorites system for quick access
 * 
 * MODES:
 * - browse: Manage images (default)
 * - select: Choose image for new offer (called from CreateOfferWizard)
 */

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  tags: string[];
  favorite: boolean;
  usedCount: number;
  uploadedAt: string;
}

interface GalleryModalProps {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  mode?: 'browse' | 'select'; // browse = manage, select = pick for offer
  onSelect?: (imageUrl: string) => void;
}

export function GalleryModal({ open, onClose, partnerId, mode = 'browse', onSelect }: GalleryModalProps) {
  const [images, setImages] = useState<GalleryImage[]>([
    // Mock data for demonstration
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop',
      title: 'Margherita Pizza',
      tags: ['pizza', 'italian'],
      favorite: true,
      usedCount: 3,
      uploadedAt: '2025-01-15',
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=400&fit=crop',
      title: 'Burger Special',
      tags: ['burger', 'american'],
      favorite: false,
      usedCount: 1,
      uploadedAt: '2025-01-14',
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=400&fit=crop',
      title: 'Pancakes',
      tags: ['breakfast', 'sweet'],
      favorite: true,
      usedCount: 0,
      uploadedAt: '2025-01-13',
    },
  ]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Here you would upload to Supabase storage
    toast.success(`${files.length} სურათი აიტვირთა`);
  };

  const handleDelete = (id: string) => {
    const image = images.find((img) => img.id === id);
    if (!image) return;
    
    if (image.usedCount > 0) {
      toast.error(`ეს სურათი გამოიყენება ${image.usedCount} შეთავაზებაში`);
      return;
    }
    setImages((prev) => prev.filter((img) => img.id !== id));
    setSelectedImage(null);
    toast.success('სურათი წაიშალა');
  };

  const handleImageClick = (imageId: string) => {
    if (mode === 'select') {
      const image = images.find((img) => img.id === imageId);
      if (image) {
        onSelect?.(image.url);
        onClose();
      }
    } else {
      setSelectedImage(imageId);
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
                <h2 className="text-2xl font-bold text-gray-900">სურათები</h2>
                <p className="text-sm text-gray-500 mt-0.5">შეთავაზებებისთვის</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUpload}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-emerald-500/30 transition-shadow"
                >
                  <Upload className="w-4 h-4" />
                  ატვირთვა
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* IMAGE GRID */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {images.length === 0 ? (
              <EmptyState onUpload={handleUpload} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {images.map((image, index) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    index={index}
                    onClick={() => handleImageClick(image.id)}
                  />
                ))}
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
                    src={images.find((img) => img.id === selectedImage)?.url}
                    alt="Preview"
                    className="w-full h-auto rounded-2xl shadow-2xl"
                  />
                  <button
                    onClick={() => handleDelete(selectedImage)}
                    className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl px-4 py-2 font-semibold shadow-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    წაშლა
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
  image,
  index,
  onClick,
}: {
  image: GalleryImage;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer shadow-md hover:shadow-xl transition-shadow"
    >
      <img src={image.url} alt={image.title} className="w-full h-full object-cover" />
    </motion.div>
  );
}

// EMPTY STATE
function EmptyState({ onUpload }: { onUpload: () => void }) {
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
        ატვირთეთ სურათები და გამოიყენეთ შეთავაზებების შექმნისას
      </p>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-emerald-500/30 transition-shadow"
      >
        <Upload className="w-5 h-5" />
        სურათის ატვირთვა
      </button>
    </motion.div>
  );
}
