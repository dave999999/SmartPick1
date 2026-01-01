import { logger } from '@/lib/logger';
/**
 * OffersSheet - Ultra-Compact Apple-Grade Premium Design
 * 
 * DESIGN SYSTEM:
 * - Apple Human Interface Guidelines strict compliance
 * - SF Pro Display typography scale
 * - Haptic feedback on interactions
 * - Premium micro-animations
 * - Zero wasted vertical space
 * 
 * TYPOGRAPHY SCALE:
 * - Display: 24px/600 (-0.02em) | Headline: 18px/600 (-0.01em)
 * - Title: 15px/600 | Label: 13px/500 | Body: 14px/400
 * - Caption: 12px/400 | Micro: 10px/500 (0.01em)
 * 
 * SPACING SYSTEM:
 * - 4px/8px/12px/16px/20px/24px strict grid
 * 
 * COLOR TOKENS:
 * - Primary: #FF7A00 | Accent: #18C37B | Surface: #FFFFFF/#F8F8F8
 * - Text: #1A1A1A/#666666/#999999 | Border: #E5E5E5/#F0F0F0
 * - Shadow: rgba(0,0,0,0.04-0.08)
 * 
 * CORNER RADIUS:
 * - sm:8px | md:12px | lg:16px | xl:20px | full:9999px
 * 
 * Built with: React 18 + Framer Motion + Tailwind CSS
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { 
  Search, MapPin, Clock, X, Star, ChevronRight, Flame,
  Utensils, Coffee, ShoppingBag, Sparkles, Heart, Ticket, Wrench, Grid as GridIcon
} from 'lucide-react';
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
  hasActiveReservation?: boolean;
  onClose: () => void;
  onOfferSelect: (offerId: string) => void;
  onOfferReserve?: (offerId: string) => void;
}

type SheetHeight = 'collapsed' | 'expanded';

// Apple-Quality Category System with Lucide Icons
// Compact iOS-style category chips (36px height)
const CATEGORIES = [
  { id: '', label: 'All', icon: GridIcon, gradient: 'from-[#4D4D4D] to-[#3A3A3A]' },
  { id: 'RESTAURANT', label: 'Restaurant', icon: Utensils, gradient: 'from-[#FF6B6B] to-[#EE5A6F]' },
  { id: 'FAST_FOOD', label: 'Fast Food', icon: ShoppingBag, gradient: 'from-[#FF9A1F] to-[#FF7A00]' },
  { id: 'BAKERY', label: 'Bakery', icon: Coffee, gradient: 'from-[#D4A574] to-[#B8935A]' },
  { id: 'DESSERTS_SWEETS', label: 'Desserts', icon: Sparkles, gradient: 'from-[#FF99CC] to-[#FF6B9D]' },
  { id: 'CAFE', label: 'Café', icon: Coffee, gradient: 'from-[#A67C52] to-[#8B6F47]' },
  { id: 'DRINKS_JUICE', label: 'Drinks', icon: Coffee, gradient: 'from-[#FFB347] to-[#FF9A1F]' },
  { id: 'GROCERY', label: 'Grocery', icon: ShoppingBag, gradient: 'from-[#4ECDC4] to-[#44A89F]' },
  { id: 'MINI_MARKET', label: 'Mini Market', icon: ShoppingBag, gradient: 'from-[#4D8EFF] to-[#3D7FEE]' },
  { id: 'MEAT_BUTCHER', label: 'Meat', icon: Utensils, gradient: 'from-[#DC143C] to-[#C41E3A]' },
  { id: 'FISH_SEAFOOD', label: 'Seafood', icon: Utensils, gradient: 'from-[#00CED1] to-[#20B2AA]' },
  { id: 'ALCOHOL', label: 'Alcohol', icon: Ticket, gradient: 'from-[#8B4789] to-[#6B3767]' },
  { id: 'DRIVE', label: 'Drive', icon: Wrench, gradient: 'from-[#18C37B] to-[#12A368]' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function OffersSheet({
  isOpen,
  offers,
  user,
  userLocation,
  hasActiveReservation = false,
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

    // Filter out expired offers
    filtered = filtered.filter(o => !o.expires_at || new Date(o.expires_at) > new Date());

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

      {/* Sheet Container - Apple-Quality Design */}
      <motion.div
        ref={sheetRef}
        drag={hasActiveReservation ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={hasActiveReservation ? undefined : handleDragEnd}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ 
          y: 0, 
          opacity: 1,
          transition: { 
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8
          } 
        }}
        exit={{ 
          y: '100%', 
          opacity: 0,
          transition: { 
            type: 'spring',
            stiffness: 300,
            damping: 30
          }
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#F8F8F8] rounded-t-[24px] flex flex-col overflow-hidden"
        style={{ 
          height: getHeight(), 
          maxHeight: 'calc(100vh - 100px)',
          boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.06), 0 -1px 3px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Drag Handle - Minimal */}
        <div className="flex justify-center pt-2 pb-1 bg-white/90 backdrop-blur-xl">
          <div className="w-10 h-1 bg-[#D1D1D6] rounded-full" />
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F8F8F8]"
          onTouchStart={(e) => {
            const element = e.currentTarget;
            if (element.scrollTop === 0) {
              element.scrollTop = 1;
            }
          }}
        >
          <div className="max-w-[480px] mx-auto pb-32">
            
            {/* HEADER - Ultra Compact Apple Style */}
            <div className="px-4 pt-2 pb-2 bg-white/90 backdrop-blur-xl">
              <motion.h1 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04, type: 'spring', stiffness: 400 }}
                className="text-[18px] leading-[22px] font-semibold text-[#1A1A1A] tracking-tight"
              >
                Discover Deals
              </motion.h1>
              <div className="flex items-center gap-1 text-[11px] text-[#999999] mt-1">
                <MapPin size={10} className="text-[#FF7A00]" strokeWidth={2.5} />
                <span className="font-medium">Downtown Tbilisi</span>
              </div>
            </div>

            {/* Search Bar - Ultra Compact 40px */}
            <div className="px-4 pb-2 bg-white/90 backdrop-blur-xl">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" strokeWidth={2.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-[40px] pl-9 pr-9 rounded-xl bg-[#F2F2F2] border-0 text-[13px] text-[#1A1A1A] placeholder:text-[#999999] focus:outline-none focus:ring-1 focus:ring-[#FF7A00]/40 focus:bg-white transition-all"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={onClose}>
                  <X size={15} className="text-[#999999]" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#E5E5E5]" />

            {/* CATEGORIES - Ultra Compact 32px Pills */}
            <div className="py-2 bg-white/60 backdrop-blur-xl">
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <div className="flex gap-1.5 px-4">
                  {CATEGORIES.map((cat, index) => {
                    const Icon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    
                    return (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02, type: 'spring', stiffness: 400, damping: 25 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`
                          flex items-center gap-1 
                          h-[32px] px-2.5 rounded-full
                          bg-gradient-to-br ${cat.gradient}
                          shadow-[0_1px_3px_rgba(0,0,0,0.06)]
                          transition-all duration-150
                          ${isActive ? 'ring-1 ring-white/40 scale-105' : 'opacity-85'}
                        `}
                      >
                        <Icon size={16} className="text-white" strokeWidth={2.5} />
                        <span className="text-[11px] font-semibold text-white leading-none whitespace-nowrap tracking-tight">
                          {cat.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 1px Divider */}
            <div className="h-px bg-[#E5E5E5]" />

            {/* SECTION C: FLASH DEALS - Ultra Compact */}
            {flashDeal && (
              <div className="pt-2 pb-2 bg-[#FAFAFA]">
                <div className="px-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Flame size={14} className="text-[#FF7A00]" strokeWidth={2.5} />
                    <h2 className="text-[15px] leading-[18px] font-semibold text-[#1A1A1A] tracking-tight">
                      Ends Soon
                    </h2>
                  </div>
                  <p className="text-[11px] text-[#999999] mt-0.5 font-medium">
                    Limited time offers
                  </p>
                </div>

                <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  <div className="flex gap-2.5 px-4">
                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05, type: 'spring', stiffness: 350, damping: 28 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <FlashDealCard 
                        offer={flashDeal} 
                        onClick={() => onOfferSelect(flashDeal.id)} 
                        userLocation={userLocation} 
                      />
                    </motion.div>
                  </div>
                </div>
              </div>
            )}

            {/* Subtle Divider */}
            {flashDeal && bestSellers.length > 0 && (
              <div className="py-2 bg-[#FAFAFA]">
                <div className="h-px bg-[#E5E5E5] mx-4" />
              </div>
            )}

            {/* SECTION D: BEST SELLERS - Ultra Compact Grid */}
            {bestSellers.length > 0 && (
              <div className="pb-2 bg-[#FAFAFA]">
                <div className="px-4 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className="text-[#FF7A00] fill-[#FF7A00]" strokeWidth={2.5} />
                    <h2 className="text-[15px] leading-[18px] font-semibold text-[#1A1A1A] tracking-tight">
                      Best Near You
                    </h2>
                  </div>
                  <p className="text-[11px] text-[#999999] mt-0.5 font-medium">
                    Top-rated offers
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 px-4">
                  {bestSellers.slice(0, 6).map((offer, idx) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04, type: 'spring', stiffness: 350, damping: 28 }}
                      whileTap={{ scale: 0.97 }}
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

            {/* Subtle Divider */}
            {allOffers.length > 0 && (
              <div className="py-2 bg-[#FAFAFA]">
                <div className="h-px bg-[#E5E5E5] mx-4" />
              </div>
            )}

            {/* All Offers Grid - Ultra Compact */}
            {allOffers.length > 0 && (
              <div className="px-4 pb-4 bg-[#FAFAFA]">
                <div className="grid grid-cols-2 gap-2">
                  {allOffers.map((offer, idx) => (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02, type: 'spring', stiffness: 400, damping: 30 }}
                      whileTap={{ scale: 0.97 }}
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

            {/* Empty State - Compact */}
            {filteredOffers.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center justify-center py-16 text-center px-4 bg-[#F5F5F5]"
              >
                <div className="w-16 h-16 rounded-full bg-[#EAEAEA] flex items-center justify-center mb-3">
                  <Search size={24} className="text-[#A6A6A6]" strokeWidth={2} />
                </div>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A] mb-1">No offers found</h3>
                <p className="text-[12px] text-[#A6A6A6] max-w-[220px]">
                  Try adjusting your filters
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ============================================
// FLASH DEAL CARD - Apple Quality (280×340px)
// ============================================

interface FlashDealCardProps {
  offer: EnrichedOffer;
  onClick: () => void;
  userLocation?: [number, number] | null;
}

function FlashDealCard({ offer, onClick, userLocation }: FlashDealCardProps) {
  const [timeLeft, setTimeLeft] = useState(30);
  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';
  const discount = offer.discount_percent || 0;

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const endTime = offer.pickup_end ? new Date(offer.pickup_end) : new Date(now.getTime() + 30 * 60 * 1000);
      const diff = Math.max(0, endTime.getTime() - now.getTime());
      return Math.floor(diff / 60000);
    };
    
    setTimeLeft(calculateTime());
    const timer = setInterval(() => setTimeLeft(calculateTime()), 60000);
    return () => clearInterval(timer);
  }, [offer]);

  return (
    <button
      onClick={onClick}
      className="w-[220px] flex-shrink-0 text-left"
    >
      <div className="h-[220px] overflow-hidden border-0 shadow-[0_1px_6px_rgba(0,0,0,0.04)] rounded-xl bg-white hover:shadow-[0_2px_10px_rgba(0,0,0,0.08)] transition-all duration-150 cursor-pointer">
        {/* Image Section - Ultra Compact */}
        <div className="relative h-[110px] bg-[#F5F5F7]">
          <img 
            src={imageUrl} 
            alt={offer.title}
            className="w-full h-full object-cover"
          />
          
          {/* Countdown Badge - Ultra Compact */}
          <div className="absolute top-1.5 right-1.5 bg-[#FF3B30]/90 backdrop-blur-sm text-white border-0 shadow-sm flex items-center gap-0.5 px-1.5 py-0.5 rounded-full">
            <Clock size={10} strokeWidth={2.5} />
            <span className="text-[10px] font-bold tracking-wide leading-none">
              {timeLeft} MIN
            </span>
          </div>
        </div>

        {/* Content Section - Ultra Compact */}
        <div className="p-2.5 space-y-1.5">
          <p className="text-[10px] text-[#999999] font-medium uppercase tracking-wide">
            {offer.category || 'Restaurant'}
          </p>
          
          <h3 className="text-[14px] font-semibold text-[#1A1A1A] leading-tight line-clamp-1 tracking-tight">
            {offer.title}
          </h3>
          
          <p className="text-[11px] text-[#999999] line-clamp-1">
            {offer.partner?.business_name || 'Location'}
          </p>
          
          {/* Badges Row - Ultra Compact */}
          <div className="flex gap-1">
            <div className="bg-[#FF7A00] text-white border-0 px-1.5 py-0.5 text-[10px] font-bold rounded-md leading-none">
              -{discount}%
            </div>
            <div className="bg-[#F2F2F2] text-[#666666] border-0 px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-0.5 rounded-md leading-none">
              <MapPin size={9} strokeWidth={2.5} />
              {offer.distance?.toFixed(1) || '2.4'} km
            </div>
          </div>
          
          {/* Price Row - Ultra Compact */}
          <div className="flex items-baseline gap-1">
            <span className="text-[12px] text-[#AEAEB2] line-through">
              {offer.original_price.toFixed(2)}₾
            </span>
            <span className="text-[17px] font-bold text-[#1A1A1A]">
              {offer.smart_price.toFixed(2)}₾
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================
// GRID OFFER CARD - Apple Quality (168×220px)
// ============================================

// Helper to format time remaining
function formatTimeRemaining(expiresAt: string): string | null {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}დ`;
  if (hours > 0) return `${hours}სთ`;
  return `${minutes}წთ`;
}

interface GridOfferCardProps {
  offer: EnrichedOffer;
  userLocation?: [number, number] | null;
  onClick: () => void;
}

function GridOfferCard({ offer, userLocation, onClick }: GridOfferCardProps) {
  const imageUrl = offer.images?.[0] || '/images/placeholder-food.jpg';
  const discount = offer.discount_percent || 0;
  const hasActiveReservation = offer.user_reservation_id != null;
  const timeRemaining = formatTimeRemaining(offer.expires_at);
  
  // Debug log
  logger.debug('Offer expires_at:', offer.expires_at, 'Time remaining:', timeRemaining);

  return (
    <button
      onClick={onClick}
      className="w-full overflow-hidden border-0 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-150 rounded-xl bg-white"
    >
      {/* Image Section - Ultra Compact */}
      <div className="relative aspect-[3/2] bg-[#F5F5F7]">
        <img 
          src={imageUrl} 
          alt={offer.title}
          className="w-full h-full object-cover"
        />
        
        {/* Discount Badge - Ultra Compact */}
        {discount > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-[#FF7A00] text-white border-0 shadow-sm px-1.5 py-0.5 text-[10px] font-bold rounded-md leading-none">
            -{discount}%
          </div>
        )}
        
        {/* Active Badge - Ultra Compact */}
        {hasActiveReservation && (
          <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-[#18C37B] to-[#12A368] text-white border-0 shadow-sm flex items-center gap-0.5 px-1.5 py-0.5 rounded-md">
            <span className="text-[10px] font-bold tracking-wide uppercase leading-none">
              Active
            </span>
            <ChevronRight size={10} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Content Section - Ultra Compact */}
      <div className="p-2 space-y-1 bg-white relative">
        <h4 className="text-[14px] font-semibold text-[#1A1A1A] leading-tight line-clamp-1 tracking-tight">
          {offer.title}
        </h4>
        
        {/* Metadata Row - Ultra Compact */}
        <div className="flex items-center gap-1 text-[11px] text-[#999999]">
          <div className="flex items-center gap-0.5">
            <Star size={10} className="fill-[#FF7A00] text-[#FF7A00]" strokeWidth={2} />
            <span className="font-medium">{offer.rating?.toFixed(1) || '4.8'}</span>
          </div>
          <span>·</span>
          <div className="flex items-center gap-0.5">
            <MapPin size={10} strokeWidth={2} />
            <span>{offer.distance?.toFixed(1) || '1.2'} km</span>
          </div>
        </div>
        
        {/* Price Row with Time - Ultra Compact */}
        <div className="flex items-end justify-between pt-0.5">
          <div className="flex items-baseline gap-1">
            {offer.original_price > offer.smart_price && (
              <span className="text-[11px] text-[#AEAEB2] line-through">
                {offer.original_price.toFixed(2)}₾
              </span>
            )}
            <span className="text-[16px] font-bold text-[#1A1A1A]">
              {offer.smart_price.toFixed(2)}₾
            </span>
          </div>
          
          {/* Time Remaining Badge - Bottom Right */}
          {offer.expires_at && formatTimeRemaining(offer.expires_at) && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/60 rounded-md">
              <Clock size={9} className="text-orange-600" strokeWidth={2.5} />
              <span className="text-[10px] font-bold text-orange-600 leading-none">
                {formatTimeRemaining(offer.expires_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
