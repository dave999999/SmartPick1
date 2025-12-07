/**
 * OffersSheetNew.tsx
 * Premium Offers Sheet with new card designs
 * Matches reference UI with search, categories, and grid layout
 */

import { useState, useRef, useEffect } from 'react';
import { Search, Mic } from 'lucide-react';
import { motion } from 'framer-motion';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { HeroOfferCard } from './HeroOfferCard';
import { OfferListCard } from './OfferListCard';
import { useOffers } from '@/hooks/useOffers';
import { usePartners } from '@/hooks/usePartners';
import { getAllCategories } from '@/lib/categories';
import { Offer, Partner } from '@/lib/types';

interface OffersSheetNewProps {
  isOpen: boolean;
  onClose: () => void;
  onOfferSelect: (offer: Offer) => void;
  selectedPartnerId?: string | null;
  isMinimized?: boolean;
  onCenteredOfferChange?: (offer: Offer | null) => void;
}

export function OffersSheetNew({ isOpen, onClose, onOfferSelect, selectedPartnerId, isMinimized = false, onCenteredOfferChange }: OffersSheetNewProps) {
  const allCategories = getAllCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [centeredCardIndex, setCenteredCardIndex] = useState(0);
  
  const { offers, loading } = useOffers();
  const { partners } = usePartners();

  // Handle category toggle
  const handleCategoryClick = (categoryValue: string) => {
    if (selectedCategory === categoryValue) {
      setSelectedCategory(null); // Unselect if clicking the same category
    } else {
      setSelectedCategory(categoryValue);
    }
  };

  // Calculate discount percentage
  const getDiscount = (offer: Offer) => {
    if (!offer.original_price || offer.original_price <= offer.smart_price) return null;
    return Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);
  };

  // Filter offers based on partner, category and search
  const filteredOffers = offers.filter((offer: Offer) => {
    const matchesPartner = !selectedPartnerId || offer.partner_id === selectedPartnerId;
    const matchesCategory = !selectedCategory || 
      offer.category === selectedCategory ||
      offer.category?.toUpperCase() === selectedCategory;
    const matchesSearch = !searchQuery || 
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPartner && matchesCategory && matchesSearch && offer.status === 'ACTIVE';
  });

  // Get special offers (50% or more discount)
  const specialOffers = filteredOffers
    .filter((offer: Offer) => {
      const discount = getDiscount(offer);
      return discount && discount >= 50;
    })
    .sort((a: Offer, b: Offer) => {
      const discountA = ((a.original_price - a.smart_price) / a.original_price) * 100;
      const discountB = ((b.original_price - b.smart_price) / b.original_price) * 100;
      return discountB - discountA;
    });

  // Get popular offers sorted by reservation_count
  const popularOffers = [...filteredOffers]
    .filter(offer => !specialOffers.some(special => special.id === offer.id))
    .sort((a: Offer, b: Offer) => (b.reservation_count || 0) - (a.reservation_count || 0))
    .slice(0, 10);

  // Track centered card in carousel
  useEffect(() => {
    if (!isMinimized || !carouselRef.current) return;

    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      const container = carouselRef.current;
      if (!container) return;

      const containerCenter = container.scrollLeft + container.offsetWidth / 2;
      const cards = container.querySelectorAll('[data-card-index]');

      let closestIndex = 0;
      let closestDistance = Infinity;

      cards.forEach((card, index) => {
        const cardElement = card as HTMLElement;
        const cardCenter = cardElement.offsetLeft + cardElement.offsetWidth / 2;
        const distance = Math.abs(containerCenter - cardCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setCenteredCardIndex(closestIndex);

      // Debounce the parent callback to avoid rapid map updates
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        if (onCenteredOfferChange) {
          const centeredOffer = filteredOffers[closestIndex];
          onCenteredOfferChange(centeredOffer || null);
        }
      }, 100); // Reduced debounce for more responsive map updates
    };

    const container = carouselRef.current;
    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [isMinimized, filteredOffers, onCenteredOfferChange]);

  // If minimized, render carousel with enhanced card design
  if (isOpen && isMinimized) {
    return (
      <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
        <div className="relative">
          {/* Carousel Container */}
          <div 
            ref={carouselRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth px-8"
            style={{ 
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollPaddingLeft: '32px',
              scrollPaddingRight: '32px'
            }}
          >
            {filteredOffers.map((offer: Offer, index: number) => {
              const isCentered = index === centeredCardIndex;
              
              return (
                <motion.div 
                  key={offer.id}
                  data-card-index={index}
                  className="flex-shrink-0 snap-center"
                  animate={{
                    scale: isCentered ? 1 : 0.85,
                    opacity: isCentered ? 1 : 0.7,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                  style={{
                    width: '140px',
                    filter: isCentered ? 'none' : 'brightness(0.9)',
                  }}
                >
                  <div 
                    className={`relative transition-all duration-300 ${
                      isCentered 
                        ? 'shadow-[0_8px_32px_rgba(255,90,0,0.25),0_4px_16px_rgba(0,0,0,0.15)]' 
                        : 'shadow-[0_2px_8px_rgba(0,0,0,0.1)]'
                    }`}
                    style={{
                      borderRadius: '16px',
                      border: isCentered 
                        ? '1.5px solid rgba(255,163,102,0.4)' 
                        : '1px solid rgba(0,0,0,0.05)',
                      background: isCentered 
                        ? 'linear-gradient(135deg, rgba(255,163,102,0.03) 0%, rgba(255,90,0,0.02) 100%)' 
                        : 'transparent'
                    }}
                  >
                    {isCentered && (
                      <div 
                        className="absolute -inset-[2px] rounded-[18px] pointer-events-none"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,163,102,0.2), rgba(255,90,0,0.15))',
                          filter: 'blur(8px)',
                          zIndex: -1
                        }}
                      />
                    )}
                    <OfferListCard
                      title={offer.title}
                      imageUrl={offer.images?.[0] || '/images/Map.jpg'}
                      priceNow={`₾${Math.round(offer.smart_price).toLocaleString()}`}
                      priceOld={offer.original_price ? `₾${Math.round(offer.original_price).toLocaleString()}` : undefined}
                      onClick={() => onOfferSelect(offer)}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  
  // If closed, don't render anything
  if (!isOpen) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[85vh] sm:h-[82vh] max-h-none sm:max-h-[720px] p-0 overflow-hidden z-40"
        style={{
          left: '0',
          right: '0',
          bottom: '0',
          width: '100%',
          maxWidth: '100%',
          background: 'rgba(255, 255, 255, 0.18)',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          borderRadius: '36px 36px 0 0',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
        }}
      >
        <SheetTitle className="absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0">
          Discover Deals and Offers
        </SheetTitle>
        <div className="h-full overflow-y-auto overflow-x-hidden" ref={scrollContainerRef}>
          {/* Hidden dummy input to prevent search bar from getting focus */}
          <input type="text" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} tabIndex={-1} />
          
          {/* Search Bar & Categories */}
          <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3">
            {/* Search Bar */}
            <div className="relative flex items-center h-10 sm:h-11 rounded-xl mb-2 sm:mb-3" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              transform: 'translateZ(0)'
            }}>
              <Search className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter a dish name e.g. Egusi soup"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-10 text-sm bg-transparent outline-none placeholder:text-gray-400"
                autoFocus={false}
                tabIndex={-1}
              />
              <button className="absolute right-3">
                <Mic className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide px-1 py-1">
              {allCategories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => handleCategoryClick(category.value)}
                  className="flex-shrink-0 flex items-center justify-center w-[48px] h-[48px] sm:w-[56px] sm:h-[56px] rounded-2xl transition-all active:scale-95"
                  style={{
                    background: selectedCategory === category.value 
                      ? 'linear-gradient(135deg, #FF7A1A 0%, #FF5A00 100%)'
                      : 'transparent',
                    boxShadow: selectedCategory === category.value
                      ? '0 6px 20px rgba(255, 122, 26, 0.35), 0 2px 8px rgba(255, 122, 26, 0.2)'
                      : '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 6px rgba(0, 0, 0, 0.1)',
                    border: selectedCategory === category.value
                      ? '1px solid rgba(255, 255, 255, 0.9)'
                      : 'none',
                    transform: 'translateZ(0)'
                  }}
                >
                  <img 
                    src={`/icons/categories/${category.value}.png`}
                    alt={category.label}
                    className="w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] object-contain"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))' }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div>
            {/* Show Featured & Popular only when NO category is selected */}
            {!selectedCategory && (
              <>
                {/* Today's Special Offers (50%+ discount) - Swipable Carousel */}
                {specialOffers.length > 0 && (
                  <div className="pb-2">
                    <div className="px-4 mb-3">
                      <h2 className="text-[18px] font-bold text-gray-900">
                        Today's Special Offer
                      </h2>
                    </div>
                    {/* Horizontal Scrollable Cards */}
                    <div className="overflow-x-auto scrollbar-hide">
                      <div className="flex gap-4 px-4 snap-x snap-mandatory">
                        {specialOffers.map((offer: Offer) => (
                          <div key={offer.id} className="flex-shrink-0 w-[calc(100%-64px)] max-w-[340px] snap-center">
                            {/* Pixel-Perfect Special Offer Card */}
                            <div
                              className="relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-200"
                              onClick={() => onOfferSelect(offer)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.95)',
                                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.9)',
                                transform: 'translateZ(0)'
                              }}
                              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98) translateZ(0)'}
                              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1) translateZ(0)'}
                              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) translateZ(0)'}
                            >
                              <div className="flex items-stretch">
                                {/* Product Image - Full height on left */}
                                <div
                                  className="flex-shrink-0 overflow-hidden"
                                  style={{
                                    width: '120px',
                                  }}
                                >
                                  <img
                                    src={offer.images?.[0] || '/images/Map.jpg'}
                                    alt={offer.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                {/* Content Stack */}
                                <div className="flex-1 flex flex-col gap-1.5 p-4">
                                  {/* Title */}
                                  <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">
                                    {offer.title}
                                  </h3>

                                  {/* Price Row */}
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-[22px] font-bold leading-none" style={{ color: '#FF8A00' }}>
                                      ₾{Math.round(offer.smart_price)}
                                    </span>
                                    {getDiscount(offer) && (
                                      <div
                                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white leading-none"
                                        style={{
                                          background: 'linear-gradient(135deg, #FF7A00 0%, #FF4E00 100%)',
                                        }}
                                      >
                                        {getDiscount(offer)}% off
                                      </div>
                                    )}
                                  </div>

                                  {/* Old Price */}
                                  <div className="flex items-center gap-2 text-xs">
                                    {offer.original_price && (
                                      <span className="line-through font-medium" style={{ color: '#9CA3AF' }}>
                                        ₾{Math.round(offer.original_price)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Reserve Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOfferSelect(offer);
                                  }}
                                  className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-3 py-1.5 sm:px-5 sm:py-2 rounded-full text-white text-xs sm:text-sm font-semibold transition-transform active:scale-95"
                                  style={{
                                    background: 'linear-gradient(135deg, #FF8A00 0%, #FF5A00 100%)',
                                    boxShadow: '0 4px 16px rgba(255, 138, 0, 0.3)',
                                  }}
                                >
                                  Reserve Now
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Popular Now - Horizontal Scroll */}
                {popularOffers.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-4 mb-2">
                      <h2 className="text-[17px] font-semibold text-gray-900">
                        Popular Now
                      </h2>
                    </div>
                    <div className="overflow-x-auto scrollbar-hide">
                      <div className="flex gap-3 px-4">
                        {popularOffers.map((offer: Offer) => (
                          <div key={offer.id} className="flex-shrink-0 w-[110px]">
                            <OfferListCard
                              title={offer.title}
                              imageUrl={offer.images?.[0] || '/images/Map.jpg'}
                              priceNow={`₾${Math.round(offer.smart_price).toLocaleString()}`}
                              priceOld={offer.original_price ? `₾${Math.round(offer.original_price).toLocaleString()}` : undefined}
                              onClick={() => onOfferSelect(offer)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Featured Offers Grid */}
            {filteredOffers.length > 0 && (
              <div className="px-4 pb-20">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[17px] font-semibold text-gray-900">
                    Featured Offers
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {filteredOffers.map((offer: Offer) => (
                    <OfferListCard
                      key={offer.id}
                      title={offer.title}
                      imageUrl={offer.images?.[0] || '/images/Map.jpg'}
                      priceNow={`₾${Math.round(offer.smart_price).toLocaleString()}`}
                      priceOld={offer.original_price ? `₾${Math.round(offer.original_price).toLocaleString()}` : undefined}
                      onClick={() => onOfferSelect(offer)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredOffers.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No offers found
                </h3>
                <p className="text-sm text-gray-500 max-w-[240px]">
                  Try selecting a different category
                </p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
