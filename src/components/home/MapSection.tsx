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
}

export function MapSection({
  offers,
  onOfferClick,
  selectedCategory,
  onCategorySelect,
  onLocationChange,
}: MapSectionProps) {
  const [mapActivated, setMapActivated] = useState(false);

  return (
    <div className="relative w-full h-[70vh] md:h-[60vh] rounded-2xl overflow-hidden shadow-2xl">
      {/* Map Activation Overlay */}
      {!mapActivated && (
        <div
          className="absolute inset-0 z-[999] bg-black/20 backdrop-blur-[1px] flex items-center justify-center cursor-pointer"
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
          <div className="bg-white/95 backdrop-blur-md rounded-2xl px-6 py-4 shadow-xl text-center animate-bounce">
            <p className="text-sm md:text-base font-semibold text-gray-900">
              Double tap to activate map
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Prevents accidental scrolling
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

      {/* Floating Controls */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-white/95 hover:bg-white text-[#00C896] shadow-lg border border-gray-200"
          onClick={() => {
            // Trigger "Near Me" functionality
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
          <Navigation className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-white/95 hover:bg-white text-[#00C896] shadow-lg border border-gray-200"
          onClick={() => {
            // Trigger "My Location" functionality
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
  );
}
