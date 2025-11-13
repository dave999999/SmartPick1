import { Offer } from '@/lib/types';
import OfferMap from '@/components/OfferMap';
import { Crosshair } from 'lucide-react';

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
    <div className="relative w-full h-full">
      {/* Map - Full screen */}
      <div className="absolute inset-0 w-full h-full">
        <OfferMap
          offers={offers}
          onOfferClick={onOfferClick}
          selectedCategory={selectedCategory}
          onCategorySelect={onCategorySelect}
          onLocationChange={onLocationChange}
        />
      </div>

      {/* Center Location Button - Crosshair icon in white circle */}
      <button
        className="absolute bottom-[42vh] right-4 bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow z-[50]"
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
      >
        <Crosshair className="w-6 h-6 text-gray-900" />
      </button>
    </div>
  );
}
