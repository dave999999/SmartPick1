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
  return (
    <div className="relative w-full h-[70vh] md:h-[65vh]" style={{ marginBottom: 0, paddingBottom: 0, lineHeight: 0, marginLeft: 0, marginRight: 0 }}>
      {/* Search Bar OVERLAY on top of map */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-xl px-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search dishes, restaurants, categories..."
          className="w-full px-5 py-3 rounded-full bg-white shadow-xl border-0 focus:outline-none focus:ring-2 focus:ring-[#FF6B35] text-base placeholder-gray-400"
        />
      </div>

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
    </div>
  );
}
