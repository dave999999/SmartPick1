import { Offer } from '@/lib/types';
import OfferMap from '@/components/OfferMap';
import { Crosshair } from 'lucide-react';

interface MapSectionProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  onMarkerClick?: (partnerName: string, partnerAddress: string | undefined, offers: Offer[]) => void;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  onLocationChange: (location: [number, number] | null) => void;
}

export function MapSection({
  offers,
  onOfferClick,
  onMarkerClick,
  selectedCategory,
  onCategorySelect,
  onLocationChange,
}: MapSectionProps) {
  return (
    <div className="absolute inset-0 w-full h-full m-0 p-0">
      {/* Borderless Full Screen Map */}
      <div className="w-full h-full m-0 p-0">
        <OfferMap
          offers={offers}
          onOfferClick={onOfferClick}
          onMarkerClick={onMarkerClick}
          selectedCategory={selectedCategory}
          onCategorySelect={onCategorySelect}
          onLocationChange={onLocationChange}
        />
      </div>

      {/* Center Location Button - positioned above bottom overlay */}
      <button
        className="absolute bottom-[47%] right-4 bg-white rounded-full p-3 shadow-md hover:shadow-lg transition-shadow z-30"
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
        <Crosshair className="w-5 h-5 text-gray-900" />
      </button>
    </div>
  );
}
