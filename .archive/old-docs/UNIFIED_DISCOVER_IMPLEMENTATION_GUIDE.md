# UNIFIED DISCOVER SYSTEM - IMPLEMENTATION GUIDE

## Phase 10: Production-Ready Code Examples

This document contains all the high-quality, production-ready React/TypeScript code snippets to implement the unified Discover & Offers bottom sheet system for SmartPick.

---

## 1. TYPE DEFINITIONS

```typescript
// types/discover.ts

export type SheetHeight = 'closed' | 'collapsed' | 'mid' | 'full';
export type ContentMode = 'discover' | 'partner';
export type SortOption = 'recommended' | 'nearest' | 'cheapest' | 'expiring' | 'newest';

export interface DiscoverSheetProps {
  isOpen: boolean;
  mode: ContentMode;
  height: SheetHeight;
  partnerId?: string | null;
  offers: Offer[];
  userLocation: [number, number] | null;
  onClose: () => void;
  onHeightChange?: (height: SheetHeight) => void;
  onModeChange?: (mode: ContentMode) => void;
  onOfferSelect: (offerId: string) => void;
  onMapSync?: (offerId: string, center: boolean) => void;
}

export interface FilterState {
  searchQuery: string;
  selectedSort: SortOption;
  selectedCategory: string | null;
  priceRange: [number, number] | null;
  distanceLimit: number | null;
  availableOnly: boolean;
}

export interface OfferSection {
  id: string;
  title: string;
  emoji: string;
  offers: Offer[];
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  points: number;
  partnerId: string;
  partnerName: string;
  category: string;
  distance?: number;
  eta?: number;
  expiresAt: string;
  pickupWindow: { start: string; end: string };
  quantity: number;
  partnerLocation?: { lat: number; lng: number };
  trendingScore?: number;
  reservationCount?: number;
  createdAt: string;
}

export interface Partner {
  id: string;
  name: string;
  category: string;
  rating: number;
  activeOffersCount: number;
  closingTime: string;
  location: { lat: number; lng: number };
  imageUrl?: string;
  emoji: string;
}
```

---

## 2. MAIN DISCOVER SHEET COMPONENT

```typescript
// components/discover/DiscoverSheet.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo, useAnimation, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { SheetHeight, ContentMode, DiscoverSheetProps } from '@/types/discover';
import { DiscoverModeContent } from './DiscoverModeContent';
import { PartnerModeContent } from './PartnerModeContent';

export const DiscoverSheet: React.FC<DiscoverSheetProps> = ({
  isOpen,
  mode = 'discover',
  partnerId = null,
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

  // Height values
  const HEIGHTS = {
    collapsed: '15vh',
    mid: '50vh',
    full: '85vh',
  };

  const BACKDROP_OPACITY = {
    collapsed: 0,
    mid: 0.1,
    full: 0.4,
  };

  // Update mode when prop changes
  useEffect(() => {
    if (mode !== contentMode) {
      setContentMode(mode);
    }
  }, [mode]);

  // Update partner when prop changes
  useEffect(() => {
    if (partnerId !== currentPartnerId) {
      setCurrentPartnerId(partnerId);
      if (partnerId) {
        setContentMode('partner');
        setSheetHeight('mid');
      }
    }
  }, [partnerId]);

  // Animate height changes
  useEffect(() => {
    if (isOpen) {
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

  // Reset to collapsed when opening
  useEffect(() => {
    if (isOpen) {
      setSheetHeight('collapsed');
    }
  }, [isOpen]);

  // Handle drag end
  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;

    // Drag down
    if (offset.y > 100 || velocity.y > 500) {
      if (sheetHeight === 'full') {
        setSheetHeight('mid');
      } else if (sheetHeight === 'mid') {
        setSheetHeight('collapsed');
      } else {
        onClose();
      }
    }
    // Drag up
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

  const currentBackdropOpacity = BACKDROP_OPACITY[sheetHeight];

  return (
    <>
      {/* Backdrop */}
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

      {/* Sheet Container */}
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

        {/* Collapsed Preview */}
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
                      ({offers.filter(o => o.partnerId === currentPartnerId).length})
                    </span>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Main Content */}
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

            {/* Content */}
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
                      userLocation={userLocation}
                      onOfferClick={onOfferSelect}
                      onOfferInView={(offerId) => onMapSync?.(offerId, false)}
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
                      offers={offers.filter(o => o.partnerId === currentPartnerId)}
                      partnerId={currentPartnerId}
                      userLocation={userLocation}
                      onOfferClick={onOfferSelect}
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
```

---

## 3. DISCOVER MODE CONTENT

```typescript
// components/discover/DiscoverModeContent.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Offer } from '@/types/discover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OfferCard } from './OfferCard';
import { computeVisibleOffers } from '@/lib/offerFilters';

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended', emoji: '⭐' },
  { id: 'nearest', label: 'Nearest', emoji: '📍' },
  { id: 'cheapest', label: 'Cheapest', emoji: '💸' },
  { id: 'expiring', label: 'Expiring Soon', emoji: '⏳' },
  { id: 'newest', label: 'New', emoji: '🆕' },
];

const CATEGORIES = [
  { id: '', label: 'All', emoji: '⭐' },
  { id: 'bakery', label: 'Bakery', emoji: '🍞' },
  { id: 'restaurant', label: 'Restaurant', emoji: '🍕' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'fresh', label: 'Fresh', emoji: '🥗' },
  { id: 'pastry', label: 'Pastry', emoji: '🥐' },
  { id: 'dessert', label: 'Dessert', emoji: '🍰' },
  { id: 'market', label: 'Market', emoji: '🛒' },
];

interface Props {
  offers: Offer[];
  userLocation: [number, number] | null;
  onOfferClick: (offerId: string) => void;
  onOfferInView?: (offerId: string) => void;
}

export const DiscoverModeContent: React.FC<Props> = ({
  offers,
  userLocation,
  onOfferClick,
  onOfferInView,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSort, setSelectedSort] = useState('recommended');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Compute visible offers
  const { visibleOffers, sections } = useMemo(() => {
    return computeVisibleOffers(offers, {
      searchQuery: debouncedSearch,
      selectedSort,
      selectedCategory,
      priceRange: null,
      distanceLimit: null,
      availableOnly: true,
    }, userLocation);
  }, [offers, debouncedSearch, selectedSort, selectedCategory, userLocation]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSort('recommended');
    setSelectedCategory('');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="px-3 py-2 border-b border-gray-100 space-y-2 bg-white">
        {/* Search Bar */}
        <div className="relative flex items-center gap-1.5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search deals, places, items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 h-9 text-sm rounded-full border-gray-200 focus:border-orange-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                ×
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Sort Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedSort(option.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                selectedSort === option.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span>{option.emoji}</span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="flex flex-col items-center gap-0.5 min-w-[56px]"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg'
                      : 'bg-gray-100'
                  }`}
                >
                  {category.emoji}
                </div>
                <span className="text-[10px] font-medium text-gray-700">
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Offers List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {sections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="text-6xl mb-4">🔍❌</div>
            <h3 className="text-xl font-bold mb-2">No offers found</h3>
            <p className="text-gray-600 text-center mb-6">
              Try adjusting your filters
            </p>
            <button
              onClick={handleClearFilters}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full"
            >
              Clear Filters
            </button>
          </motion.div>
        ) : (
          sections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{section.emoji}</span>
                <h3 className="text-lg font-bold">{section.title}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {section.offers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    onClick={() => onOfferClick(offer.id)}
                    onInView={() => onOfferInView?.(offer.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

---

## 4. OFFER CARD COMPONENT

```typescript
// components/discover/OfferCard.tsx

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Offer } from '@/types/discover';

interface Props {
  offer: Offer;
  onClick: () => void;
  onInView?: () => void;
}

export const OfferCard: React.FC<Props> = ({ offer, onClick, onInView }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection observer for map sync
  useEffect(() => {
    if (!onInView || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            onInView();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [onInView]);

  return (
    <motion.div
      ref={cardRef}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-32 bg-gray-100">
        <img
          src={offer.imageUrl}
          alt={offer.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 right-2 bg-black/75 backdrop-blur-sm px-2 py-1 rounded-md">
          <span className="text-white text-xs font-bold">
            {offer.discountPercent}% OFF
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-1">
        <h4 className="font-bold text-sm line-clamp-2">{offer.title}</h4>
        <p className="text-xs text-gray-600 line-clamp-1">{offer.partnerName}</p>
        
        {offer.distance && (
          <p className="text-xs text-gray-400">
            📍 {offer.distance.toFixed(1)} km • {offer.eta} min
          </p>
        )}

        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-lg font-bold text-orange-600">
            {offer.discountedPrice}₾
          </span>
          <span className="text-sm text-gray-400 line-through">
            {offer.originalPrice}₾
          </span>
        </div>

        <div className="inline-flex items-center bg-orange-50 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-md">
          ⭐ +{offer.points}
        </div>
      </div>
    </motion.div>
  );
};
```

---

## 5. FLOATING STAR BUTTON

```typescript
// components/FloatingStarButton.tsx

import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  isActive: boolean;
  onClick: () => void;
}

export const FloatingStarButton: React.FC<Props> = ({ isActive, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      animate={{
        scale: isActive ? 1.1 : 1,
        rotate: isActive ? 180 : 0,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      className="relative w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-2xl flex items-center justify-center shadow-lg"
    >
      {/* Glow effect */}
      <motion.div
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute inset-0 rounded-full bg-orange-400 blur-lg"
        style={{ zIndex: -1 }}
      />
      ⭐
    </motion.button>
  );
};
```

---

## 6. FILTER LOGIC (UTILITY)

```typescript
// lib/offerFilters.ts

import { Offer, FilterState, OfferSection, SortOption } from '@/types/discover';

export function computeVisibleOffers(
  allOffers: Offer[],
  filterState: FilterState,
  userLocation: [number, number] | null
): { visibleOffers: Offer[], sections: OfferSection[] } {
  
  // Step 1: Apply filters
  let filtered = applyFilters(allOffers, filterState, userLocation);
  
  // Step 2: Enrich with distances
  filtered = enrichWithDistances(filtered, userLocation);
  
  // Step 3: Sort
  const sorted = sortOffers(filtered, filterState.selectedSort as SortOption);
  
  // Step 4: Build sections
  const sections = buildOfferSections(sorted);
  
  return { visibleOffers: sorted, sections };
}

function applyFilters(
  offers: Offer[],
  filterState: FilterState,
  userLocation: [number, number] | null
): Offer[] {
  
  let filtered = [...offers];
  
  // Available only
  if (filterState.availableOnly) {
    filtered = filtered.filter(o => o.quantity > 0);
  }
  
  // Search
  if (filterState.searchQuery.trim()) {
    const query = filterState.searchQuery.toLowerCase();
    filtered = filtered.filter(o => 
      o.title.toLowerCase().includes(query) ||
      o.description.toLowerCase().includes(query) ||
      o.partnerName.toLowerCase().includes(query)
    );
  }
  
  // Category
  if (filterState.selectedCategory) {
    filtered = filtered.filter(o => o.category === filterState.selectedCategory);
  }
  
  // Price range
  if (filterState.priceRange) {
    const [min, max] = filterState.priceRange;
    filtered = filtered.filter(o => 
      o.discountedPrice >= min && o.discountedPrice <= max
    );
  }
  
  return filtered;
}

function enrichWithDistances(
  offers: Offer[],
  userLocation: [number, number] | null
): Offer[] {
  if (!userLocation) return offers;
  
  return offers.map(offer => {
    if (!offer.partnerLocation) return offer;
    
    const distance = calculateDistance(
      userLocation,
      [offer.partnerLocation.lat, offer.partnerLocation.lng]
    );
    
    const eta = Math.round((distance / 4) * 60); // 4 km/h walking
    
    return { ...offer, distance, eta };
  });
}

function sortOffers(offers: Offer[], sortOption: SortOption): Offer[] {
  const sorted = [...offers];
  
  switch (sortOption) {
    case 'nearest':
      return sorted.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    case 'cheapest':
      return sorted.sort((a, b) => a.discountedPrice - b.discountedPrice);
    case 'expiring':
      return sorted.sort((a, b) => 
        new Date(a.pickupWindow.end).getTime() - new Date(b.pickupWindow.end).getTime()
      );
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case 'recommended':
    default:
      return sorted.sort((a, b) => 
        calculateRecommendationScore(b) - calculateRecommendationScore(a)
      );
  }
}

function calculateRecommendationScore(offer: Offer): number {
  let score = 0;
  
  if (offer.distance) {
    score += Math.max(0, 100 - offer.distance * 10);
  }
  
  score += offer.discountPercent / 2;
  
  if (offer.reservationCount) {
    score += Math.min(offer.reservationCount, 30);
  }
  
  return score;
}

function buildOfferSections(offers: Offer[]): OfferSection[] {
  const sections: OfferSection[] = [];
  
  // Trending
  const trending = offers.filter(o => (o.trendingScore || 0) > 70).slice(0, 6);
  if (trending.length > 0) {
    sections.push({ id: 'trending', title: 'Trending Right Now', emoji: '⭐', offers: trending });
  }
  
  // Closing Soon
  const now = new Date();
  const closingSoon = offers.filter(o => {
    const end = new Date(o.pickupWindow.end);
    const hours = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hours > 0 && hours <= 2;
  }).slice(0, 4);
  if (closingSoon.length > 0) {
    sections.push({ id: 'closing-soon', title: 'Closing Soon', emoji: '⏳', offers: closingSoon });
  }
  
  // Under 5 GEL
  const under5 = offers.filter(o => o.discountedPrice <= 5).slice(0, 8);
  if (under5.length > 0) {
    sections.push({ id: 'under-5', title: 'Under 5₾', emoji: '💸', offers: under5 });
  }
  
  return sections;
}

function calculateDistance([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
```

---

## INTEGRATION INSTRUCTIONS

### 1. Install Dependencies

```bash
npm install framer-motion lucide-react
```

### 2. Add to HomePage

```typescript
// pages/HomePage.tsx

import { DiscoverSheet } from '@/components/discover/DiscoverSheet';
import { FloatingStarButton } from '@/components/FloatingStarButton';

export function HomePage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'discover' | 'partner'>('discover');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  
  return (
    <div className="relative h-screen">
      {/* Map */}
      <MapView
        onPartnerClick={(partnerId) => {
          setSelectedPartnerId(partnerId);
          setSheetMode('partner');
          setSheetOpen(true);
        }}
      />
      
      {/* Bottom Nav */}
      <BottomNav>
        <FloatingStarButton
          isActive={sheetOpen}
          onClick={() => {
            setSheetMode('discover');
            setSheetOpen(true);
          }}
        />
      </BottomNav>
      
      {/* Discover Sheet */}
      <DiscoverSheet
        isOpen={sheetOpen}
        mode={sheetMode}
        partnerId={selectedPartnerId}
        offers={offers}
        userLocation={userLocation}
        onClose={() => setSheetOpen(false)}
        onOfferSelect={(offerId) => {
          // Open offer detail
        }}
      />
    </div>
  );
}
```

### 3. Tailwind Config

```javascript
// tailwind.config.js

module.exports = {
  theme: {
    extend: {
      colors: {
        orange: {
          400: '#FFA940',
          500: '#FF8A00',
          600: '#FF6B00',
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
  ],
};
```

---

## NEXT STEPS

1. ✅ Remove old ExploreSheet and legacy offer UI
2. ✅ Test on mobile devices
3. ✅ Add i18n for Georgian language
4. ✅ Optimize performance with React.memo
5. ✅ Add analytics tracking
6. ✅ Test accessibility

---

This completes the full implementation guide! 🎉
