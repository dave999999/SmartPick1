/**
 * OffersSheet - Premium Banana-Style Marketplace Design
 * 
 * 🎨 EXACT VISUAL MATCH TO BANANA REFERENCE:
 * - Clean white background with warm color palette
 * - Light pastel category icons (h-16 w-16 rounded rectangles)
 * - Large soft gradient Flash Deal card with smooth shadows
 * - Best Sellers horizontal scroll with rounded corners
 * - 2-column All Offers grid with consistent spacing
 * - Smooth slide-in animation (300ms ease-out)
 * - Friendly premium grocery marketplace aesthetic
 * 
 * 📐 LAYOUT STRUCTURE:
 * 1. Category Bar - Horizontal scroll, pastel icons, labels below
 * 2. Search Bar - Shadcn Input, h-12, rounded-xl, left icon
 * 3. Flash Deal Card - Yellow gradient, large image, price display
 * 4. Best Sellers - 2-column horizontal cards with badges
 * 5. Fresh Right Now - 1-row soft pastel gradient cards
 * 6. All Offers Grid - 2-column with distance/time info
 * 
 * Built with: Next.js 14 + Shadcn UI + Tailwind + Framer Motion
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Search, MapPin, Clock, Menu, X } from 'lucide-react';
import { EnrichedOffer } from '@/lib/offerFilters';
import { User } from '@/lib/types';

// ============================================
// TYPES & CONSTANTS
// ============================================

interface OffersSheetProps {
  isOpen: boolean;
  offers: EnrichedOffer[];
  user: User | null;
  userLocation?: [number, number] | null;
  onClose: () => void;
  onOfferSelect: (offerId: string) => void;
  onOfferReserve?: (offerId: string) => void;
}

type SheetHeight = 'collapsed' | 'expanded';

// 6 Primary Categories - Clean design matching reference
const CATEGORIES = [
  { id: 'BAKERY', label: 'Bakery', emoji: '🥐', bgColor: 'bg-orange-100', iconColor: 'text-orange-600' },
  { id: 'DAIRY', label: 'Dairy', emoji: '🥛', bgColor: 'bg-blue-100', iconColor: 'text-blue-600' },
  { id: 'BREAD', label: 'Bread', emoji: '🍞', bgColor: 'bg-amber-100', iconColor: 'text-amber-700' },
  { id: 'RESTAURANT', label: 'Meals', emoji: '🍽️', bgColor: 'bg-yellow-100', iconColor: 'text-yellow-700' },
  { id: 'VEGETABLES', label: 'Vegeta...', emoji: '🥕', bgColor: 'bg-green-100', iconColor: 'text-green-600' },
  { id: 'MEAT', label: 'Meat', emoji: '🥩', bgColor: 'bg-red-100', iconColor: 'text-red-600' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function OffersSheet({
  isOpen,
  offers,
  user,
  userLocation,
  onClose,
  onOfferSelect,
}: OffersSheetProps) {
  const [height, setHeight] = useState<SheetHeight>('expanded');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const sheetRef = useRef<HTMLDivElement>(null);

  // Auto-expand on open
  useEffect(() => {
    if (isOpen) {
      setHeight('expanded');
    }
  }, [isOpen]);

  // Filter offers
  const filteredOffers = useMemo(() => {
    let filtered = [...offers];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        o =>
          o.title?.toLowerCase().includes(q) ||
          o.partner?.business_name?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(o => o.category === selectedCategory);
    }

    return filtered;
  }, [offers, searchQuery, selectedCategory]);

  // Flash deal (highest discount)
  const flashDeal = useMemo(() => {
    const hotOffers = filteredOffers
      .filter(o => o.discount_percent && o.discount_percent > 30)
      .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
    return hotOffers[0] || null;
  }, [filteredOffers]);

  // Best sellers (top 8 discounts)
  const bestSellers = useMemo(() => {
    return filteredOffers
      .filter(o => o.discount_percent && o.discount_percent > 20)
      .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))
      .slice(0, 8);
  }, [filteredOffers]);

  // All offers (exclude flash deal)
  const allOffers = useMemo(() => {
    return filteredOffers.filter(o => o.id !== flashDeal?.id);
  }, [filteredOffers, flashDeal]);

  // Drag gesture
  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.y > 100 || velocity.y > 500) {
      if (height === 'expanded') setHeight('collapsed');
      else onClose();
    } else if (offset.y < -100 || velocity.y < -500) {
      setHeight('expanded');
    }
  };

  const getHeight = () => {
    if (!isOpen) return '0vh';
    return height === 'collapsed' ? '30vh' : 'calc(100vh - 68px)';
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - Subtle overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed inset-0 bg-black z-40"
        onClick={onClose}
      />

      {/* Sheet Container - 90% height, smooth slide-in */}
      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ 
          y: 0, 
          opacity: 1,
          transition: { 
            type: 'tween',
            duration: 0.6,
            ease: [0.25, 0.1, 0.25, 1]
          } 
        }}
        exit={{ 
          y: '100%', 
          opacity: 0,
          transition: { duration: 0.25, ease: 'easeIn' }
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[24px] flex flex-col overflow-hidden"
        style={{ 
          height: getHeight(), 
          maxHeight: 'calc(100vh - 68px)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* Handle Bar - Drag indicator */}
        <div className="flex justify-center pt-3 pb-2 bg-white sticky top-0 z-10">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
          <div className="max-w-[480px] mx-auto pb-24">
            
            {/* Header - Brand + Close */}
            <div className="flex items-center justify-between px-4 py-2 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-orange-500 rounded-md" />
                <span className="text-lg font-semibold text-orange-500">SmartPick</span>
              </div>
              <button onClick={onClose} className="p-1">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* 1. CATEGORY BAR - Horizontal scroll with pastel icons */}
            <div className="bg-white px-4 pt-2 pb-2">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {CATEGORIES.map(cat => (
                  <CategoryItem
                    key={cat.id}
                    category={cat}
                    isSelected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                  />
                ))}
              </div>
            </div>

            {/* 2. SEARCH BAR - Shadcn Input with icon */}
            <div className="bg-white px-4 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 opacity-60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search offers..."
                  className="w-full h-10 pl-10 pr-3 bg-gray-100 border-0 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* 3. FLASH DEAL CARD - Large gradient hero banner */}
            {flashDeal && (
              <div className="bg-white px-4 pt-3 pb-2">
                <h2 className="text-[17px] font-bold text-neutral-900 mb-2">Best bellie You</h2>
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <FlashDealCard 
                    offer={flashDeal} 
                    onClick={() => onOfferSelect(flashDeal.id)} 
                    userLocation={userLocation} 
                  />
                </motion.div>
              </div>
            )}

            {/* 4. BEST SELLERS - Banana-style horizontal scroll with pastel cards */}
            {bestSellers.length > 0 && (
              <div className="bg-white pt-3 pb-0">
                <h2 className="text-[17px] font-bold tracking-tight text-neutral-900 mb-2 px-4">
                  Best Sellers Near You
                </h2>
                <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pl-4 pr-4 pb-3">
                  {bestSellers.map((offer, idx) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.2,
                        delay: idx * 0.05 
                      }}
                    >
                      <BestSellerCard
                        offer={offer}
                        userLocation={userLocation}
                        onClick={() => onOfferSelect(offer.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. FRESH RIGHT NOW - Soft pastel gradient row (optional featured section) */}
            {filteredOffers.length > 2 && (
              <div className="bg-white pt-3 pb-2">
                <h2 className="text-[17px] font-bold text-neutral-900 mb-2 px-4">Fresh Right Now</h2>
                <div className="px-4">
                  <FreshCard 
                    offer={filteredOffers[1]} 
                    onClick={() => onOfferSelect(filteredOffers[1].id)}
                  />
                </div>
              </div>
            )}

            {/* 6. ALL OFFERS GRID - 2-column layout */}
            {allOffers.length > 0 && (
              <div className="bg-white px-4 pt-3 pb-4">
                <h2 className="text-[17px] font-bold text-neutral-900 mb-2">All Offers</h2>
                <div className="grid grid-cols-2 gap-3">
                  {allOffers.map((offer, idx) => (
                    <motion.div
                      key={offer.id}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut', delay: idx * 0.015 }}
                    >
                      <GridOfferCard
                        offer={offer}
                        userLocation={userLocation}
                        onClick={() => onOfferSelect(offer.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredOffers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No offers found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ============================================
// SECTION HEADER
// ============================================

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h2 className="px-4 text-lg font-semibold text-gray-900 mb-2">
      {title}
    </h2>
  );
}

// ============================================
// CATEGORY ITEM - Pastel rounded rectangle with label below
// ============================================

interface CategoryItemProps {
  category: {
    id: string;
    label: string;
    emoji: string;
    bgColor: string;
    iconColor: string;
  };
  isSelected: boolean;
  onClick: () => void;
}

function CategoryItem({ category, isSelected, onClick }: CategoryItemProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="flex-shrink-0 flex flex-col items-center gap-1"
    >
      {/* Icon Container - compact size for small screens */}
      <div
        className={`
          h-[52px] w-[52px] rounded-[14px] flex items-center justify-center
          transition-all duration-200
          ${category.bgColor}
          ${isSelected ? 'ring-2 ring-orange-400' : ''}
        `}
      >
        <span className="text-xl">{category.emoji}</span>
      </div>
      {/* Label below */}
      <span className="text-[9px] font-medium text-gray-600 text-center leading-tight max-w-[52px]">
        {category.label}
      </span>
    </motion.button>
  );
}

// ============================================
// FRESH CARD - Soft pastel gradient horizontal card
// ============================================

interface FreshCardProps {
  offer: EnrichedOffer;
  onClick: () => void;
}

function FreshCard({ offer, onClick }: FreshCardProps) {
  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';
  const discount = offer.discount_percent || 0;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-[14px] bg-gradient-to-r from-green-50 to-teal-50 shadow-[0_2px_10px_rgba(0,0,0,0.06)] p-2.5 flex items-center gap-2.5"
    >
      {/* Image - fully rounded */}
      <div className="h-[48px] w-[48px] rounded-[10px] overflow-hidden bg-white shadow-sm flex-shrink-0">
        <img src={imageUrl} alt={offer.title} className="w-full h-full object-cover" />
      </div>
      
      {/* Content */}
      <div className="flex-1 text-left">
        <h3 className="text-[12px] font-semibold text-gray-900 line-clamp-1 mb-0.5">
          {offer.title}
        </h3>
        <div className="flex items-center gap-1">
          <span className="text-[13px] font-bold text-gray-900">
            {offer.smart_price.toFixed(2)} ₾
          </span>
          {discount > 0 && (
            <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ============================================
// FLASH DEAL CARD
// ============================================

interface FlashDealCardProps {
  offer: EnrichedOffer;
  onClick: () => void;
  userLocation?: [number, number] | null;
}

function FlashDealCard({ offer, onClick, userLocation }: FlashDealCardProps) {
  const [timeLeft, setTimeLeft] = useState('12 min');
  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const endTime = offer.pickup_end ? new Date(offer.pickup_end) : new Date(now.getTime() + 12 * 60 * 1000);
      const diff = Math.max(0, endTime.getTime() - now.getTime());
      const minutes = Math.floor(diff / 60000);
      return `${minutes} min`;
    };
    
    setTimeLeft(calculateTime());
    const timer = setInterval(() => setTimeLeft(calculateTime()), 60000);
    return () => clearInterval(timer);
  }, [offer]);

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-[18px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden bg-white"
    >
      {/* Gradient Background Section */}
      <div className="bg-gradient-to-b from-amber-100 to-yellow-50 p-3 flex flex-row items-center gap-3">
        {/* Left: Text Content */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[15px] font-bold text-gray-900">Flash Deal</span>
            <span className="text-[15px]">🔥</span>
          </div>
          <p className="text-[12px] text-gray-600 mb-2">Ending in {timeLeft}</p>
          
          {/* Price Display */}
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-xl font-bold text-gray-900">
              {offer.smart_price.toFixed(2)} ₾
            </span>
            <span className="text-[12px] text-gray-400 line-through">
              {offer.original_price.toFixed(2)} ₾
            </span>
          </div>
          
          {/* Product Name */}
          <p className="text-[12px] text-gray-700 line-clamp-1">
            {offer.title}
          </p>
        </div>

        {/* Right: Large Product Image - fully rounded like banana */}
        <div className="h-[90px] w-[90px] rounded-[16px] overflow-hidden bg-white shadow-md flex-shrink-0">
          <img
            src={imageUrl}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </motion.button>
  );
}

// ============================================
// BEST SELLER CARD (Horizontal)
// ============================================

interface BestSellerCardProps {
  offer: EnrichedOffer;
  userLocation?: [number, number] | null;
  onClick: () => void;
}

/**
 * BestSellerCard - Premium Banana-Style Design
 * 
 * FIGMA LAYER STRUCTURE:
 * ├─ Card Container (w-[168px], rounded-2xl, shadow-sm)
 * │  ├─ Image Area (h-[128px], rounded-t-2xl)
 * │  │  └─ Discount Badge (absolute, top-2, left-2, pastel pill)
 * │  └─ Content Area (px-3, py-3)
 * │     ├─ Product Name (text-base, font-medium, mb-1)
 * │     ├─ Price Row (flex, gap-1.5, mb-1.5)
 * │     │  ├─ Current Price (text-lg, font-semibold)
 * │     │  └─ Old Price (text-sm, muted, line-through)
 * │     └─ Meta Row (flex, gap-2, text-xs, muted)
 * │        ├─ Location Icon + Text
 * │        └─ Time Icon + Text
 * 
 * SPACING SYSTEM:
 * - Card padding: 0 (full bleed image)
 * - Content padding: 12px all sides
 * - Title margin: 4px bottom
 * - Price margin: 6px bottom
 * - Icon-text gap: 4px
 * - Meta items gap: 8px
 */
function BestSellerCard({ offer, userLocation, onClick }: BestSellerCardProps) {
  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';
  const discount = offer.discount_percent || 0;
  
  // Calculate actual distance between user and partner
  const calculateDistance = (userLoc: [number, number], partnerLat: number, partnerLng: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (partnerLat - userLoc[0]) * Math.PI / 180;
    const dLon = (partnerLng - userLoc[1]) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLoc[0] * Math.PI / 180) *
      Math.cos(partnerLat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };
  
  const getPartnerLocation = () => {
    if (offer.partner?.location?.latitude && offer.partner?.location?.longitude) {
      return { lat: offer.partner.location.latitude, lng: offer.partner.location.longitude };
    }
    if (offer.partner?.latitude && offer.partner?.longitude) {
      return { lat: offer.partner.latitude, lng: offer.partner.longitude };
    }
    return null;
  };
  
  const partnerLoc = getPartnerLocation();
  const distance = userLocation && partnerLoc 
    ? calculateDistance(userLocation, partnerLoc.lat, partnerLoc.lng)
    : null;
  
  const distanceText = distance !== null 
    ? distance < 1 
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`
    : '—';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.005, boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex-shrink-0 w-[165px] bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden border-0 mr-0 last:mr-4"
    >
      {/* Image Area - 4:3 aspect ratio, rounded top only */}
      <div className="relative h-[120px] overflow-hidden bg-[#FAFAFA]">
        <img 
          src={imageUrl} 
          alt={offer.title} 
          className="w-full h-full object-cover"
        />
        
        {/* Discount Badge - Soft pastel pill like reference */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 rounded-full bg-[#FFE5D9] text-[#FF6B35] px-2 py-1 text-[11px] font-medium shadow-sm">
            -{discount}%
          </div>
        )}
        
        {/* Product Name - Elegant overlay at bottom left with soft shadow */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent px-3 pt-6 pb-2">
          <h3 className="text-[14px] font-medium text-white tracking-tight line-clamp-1 leading-tight drop-shadow-md text-left">
            {offer.title}
          </h3>
        </div>
      </div>

      {/* Content Area - Compact pricing and location */}
      <div className="px-3 py-2 bg-white">
        
        {/* Price Row - Clear hierarchy */}
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="text-[16px] font-semibold text-neutral-900">
            {offer.smart_price.toFixed(2)} ₾
          </span>
          {offer.original_price > offer.smart_price && (
            <span className="text-[13px] text-[#B0B0B0] line-through">
              {offer.original_price.toFixed(2)} ₾
            </span>
          )}
        </div>
        
        {/* Location Only - Distance from user */}
        <div className="flex items-center gap-1 text-[11px] text-[#A0A0A0]">
          <MapPin className="w-3 h-3 opacity-40" />
          <span>{distanceText}</span>
        </div>
      </div>
    </motion.button>
  );
}

// ============================================
// GRID OFFER CARD
// ============================================

interface GridOfferCardProps {
  offer: EnrichedOffer;
  userLocation?: [number, number] | null;
  onClick: () => void;
}

/**
 * GridOfferCard - Premium Banana-Style Grid Card
 * 
 * FIGMA LAYER STRUCTURE:
 * ├─ Card Container (w-full, rounded-2xl, shadow-sm)
 * │  ├─ Image Area (h-[115px], rounded-t-2xl)
 * │  │  └─ Discount Badge (absolute, top-2, left-2)
 * │  └─ Content Area (px-3, py-3)
 * │     ├─ Product Name (text-base, font-medium, mb-1)
 * │     ├─ Price Row (flex, gap-1.5, mb-1.5)
 * │     └─ Meta Row (flex, gap-2, text-xs)
 */
function GridOfferCard({ offer, userLocation, onClick }: GridOfferCardProps) {
  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';
  const discount = offer.discount_percent || 0;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.005, boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden text-left border-0"
    >
      {/* Image Area - Soft gradient background */}
      <div className="relative h-[120px] bg-[#FAFAFA] overflow-hidden">
        <img src={imageUrl} alt={offer.title} className="w-full h-full object-cover" />
        
        {/* Discount Badge - Pastel like reference */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-[#FFE5D9] text-[#FF6B35] text-[11px] font-medium px-2 py-1 rounded-full shadow-sm">
            -{discount}%
          </div>
        )}
      </div>

      {/* Content Area - Clean spacing */}
      <div className="px-3 py-3 bg-white">
        
        {/* Product Name */}
        <h3 className="text-[14px] font-medium text-neutral-900 tracking-tight line-clamp-1 mb-1 leading-tight">
          {offer.title}
        </h3>
        
        {/* Price Row */}
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className="text-[16px] font-semibold text-neutral-900">
            {offer.smart_price.toFixed(2)} ₾
          </span>
          {offer.original_price > offer.smart_price && (
            <span className="text-[13px] text-[#B0B0B0] line-through">
              {offer.original_price.toFixed(2)} ₾
            </span>
          )}
        </div>
        
        {/* Meta Info Row */}
        <div className="flex items-center gap-2 text-[11px] text-[#A0A0A0]">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 opacity-40" />
            <span>4 min</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 opacity-40" />
            <span>10 min</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
