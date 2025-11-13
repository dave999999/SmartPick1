import { Offer } from '@/lib/types';
import OfferMap from '@/components/OfferMap';
import { Navigation } from 'lucide-react';

interface MapSectionProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  onLocationChange: (location: [number, number] | null) => void;
}

export function MapSection({
  offers,
  onOfferClick,
  selectedCategory,
  onCategorySelect,
  onLocationChange,
}: MapSectionProps) {
  return (
    <div className="relative w-full h-[65vh]" style={{ marginBottom: 0, paddingBottom: 0, lineHeight: 0 }}>
      {/* Map - Full width, no gaps */}
      <div className="absolute inset-0 w-full h-full" style={{ margin: 0, padding: 0, lineHeight: 0, fontSize: 0 }}>
        <style>{`
          .leaflet-control-zoom { display: none !important; }
          .leaflet-container { margin: 0 !important; padding: 0 !important; border: none !important; line-height: 0 !important; }
          .leaflet-bottom { margin: 0 !important; padding: 0 !important; }
        `}</style>
        <OfferMap
          offers={offers}
          onOfferClick={onOfferClick}
          selectedCategory={selectedCategory}
          onCategorySelect={onCategorySelect}
          onLocationChange={onLocationChange}
        />
      </div>

      {/* Center Location Button */}
      <button
        className="absolute bottom-6 right-6 bg-white rounded-full p-3 shadow-lg z-10"
        onClick={() => {
          // Get user's current location
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
              onLocationChange([position.coords.latitude, position.coords.longitude]);
            });
          }
        }}
      >
        <Navigation className="w-5 h-5 text-gray-900" />
      </button>
    </div>
  );
}
