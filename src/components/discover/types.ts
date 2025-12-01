/**
 * Type definitions for Unified Discover Sheet
 */

import { Offer, User } from '@/lib/types';

export type SheetHeight = 'collapsed' | 'mid' | 'full';
export type ContentMode = 'discover' | 'partner';
export type SortOption = 'recommended' | 'nearest' | 'cheapest' | 'expiring' | 'newest';

export interface SheetState {
  height: SheetHeight;
  mode: ContentMode;
  partnerId: string | null;
  isOpen: boolean;
}

export interface UnifiedDiscoverSheetProps {
  offers: Offer[];
  user: User | null;
  userLocation: [number, number] | null;
  open: boolean;
  onClose: () => void;
  
  // Mode control
  mode?: ContentMode;
  partnerId?: string | null;
  
  // Callbacks
  onOfferClick: (offer: Offer, index: number) => void;
  onModeChange?: (mode: ContentMode) => void;
  onHeightChange?: (height: SheetHeight) => void;
  
  // Discovery mode props
  onCategorySelect?: (category: string) => void;
  selectedCategory?: string;
  onSortChange?: (sort: SortOption) => void;
  selectedSort?: SortOption;
  
  // Map integration
  onMapHighlight?: (offerId: string | null) => void;
  onMapCenter?: (location: { lat: number; lng: number }) => void;
}

export interface OfferCluster {
  id: string;
  title: string;
  emoji: string;
  offers: Offer[];
}

export interface PartnerInfo {
  id: string;
  name: string;
  businessType: string;
  location: {
    latitude: number;
    longitude: number;
    district?: string;
  };
  rating?: number;
  totalReviews?: number;
}
