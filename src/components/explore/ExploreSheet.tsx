/**
 * ExploreSheet - Premium Discovery Engine
 * 
 * A powerful, all-in-one offer discovery bottom sheet featuring:
 * - Sticky search bar with filters
 * - Smart sorting pills (Recommended, Nearest, Cheapest, etc.)
 * - Category carousel with icons
 * - Offer clusters (Trending, Closing Soon, Under 5 GEL)
 * - Map synchronization (highlights pins, centers on scroll)
 * - 3 drag states: collapsed, medium, expanded
 * - Premium animations and cosmic orange theme
 * 
 * Inspired by: Uber Eats, Apple Wallet, Google Maps Explore
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  TrendingUp,
  X,
  ChevronRight,
} from 'lucide-react';
import { Offer, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCategoryIcon, getCategoryLabel, MAIN_CATEGORIES } from '@/lib/categories';
import { OfferCard } from '@/components/explore/OfferCard';
import { calculateDistance as calcDist } from '@/lib/maps/distance';

interface ExploreSheetProps {
  offers: Offer[];
  user: User | null;
  userLocation: [number, number] | null;
  open: boolean;
  onClose: () => void;
  onOfferClick: (offer: Offer, index: number) => void;
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string;
  onMapHighlight?: (offerId: string | null) => void;
  onMapCenter?: (location: { lat: number; lng: number }) => void;
}

type SheetState = 'collapsed' | 'medium' | 'expanded';
type SortOption = 'recommended' | 'nearest' | 'cheapest' | 'expiring' | 'newest';

interface OfferCluster {
  id: string;
  title: string;
  emoji: string;
  offers: Offer[];
}

export function ExploreSheet({
  offers,
  user,
  userLocation,
  open,
  onClose,
  onOfferClick,
  onCategorySelect,
  selectedCategory = '',
  onMapHighlight,
  onMapCenter,
}: ExploreSheetProps) {
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<SortOption>('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [scrolledCardIndex, setScrolledCardIndex] = useState<number | null>(null);
  
  const sheetRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Sheet heights
  const HEIGHTS = {
    collapsed: '12vh',
    medium: '50vh',
    expanded: '85vh',
  };

  // Sort options config
  const SORT_OPTIONS = [
    { id: 'recommended', label: 'Recommended', emoji: '⭐', icon: Star },
    { id: 'nearest', label: 'Nearest', emoji: '📍', icon: MapPin },
    { id: 'cheapest', label: 'Cheapest', emoji: '💸', icon: DollarSign },
    { id: 'expiring', label: 'Expiring Soon', emoji: '⏳', icon: Clock },
    { id: 'newest', label: 'Newly Added', emoji: '🆕', icon: Sparkles },
  ] as const;

  // Filter and sort offers
  const filteredOffers = useMemo(() => {
    let result = offers.filter(offer => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = offer.title?.toLowerCase().includes(query);
        const descMatch = offer.description?.toLowerCase().includes(query);
        const partnerMatch = offer.partner?.business_name?.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !partnerMatch) return false;
      }

      // Category filter
      if (selectedCategory && offer.partner?.business_type !== selectedCategory) {
        return false;
      }

      return true;
    });

    // Apply sorting
    switch (selectedSort) {
      case 'nearest':
        if (userLocation) {
          result = result.sort((a, b) => {
            const distA = calcDist(
              { lat: userLocation[0], lng: userLocation[1] },
              { lat: a.partner?.location?.latitude || 0, lng: a.partner?.location?.longitude || 0 }
            );
            const distB = calcDist(
              { lat: userLocation[0], lng: userLocation[1] },
              { lat: b.partner?.location?.latitude || 0, lng: b.partner?.location?.longitude || 0 }
            );
            return distA - distB;
          });
        }
        break;
      
      case 'cheapest':
        result = result.sort((a, b) => (a.original_price || 0) - (b.original_price || 0));
        break;
      
      case 'expiring':
        result = result.sort((a, b) => {
          const timeA = new Date(a.pickup_end || '').getTime();
          const timeB = new Date(b.pickup_end || '').getTime();
          return timeA - timeB;
        });
        break;
      
      case 'newest':
        result = result.sort((a, b) => {
          const timeA = new Date(a.created_at || '').getTime();
          const timeB = new Date(b.created_at || '').getTime();
          return timeB - timeA;
        });
        break;
      
      case 'recommended':
      default:
        // Keep original order (server-side recommendation)
        break;
    }

    return result;
  }, [offers, searchQuery, selectedCategory, selectedSort, userLocation]);

  // Generate clusters
  const offerClusters = useMemo((): OfferCluster[] => {
    const clusters: OfferCluster[] = [];

    // Trending (offers with high reservation count or recent activity)
    const trending = filteredOffers.slice(0, 6);
    if (trending.length > 0) {
      clusters.push({
        id: 'trending',
        title: 'Trending Right Now',
        emoji: '🔥',
        offers: trending,
      });
    }

    // Closing Soon (expires in next 2 hours)
    const closingSoon = filteredOffers.filter(offer => {
      const endTime = new Date(offer.pickup_end || '').getTime();
      const now = Date.now();
      const hoursLeft = (endTime - now) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 2;
    }).slice(0, 6);
    
    if (closingSoon.length > 0) {
      clusters.push({
        id: 'closing',
        title: 'Closing Soon',
        emoji: '⏰',
        offers: closingSoon,
      });
    }

    // Under 5 GEL
    const cheap = filteredOffers
      .filter(offer => (offer.original_price || 0) <= 5)
      .slice(0, 6);
    
    if (cheap.length > 0) {
      clusters.push({
        id: 'cheap',
        title: 'Under 5 GEL',
        emoji: '💸',
        offers: cheap,
      });
    }

    // Freshly Baked (bakery category, created today)
    const today = new Date().toDateString();
    const fresh = filteredOffers
      .filter(offer => {
        const isBakery = offer.partner?.business_type === 'BAKERY';
        const isToday = new Date(offer.created_at || '').toDateString() === today;
        return isBakery && isToday;
      })
      .slice(0, 6);
    
    if (fresh.length > 0) {
      clusters.push({
        id: 'fresh',
        title: 'Freshly Baked Today',
        emoji: '🍞',
        offers: fresh,
      });
    }

    return clusters;
  }, [filteredOffers]);

  // Handle drag end
  const handleDragEnd = (_: any, info: PanInfo) => {
    const { offset, velocity } = info;

    if (offset.y > 100 || velocity.y > 500) {
      // Drag down
      if (sheetState === 'expanded') {
        setSheetState('medium');
      } else if (sheetState === 'medium') {
        setSheetState('collapsed');
      } else {
        onClose();
      }
    } else if (offset.y < -100 || velocity.y < -500) {
      // Drag up
      if (sheetState === 'collapsed') {
        setSheetState('medium');
      } else if (sheetState === 'medium') {
        setSheetState('expanded');
      }
    }
  };

  // Auto-scroll to selected category
  useEffect(() => {
    if (selectedCategory && categoryRef.current) {
      const categoryIndex = MAIN_CATEGORIES.indexOf(selectedCategory as any);
      if (categoryIndex >= 0) {
        const scrollPosition = categoryIndex * 100; // Approximate width per category
        categoryRef.current.scrollTo({
          left: scrollPosition,
          behavior: 'smooth',
        });
      }
    }
  }, [selectedCategory]);

  // Animate state changes
  useEffect(() => {
    controls.start({
      height: HEIGHTS[sheetState],
      transition: { type: 'spring', damping: 30, stiffness: 300 },
    });
  }, [sheetState, controls]);

  // Handle card scroll into view (map sync)
  const handleCardInView = (offer: Offer, index: number) => {
    setScrolledCardIndex(index);
    onMapHighlight?.(offer.id);
    
    // Center map when card is 40% into view
    if (offer.partner?.location) {
      onMapCenter?.({
        lat: offer.partner.location.latitude,
        lng: offer.partner.location.longitude,
      });
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSort('recommended');
    if (onCategorySelect) onCategorySelect('');
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: sheetState === 'expanded' ? 0.4 : 0 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black z-40 pointer-events-none"
      />

      {/* Bottom Sheet */}
      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ height: HEIGHTS.collapsed }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col"
        style={{
          maxHeight: '90vh',
        }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Collapsed State Header */}
        {sheetState === 'collapsed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 cursor-pointer"
            onClick={() => setSheetState('medium')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-orange-500 fill-orange-500" />
                <span className="font-bold text-gray-900">Explore Offers</span>
                <span className="text-sm text-gray-500">({offers.length})</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </motion.div>
        )}

        {/* Main Content (Medium & Expanded) */}
        {sheetState !== 'collapsed' && (
          <div ref={contentRef} className="flex-1 flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="px-3 py-2 border-b border-gray-100 space-y-2">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Discover</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <div className="relative flex items-center gap-1.5">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      placeholder="Search deals, places, item…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 h-9 text-sm rounded-full border-gray-200 focus:border-orange-400 focus:ring-orange-400/20"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`h-9 w-9 rounded-full border-gray-200 shrink-0 ${
                      showFilters ? 'bg-orange-50 border-orange-300' : ''
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Smart Sorting Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3">
                {SORT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = selectedSort === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setSelectedSort(option.id as SortOption)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/30'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-sm">{option.emoji}</span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Row */}
              <div
                ref={categoryRef}
                className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3"
              >
                {/* All Categories */}
                <button
                  onClick={() => onCategorySelect?.('')}
                  className={`flex flex-col items-center gap-0.5 min-w-[56px] shrink-0 ${
                    !selectedCategory ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                      !selectedCategory
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 scale-105'
                        : 'bg-gray-100'
                    }`}
                  >
                    ⭐
                  </div>
                  <span className="text-[10px] font-medium text-gray-700">All</span>
                </button>

                {MAIN_CATEGORIES.map((category) => {
                  const categoryEmoji = getCategoryIcon(category);
                  const isActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      onClick={() => onCategorySelect?.(category)}
                      className={`flex flex-col items-center gap-0.5 min-w-[56px] shrink-0 transition-all ${
                        isActive ? 'opacity-100' : 'opacity-60'
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                          isActive
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30 scale-105'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {categoryEmoji}
                      </div>
                      <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">
                        {getCategoryLabel(category).split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
              {/* Empty State */}
              {filteredOffers.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <div className="text-5xl mb-3">🙈</div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">
                    No offers match your filters
                  </h3>
                  <p className="text-xs text-gray-600 mb-3 px-4">
                    Try clearing filters or browsing what's nearby!
                  </p>
                  <Button
                    onClick={handleClearFilters}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white h-9 text-sm"
                  >
                    Clear Filters
                  </Button>
                </motion.div>
              )}

              {/* Offer Clusters */}
              {filteredOffers.length > 0 && offerClusters.map((cluster) => (
                <div key={cluster.id} className="space-y-2">
                  {/* Cluster Header */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl">{cluster.emoji}</span>
                    <h3 className="text-sm font-bold text-gray-900">
                      {cluster.title}
                    </h3>
                  </div>

                  {/* Cluster Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {cluster.offers.map((offer, idx) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        userLocation={userLocation}
                        onClick={() => onOfferClick(offer, idx)}
                        onInView={() => handleCardInView(offer, idx)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* All Offers Section */}
              {filteredOffers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm font-bold text-gray-900">All Offers</h3>
                    <span className="text-xs text-gray-500">
                      ({filteredOffers.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {filteredOffers.map((offer, idx) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        userLocation={userLocation}
                        onClick={() => onOfferClick(offer, idx)}
                        onInView={() => handleCardInView(offer, idx)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Padding for Safe Area */}
              <div className="h-24" />
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
