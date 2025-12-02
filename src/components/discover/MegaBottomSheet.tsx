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
import { OfferCarouselModal } from './OfferCarouselModal';

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
  { id: 'RESTAURANT', label: 'Restaurant', emoji: '🍽️' },
  { id: 'FAST_FOOD', label: 'Fast Food', emoji: '🍔' },
  { id: 'BAKERY', label: 'Bakery', emoji: '🥐' },
  { id: 'DESSERTS_SWEETS', label: 'Desserts', emoji: '🍰' },
  { id: 'CAFE', label: 'Café', emoji: '☕' },
  { id: 'DRINKS_JUICE', label: 'Drinks', emoji: '🥤' },
  { id: 'GROCERY', label: 'Grocery', emoji: '🛒' },
  { id: 'MINI_MARKET', label: 'Mini Market', emoji: '🏪' },
  { id: 'MEAT_BUTCHER', label: 'Meat', emoji: '🥩' },
  { id: 'FISH_SEAFOOD', label: 'Fish', emoji: '🐟' },
  { id: 'ALCOHOL', label: 'Alcohol', emoji: '🍷' },
  { id: 'DRIVE', label: 'Drive', emoji: '🚗' },
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
        if (height === 'mid') return '35vh';
        return 'calc(100vh - 80px)';
      case 'detail':
        return '50vh'; // Smaller detail view
      case 'carousel':
        return '50vh'; // Smaller carousel view
      case 'reservation':
        return '60vh'; // Compact reservation view
      case 'qr':
        return '30vh';
      default:
        return '35vh';
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

  // Detail mode (single offer) renders as standalone modal
  if (mode === 'detail' && currentOffer) {
    return (
      <AnimatePresence>
        <OfferCarouselModal
          offers={[currentOffer]}
          initialIndex={0}
          onClose={() => {
            onModeChange('discover');
            setHeight('mid');
          }}
          onReserve={(offer) => {
            onOfferSelect(offer.id);
            onModeChange('reservation');
          }}
        />
      </AnimatePresence>
    );
  }

  // Carousel mode (multiple offers) renders as standalone modal
  if (mode === 'carousel' && currentOffer) {
    return (
      <AnimatePresence>
        <OfferCarouselModal
          offers={carouselOffers}
          initialIndex={carouselIndex}
          onClose={() => {
            onModeChange('discover');
            setHeight('mid');
          }}
          onReserve={(offer) => {
            onOfferSelect(offer.id);
            onModeChange('reservation');
          }}
        />
      </AnimatePresence>
    );
  }

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
    <div className="flex flex-col h-full bg-white">
      {/* COMPACT HEADER - Horizontal Layout */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 p-3">
          
          {/* LEFT: SWIPEABLE PHOTO CAROUSEL */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shadow-md"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                {offer?.images?.[currentIndex] ? (
                  <img
                    src={offer.images[currentIndex]}
                    alt={offer.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🎁</div>
                )}
              </motion.div>
            </AnimatePresence>
            
            {/* Pagination Dots */}
            {offers.length > 1 && (
              <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                {offers.slice(0, 5).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1 h-1 rounded-full transition-all ${
                      idx === currentIndex ? 'bg-white w-2' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Swipe Indicators */}
            {currentIndex > 0 && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-0.5">
                <ChevronLeft className="w-3 h-3" />
              </div>
            )}
            {currentIndex < offers.length - 1 && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-0.5">
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </motion.div>

          {/* RIGHT: OFFER INFO */}
          <div className="flex-1 min-w-0">
            <button onClick={onClose} className="float-right p-0.5 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
            
            <h2 className="text-sm font-bold text-gray-900 leading-tight mb-0.5 pr-6 line-clamp-2">
              {offer?.title}
            </h2>
            <p className="text-[10px] text-gray-500 mb-1.5">{partner?.business_name}</p>
            
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-green-600">{offer?.smart_price}₾</span>
              <span className="bg-orange-50 text-orange-600 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-orange-200">
                {totalPoints} SmartPoints
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">

        {/* QUANTITY SECTION - Super Compact */}
        <div className="bg-gray-50/50 rounded-lg border border-gray-200 p-2.5">
          <div className="text-[11px] font-semibold text-gray-700 mb-2">Quantity</div>
          <div className="flex items-center justify-center gap-2.5 mb-1.5">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-orange-400 disabled:opacity-30 disabled:hover:border-gray-300 flex items-center justify-center transition-all bg-white active:scale-95"
            >
              <span className="text-base font-bold text-gray-600">−</span>
            </button>
            <span className="text-2xl font-bold text-gray-900 w-9 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity}
              className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-orange-400 disabled:opacity-30 disabled:hover:border-gray-300 flex items-center justify-center transition-all bg-white active:scale-95"
            >
              <span className="text-base font-bold text-gray-600">+</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-gray-500">Up to {maxQuantity} per order</span>
            <span className="text-green-600 font-semibold">{offer?.quantity_available} available</span>
          </div>
        </div>

        {/* PICKUP INFO BLOCK - Clean & Grouped */}
        <div className="bg-white rounded-lg border border-gray-200 p-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
            <span className="text-[11px] text-gray-900 font-medium">Today · 11:50 PM – 11:50 PM</span>
          </div>
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-gray-100">
            <MapPin className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
            <span className="text-[11px] text-gray-700">{partner?.business_name || 'Partner Location'}</span>
          </div>
          
          {/* Info Box */}
          <div className="bg-blue-50/40 rounded-md p-2 mt-1.5">
            <div className="flex items-start gap-1.5">
              <span className="text-blue-500 flex-shrink-0 text-xs">ℹ️</span>
              <p className="text-[9px] text-gray-600 leading-snug">
                You'll pay <span className="font-semibold text-gray-900">{offer?.smart_price}₾</span> at pickup. 
                Reservation costs <span className="font-semibold text-orange-600">{totalPoints} SmartPoints</span>.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* FIXED BOTTOM CTA */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 p-3 pt-2.5 pb-20">
        <button
          onClick={onReserve}
          disabled={!hasEnoughPoints}
          className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
            hasEnoughPoints
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-xl active:scale-[0.98]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Reserve for {totalPoints} SmartPoints
        </button>
        <p className="text-center text-[9px] text-gray-500 mt-1.5">🕓 Held for 1 hour</p>
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
    <div className="flex flex-col h-full bg-white">
      {/* COMPACT HEADER */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 p-2.5">
          
          {/* LEFT: PHOTO THUMBNAIL */}
          <div className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
            {offer?.images?.[0] ? (
              <img
                src={offer.images[0]}
                alt={offer.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">🎁</div>
            )}
          </div>

          {/* RIGHT: INFO */}
          <div className="flex-1 min-w-0">
            <button onClick={onBack} className="float-right text-orange-600 text-[10px] font-medium flex items-center gap-0.5">
              <ChevronLeft className="w-3 h-3" />
              Back
            </button>
            
            <h2 className="text-[11px] font-bold text-gray-900 leading-tight mb-0.5 pr-10 line-clamp-1">
              {offer?.title}
            </h2>
            <p className="text-[8px] text-gray-500 mb-0.5">{partner?.business_name}</p>
            
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-green-600">{totalPrice.toFixed(2)}₾</span>
              <span className="bg-orange-50 text-orange-600 text-[8px] font-semibold px-1.5 py-0.5 rounded-full border border-orange-200">
                {totalPoints} SmartPoints
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">

        {/* QUANTITY SECTION - Super Compact */}
        <div className="bg-gray-50/50 rounded-lg border border-gray-200 p-2">
          <div className="text-[10px] font-semibold text-gray-700 mb-1.5">Quantity</div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="w-7 h-7 rounded-lg border-2 border-gray-300 hover:border-orange-400 disabled:opacity-30 disabled:hover:border-gray-300 flex items-center justify-center transition-all bg-white active:scale-95"
            >
              <span className="text-sm font-bold text-gray-600">−</span>
            </button>
            <span className="text-xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity}
              className="w-7 h-7 rounded-lg border-2 border-gray-300 hover:border-orange-400 disabled:opacity-30 disabled:hover:border-gray-300 flex items-center justify-center transition-all bg-white active:scale-95"
            >
              <span className="text-sm font-bold text-gray-600">+</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[8px]">
            <span className="text-gray-500">Up to {maxQuantity} per order</span>
            <span className="text-green-600 font-semibold">{offer.quantity_available} available</span>
          </div>
        </div>

        {/* PICKUP INFO BLOCK - Clean & Grouped */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 space-y-1">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-orange-500 flex-shrink-0" />
            <span className="text-[10px] text-gray-900 font-medium">Today · 11:50 PM – 11:50 PM</span>
          </div>
          <div className="flex items-center gap-1.5 pb-1 border-b border-gray-100">
            <MapPin className="w-3 h-3 text-green-600 flex-shrink-0" />
            <span className="text-[10px] text-gray-700">{partner?.business_name}</span>
          </div>
          
          {/* Info Box */}
          <div className="bg-blue-50/40 rounded-md p-1.5 mt-1">
            <div className="flex items-start gap-1">
              <span className="text-blue-500 flex-shrink-0 text-[10px]">ℹ️</span>
              <p className="text-[8px] text-gray-600 leading-snug">
                You'll pay <span className="font-semibold text-gray-900">{totalPrice.toFixed(2)}₾</span> at pickup. 
                Reservation costs <span className="font-semibold text-orange-600">{totalPoints} SmartPoints</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Balance (if needed) */}
        {!hasEnoughPoints && (
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg border border-red-200 p-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] text-gray-700">
                Balance: <span className="font-bold text-red-600">{userPoints} Points</span>
              </div>
              <button className="text-[8px] font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-full px-2 py-0.5 shadow-sm transition-all">
                Add Points
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FIXED BOTTOM CTA */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-3 py-2 pb-20">
        <button
          onClick={onConfirm}
          disabled={!hasEnoughPoints || !user}
          className={`w-full py-3 rounded-lg font-bold text-sm shadow-md transition-all ${
            hasEnoughPoints && user
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-lg active:scale-[0.98]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {!user ? 'Sign In' : hasEnoughPoints ? `Confirm — ${totalPoints} SmartPoints` : 'Not enough SmartPoints'}
        </button>
        <p className="text-center text-[8px] text-gray-500 mt-1">🕓 Held for 1 hour</p>
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
    <div onClick={onClick} className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative aspect-[4/3] bg-gray-100">
        {offer.images?.[0] ? (
          <img src={offer.images[0]} alt={offer.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl">🎁</div>
        )}
        {discount > 0 && (
          <div className="absolute top-1 left-1 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-1.5">
        <h3 className="text-[11px] font-semibold line-clamp-1 mb-0.5">{offer.title}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-orange-600">{offer.smart_price}₾</span>
          <span className="text-[9px] text-gray-400 line-through">{offer.original_price}₾</span>
        </div>
      </div>
    </div>
  );
}
