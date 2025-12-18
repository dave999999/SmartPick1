import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Star,
  MoreVertical,
  Search,
  Filter,
  Image as ImageIcon,
  Tag as TagIcon,
  Trash2,
  Edit3,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * GALLERY MODAL - APPLE-STYLE IMAGE MANAGEMENT
 * 
 * DESIGN PRINCIPLES:
 * - Glassmorphism with frosted blur
 * - Spring animations (Apple-like easing)
 * - 1:1 image grid (Instagram-style)
 * - Tag-based organization (no folders)
 * - Lightweight, premium feel
 * 
 * VISUAL HIERARCHY:
 * 1. Header: Title + Upload CTA (sticky)
 * 2. Filters: Glass chips (All, Favorites, Tags)
 * 3. Grid: 2 col mobile / 4-5 col desktop
 * 4. Image Cards: Frosted tiles with status
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

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'used' | 'unused'>('newest');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter images
  const filteredImages = images.filter((img) => {
    if (selectedFilter === 'favorites' && !img.favorite) return false;
    if (selectedFilter !== 'all' && selectedFilter !== 'favorites' && !img.tags.includes(selectedFilter)) return false;
    if (searchQuery && !img.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sort images
  const sortedImages = [...filteredImages].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    if (sortBy === 'used') return b.usedCount - a.usedCount;
    if (sortBy === 'unused') return a.usedCount - b.usedCount;
    return 0;
  });

  // All unique tags
  const allTags = Array.from(new Set(images.flatMap((img) => img.tags)));

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Here you would upload to Supabase storage
    toast.success(`${files.length} სურათი აიტვირთა`);
  };

  const toggleFavorite = (id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, favorite: !img.favorite } : img))
    );
  };

  const handleDelete = (id: string) => {
    const image = images.find((img) => img.id === id);
    if (!image) return;
    
    if (image.usedCount > 0) {
      toast.error(`ეს სურათი გამოიყენება ${image.usedCount} შეთავაზებაში`);
      return;
    }
    setImages((prev) => prev.filter((img) => img.id !== id));
    toast.success('სურათი წაიშალა');
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
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gallery</h2>
                <p className="text-sm text-gray-500 mt-0.5">თქვენი პროდუქტების სურათები</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* ACTIONS ROW */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpload}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold shadow-lg hover:shadow-emerald-500/30 transition-shadow"
              >
                <Upload className="w-4 h-4" />
                ატვირთვა
              </button>

              {/* Sort Dropdown */}
              <div className="relative ml-auto">
                <button className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white/80 transition-colors">
                  დალაგება
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* FILTERS - Glass Chips */}
          <div className="px-4 sm:px-6 py-3 border-b border-gray-200/50 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <FilterChip
                label="ყველა"
                active={selectedFilter === 'all'}
                onClick={() => setSelectedFilter('all')}
                count={images.length}
              />
              <FilterChip
                label="რჩეული"
                icon={<Star className="w-3.5 h-3.5" />}
                active={selectedFilter === 'favorites'}
                onClick={() => setSelectedFilter('favorites')}
                count={images.filter((img) => img.favorite).length}
              />
              {allTags.map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  active={selectedFilter === tag}
                  onClick={() => setSelectedFilter(tag)}
                  count={images.filter((img) => img.tags.includes(tag)).length}
                />
              ))}
            </div>
          </div>

          {/* IMAGE GRID */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {sortedImages.length === 0 ? (
              <EmptyState onUpload={handleUpload} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {sortedImages.map((image, index) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    index={index}
                    onToggleFavorite={toggleFavorite}
                    onDelete={handleDelete}
                    onSelect={mode === 'select' ? () => onSelect?.(image.url) : undefined}
                    activeMenu={activeMenu}
                    setActiveMenu={setActiveMenu}
                  />
                ))}
              </div>
            )}
          </div>

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

// FILTER CHIP COMPONENT
function FilterChip({
  label,
  icon,
  active,
  onClick,
  count,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all
        ${
          active
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-white/60 backdrop-blur-sm border border-gray-200/60 text-gray-700 hover:bg-white/80'
        }
      `}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          className={`text-xs ${
            active ? 'opacity-90' : 'text-gray-500'
          }`}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}

// IMAGE CARD COMPONENT
function ImageCard({
  image,
  index,
  onToggleFavorite,
  onDelete,
  onSelect,
  activeMenu,
  setActiveMenu,
}: {
  image: GalleryImage;
  index: number;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect?: () => void;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
      onClick={onSelect}
      className="group relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer"
    >
      {/* Image */}
      <img src={image.url} alt={image.title} className="w-full h-full object-cover" />

      {/* Glass Overlay on Hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

      {/* Top Controls */}
      <div className="absolute top-2 left-2 right-2 flex items-start justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Favorite Star */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(image.id);
          }}
          className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg"
        >
          <Star
            className={`w-4 h-4 ${
              image.favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'
            }`}
          />
        </motion.button>

        {/* Menu */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenu(activeMenu === image.id ? null : image.id);
            }}
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-lg"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {activeMenu === image.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute right-0 top-10 w-40 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 overflow-hidden z-10"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.success('სახელი შეიცვალა');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50"
                >
                  <Edit3 className="w-4 h-4" />
                  სახელის შეცვლა
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(image.url);
                    toast.success('ლინკი დაკოპირდა');
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100/50"
                >
                  <Copy className="w-4 h-4" />
                  ლინკის კოპირება
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(image.id);
                    setActiveMenu(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50/50"
                >
                  <Trash2 className="w-4 h-4" />
                  წაშლა
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-white text-sm font-medium truncate">{image.title}</p>
        <div className="flex items-center gap-1 mt-1">
          {image.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs text-white/80 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
        {image.usedCount > 0 && (
          <p className="text-xs text-white/70 mt-1">გამოყენებულია {image.usedCount}-ჯერ</p>
        )}
      </div>
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
      <h3 className="text-lg font-bold text-gray-900 mb-1">Gallery ცარიელია</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        ატვირთეთ პროდუქტების სურათები და გამოიყენეთ შეთავაზებებში
      </p>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl px-6 py-3 font-semibold shadow-lg hover:shadow-emerald-500/30 transition-shadow"
      >
        <Upload className="w-5 h-5" />
        პირველი სურათის ატვირთვა
      </button>
    </motion.div>
  );
}
