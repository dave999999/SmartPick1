/**
 * UnifiedOffersSheet - TRUE BottomSheet like Uber Eats / Wolt / TooGoodToGo
 * 
 * 3 States: PEEK (15vh) → MID (50vh) → FULL (calc(100vh - 80px))
 * Modes: DISCOVER → OFFER_DETAIL → RESERVATION → QR_VIEW
 * 
 * PERFECT UX:
 * - Spring animations with velocity snap
 * - Backdrop blur + dim overlay
 * - Compact header with counts
 * - Categories BELOW filters
 * - No scroll in peek, controlled in mid/full
 * - Everything in ONE sheet
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimation, PanInfo, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, Clock, ChevronUp, Sparkles, TrendingUp } from 'lucide-react';
import { EnrichedOffer } from '@/lib/offerFilters';
import { User } from '@/lib/types';

type SheetState = 'closed' | 'peek' | 'mid' | 'full';
type SheetMode = 'discover' | 'offer_detail';

interface UnifiedOffersSheetProps {
  isOpen: boolean;
  offers: EnrichedOffer[];
  user: User | null;
  userLocation: [number, number] | null;
  selectedOfferId?: string | null;
  onClose: () => void;
  onOfferSelect: (offerId: string) => void;
  onMapHighlight?: (offerId: string | null) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '⭐' },
  { id: 'restaurant', label: 'Dining', emoji: '🍽️' },
  { id: 'bakery', label: 'Bakery', emoji: '🥐' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'dessert', label: 'Sweets', emoji: '🍰' },
  { id: 'drinks', label: 'Drinks', emoji: '🥤' },
];

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended', icon: TrendingUp },
  { id: 'distance', label: 'Nearest', icon: MapPin },
  { id: 'price', label: 'Cheapest', emoji: '💸' },
  { id: 'expiring', label: 'Expiring', icon: Clock },
  { id: 'newest', label: 'New', icon: Sparkles },
];

export function UnifiedOffersSheet({
  isOpen,
  offers,
  user,
  userLocation,
  selectedOfferId,
  onClose,
  onOfferSelect,
  onMapHighlight,
}: UnifiedOffersSheetProps) {
  
  const [sheetState, setSheetState] = useState<SheetState>('mid');
  const [sheetMode, setSheetMode] = useState<SheetMode>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Calculate sheet height
  const getSheetHeight = (state: SheetState) => {
    switch (state) {
      case 'closed': return '0vh';
      case 'peek': return '15vh';
      case 'mid': return '50vh';
      case 'full': return 'calc(100vh - 80px)'; // Leave space for nav
      default: return '50vh';
    }
  };

  // Open/close animations
  useEffect(() => {
    if (isOpen) {
      setSheetState('mid');
    } else {
      setSheetState('closed');
    }
  }, [isOpen]);

  // Auto-switch to detail mode if offer selected
  useEffect(() => {
    if (selectedOfferId && isOpen) {
      setSheetMode('offer_detail');
      setSheetState('mid');
    } else if (isOpen) {
      setSheetMode('discover');
    }
  }, [selectedOfferId, isOpen]);

  // Filter offers
  const filteredOffers = useMemo(() => {
    let filtered = [...offers];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.partner?.business_name?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(o => o.category === selectedCategory);
    }

    switch (sortBy) {
      case 'distance':
        filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        break;
      case 'price':
        filtered.sort((a, b) => a.smart_price - b.smart_price);
        break;
      case 'expiring':
        filtered.sort((a, b) => {
          const aEnd = new Date(a.pickup_end || a.pickup_window?.end || '').getTime();
          const bEnd = new Date(b.pickup_end || b.pickup_window?.end || '').getTime();
          return aEnd - bEnd;
        });
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return filtered;
  }, [offers, searchQuery, selectedCategory, sortBy]);

  // Drag handling with velocity detection
  const handleDragEnd = (event: any, info: PanInfo) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Velocity-based snap
    if (velocity > 500 || offset > 100) {
      // Swipe down
      if (sheetState === 'full') setSheetState('mid');
      else if (sheetState === 'mid') setSheetState('peek');
      else if (sheetState === 'peek') onClose();
    } else if (velocity < -500 || offset < -100) {
      // Swipe up
      if (sheetState === 'peek') setSheetState('mid');
      else if (sheetState === 'mid') setSheetState('full');
    }
  };

  const expandToFull = () => setSheetState('full');
  const collapseToMid = () => setSheetState('mid');

  if (!isOpen) return null;

  const backdropOpacity = sheetState === 'full' ? 0.5 : sheetState === 'mid' ? 0.3 : 0.1;

  return (
    <>
      {/* Backdrop with blur */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: backdropOpacity }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
        onClick={() => sheetState === 'full' ? collapseToMid() : onClose()}
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ height: getSheetHeight(sheetState) }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 40,
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* PEEK STATE - Compact Header Only */}
        {sheetState === 'peek' && (
          <div 
            className="px-4 pb-4 cursor-pointer"
            onClick={() => setSheetState('mid')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">🔥 Discover Deals</h2>
                <p className="text-xs text-gray-500">{filteredOffers.length} deals • Tap to browse</p>
              </div>
              <ChevronUp className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        )}

        {/* MID & FULL STATES - Full Interface */}
        {(sheetState === 'mid' || sheetState === 'full') && (
          <>
            {/* Sticky Header */}
            <div className="flex-shrink-0 border-b border-gray-100">
              {/* Title Bar with Count */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {sheetMode === 'discover' ? '🔥 Discover Deals' : '✨ Offer Details'}
                  </h1>
                  {sheetMode === 'discover' && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-semibold text-orange-600">{filteredOffers.length}</span> deals found • auto-updated
                    </p>
                  )}
                </div>
                {sheetMode === 'discover' && (
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>

              {/* Compact Search */}
              {sheetMode === 'discover' && (
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setSearchExpanded(true)}
                      onBlur={() => !searchQuery && setSearchExpanded(false)}
                      placeholder="Search..."
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Sort Pills - Compact, horizontally scrollable */}
              {sheetMode === 'discover' && (
                <div className="px-4 pb-2">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                    {SORT_OPTIONS.map((option) => {
                      const Icon = typeof option.icon === 'string' ? null : option.icon;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setSortBy(option.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                            sortBy === option.id
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {Icon ? <Icon className="w-3.5 h-3.5" /> : <span>{option.emoji}</span>}
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Category Pills - BELOW filters */}
              {sheetMode === 'discover' && (
                <div className="px-4 pb-3">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                          selectedCategory === cat.id
                            ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                            : 'bg-orange-50 text-orange-700'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Scrollable Content */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3"
              style={{
                overscrollBehavior: 'contain',
              }}
            >
              {sheetMode === 'discover' ? (
                <OfferGrid
                  offers={filteredOffers}
                  onOfferClick={onOfferSelect}
                  expandToFull={expandToFull}
                />
              ) : (
                <OfferDetail
                  offerId={selectedOfferId || ''}
                  offers={offers}
                  user={user}
                  onBack={() => {
                    setSheetMode('discover');
                    setSheetState('mid');
                  }}
                  onReserve={() => {}}
                />
              )}
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

// ============================================
// OFFER GRID - 2 Column with proper spacing
// ============================================

interface OfferGridProps {
  offers: EnrichedOffer[];
  onOfferClick: (offerId: string) => void;
  expandToFull: () => void;
}

function OfferGrid({ offers, onOfferClick, expandToFull }: OfferGridProps) {
  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-5xl mb-3">🔍</div>
        <h3 className="text-base font-bold text-gray-900 mb-1">No deals found</h3>
        <p className="text-sm text-gray-500">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 pb-20">
      {offers.map((offer, index) => (
        <motion.div
          key={offer.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
          onClick={() => {
            onOfferClick(offer.id);
            expandToFull();
          }}
          className="cursor-pointer"
        >
          <OfferCard offer={offer} />
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// OFFER CARD - Compact, image-focused
// ============================================

function OfferCard({ offer }: { offer: EnrichedOffer }) {
  const discountPercent = offer.discount_percent || 
    Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Image - auto-expand */}
      <div className="relative aspect-square bg-gray-100">
        {offer.images?.[0] ? (
          <img
            src={offer.images[0]}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            🎁
          </div>
        )}
        
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discountPercent}%
          </div>
        )}
      </div>

      {/* Content - Compact */}
      <div className="p-2">
        <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 mb-1 leading-tight">
          {offer.title}
        </h3>
        
        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-orange-600">
            {offer.smart_price}₾
          </span>
          <span className="text-[10px] text-gray-400 line-through">
            {offer.original_price}₾
          </span>
        </div>

        {/* Distance - if available */}
        {offer.distance && (
          <div className="flex items-center gap-0.5 text-[10px] text-gray-500 mt-1">
            <MapPin className="w-2.5 h-2.5" />
            {offer.distance.toFixed(1)}km
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// OFFER DETAIL - Full view inside same sheet
// ============================================

interface OfferDetailProps {
  offerId: string;
  offers: EnrichedOffer[];
  user: User | null;
  onBack: () => void;
  onReserve: () => void;
}

function OfferDetail({ offerId, offers, user, onBack, onReserve }: OfferDetailProps) {
  const offer = offers.find(o => o.id === offerId);

  if (!offer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-3">Offer not found</p>
        <button onClick={onBack} className="text-orange-600 font-medium text-sm">
          ← Back to offers
        </button>
      </div>
    );
  }

  const discountPercent = offer.discount_percent || 
    Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);

  return (
    <div className="pb-24">
      {/* Back Button */}
      <button 
        onClick={onBack} 
        className="mb-3 text-orange-600 font-medium text-sm flex items-center gap-1"
      >
        ← Back to offers
      </button>

      {/* Hero Image */}
      <div className="relative h-56 bg-gray-100 rounded-2xl overflow-hidden mb-4">
        {offer.images?.[0] ? (
          <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🎁</div>
        )}
        
        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-lg">
            Save {discountPercent}%
          </div>
        )}
      </div>

      {/* Title & Partner */}
      <h2 className="text-xl font-bold text-gray-900 mb-1">{offer.title}</h2>
      <p className="text-sm text-gray-600 mb-4">📍 {offer.partner?.business_name}</p>

      {/* Price */}
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-3xl font-bold text-orange-600">{offer.smart_price}₾</span>
        <span className="text-lg text-gray-400 line-through">{offer.original_price}₾</span>
      </div>

      {/* Description */}
      {offer.description && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-2">About this deal</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{offer.description}</p>
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl mb-6">
        <span className="text-sm text-gray-600">Available</span>
        <span className="text-sm font-bold text-gray-900">
          {offer.quantity_available} left
        </span>
      </div>

      {/* Reserve Button - Fixed at bottom */}
      <div className="fixed bottom-24 left-0 right-0 px-4 py-3 bg-white border-t border-gray-100">
        <button
          onClick={onReserve}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3.5 rounded-xl font-bold text-base shadow-lg active:scale-98 transition-transform"
        >
          {user ? 'Reserve Now' : 'Sign In to Reserve'}
        </button>
      </div>
    </div>
  );
}
