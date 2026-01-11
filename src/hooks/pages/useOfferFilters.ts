/**
 * useOfferFilters - Search, filter, and sort logic for offers
 * 
 * Manages all filtering and sorting state for the offers list.
 * Includes search by partner/title, category filters, price range, distance, and sorting options.
 * Extracted from IndexRedesigned.tsx to improve testability and reusability.
 */

import { useState, useMemo } from 'react';
import { Offer } from '@/lib/types';
import { FilterState, SortOption } from '@/components/SearchAndFilters';
import { DEFAULT_24H_OFFER_DURATION_HOURS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface UseOfferFiltersProps {
  offers: Offer[];
  userLocation: [number, number] | null;
}

export interface OfferFiltersState {
  searchQuery: string;
  filters: FilterState;
  sortBy: SortOption;
  selectedCategory: string;
  selectedSubcategory: string;
  filteredOffers: Offer[];
  mapFilteredOffers: Offer[];
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterState) => void;
  setSortBy: (sort: SortOption) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedSubcategory: (subcategory: string) => void;
}

// Helper: Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Get partner location from offer
function getPartnerLocation(offer: Offer): { lat: number; lng: number } | null {
  if (offer.partner?.latitude && offer.partner?.longitude) {
    return {
      lat: Number(offer.partner.latitude),
      lng: Number(offer.partner.longitude),
    };
  }
  return null;
}

export function useOfferFilters({ offers, userLocation }: UseOfferFiltersProps): OfferFiltersState {
  const [searchQuery, setSearchQuery] = useState('');
  // ⚡ OPTIMIZATION: Debounce search to reduce filtering operations by 80%
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const [filters, setFilters] = useState<FilterState>({
    minPrice: 0,
    maxPrice: 100,
    maxDistance: 50,
    availableNow: false,
  });
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');

  // Main filtering and sorting logic for the offers carousel/list
  const getFilteredAndSortedOffers = (): Offer[] => {
    let filtered = [...offers];

    // Apply search filter first (for partner name filtering)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(offer =>
        offer.title.toLowerCase().includes(query) ||
        offer.partner?.business_name?.toLowerCase().includes(query) ||
        offer.category.toLowerCase().includes(query)
      );
      
      // If searching for a partner, apply category filter to the carousel only
      // The category filter is applied AFTER partner filter so it only filters the partner's offers
      if (selectedCategory && selectedCategory !== '') {
        logger.debug('[useOfferFilters] Filtering partner offers by category:', selectedCategory);
        filtered = filtered.filter(o => o.category === selectedCategory);
      }
    } else {
      // If NOT searching for a partner, apply category filter globally (affects map)
      if (selectedCategory && selectedCategory !== '') {
        logger.debug('[useOfferFilters] Filtering all offers by category:', selectedCategory);
        logger.debug('📊 Total offers before category filter:', filtered.length);
        filtered = filtered.filter(o => o.category === selectedCategory);
        logger.debug('✅ Offers after category filter:', filtered.length);
      }
    }

    // Price range filter
    filtered = filtered.filter(offer =>
      Number(offer.smart_price) >= filters.minPrice &&
      Number(offer.smart_price) <= filters.maxPrice
    );

    // Available now filter
    if (filters.availableNow) {
      filtered = filtered.filter(offer => (offer as any).available_quantity > 0);
    }

    // Distance filter (if user location available)
    if (userLocation && filters.maxDistance < 50) {
      filtered = filtered.filter(offer => {
        const location = getPartnerLocation(offer);
        if (!location) return false;
        const distance = calculateDistance(
          userLocation[0],
          userLocation[1],
          location.lat,
          location.lng
        );
        return distance <= filters.maxDistance;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'nearest':
          if (!userLocation) return 0;
          const locA = getPartnerLocation(a);
          const locB = getPartnerLocation(b);
          if (!locA || !locB) return 0;
          const distA = calculateDistance(userLocation[0], userLocation[1], locA.lat, locA.lng);
          const distB = calculateDistance(userLocation[0], userLocation[1], locB.lat, locB.lng);
          return distA - distB;

        case 'cheapest':
          return Number(a.smart_price) - Number(b.smart_price);

        case 'expiring':
          const expiryA = (a as any)?.expires_at || (a as any)?.auto_expire_in || 
            new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
          const expiryB = (b as any)?.expires_at || (b as any)?.auto_expire_in || 
            new Date(Date.now() + DEFAULT_24H_OFFER_DURATION_HOURS * 60 * 60 * 1000).toISOString();
          return new Date(expiryA).getTime() - new Date(expiryB).getTime();

        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    return filtered;
  };

  // Separate filtered offers for the map - don't apply category filter when partner is selected
  const getMapFilteredOffers = (): Offer[] => {
    let filtered = [...offers];

    // If partner search is active, show all pins (don't filter by category)
    if (searchQuery.trim()) {
      return offers;
    }

    // Otherwise, apply category filter to map
    if (selectedCategory && selectedCategory !== '') {
      filtered = filtered.filter(o => o.category === selectedCategory);
    }

    // Apply other filters (price, distance, availability)
    filtered = filtered.filter(offer =>
      Number(offer.smart_price) >= filters.minPrice &&
      Number(offer.smart_price) <= filters.maxPrice
    );

    if (filters.availableNow) {
      filtered = filtered.filter(offer => (offer as any).available_quantity > 0);
    }

    if (userLocation && filters.maxDistance < 50) {
      filtered = filtered.filter(offer => {
        const location = getPartnerLocation(offer);
        if (!location) return false;
        const distance = calculateDistance(
          userLocation[0],
          userLocation[1],
          location.lat,
          location.lng
        );
        return distance <= filters.maxDistance;
      });
    }

    return filtered;
  };

  // Memoized filtered offers for the carousel/list
  const filteredOffers = useMemo(() => getFilteredAndSortedOffers(), [
    offers,
    selectedCategory,
    debouncedSearchQuery,
    filters.minPrice,
    filters.maxPrice,
    filters.maxDistance,
    filters.availableNow,
    userLocation,
    sortBy
  ]);

  // Memoized filtered offers for the map
  const mapFilteredOffers = useMemo(() => {
    const filtered = getMapFilteredOffers();
    logger.debug('[useOfferFilters] mapFilteredOffers updated', {
      count: filtered.length,
      offersFromQuery: offers.length,
      selectedCategory,
      searchQuery: debouncedSearchQuery
    });
    return filtered;
  }, [
    offers,
    selectedCategory,
    debouncedSearchQuery,
    filters.minPrice,
    filters.maxPrice,
    filters.maxDistance,
    filters.availableNow,
    userLocation
  ]);

  return {
    searchQuery,
    filters,
    sortBy,
    selectedCategory,
    selectedSubcategory,
    filteredOffers,
    mapFilteredOffers,
    setSearchQuery,
    setFilters,
    setSortBy,
    setSelectedCategory,
    setSelectedSubcategory,
  };
}
