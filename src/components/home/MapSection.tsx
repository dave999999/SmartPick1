import { Offer } from '@/lib/types';
import { Suspense, lazy } from 'react';
const SmartPickMap = lazy(() => import('@/components/SmartPickMap'));
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
    <div className="relative w-full m-0 p-0 h-[58vh] min-h-[420px] md:h-[56vh] lg:h-[52vh] xl:h-[48vh]">
      {/* Responsive-height Map */}
      <div className="w-full h-full m-0 p-0">
        <Suspense fallback={
          <div className="w-full h-full bg-[#050814] flex items-center justify-center rounded-2xl" aria-busy="true" aria-label="Loading map...">
            <div className="text-white/60 text-sm">Loading map...</div>
          </div>
        }>
          <SmartPickMap
            offers={offers}
            onOfferClick={onOfferClick}
            onMarkerClick={onMarkerClick}
            selectedCategory={selectedCategory}
            onCategorySelect={onCategorySelect}
            onLocationChange={onLocationChange}
            showUserLocation
          />
        </Suspense>
      </div>

      {/* Center Location Button - Dark glossy style with 44px touch target */}
      <button
        className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md rounded-full p-3 shadow-xl hover:shadow-2xl hover:bg-black/80 active:scale-95 transition-all z-30 border border-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
        <Crosshair className="w-5 h-5 text-orange-500" strokeWidth={2.5} />
      </button>
    </div>
  );
}
