/**
 * OffersSheetDemo.tsx
 * Demo page to showcase the new Offers Sheet design
 */

import { useState } from 'react';
import { OffersSheetNew } from '@/components/offers/OffersSheetNew';
import { Offer } from '@/lib/types';
import { toast } from 'sonner';

export default function OffersSheetDemo() {
  const [showOffersSheet, setShowOffersSheet] = useState(true); // Auto-open on load

  const handleOfferSelect = (offer: Offer) => {
    toast.success(`Selected: ${offer.title}`);
    console.log('Offer selected:', offer);
    setShowOffersSheet(false);
  };

  return (
    <div className="relative h-screen w-full bg-gradient-to-br from-[#6b8080] to-[#758080] overflow-hidden">
      {/* Demo Background - Map-like appearance */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            SmartPick Offers Sheet
          </h1>
          <p className="text-xl text-white/80 drop-shadow">
            New Pixel-Perfect Design
          </p>
          <p className="text-sm text-white/60 max-w-md mx-auto">
            This is a demo of the completely rebuilt offers sheet matching the reference design exactly.
          </p>
        </div>
      </div>

      {/* Grid pattern overlay for map-like feel */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Toggle Button */}
      {!showOffersSheet && (
        <button
          onClick={() => setShowOffersSheet(true)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                     px-8 py-4 bg-[#FF6B35] hover:bg-[#FF8555] active:bg-[#E55A2B]
                     text-white text-[16px] font-semibold rounded-full
                     shadow-2xl hover:shadow-3xl transition-all active:scale-95
                     flex items-center gap-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Open Offers Sheet
        </button>
      )}

      {/* Info Badge */}
      <div className="fixed top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
        <span className="text-sm font-medium text-[#1A1A1A]">
          ✨ Demo Mode
        </span>
      </div>

      {/* New Offers Sheet */}
      <OffersSheetNew
        isOpen={showOffersSheet}
        onClose={() => setShowOffersSheet(false)}
        onOfferSelect={handleOfferSelect}
      />
    </div>
  );
}
