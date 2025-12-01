import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo, useAnimation, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { SheetHeight, ContentMode } from '@/types/discover';
import { Offer, User } from '@/lib/types';
import { EnrichedOffer } from '@/lib/offerFilters';
import { NewDiscoverModeContent } from './NewDiscoverModeContent';
import { PartnerModeContent } from './PartnerModeContent';

interface NewDiscoverSheetProps {
  isOpen: boolean;
  mode: ContentMode;
  height?: SheetHeight;
  partnerId?: string | null;
  user: User | null;
  offers: EnrichedOffer[];
  userLocation: [number, number] | null;
  onClose: () => void;
  onHeightChange?: (height: SheetHeight) => void;
  onModeChange?: (mode: ContentMode) => void;
  onOfferSelect: (offerId: string) => void;
  onMapSync?: (offerId: string, center: boolean) => void;
}

export const NewDiscoverSheet: React.FC<NewDiscoverSheetProps> = ({
  isOpen,
  mode = 'discover',
  partnerId = null,
  user,
  offers,
  userLocation,
  onClose,
  onHeightChange,
  onModeChange,
  onOfferSelect,
  onMapSync,
}) => {
  const [sheetHeight, setSheetHeight] = useState<SheetHeight>('collapsed');
  const [contentMode, setContentMode] = useState<ContentMode>(mode);
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(partnerId);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const HEIGHTS: Record<Exclude<SheetHeight, 'closed'>, string> = {
    collapsed: '15vh',
    mid: '50vh',
    full: '85vh',
  };

  const BACKDROP_OPACITY: Record<Exclude<SheetHeight, 'closed'>, number> = {
    collapsed: 0,
    mid: 0.1,
    full: 0.4,
  };

  useEffect(() => {
    if (mode !== contentMode) {
      setContentMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (partnerId !== currentPartnerId) {
      setCurrentPartnerId(partnerId);
      if (partnerId) {
        setContentMode('partner');
        setSheetHeight('mid');
      }
    }
  }, [partnerId]);

  useEffect(() => {
    if (isOpen && sheetHeight !== 'closed') {
      controls.start({
        height: HEIGHTS[sheetHeight],
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        },
      });
      onHeightChange?.(sheetHeight);
    }
  }, [sheetHeight, isOpen, controls, onHeightChange]);

  useEffect(() => {
    if (isOpen) {
      setSheetHeight('collapsed');
    }
  }, [isOpen]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;

    if (offset.y > 100 || velocity.y > 500) {
      if (sheetHeight === 'full') {
        setSheetHeight('mid');
      } else if (sheetHeight === 'mid') {
        setSheetHeight('collapsed');
      } else {
        onClose();
      }
    } else if (offset.y < -100 || velocity.y < -500) {
      if (sheetHeight === 'collapsed') {
        setSheetHeight('mid');
      } else if (sheetHeight === 'mid') {
        setSheetHeight('full');
      }
    }
  };

  const handleModeSwitch = (newMode: ContentMode) => {
    setContentMode(newMode);
    onModeChange?.(newMode);
    setSheetHeight('mid');
  };

  const handleBackToDiscover = () => {
    setCurrentPartnerId(null);
    handleModeSwitch('discover');
  };

  const handleCollapsedTap = () => {
    if (sheetHeight === 'collapsed') {
      setSheetHeight('mid');
    }
  };

  if (!isOpen) return null;

  const currentBackdropOpacity = sheetHeight !== 'closed' ? BACKDROP_OPACITY[sheetHeight] : 0;

  return (
    <>
      <AnimatePresence>
        {currentBackdropOpacity > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: currentBackdropOpacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSheetHeight('collapsed')}
            className="fixed inset-0 bg-black z-40"
            style={{ pointerEvents: currentBackdropOpacity > 0 ? 'auto' : 'none' }}
          />
        )}
      </AnimatePresence>

      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ height: HEIGHTS.collapsed }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh', touchAction: 'none' }}
      >
        <motion.div
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          animate={{
            scale: sheetHeight === 'collapsed' ? [1, 1.2, 1] : 1,
            opacity: sheetHeight === 'collapsed' ? [0.5, 1, 0.5] : 0.5,
          }}
          transition={{
            duration: 2,
            repeat: sheetHeight === 'collapsed' ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </motion.div>

        {sheetHeight === 'collapsed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 cursor-pointer"
            onClick={handleCollapsedTap}
          >
            {contentMode === 'discover' ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <span className="font-bold text-gray-900">Explore Offers</span>
                    <span className="text-sm text-gray-500 ml-2">({offers.length})</span>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <span className="font-bold text-gray-900">Partner Offers</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({offers.filter(o => o.partner_id === currentPartnerId).length})
                    </span>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            )}
          </motion.div>
        )}

        {sheetHeight !== 'collapsed' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {contentMode === 'partner' && (
                  <button
                    onClick={handleBackToDiscover}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <span className="text-gray-600 text-xl">←</span>
                  </button>
                )}
                <h2 className="text-lg font-bold text-gray-900">
                  {contentMode === 'discover' ? 'Discover' : 'Partner Offers'}
                </h2>
              </div>
              
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {contentMode === 'discover' ? (
                  <motion.div
                    key="discover"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    <NewDiscoverModeContent
                      offers={offers}
                      user={user}
                      userLocation={userLocation}
                      onOfferClick={(offer: EnrichedOffer, index: number) => onOfferSelect(offer.id)}
                      onMapHighlight={(offerId: string | null) => onMapSync?.(offerId || '', false)}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="partner"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    <PartnerModeContent
                      offers={offers.filter(o => o.partner_id === currentPartnerId)}
                      partnerId={currentPartnerId}
                      user={user}
                      userLocation={userLocation}
                      onOfferClick={(offer: Offer, index: number) => onOfferSelect(offer.id)}
                      onBackToDiscover={handleBackToDiscover}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
};
