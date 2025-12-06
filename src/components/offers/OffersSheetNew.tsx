/**
 * OffersSheetNew.tsx
 * Premium Offers Sheet with new card designs
 * Matches reference UI with search, categories, and grid layout
 */

import { useState, useRef } from 'react';
import { Search, Mic } from 'lucide-react';
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
}

export function OffersSheetNew({ isOpen, onClose, onOfferSelect, selectedPartnerId, isMinimized = false }: OffersSheetNewProps) {
  const allCategories = getAllCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  
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

  // Get featured offer (first offer with highest discount)
  const featuredOffer = filteredOffers
    .sort((a: Offer, b: Offer) => {
      const discountA = ((a.original_price - a.smart_price) / a.original_price) * 100;
      const discountB = ((b.original_price - b.smart_price) / b.original_price) * 100;
      return discountB - discountA;
    })[0];

  // Get popular offers sorted by reservation_count
  const popularOffers = [...filteredOffers]
    .filter(offer => offer.id !== featuredOffer?.id)
    .sort((a: Offer, b: Offer) => (b.reservation_count || 0) - (a.reservation_count || 0))
    .slice(0, 10);

  // Calculate discount percentage
  const getDiscount = (offer: Offer) => {
    if (!offer.original_price || offer.original_price <= offer.smart_price) return null;
    return Math.round(((offer.original_price - offer.smart_price) / offer.original_price) * 100);
  };

  // If minimized, render carousel with same card design
  if (isMinimized) {
    return (
      <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
        <div className="relative">
          {/* Carousel Container */}
          <div 
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
            style={{ 
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {filteredOffers.slice(0, 10).map((offer: Offer) => (
              <div 
                key={offer.id}
                className="flex-shrink-0 w-[280px] snap-center"
              >
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
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="h-[82vh] max-h-[720px] p-0 border-none bg-[#FAFAFA] rounded-t-[24px] overflow-hidden z-40"
        style={{
          left: '8px',
          right: '8px',
          bottom: '8px',
          width: 'calc(100% - 16px)',
          maxWidth: '100%',
        }}
      >
        <SheetTitle className="absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0">
          Discover Deals and Offers
        </SheetTitle>
        <div className="h-full overflow-y-auto overflow-x-hidden" ref={scrollContainerRef}>
          {/* Search Bar & Categories */}
          <div className="bg-white px-4 pt-4 pb-3">
            {/* Search Bar */}
            <div className="relative flex items-center h-11 bg-[#F5F5F5] rounded-xl mb-3">
              <Search className="absolute left-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Enter a dish name e.g. Egusi soup"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-10 text-sm bg-transparent outline-none placeholder:text-gray-400"
              />
              <button className="absolute right-3">
                <Mic className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Category Pills */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-1 py-1">
              {allCategories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => handleCategoryClick(category.value)}
                  className={`flex-shrink-0 flex items-center justify-center w-[56px] h-[56px] rounded-2xl transition-all active:scale-95 ${
                    selectedCategory === category.value
                      ? 'bg-[#FF7A1A] shadow-lg'
                      : 'bg-white shadow-sm hover:shadow-md'
                  }`}
                >
                  <img 
                    src={`/icons/categories/${category.value}.png`}
                    alt={category.label}
                    className="w-[52px] h-[52px] object-contain"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-[#F6F6F8]">
            {/* Show Featured & Popular only when NO category is selected */}
            {!selectedCategory && (
              <>
                {/* Featured Offer */}
                {featuredOffer && (
                  <div className="px-4 pt-3 pb-2">
                    <h2 className="text-[17px] font-semibold text-gray-900 mb-2">
                      Today's Special Offer
                    </h2>
                    <HeroOfferCard
                      title={featuredOffer.title}
                      imageUrl={featuredOffer.images?.[0] || '/images/Map.jpg'}
                      priceNow={`₾${Math.round(featuredOffer.smart_price).toLocaleString()}`}
                      priceOld={featuredOffer.original_price ? `₾${Math.round(featuredOffer.original_price).toLocaleString()}` : undefined}
                      discountLabel={getDiscount(featuredOffer) ? `${getDiscount(featuredOffer)}% off` : undefined}
                      ctaLabel="Reserve Now"
                      onClick={() => onOfferSelect(featuredOffer)}
                      onCtaClick={() => onOfferSelect(featuredOffer)}
                    />
                  </div>
                )}

                {/* Popular Now - Horizontal Scroll */}
                {popularOffers.length > 0 && (
                  <div className="pb-2">
                    <div className="flex items-center justify-between px-4 mb-2">
                      <h2 className="text-[17px] font-semibold text-gray-900">
                        Popular Now
                      </h2>
                      <button className="text-[13px] font-medium text-[#FF7A1A]">
                        SEE FULL MENU →
                      </button>
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
              <div className="px-4 pt-3 pb-20">
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
