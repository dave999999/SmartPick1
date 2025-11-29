/**
 * REFACTORED: Premium Dark Map Section
 * Glass overlay with darker map background
 */

import { Offer } from '@/lib/types';
import { Suspense, lazy } from 'react';
const SmartPickMap = lazy(() => import('@/components/SmartPickMap'));

interface MapSectionNewProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  onMarkerClick?: (partnerName: string, partnerAddress: string | undefined, offers: Offer[]) => void;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  onLocationChange: (location: [number, number] | null) => void;
  userLocation?: [number, number] | null;
}

export function MapSectionNew({
  offers,
  onOfferClick,
  onMarkerClick,
  selectedCategory,
  onCategorySelect,
  onLocationChange,
  userLocation,
}: MapSectionNewProps) {
  return (
    <div className="relative w-full h-full">
      {/* Map Overlay Gradient for better contrast */}
      <div className="sp-map-overlay" />
      
      {/* Map */}
      <div className="w-full h-full">
        <Suspense fallback={
          <div className="w-full h-full bg-sp-bg flex items-center justify-center" aria-busy="true" aria-label="Loading map...">
            <div className="text-sp-text-muted text-sm">Loading map...</div>
          </div>
        }>
          <SmartPickMap
            offers={offers}
            onOfferClick={onOfferClick}
            onMarkerClick={onMarkerClick}
            selectedCategory={selectedCategory}
            onCategorySelect={onCategorySelect}
            onLocationChange={onLocationChange}
            userLocation={userLocation}
            showUserLocation
          />
        </Suspense>
      </div>
    </div>
  );
}
