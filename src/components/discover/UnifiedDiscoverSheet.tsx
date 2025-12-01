/**
 * UnifiedDiscoverSheet - One Sheet to Rule Them All
 * 
 * A premium, unified bottom sheet that handles:
 * - DISCOVER MODE: Browse all offers, search, filter, sort
 * - PARTNER MODE: View specific partner offers in carousel
 * 
 * Features:
 * - 3 height states: collapsed (peek), mid (50%), full (85%)
 * - Smooth drag interactions with spring physics
 * - Mode switching (discover ↔ partner)
 * - Map synchronization (highlight pins on scroll)
 * - Premium animations (Framer Motion)
 * - Cosmic orange theme
 * 
 * Inspired by: Uber Eats, Google Maps, Too Good To Go, Airbnb
 */

import { useState, useEffect, useRef } from 'react';
import { motion, PanInfo, useAnimation, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { SheetHeight, ContentMode, UnifiedDiscoverSheetProps } from './types';
import { DiscoverModeContent } from './DiscoverModeContent';
import { PartnerModeContent } from './PartnerModeContent';

export function UnifiedDiscoverSheet({
  offers,
  user,
  userLocation,
  open,
  onClose,
  mode = 'discover',
  partnerId = null,
  onOfferClick,
  onModeChange,
  onHeightChange,
  onCategorySelect,
  selectedCategory = '',
  onSortChange,
  selectedSort = 'recommended',
  onMapHighlight,
  onMapCenter,
}: UnifiedDiscoverSheetProps) {
  const [sheetHeight, setSheetHeight] = useState<SheetHeight>('collapsed');
  const [contentMode, setContentMode] = useState<ContentMode>(mode);
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(partnerId);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Height values (viewport height)
  const HEIGHTS = {
    collapsed: '15vh',
    mid: '50vh',
    full: '85vh',
  };

  // Backdrop opacity based on height
  const BACKDROP_OPACITY = {
    collapsed: 0,
    mid: 0.2,
    full: 0.4,
  };

  // Update mode when prop changes (parent control)
  useEffect(() => {
    if (mode !== contentMode) {
      setContentMode(mode);
    }
  }, [mode]);

  // Update partner ID when prop changes
  useEffect(() => {
    if (partnerId !== currentPartnerId) {
      setCurrentPartnerId(partnerId);
      // Switch to partner mode when partner is selected
      if (partnerId) {
        setContentMode('partner');
        setSheetHeight('mid'); // Start at mid-height
      }
    }
  }, [partnerId]);

  // Animate height changes
  useEffect(() => {
    if (open) {
      controls.start({
        height: HEIGHTS[sheetHeight],
        transition: {
          type: 'spring',
          damping: 30,
          stiffness: 300,
          mass: 0.8,
        },
      });
      
      // Notify parent of height change
      onHeightChange?.(sheetHeight);
    }
  }, [sheetHeight, open, controls, onHeightChange]);

  // Reset to collapsed when opening
  useEffect(() => {
    if (open) {
      setSheetHeight('collapsed');
    }
  }, [open]);

  // Handle drag end
  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;

    // Drag down (close or shrink)
    if (offset.y > 100 || velocity.y > 500) {
      if (sheetHeight === 'full') {
        setSheetHeight('mid');
      } else if (sheetHeight === 'mid') {
        setSheetHeight('collapsed');
      } else {
        // Close sheet
        onClose();
      }
    }
    
    // Drag up (expand)
    else if (offset.y < -100 || velocity.y < -500) {
      if (sheetHeight === 'collapsed') {
        setSheetHeight('mid');
      } else if (sheetHeight === 'mid') {
        setSheetHeight('full');
      }
    }
  };

  // Handle mode switching
  const handleModeSwitch = (newMode: ContentMode) => {
    setContentMode(newMode);
    onModeChange?.(newMode);
    
    // Reset height to mid when switching modes
    setSheetHeight('mid');
  };

  // Handle back from partner mode
  const handleBackToDiscover = () => {
    setCurrentPartnerId(null);
    handleModeSwitch('discover');
  };

  // Expand to mid height when collapsed is tapped
  const handleCollapsedTap = () => {
    if (sheetHeight === 'collapsed') {
      setSheetHeight('mid');
    }
  };

  if (!open) return null;

  const currentBackdropOpacity = BACKDROP_OPACITY[sheetHeight];

  return (
    <>
      {/* Backdrop Overlay */}
      <AnimatePresence>
        {currentBackdropOpacity > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: currentBackdropOpacity }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={() => setSheetHeight('collapsed')}
            className="fixed inset-0 bg-black z-40"
            style={{ pointerEvents: currentBackdropOpacity > 0 ? 'auto' : 'none' }}
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet */}
      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ height: HEIGHTS.collapsed }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
        style={{
          maxHeight: '90vh',
          touchAction: 'none',
        }}
      >
        {/* Drag Handle */}
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

        {/* Collapsed State Preview */}
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

        {/* Main Content (Mid & Full Heights) */}
        {sheetHeight !== 'collapsed' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {contentMode === 'partner' && (
                  <button
                    onClick={handleBackToDiscover}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <span className="text-gray-600">←</span>
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

            {/* Mode-Specific Content */}
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
                    <DiscoverModeContent
                      offers={offers}
                      user={user}
                      userLocation={userLocation}
                      selectedCategory={selectedCategory}
                      selectedSort={selectedSort}
                      onCategorySelect={onCategorySelect}
                      onSortChange={onSortChange}
                      onOfferClick={onOfferClick}
                      onMapHighlight={onMapHighlight}
                      onMapCenter={onMapCenter}
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
                      onOfferClick={onOfferClick}
                      onMapCenter={onMapCenter}
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
}
