// Utility functions for filtering, sorting, and organizing offers

import { Offer as BaseOffer } from '@/lib/types';
import { SortOption } from '@/types/discover';

// Extended offer with computed fields for filtering
export interface EnrichedOffer extends BaseOffer {
  distance?: number;
  eta?: number;
  discount_percent?: number;
}

export interface FilterState {
  searchQuery: string;
  selectedSort: SortOption;
  selectedCategory: string | null;
  priceRange: [number, number] | null;
  distanceLimit: number | null;
  availableOnly: boolean;
}

export interface OfferSection {
  id: string;
  title: string;
  emoji: string;
  offers: EnrichedOffer[];
}

export function computeVisibleOffers(
  allOffers: EnrichedOffer[],
  filterState: FilterState,
  userLocation: [number, number] | null
): { visibleOffers: EnrichedOffer[], sections: OfferSection[] } {
  
  // Step 1: Apply filters
  let filtered = applyFilters(allOffers, filterState, userLocation);
  
  // Step 2: Enrich with distances
  filtered = enrichWithDistances(filtered, userLocation);
  
  // Step 3: Sort
  const sorted = sortOffers(filtered, filterState.selectedSort);
  
  // Step 4: Build sections
  const sections = buildOfferSections(sorted);
  
  return { visibleOffers: sorted, sections };
}

function applyFilters(
  offers: EnrichedOffer[],
  filterState: FilterState,
  userLocation: [number, number] | null
): EnrichedOffer[] {
  
  let filtered = [...offers];
  
  // Available only
  if (filterState.availableOnly) {
    filtered = filtered.filter(o => (o.quantity_available || 0) > 0);
  }
  
  // Search
  if (filterState.searchQuery.trim()) {
    const query = filterState.searchQuery.toLowerCase();
    filtered = filtered.filter(o => 
      o.title.toLowerCase().includes(query) ||
      o.description.toLowerCase().includes(query) ||
      (o.partner?.business_name || '').toLowerCase().includes(query)
    );
  }
  
  // Category
  if (filterState.selectedCategory) {
    filtered = filtered.filter(o => 
      (o.partner?.business_type || o.category) === filterState.selectedCategory
    );
  }
  
  // Price range
  if (filterState.priceRange) {
    const [min, max] = filterState.priceRange;
    filtered = filtered.filter(o =>
      o.smart_price >= min && o.smart_price <= max
    );
  }  return filtered;
}

function enrichWithDistances(
  offers: EnrichedOffer[],
  userLocation: [number, number] | null
): EnrichedOffer[] {
  if (!userLocation) return offers;
  
  return offers.map(offer => {
    const partnerLocation = offer.partner?.location;
    if (!partnerLocation) return offer;
    
    const distance = calculateDistance(
      userLocation,
      [partnerLocation.latitude, partnerLocation.longitude]
    );
    
    const eta = Math.round((distance / 4) * 60); // 4 km/h walking speed
    
    return { ...offer, distance, eta };
  });
}

function sortOffers(offers: EnrichedOffer[], sortOption: SortOption): EnrichedOffer[] {
  const sorted = [...offers];
  
  switch (sortOption) {
    case 'nearest':
      return sorted.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    
    case 'cheapest':
      return sorted.sort((a, b) => a.smart_price - b.smart_price);
    
    case 'expiring':
      return sorted.sort((a, b) =>
        new Date(a.pickup_end || a.pickup_window?.end || '').getTime() - 
        new Date(b.pickup_end || b.pickup_window?.end || '').getTime()
      );    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    
    case 'recommended':
    default:
      return sorted.sort((a, b) => 
        calculateRecommendationScore(b) - calculateRecommendationScore(a)
      );
  }
}

function calculateRecommendationScore(offer: EnrichedOffer): number {
  let score = 0;
  
  // Distance factor
  if (offer.distance) {
    score += Math.max(0, 100 - offer.distance * 10);
  }
  
  // Discount factor
  const discountPercent = offer.discount_percent ||
    ((offer.original_price - offer.smart_price) / offer.original_price * 100);
  score += discountPercent / 2;
  
  // Urgency factor
  const now = new Date().getTime();
  const end = new Date(offer.pickup_end || offer.pickup_window?.end || '').getTime();
  const hoursUntilExpiry = (end - now) / (1000 * 60 * 60);
  
  if (hoursUntilExpiry < 2) {
    score += 50;
  } else if (hoursUntilExpiry < 4) {
    score += 30;
  } else if (hoursUntilExpiry < 8) {
    score += 10;
  }
  
  return score;
}

function buildOfferSections(offers: EnrichedOffer[]): OfferSection[] {
  const sections: OfferSection[] = [];
  const now = new Date();
  
  // Closing Soon
  const closingSoon = offers.filter(o => {
    const end = new Date(o.pickup_end || o.pickup_window?.end || '');
    const hours = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hours > 0 && hours <= 2;
  }).slice(0, 6);
  
  if (closingSoon.length > 0) {
    sections.push({
      id: 'closing-soon',
      title: 'Closing Soon',
      emoji: '⏳',
      offers: closingSoon
    });
  }
  
  // Under 5 GEL
  const under5 = offers.filter(o => o.smart_price <= 5).slice(0, 8);
  if (under5.length > 0) {
    sections.push({
      id: 'under-5',
      title: 'Under 5₾',
      emoji: '💸',
      offers: under5
    });
  }
  
  // Near You
  const nearby = offers.filter(o => o.distance && o.distance <= 1).slice(0, 8);
  if (nearby.length > 0) {
    sections.push({
      id: 'near-you',
      title: 'Near You',
      emoji: '🎯',
      offers: nearby
    });
  }
  
  // New Arrivals
  const last24h = now.getTime() - (24 * 60 * 60 * 1000);
  const newArrivals = offers.filter(o => 
    new Date(o.created_at).getTime() > last24h
  ).slice(0, 6);
  
  if (newArrivals.length > 0) {
    sections.push({
      id: 'new-arrivals',
      title: 'New Arrivals',
      emoji: '🆕',
      offers: newArrivals
    });
  }
  
  // All Offers (fallback)
  if (sections.length === 0 && offers.length > 0) {
    sections.push({
      id: 'all-offers',
      title: 'All Offers',
      emoji: '🎁',
      offers: offers.slice(0, 20)
    });
  }
  
  return sections;
}

function calculateDistance(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
