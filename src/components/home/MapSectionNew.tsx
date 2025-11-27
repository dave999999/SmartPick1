/**
 * REFACTORED: Premium Dark Map Section
 * Glass overlay with darker map background
 */

import { Offer } from '@/lib/types';
import { Suspense, lazy } from 'react';
const SmartPickMap = lazy(() => import('@/components/SmartPickMap'));
import { Crosshair } from 'lucide-react';

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

      {/* Center Location Button - Premium Dark Style */}
      <button
        className="
          absolute top-[25%] right-4 -translate-y-1/2 z-30
          bg-sp-surface-glass backdrop-blur-xl
          rounded-full p-3
          border border-sp-border-soft
          shadow-[0_8px_24px_rgba(0,0,0,0.6)]
          hover:shadow-[0_12px_32px_rgba(0,0,0,0.7)]
          hover:border-sp-border-strong
          active:scale-95
          transition-all duration-200
          min-w-[44px] min-h-[44px] 
          flex items-center justify-center
        "
        onClick={() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                onLocationChange([position.coords.latitude, position.coords.longitude]);
              },
              (error) => {
                console.error('Error getting location:', error);
              }
            );
          }
        }}
        aria-label="Center map on my location"
      >
        <Crosshair className="w-5 h-5 text-sp-accent-orange" strokeWidth={2.5} />
      </button>
    </div>
  );
}
