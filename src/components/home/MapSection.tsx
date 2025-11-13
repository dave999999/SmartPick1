import { useState } from 'react';
import { Offer } from '@/lib/types';
import OfferMap from '@/components/OfferMap';
import { Navigation, Locate } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapSectionProps {
  offers: Offer[];
  onOfferClick: (offer: Offer) => void;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
  onLocationChange: (location: [number, number] | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function MapSection({
  offers,
  onOfferClick,
  selectedCategory,
  onCategorySelect,
  onLocationChange,
  searchQuery,
  onSearchChange,
}: MapSectionProps) {
  const [mapActivated, setMapActivated] = useState(false);

  return (
    <div className="relative w-full">
      {/* Map Container */}
      <div className="relative w-full h-[70vh] md:h-[60vh] rounded-2xl overflow-hidden shadow-lg">
      
      {/* Search Bar OVERLAY on top of map */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-full max-w-xl px-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search dishes, restaurants, categories..."
          className="w-full px-5 py-3 rounded-full bg-white shadow-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-base placeholder-gray-400"
        />
      </div>

      {/* Map Activation Overlay */}
      {!mapActivated && (
        <div
          className="absolute inset-0 z-[999] bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center cursor-pointer"
          onDoubleClick={() => setMapActivated(true)}
          onTouchStart={(e) => {
            // Handle double tap on mobile
            const now = Date.now();
            const lastTap = (e.currentTarget as any).lastTap || 0;
            if (now - lastTap < 300) {
              setMapActivated(true);
            }
            (e.currentTarget as any).lastTap = now;
          }}
        >
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl text-center">
            <p className="text-sm md:text-base font-semibold text-gray-900">
              Double tap to activate map
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Tap to explore nearby
            </p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className={`w-full h-full ${!mapActivated ? 'pointer-events-none' : ''}`}>
        <OfferMap
          offers={offers}
          onOfferClick={onOfferClick}
          selectedCategory={selectedCategory}
          onCategorySelect={onCategorySelect}
          onLocationChange={onLocationChange}
        />
      </div>

      {/* My Location Button Only */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-white hover:bg-gray-50 text-[#FF6B35] shadow-xl border-0"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const location: [number, number] = [
                    position.coords.latitude,
                    position.coords.longitude,
                  ];
                  onLocationChange(location);
                },
                (error) => {
                  console.error('Error getting location:', error);
                }
              );
            }
          }}
        >
          <Locate className="h-5 w-5" />
        </Button>
      </div>
      </div>
    </div>
  );
}
