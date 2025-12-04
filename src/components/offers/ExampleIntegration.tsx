/**
 * Example: Integrating OffersSheetNew into your Map component
 * Replace your existing offers sheet with this new implementation
 */

import { useState } from 'react';
import { OffersSheetNew } from '@/components/offers/OffersSheetNew';
import { Offer } from '@/lib/types';

export function MapComponent() {
  const [showOffersSheet, setShowOffersSheet] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const handleOfferSelect = (offer: Offer) => {
    setSelectedOffer(offer);
    setShowOffersSheet(false);
    
    // TODO: Navigate to offer details or show reservation modal
    // Example:
    // navigate(`/offer/${offer.id}`);
    // OR
    // setShowReservationModal(true);
  };

  return (
    <div className="relative h-screen">
      {/* Your existing map component */}
      <div id="map" className="w-full h-full">
        {/* Map implementation */}
      </div>

      {/* Browse Offers Button - positioned at bottom center */}
      <button
        onClick={() => setShowOffersSheet(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                   px-6 py-3 bg-[#FF6B35] hover:bg-[#FF8555] active:bg-[#E55A2B]
                   text-white text-[15px] font-semibold rounded-full
                   shadow-lg hover:shadow-xl transition-all active:scale-95
                   flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Browse Offers
      </button>

      {/* New Offers Sheet */}
      <OffersSheetNew
        isOpen={showOffersSheet}
        onClose={() => setShowOffersSheet(false)}
        onOfferSelect={handleOfferSelect}
      />
    </div>
  );
}
