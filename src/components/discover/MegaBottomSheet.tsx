/**
 * MegaBottomSheet - THE ONLY SHEET IN THE APP
 * 
 * Modes:
 * - DISCOVER: Grid of all offers with search/filters
 * - CAROUSEL: Horizontal swipe of partner offers
 * - RESERVATION: Compact confirmation form
 * - QR: Minimal QR code display
 * 
 * Heights adapt per mode. No conflicts. Bottom nav always visible.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { X, Search, MapPin, Clock, ChevronUp, ChevronLeft, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { EnrichedOffer } from '@/lib/offerFilters';
import { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';

// ============================================
// TYPES
// ============================================

type SheetMode = 'discover' | 'detail' | 'carousel' | 'reservation' | 'qr';
type SheetHeight = 'collapsed' | 'mid' | 'full';

interface MegaBottomSheetProps {
  isOpen: boolean;
  mode: SheetMode;
  offers: EnrichedOffer[];
  user: User | null;
  selectedOfferId?: string | null;
  partnerId?: string | null;
  onClose: () => void;
  onModeChange: (mode: SheetMode) => void;
  onOfferSelect: (offerId: string) => void;
  onReserve?: (offerId: string, quantity: number) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '⭐' },
  { id: 'restaurant', label: 'Dining', emoji: '🍽️' },
  { id: 'bakery', label: 'Bakery', emoji: '🥐' },
  { id: 'cafe', label: 'Café', emoji: '☕' },
  { id: 'grocery', label: 'Grocery', emoji: '🛒' },
  { id: 'dessert', label: 'Sweets', emoji: '🍰' },
];

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended', icon: TrendingUp },
  { id: 'distance', label: 'Near', icon: MapPin },
  { id: 'price', label: 'Cheap', emoji: '💸' },
  { id: 'expiring', label: 'Expiring', icon: Clock },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function MegaBottomSheet({
  isOpen,
  mode,
  offers,
  user,
  selectedOfferId,
  partnerId,
  onClose,
  onModeChange,
  onOfferSelect,
  onReserve,
}: MegaBottomSheetProps) {
  
  const [height, setHeight] = useState<SheetHeight>('mid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeOffer, setActiveOffer] = useState<EnrichedOffer | null>(null);
  
  const sheetRef = useRef<HTMLDivElement>(null);

  // Calculate height based on mode
  const getHeight = () => {
    if (!isOpen) return '0vh';
    
    switch (mode) {
      case 'discover':
        if (height === 'collapsed') return '20vh';
        if (height === 'mid') return '50vh';
        return 'calc(100vh - 80px)';
      case 'detail':
        return 'calc(100vh - 80px)'; // Button now in scrollable content
      case 'carousel':
        return 'calc(100vh - 80px)'; // Button now in scrollable content
      case 'reservation':
        return 'calc(100vh - 80px)'; // Full height minus nav
      case 'qr':
        return '30vh';
      default:
        return '50vh';
    }
  };

  // Filter offers for discover mode
  const filteredOffers = useMemo(() => {
    if (mode !== 'discover') return offers;
    
    let filtered = [...offers];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.title.toLowerCase().includes(q) ||
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
    }

    return filtered;
  }, [offers, mode, searchQuery, selectedCategory, sortBy]);

  // Get carousel offers (partner-specific)
  const carouselOffers = useMemo(() => {
    if (mode === 'discover') return [];
    
    // Use activeOffer's partner if available
    const targetPartnerId = partnerId || activeOffer?.partner_id;
    
    if (targetPartnerId) {
      return offers.filter(o => o.partner_id === targetPartnerId);
    }
    
    if (selectedOfferId) {
      const offer = offers.find(o => o.id === selectedOfferId);
      if (offer?.partner_id) {
        return offers.filter(o => o.partner_id === offer.partner_id);
      }
    }
    return [];
  }, [offers, mode, partnerId, selectedOfferId, activeOffer?.partner_id]);

  // Current offer - persist across modes
  const currentOffer = activeOffer || carouselOffers[carouselIndex];
  
  // Set carousel index to match the selected offer when entering carousel mode
  useEffect(() => {
    if (mode === 'carousel' && activeOffer && carouselOffers.length > 0) {
      const index = carouselOffers.findIndex(o => o.id === activeOffer.id);
      if (index !== -1) {
        setCarouselIndex(index);
      }
    }
  }, [mode, carouselOffers.length]);

  // Drag handling
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (mode !== 'discover') return; // Only discover has multi-height

    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      // Swipe down
      if (height === 'full') setHeight('mid');
      else if (height === 'mid') setHeight('collapsed');
      else onClose();
    } else if (velocity < -500 || offset < -100) {
      // Swipe up
      if (height === 'collapsed') setHeight('mid');
      else if (height === 'mid') setHeight('full');
    }
  };

  // Reset active offer when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setActiveOffer(null);
      setCarouselIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const backdropOpacity = mode === 'discover' && height === 'full' ? 0.5 : 0.3;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: backdropOpacity }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        drag={mode === 'discover' ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        animate={{ height: getHeight() }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 40,
        }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content based on mode */}
        <AnimatePresence mode="wait">
          {mode === 'discover' && (
            <DiscoverContent
              key="discover"
              height={height}
              offers={filteredOffers}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onOfferClick={(offerId) => {
                const offer = filteredOffers.find(o => o.id === offerId);
                if (offer) setActiveOffer(offer);
                onOfferSelect(offerId);
                onModeChange('detail'); // Show single offer detail
              }}
              onClose={onClose}
            />
          )}

          {mode === 'detail' && currentOffer && (
            <CarouselContent
              key="detail"
              offers={[currentOffer]} // Single offer only
              currentIndex={0}
              onIndexChange={() => {}} // No carousel in detail mode
              onBack={() => {
                onModeChange('discover');
                setHeight('mid');
              }}
              onReserve={() => {
                onReserve?.(currentOffer.id, quantity);
              }}
              onClose={onClose}
              user={user}
              quantity={quantity}
              setQuantity={setQuantity}
            />
          )}

          {mode === 'carousel' && currentOffer && (
            <CarouselContent
              key="carousel"
              offers={carouselOffers}
              currentIndex={carouselIndex}
              onIndexChange={setCarouselIndex}
              onBack={() => {
                onModeChange('discover');
                setHeight('mid');
              }}
              onReserve={() => {
                // Directly trigger reservation modal with current quantity
                onReserve?.(currentOffer.id, quantity);
              }}
              onClose={onClose}
              user={user}
              quantity={quantity}
              setQuantity={setQuantity}
            />
          )}

          {mode === 'reservation' && currentOffer && (
            <ReservationContent
              key="reservation"
              offer={currentOffer}
              user={user}
              quantity={quantity}
              setQuantity={setQuantity}
              onBack={() => onModeChange('carousel')}
              onConfirm={() => {
                onReserve?.(currentOffer.id, quantity);
                onModeChange('qr');
              }}
            />
          )}

          {mode === 'qr' && currentOffer && (
            <QRContent
              key="qr"
              offer={currentOffer}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ============================================
// DISCOVER MODE
// ============================================

interface DiscoverContentProps {
  height: SheetHeight;
  offers: EnrichedOffer[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  sortBy: string;
  setSortBy: (s: string) => void;
  onOfferClick: (offerId: string) => void;
  onClose: () => void;
}

function DiscoverContent({
  height,
  offers,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  onOfferClick,
  onClose,
}: DiscoverContentProps) {
  
  if (height === 'collapsed') {
    return (
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">🔥 Discover Deals</h2>
            <p className="text-xs text-gray-500">{offers.length} deals • Tap to browse</p>
          </div>
          <ChevronUp className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">🔥 Discover Deals</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="font-semibold text-orange-600">{offers.length}</span> deals • auto-updated
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {SORT_OPTIONS.map((opt) => {
              const Icon = typeof opt.icon === 'string' ? null : opt.icon;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    sortBy === opt.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {Icon ? <Icon className="w-3.5 h-3.5" /> : <span>{opt.emoji}</span>}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'bg-orange-50 text-orange-700'
                }`}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-3">🔍</div>
            <h3 className="text-base font-bold mb-1">No deals found</h3>
            <p className="text-sm text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-20">
            {offers.map((offer: EnrichedOffer, idx: number) => (
              <OfferCard key={offer.id} offer={offer} onClick={() => onOfferClick(offer.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ============================================
// CAROUSEL MODE
// ============================================

interface CarouselContentProps {
  offers: EnrichedOffer[];
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  onBack: () => void;
  onReserve: () => void;
  onClose: () => void;
  user: User | null;
  quantity: number;
  setQuantity: (q: number) => void;
}

function CarouselContent({ offers, currentIndex, onIndexChange, onBack, onReserve, onClose, user, quantity, setQuantity }: CarouselContentProps) {
  const offer = offers[currentIndex];
  const partner = offer?.partner;
  const [userPoints, setUserPoints] = useState(0);
  
  // Fetch user points
  useEffect(() => {
    const fetchPoints = async () => {
      if (!user?.id) return;
      try {
        const { data: points } = await supabase
          .from('user_points')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        setUserPoints(points?.balance || 0);
      } catch (err) {
        setUserPoints(0);
      }
    };
    fetchPoints();
  }, [user?.id]);
  
  const discount = offer?.original_price && offer?.smart_price 
    ? Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100)
    : 0;
  
  const POINTS_PER_UNIT = 5;
  const totalPoints = POINTS_PER_UNIT * quantity;
  const hasEnoughPoints = userPoints >= totalPoints;
  const maxQuantity = Math.min(3, offer?.quantity_available || 1);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 80;
    
    if (info.offset.x < -swipeThreshold && currentIndex < offers.length - 1) {
      onIndexChange(currentIndex + 1);
    } else if (info.offset.x > swipeThreshold && currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  console.log('CarouselContent render:', { 
    hasOffer: !!offer, 
    quantity, 
    totalPoints, 
    userPoints, 
    hasEnoughPoints,
    onReserve: typeof onReserve 
  });

  return (
    <div className="flex flex-col h-full max-h-full bg-gradient-to-b from-orange-50/20 via-white to-white">
      {/* Compact Header */}
      <div className="flex-shrink-0 px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
        <button onClick={onBack} className="text-sm text-gray-600 flex items-center gap-1 hover:text-gray-900">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-sm font-bold text-orange-600">✨ Great Pick!</div>
          <div className="text-[10px] text-gray-500">Freshly prepared at {partner?.business_name || 'Partner'} 🍽️</div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Scrollable Content - NO SCROLL NEEDED */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-24">
        
        {/* MEDIUM IMAGE - 40% Smaller */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="mb-2"
        >
          <div className="relative w-full rounded-xl overflow-hidden shadow-md">
            <div className="aspect-[16/10] bg-gray-100">
              {offer?.images?.[0] ? (
                <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">🎁</div>
              )}
            </div>
            {/* Swipe indicators */}
            {currentIndex > 0 && (
              <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-1">
                <ChevronLeft className="w-3.5 h-3.5" />
              </div>
            )}
            {currentIndex < offers.length - 1 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-1">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </motion.div>

        {/* MINI THUMBNAILS - Horizontal Strip */}
        {offers.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto mb-3 scrollbar-hide">
            {offers.slice(0, 5).map((o, idx) => (
              <button
                key={idx}
                onClick={() => onIndexChange(idx)}
                className={`flex-shrink-0 w-8 h-8 rounded-md overflow-hidden transition-all ${
                  idx === currentIndex ? 'ring-2 ring-orange-500' : 'opacity-40'
                }`}
              >
                {o.images?.[0] ? (
                  <img src={o.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs">🎁</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* TITLE & PRICE - Compact */}
        <div className="mb-3">
          <h2 className="text-base font-bold leading-tight mb-1.5">{offer?.title}</h2>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">{offer?.smart_price}₾</span>
            <span className="text-sm text-gray-400 line-through">{offer?.original_price}₾</span>
            {discount > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                −{discount}%
              </span>
            )}
          </div>
        </div>

        {/* 🟢 SMART DEAL CARD - All-in-One */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 p-3 rounded-xl border border-green-200/50 shadow-sm mb-3">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-lg">💸</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-700">Pickup Price: <span className="text-green-600">{offer?.smart_price}₾</span></p>
              <p className="text-xs text-gray-600 mt-0.5">
                ⭐ Reserve now for <span className="font-bold text-orange-600">{totalPoints} SmartPoints</span>
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-green-200/40">
            <span className="text-xs text-gray-600">
              Balance: <span className="font-bold text-teal-600">{userPoints}</span>
            </span>
            <button className="text-[10px] font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-full px-2.5 py-1 transition-colors">
              Add Points →
            </button>
          </div>
        </div>

        {/* QUANTITY - Capsule Style */}
        <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl border border-gray-200/50 mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="h-7 w-7 rounded-full bg-white hover:bg-orange-50 shadow-sm border border-gray-200 disabled:opacity-30 flex items-center justify-center transition-all"
            >
              <span className="text-base font-bold text-gray-700">−</span>
            </button>
            <span className="text-xl font-bold text-gray-900 w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity}
              className="h-7 w-7 rounded-full bg-white hover:bg-orange-50 shadow-sm border border-gray-200 disabled:opacity-30 flex items-center justify-center transition-all"
            >
              <span className="text-base font-bold text-gray-700">+</span>
            </button>
          </div>
          <p className="text-[10px] text-gray-600 font-medium">
            Max {maxQuantity} • <span className="text-green-600 font-semibold">{offer?.quantity_available} left</span> 🌿
          </p>
        </div>

        {/* PICKUP TIME - Minimal */}
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50/60 rounded-lg border border-orange-200/40 mb-3">
          <Clock className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
          <span className="text-xs text-gray-700 font-medium">🕒 Pickup until 8 PM</span>
        </div>

        {/* RESERVE BUTTON - Right after pickup time */}
        <button
          onClick={onReserve}
          disabled={!hasEnoughPoints}
          className={`w-full py-3.5 rounded-2xl font-bold shadow-xl transition-all text-sm ${
            hasEnoughPoints
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:shadow-2xl active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {hasEnoughPoints ? `Reserve for ${totalPoints} SmartPoints →` : 'Not enough SmartPoints'}
        </button>

      </div>
    </div>
  );
}

// ============================================
// RESERVATION MODE
// ============================================

interface ReservationContentProps {
  offer: EnrichedOffer;
  user: User | null;
  quantity: number;
  setQuantity: (q: number) => void;
  onBack: () => void;
  onConfirm: () => void;
}

function ReservationContent({ offer, user, quantity, setQuantity, onBack, onConfirm }: ReservationContentProps) {
  const [userPoints, setUserPoints] = useState(0);
  const partner = offer?.partner;
  
  // Fetch user points
  useEffect(() => {
    const fetchPoints = async () => {
      if (!user?.id) return;
      try {
        const { data: points } = await supabase
          .from('user_points')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        setUserPoints(points?.balance || 0);
      } catch (err) {
        setUserPoints(0);
      }
    };
    fetchPoints();
  }, [user?.id]);
  
  const POINTS_PER_UNIT = 5;
  const totalPoints = POINTS_PER_UNIT * quantity;
  const totalPrice = offer.smart_price * quantity;
  const maxQuantity = Math.min(3, offer.quantity_available);
  const hasEnoughPoints = userPoints >= totalPoints;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white via-orange-50/10 to-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} className="text-orange-600 font-medium text-sm flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-base font-bold">✨ Reserve This Deal</h2>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Compact Header Row - Image Left, Details Right */}
        <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-100">
          {offer.images?.[0] && (
            <img
              src={offer.images[0]}
              alt={offer.title}
              className="w-[70px] h-[70px] rounded-xl object-cover flex-shrink-0 shadow-md border border-gray-100"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1">{offer.title}</h3>
            <p className="text-xs text-gray-600">{partner?.business_name}</p>
            <p className="text-xl font-bold text-green-600 tracking-tight leading-none mt-1">{offer.smart_price.toFixed(2)} ₾</p>
            <p className="text-xs font-semibold text-orange-600 mt-1">Great pick! ✨</p>
          </div>
        </div>

        {/* SmartPoints Price Card - Super Compact */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 p-3 rounded-xl border border-green-200/50 shadow-sm mb-3">
          <p className="text-xs text-gray-700 leading-tight mb-2">
            <span className="font-semibold">Pickup Price: {totalPrice.toFixed(2)} ₾</span><br />
            You'll pay at pickup — reserving costs <span className="font-bold text-orange-600">{totalPoints} SmartPoints</span>.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-green-200/50">
            <span className="text-xs text-gray-600">
              Your Balance: <span className="font-bold text-teal-600">{userPoints} Points</span>
            </span>
            <button
              className="h-6 px-3 py-0 text-xs font-semibold bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-full shadow-sm"
            >
              Add Points
            </button>
          </div>
        </div>

        {/* Quantity Selector - Super Compact Single Line */}
        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200/50 mb-3">
          <div className="flex items-center justify-center gap-3 mb-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="h-8 w-8 rounded-full bg-white hover:bg-orange-50 shadow-sm border border-gray-200 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center"
            >
              <span className="text-sm font-bold text-gray-700">−</span>
            </button>
            <span className="text-2xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity}
              className="h-8 w-8 rounded-full bg-white hover:bg-orange-50 shadow-sm border border-gray-200 disabled:opacity-40 transition-all active:scale-95 flex items-center justify-center"
            >
              <span className="text-sm font-bold text-gray-700">+</span>
            </button>
          </div>
          <p className="text-xs text-center text-gray-600 font-medium">
            MAX {maxQuantity} – <span className="text-green-600 font-semibold">{offer.quantity_available} available</span> · Fresh batch just in! 🌾
          </p>
        </div>

        {/* Pickup Details Card - Tiny 2-Line Card */}
        <div className="bg-orange-50/40 p-2.5 rounded-xl border border-orange-200/30 space-y-1.5">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
            <span className="text-xs text-gray-700 font-medium">Pickup until 8 PM</span>
          </div>
          {offer.distance && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
              <span className="text-xs text-gray-700">{partner?.business_name} · {offer.distance.toFixed(1)}km away</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 py-3 space-y-2">
        <button
          onClick={onConfirm}
          disabled={!hasEnoughPoints || !user}
          className={`w-full py-3.5 rounded-xl font-bold shadow-lg transition-all ${
            hasEnoughPoints && user
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {!user ? 'Sign In to Reserve' : hasEnoughPoints ? `Reserve for ${totalPoints} SmartPoints` : 'Not enough SmartPoints'}
        </button>
        <p className="text-center text-xs text-gray-500">
          We'll save this for you for 1 hour ✨
        </p>
        <p className="text-center text-xs text-gray-400">
          Pay only at pickup — no prepayment needed.
        </p>
      </div>
    </div>
  );
}

// ============================================
// QR MODE
// ============================================

interface QRContentProps {
  offer: EnrichedOffer;
  onClose: () => void;
}

function QRContent({ offer, onClose }: QRContentProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">✅</div>
        <h2 className="text-xl font-bold mb-1">Reserved!</h2>
        <p className="text-sm text-gray-600">{offer.title}</p>
      </div>

      <div className="w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <div className="text-6xl">📱</div>
      </div>

      <p className="text-sm text-gray-600 mb-6">Show this at pickup</p>

      <button onClick={onClose} className="text-orange-600 font-medium">
        Close
      </button>
    </div>
  );
}

// ============================================
// OFFER CARD
// ============================================

function OfferCard({ offer, onClick }: { offer: EnrichedOffer; onClick: () => void }) {
  const discount = Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);

  return (
    <div onClick={onClick} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative aspect-square bg-gray-100">
        {offer.images?.[0] ? (
          <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>
        )}
        {discount > 0 && (
          <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-2">
        <h3 className="text-xs font-semibold line-clamp-2 mb-1">{offer.title}</h3>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-orange-600">{offer.smart_price}₾</span>
          <span className="text-[10px] text-gray-400 line-through">{offer.original_price}₾</span>
        </div>
      </div>
    </div>
  );
}
