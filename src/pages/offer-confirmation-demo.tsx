import { useState } from 'react';
import ReservationModalNew from '@/components/map/ReservationModalNew';
import type { Offer, User } from '@/lib/types';

export default function OfferConfirmationDemo() {
  const [isOpen, setIsOpen] = useState(true);

  // Mock user with points
  const mockUser: User = {
    id: 'demo-user-123',
    email: 'demo@smartpick.ge',
    name: 'Demo User',
    role: 'CUSTOMER',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Mock offer matching the Offer type
  const sampleOffer: Offer = {
    id: '1',
    title: 'Khachapuri Combo',
    category: 'Georgian Feast',
    images: ['https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400&q=80'],
    smart_price: 12.99,
    quantity_available: 8,
    pickup_start: new Date(new Date().setHours(13, 30)).toISOString(),
    pickup_end: new Date(new Date().setHours(14, 0)).toISOString(),
    partner_id: 'demo-partner',
    partner: {
      business_name: 'SmartPick Kitchen',
      address: '123 Main Street, Tbilisi',
      location: {
        address: '123 Main Street, Tbilisi',
      },
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Offer;

  const handleReservationCreated = (reservationId: string) => {
    console.log('Reservation created:', reservationId);
    alert(`Reserved successfully! Reservation ID: ${reservationId}`);
    setIsOpen(false);
    // Reopen after a delay for demo purposes
    setTimeout(() => setIsOpen(true), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Simulated Map Background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: 'url(/images/Map.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Dark overlay to simulate map */}
      <div className="absolute inset-0 bg-slate-900/60" />

      {/* Mock map markers */}
      <div className="absolute top-1/4 left-1/3 w-8 h-8 bg-orange-500 rounded-full shadow-lg animate-pulse" />
      <div className="absolute top-1/2 right-1/4 w-8 h-8 bg-teal-500 rounded-full shadow-lg animate-pulse" />
      <div className="absolute bottom-1/3 left-1/2 w-8 h-8 bg-red-500 rounded-full shadow-lg animate-pulse" />

      {/* Instructions */}
      <div className="absolute top-4 left-4 right-4 z-40 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
        <p className="text-white text-sm font-medium text-center">
          📱 Demo: Beige Glass Modal Over Map Background
        </p>
        <p className="text-white/70 text-xs text-center mt-1">
          Click outside the modal to close/reopen
        </p>
      </div>

      {/* New Reservation Modal */}
      <ReservationModalNew
        offer={sampleOffer}
        user={mockUser}
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
          setTimeout(() => setIsOpen(true), 1500);
        }}
        onReservationCreated={handleReservationCreated}
        initialQuantity={1}
      />
    </div>
  );
}
