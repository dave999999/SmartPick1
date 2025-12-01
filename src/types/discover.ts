// Type definitions for Unified Discover System

export type SheetHeight = 'closed' | 'collapsed' | 'mid' | 'full';
export type ContentMode = 'discover' | 'partner';
export type SortOption = 'recommended' | 'nearest' | 'cheapest' | 'expiring' | 'newest';

export interface DiscoverSheetProps {
  isOpen: boolean;
  mode: ContentMode;
  height?: SheetHeight;
  partnerId?: string | null;
  offers: Offer[];
  userLocation: [number, number] | null;
  onClose: () => void;
  onHeightChange?: (height: SheetHeight) => void;
  onModeChange?: (mode: ContentMode) => void;
  onOfferSelect: (offerId: string) => void;
  onMapSync?: (offerId: string, center: boolean) => void;
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
  offers: Offer[];
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  original_price: number;
  discounted_price: number;
  discount_percent?: number;
  partner_id: string;
  partner?: {
    business_name: string;
    business_type: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  category?: string;
  distance?: number;
  eta?: number;
  pickup_time_start: string;
  pickup_time_end: string;
  quantity_available?: number;
  created_at: string;
}

export interface Partner {
  id: string;
  business_name: string;
  business_type: string;
  location: {
    latitude: number;
    longitude: number;
  };
  emoji?: string;
}
