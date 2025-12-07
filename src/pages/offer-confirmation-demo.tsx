import { useState } from 'react';
import { OfferConfirmationCard } from '@/components/offers/OfferConfirmationCard';

export default function OfferConfirmationDemo() {
  const [userBalance, setUserBalance] = useState(615);

  const sampleOffer = {
    id: '1',
    name: 'Khachapuri Combo',
    category: 'Georgian Feast',
    image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=400&q=80',
    price: 12.99,
    pointsRequired: 5,
    maxQuantity: 8,
    pickupWindow: {
      start: '1:30 PM',
      end: '2:00 PM',
    },
    location: 'SmartPick Kitchen',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // expires in 24 hours
  };

  // Check if offer is expired
  const isOfferExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Don't render if offer is expired
  if (isOfferExpired(sampleOffer.expiresAt)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">This offer has expired</div>
      </div>
    );
  }

  const handleReserve = (quantity: number) => {
    const totalPoints = sampleOffer.pointsRequired * quantity;
    if (userBalance >= totalPoints) {
      setUserBalance(userBalance - totalPoints);
      alert(`Reserved ${quantity} x ${sampleOffer.name} for ${totalPoints} points!`);
    }
  };

  const handleAddPoints = () => {
    alert('Add Points functionality - would open payment/points purchase flow');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <OfferConfirmationCard
        offer={sampleOffer}
        userBalance={userBalance}
        onReserve={handleReserve}
        onAddPoints={handleAddPoints}
      />
    </div>
  );
}
