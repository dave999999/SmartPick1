import { useRef } from 'react';
import type { Offer } from '@/lib/types';
import { CategoryBarRedesigned } from './CategoryBarRedesigned';
import { RestaurantFoodSectionRedesigned } from './RestaurantFoodSectionRedesigned';

interface BottomSheetRedesignedProps {
  offers: Offer[];
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  onOfferClick: (offer: Offer) => void;
  sheetHeight: number;
  onHeightChange: (height: number) => void;
  userLocation?: [number, number] | null;
}

export function BottomSheetRedesigned({
  offers,
  selectedCategory,
  onCategorySelect,
  onOfferClick,
  sheetHeight,
  onHeightChange,
  userLocation,
}: BottomSheetRedesignedProps) {
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(sheetHeight);
  const isDragging = useRef(false);

  const snapToStage = (height: number) => {
    if (height < 38) return 20;
    if (height < 72) return 55;
    return 90;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = sheetHeight;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = dragStartY.current - currentY;
    const windowHeight = window.innerHeight;
    const deltaPercent = (deltaY / windowHeight) * 100;
    const newHeight = Math.max(20, Math.min(90, dragStartHeight.current + deltaPercent));
    onHeightChange(newHeight);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    const snappedHeight = snapToStage(sheetHeight);
    onHeightChange(snappedHeight);
  };

  const mapDimOpacity = sheetHeight > 40 ? Math.min((sheetHeight - 40) / 50, 0.6) : 0;

  return (
    <>
      {mapDimOpacity > 0 && (
        <div
          className="fixed inset-0 bg-black pointer-events-none z-10 transition-opacity duration-300"
          style={{ opacity: mapDimOpacity }}
        />
      )}

      <div 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] rounded-t-[24px] shadow-[0_-8px_32px_rgba(0,0,0,0.8)] overflow-hidden z-20 border-t border-white/10"
        style={{ 
          height: `${sheetHeight}%`,
          maxHeight: 'calc(100% - max(80px, env(safe-area-inset-top) + 80px))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          transition: isDragging.current ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div 
          className="flex justify-center items-center h-[42px] cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-16 h-1.5 bg-white/50 rounded-full shadow-lg hover:bg-white/70 transition-colors" />
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {sheetHeight <= 30 ? 'Explore' : 'All Offers'}
            </h2>
            <span className="text-sm text-gray-400">
              {offers.length} {offers.length === 1 ? 'offer' : 'offers'}
            </span>
          </div>
        </div>

        <CategoryBarRedesigned 
          selectedCategory={selectedCategory}
          onCategorySelect={onCategorySelect}
        />

        <div 
          className="h-[calc(100%-120px)] overflow-y-auto transition-opacity duration-300"
          style={{ opacity: sheetHeight > 40 ? 1 : 0.3 }}
        >
          <RestaurantFoodSectionRedesigned
            offers={offers}
            onOfferClick={onOfferClick}
            userLocation={userLocation}
          />
        </div>

        {sheetHeight <= 35 && (
          <div className="px-4 py-6 text-center">
            <p className="text-gray-400 text-sm">
              Swipe up to browse {offers.length} offers
            </p>
          </div>
        )}
      </div>
    </>
  );
}
