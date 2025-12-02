'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { EnrichedOffer } from '@/lib/offerFilters';

interface OfferCarouselModalProps {
  offers: EnrichedOffer[];
  initialIndex: number;
  onClose: () => void;
  onReserve: (offer: EnrichedOffer) => void;
}

// Custom hook for carousel logic
function useCarousel(totalSlides: number, initialIndex: number = 0) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  return { currentIndex, goToNext, goToPrev, goToIndex };
}

// Main Component
export function OfferCarouselModal({ offers, initialIndex, onClose, onReserve }: OfferCarouselModalProps) {
  const { currentIndex, goToNext, goToPrev, goToIndex } = useCarousel(offers.length, initialIndex);
  const [dragDirection, setDragDirection] = useState(0);
  const currentOffer = offers[currentIndex];

  // Calculate discount
  const discount = currentOffer?.original_price && currentOffer?.smart_price
    ? Math.round(((currentOffer.original_price - currentOffer.smart_price) / currentOffer.original_price) * 100)
    : 0;

  // Handle drag end for image
  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentIndex > 0) {
      setDragDirection(-1);
      goToPrev();
    } else if (info.offset.x < -threshold && currentIndex < offers.length - 1) {
      setDragDirection(1);
      goToNext();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setDragDirection(-1);
        goToPrev();
      }
      if (e.key === 'ArrowRight' && currentIndex < offers.length - 1) {
        setDragDirection(1);
        goToNext();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, offers.length]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl overflow-hidden"
        style={{ height: 'calc(50vh + 68px)', maxHeight: 'calc(50vh + 68px)', marginBottom: '68px' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all active:scale-95"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Content - Scrollable */}
        <div className="h-full overflow-y-auto px-4 pb-16">
          {/* Swipeable Image Only */}
          <div 
            className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 shadow-md mb-3"
            onDoubleClick={() => onReserve(currentOffer)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={currentIndex}
                src={currentOffer?.images?.[0] || '/placeholder.jpg'}
                alt={currentOffer?.title}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, x: dragDirection > 0 ? 300 : -300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dragDirection > 0 ? -300 : 300 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="w-full h-full object-cover cursor-grab active:cursor-grabbing select-none"
                draggable={false}
              />
            </AnimatePresence>

            {/* Discount Badge */}
            {discount > 0 && (
              <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md pointer-events-none">
                −{discount}%
              </div>
            )}

            {/* Stock Badge */}
            {currentOffer?.quantity_available <= 5 && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md pointer-events-none">
                Only {currentOffer.quantity_available} left!
              </div>
            )}

            {/* Overlay Info on Image - Bottom Section */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3 pt-8">
              {/* Title and Partner */}
              <h2 className="text-sm font-bold text-white leading-tight mb-1">
                {currentOffer?.title}
              </h2>
              
              <p className="text-[10px] text-white/80 mb-2">
                {currentOffer?.partner?.business_name || 'Partner'}
              </p>

              {/* Price Row */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl font-bold text-white">
                  {currentOffer?.smart_price?.toFixed(2)}<span className="text-sm">₾</span>
                </span>
                {currentOffer?.original_price && (
                  <span className="text-xs text-white/60 line-through">
                    {currentOffer.original_price.toFixed(2)}₾
                  </span>
                )}
              </div>

              {/* Pagination Dots */}
              <div className="flex justify-center items-center gap-1.5 mb-1">
                {offers.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setDragDirection(index > currentIndex ? 1 : -1);
                      goToIndex(index);
                    }}
                    className={`transition-all duration-300 rounded-full ${
                      index === currentIndex
                        ? 'w-6 h-1.5 bg-white shadow-md'
                        : 'w-1.5 h-1.5 bg-white/60 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action Bar - Above FloatingBottomNav */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 shadow-md">
          <button
            onClick={() => onReserve(currentOffer)}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base rounded-lg shadow-md transition-all active:scale-[0.98]"
          >
            Reserve Now
          </button>
        </div>
      </motion.div>
    </>
  );
}
