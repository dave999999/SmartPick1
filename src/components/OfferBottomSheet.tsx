/**
 * OfferBottomSheet - Premium Bottom Sheet Offer Viewer
 * 
 * Inspired by Airbnb, TooGoodToGo, Google Maps
 * Features:
 * - Collapsed (peek) state: 40-50% height
 * - Expanded state: 90-100% height
 * - Swipe left/right to navigate offers
 * - Smooth Framer Motion animations
 * - Light mode, premium UI
 */

import { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, PanInfo, useMotionValue } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { Offer, User } from '@/lib/types';
import { OfferHeader } from './bottomsheet/OfferHeader';
import { OfferImage } from './bottomsheet/OfferImage';
import { OfferContent } from './bottomsheet/OfferContent';
import { getAllCategories } from '@/lib/categories';

interface OfferBottomSheetProps {
  offers: Offer[];
  initialIndex: number;
  user: User | null;
  open: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
  onReserveSuccess?: () => void;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
}

type SheetState = 'collapsed' | 'expanded' | 'minimized';

export function OfferBottomSheet({
  offers,
  initialIndex,
  user,
  open,
  onClose,
  onIndexChange,
  onReserveSuccess,
  selectedCategory = '',
  onCategorySelect
}: OfferBottomSheetProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const controls = useAnimation();
  const y = useMotionValue(0);
  const x = useMotionValue(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastReportedIndex = useRef<number>(initialIndex);
  
  const currentOffer = offers[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < offers.length - 1;

  // Height states
  const COLLAPSED_HEIGHT = '45vh';
  const EXPANDED_HEIGHT = '80vh';

  // Reset index when initialIndex changes from parent (external update)
  useEffect(() => {
    if (initialIndex !== currentIndex && initialIndex !== lastReportedIndex.current) {
      setCurrentIndex(initialIndex);
      lastReportedIndex.current = initialIndex;
    }
  }, [initialIndex, currentIndex]);

  // Notify parent of index changes (only when index actually changes internally)
  useEffect(() => {
    if (onIndexChange && currentIndex !== lastReportedIndex.current) {
      lastReportedIndex.current = currentIndex;
      onIndexChange(currentIndex);
    }
  }, [currentIndex, onIndexChange]);

  // Animate in when opened
  useEffect(() => {
    if (open) {
      controls.start({
        y: 0,
        opacity: 1,
        transition: { type: 'spring', damping: 30, stiffness: 300 }
      });
      setSheetState('collapsed'); // Start in collapsed state
    }
  }, [open, controls]);

  // Toggle expand/collapse
  const toggleExpand = () => {
    setSheetState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed');
  };

  // Navigate to previous offer
  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Navigate to next offer
  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(prev => prev + 1);
    }
  };



  // Handle vertical drag
  const handleVerticalDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (offset.y > 150 || velocity.y > 600) {
      // Drag down
      if (sheetState === 'expanded') {
        setSheetState('collapsed');
      } else {
        onClose();
      }
    } else if (offset.y < -100 || velocity.y < -600) {
      // Drag up - expand
      if (sheetState === 'collapsed') {
        setSheetState('expanded');
      }
    } else {
      // Snap back
      controls.start({
        y: 0,
        transition: { type: 'spring', damping: 30, stiffness: 300 }
      });
    }
  };

  // Handle horizontal swipe for navigation
  const handleHorizontalDragStart = () => {
    setIsDraggingImage(true);
  };

  const handleHorizontalDragEnd = async (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (offset.x < -80 || velocity.x < -500) {
      // Swipe left - next offer
      if (hasNext) {
        handleNext();
      }
    } else if (offset.x > 80 || velocity.x > 500) {
      // Swipe right - previous offer
      if (hasPrevious) {
        handlePrevious();
      }
    }
    
    // Always animate back to center
    await controls.start({
      x: 0,
      transition: { type: 'spring', damping: 25, stiffness: 300 }
    });
    
    setIsDraggingImage(false);
  };

  if (!open || !currentOffer) return null;

  return (
    <>
      {/* Background Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: sheetState === 'expanded' ? 0.6 : 0.3 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black z-40"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <motion.div
        ref={contentRef}
        drag={isDraggingImage ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleVerticalDragEnd}
        animate={{
          height: sheetState === 'collapsed' ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT,
          ...controls
        }}
        initial={{ y: '100%', opacity: 0 }}
        style={{ y }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 300,
          mass: 0.8
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[20px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-1.5 pb-0.5">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Category Bar - Sticky at top */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-2 shadow-sm">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {getAllCategories().slice(0, 7).map((category) => {
              const isActive = selectedCategory === category.value;
              return (
                <button
                  key={category.value}
                  onClick={() => onCategorySelect?.(isActive ? '' : category.value)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0 transition-all duration-200"
                  style={{
                    background: isActive ? '#FFE8E0' : '#F5F5F5',
                    border: 'none',
                  }}
                >
                  <span className="text-base">{category.emoji}</span>
                  <span 
                    className="text-xs font-medium whitespace-nowrap"
                    style={{
                      color: isActive ? '#FF5722' : '#666666'
                    }}
                  >
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Header - Sticky Navigation */}
        <OfferHeader
          title={currentOffer.title}
          onPrevious={hasPrevious ? handlePrevious : undefined}
          onNext={hasNext ? handleNext : undefined}
          onClose={onClose}
          isExpanded={sheetState === 'expanded'}
        />

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Swipeable Image Section - Horizontal Navigation */}
          <div className="relative overflow-hidden bg-gray-100 touch-pan-x">
            <motion.div
              drag="x"
              dragConstraints={{ left: -100, right: 100 }}
              dragElastic={0.1}
              dragMomentum={false}
              onDragStart={handleHorizontalDragStart}
              onDragEnd={handleHorizontalDragEnd}
              animate={controls}
              style={{ x }}
              className="will-change-transform flex items-center justify-center gap-4 px-[10%]"
            >
              {/* Previous image (10% visible on left) */}
              <div 
                className="flex-shrink-0 opacity-50 w-full" 
                style={{ 
                  visibility: hasPrevious ? 'visible' : 'hidden'
                }}
              >
                {hasPrevious && (
                  <OfferImage
                    imageUrl={offers[currentIndex - 1]?.images?.[0]}
                    title={offers[currentIndex - 1]?.title}
                    category={offers[currentIndex - 1]?.category}
                    isExpanded={sheetState === 'expanded'}
                  />
                )}
              </div>
              
              {/* Current image (center, 80% width) */}
              <div className="flex-shrink-0 w-full">
                <OfferImage
                  imageUrl={currentOffer.images?.[0]}
                  title={currentOffer.title}
                  category={currentOffer.category}
                  isExpanded={sheetState === 'expanded'}
                />
              </div>
              
              {/* Next image (10% visible on right) */}
              <div 
                className="flex-shrink-0 opacity-50 w-full" 
                style={{ 
                  visibility: hasNext ? 'visible' : 'hidden'
                }}
              >
                {hasNext && (
                  <OfferImage
                    imageUrl={offers[currentIndex + 1]?.images?.[0]}
                    title={offers[currentIndex + 1]?.title}
                    category={offers[currentIndex + 1]?.category}
                    isExpanded={sheetState === 'expanded'}
                  />
                )}
              </div>
            </motion.div>
            
            {/* Modern Pagination Dots - Only show if multiple offers */}
            {offers.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
                {offers.map((_, index) => (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{
                      width: index === currentIndex ? 20 : 6,
                      opacity: index === currentIndex ? 1 : 0.5
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="h-1.5 rounded-full bg-white shadow-md"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Main Content */}
          <OfferContent
            offer={currentOffer}
            user={user}
            isExpanded={sheetState === 'expanded'}
            onReserveSuccess={onReserveSuccess}
          />

          {/* Expand Hint - Only show when collapsed */}
          {sheetState === 'collapsed' && (
            <div className="flex justify-center py-1.5 text-gray-400">
              <button
                onClick={toggleExpand}
                className="flex items-center gap-0.5 text-[10px] font-medium hover:text-gray-600 transition-colors"
              >
                <ChevronUp className="w-3 h-3" />
                Swipe up for details
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Scrollbar Hide Style */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
