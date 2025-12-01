/**
 * DiscoverModeContent - Global Offer Discovery Interface
 * 
 * The main browsing experience featuring:
 * - Search bar with debounced input
 * - Sort pills (Recommended, Nearest, Cheapest, etc.)
 * - Category chips (horizontal scroll)
 * - Sectioned offer lists (Trending, Closing Soon, Under 5 GEL)
 * - 2-column offer card grid
 * - Empty state with fallback content
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  Star,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Offer, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCategoryIcon, getCategoryLabel, MAIN_CATEGORIES } from '@/lib/categories';
import { OfferCard } from '@/components/explore/OfferCard';
import { SortOption, OfferCluster } from './types';
import { calculateDistance as calcDist } from '@/lib/maps/distance';

interface DiscoverModeContentProps {
  offers: Offer[];
  user: User | null;
  userLocation: [number, number] | null;
  selectedCategory?: string;
  selectedSort?: SortOption;
  onCategorySelect?: (category: string) => void;
  onSortChange?: (sort: SortOption) => void;
  onOfferClick: (offer: Offer, index: number) => void;
  onMapHighlight?: (offerId: string | null) => void;
  onMapCenter?: (location: { lat: number; lng: number }) => void;
}

const SORT_OPTIONS = [
  { id: 'recommended', label: 'Recommended', emoji: '⭐', icon: Star },
  { id: 'nearest', label: 'Nearest', emoji: '📍', icon: MapPin },
  { id: 'cheapest', label: 'Cheapest', emoji: '💸', icon: DollarSign },
  { id: 'expiring', label: 'Expiring Soon', emoji: '⏳', icon: Clock },
  { id: 'newest', label: 'Newly Added', emoji: '🆕', icon: Sparkles },
] as const;

export function DiscoverModeContent({
  offers,
  user,
  userLocation,
  selectedCategory = '',
  selectedSort = 'recommended',
  onCategorySelect,
  onSortChange,
  onOfferClick,
  onMapHighlight,
  onMapCenter,
}: DiscoverModeContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const categoryRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort offers
  const filteredOffers = useMemo(() => {
    let result = offers.filter(offer => {
      // Search filter
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
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
        break;
    }

    return result;
  }, [offers, debouncedSearch, selectedCategory, selectedSort, userLocation]);

  // Generate offer clusters
  const offerClusters = useMemo((): OfferCluster[] => {
    const clusters: OfferCluster[] = [];

    // Trending (top 6 offers)
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
        emoji: '🥐',
        offers: fresh,
      });
    }

    return clusters;
  }, [filteredOffers]);

  // Handle card in view (map sync)
  const handleCardInView = (offer: Offer) => {
    onMapHighlight?.(offer.id);
    
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
    onSortChange?.('recommended');
    onCategorySelect?.('');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky Controls */}
      <div className="px-3 py-2 border-b border-gray-100 space-y-2 bg-white">
        {/* Search Bar */}
        <div className="relative flex items-center gap-1.5">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <Input
              placeholder="Search deals, places, items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 h-9 text-sm rounded-full border-gray-200 focus:border-orange-400 focus:ring-orange-400/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
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

        {/* Sort Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3">
          {SORT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = selectedSort === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onSortChange?.(option.id as SortOption)}
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

        {/* Category Chips */}
        <div
          ref={categoryRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-3 px-3"
        >
          {/* All Categories */}
          <button
            onClick={() => onCategorySelect?.('')}
            className={`flex flex-col items-center gap-0.5 min-w-[56px] shrink-0 transition-all ${
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
      <div ref={contentRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
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

            {/* Fallback: Show trending */}
            {offers.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-bold text-gray-600 mb-3">─── Trending Near You ───</h4>
                <div className="grid grid-cols-2 gap-2">
                  {offers.slice(0, 4).map((offer, idx) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      userLocation={userLocation}
                      onClick={() => onOfferClick(offer, idx)}
                      onInView={() => handleCardInView(offer)}
                    />
                  ))}
                </div>
              </div>
            )}
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
                  onInView={() => handleCardInView(offer)}
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
                  onInView={() => handleCardInView(offer)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bottom Padding for Safe Area */}
        <div className="h-24" />
      </div>
    </div>
  );
}
