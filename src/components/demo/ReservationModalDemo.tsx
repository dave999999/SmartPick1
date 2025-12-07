import React, { useState } from 'react';
import { Clock, MapPin, Minus, Plus } from 'lucide-react';

/**
 * Premium Compact Reservation Modal
 * Optimized for mobile - exactly matching user design reference
 */
export function ReservationModalDemo() {
  const [quantity, setQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);

  // Sample data
  const offer = {
    title: 'Khachapuri Combo',
    category: 'Georgian Feast',
    price: 12.99,
    image: 'https://images.unsplash.com/photo-1600028068383-ea12de19b015?w=400&h=400&fit=crop',
    pickupStart: '1:30 PM',
    pickupEnd: '2:00 PM',
    location: 'SmartPick Kitchen',
  };

  const userBalance = 615;
  const pointsPerUnit = 5;
  const totalPoints = pointsPerUnit * quantity;
  const maxQuantity = 3;
  const quantityLeft = 8;

  const handleReserve = async () => {
    setIsReserving(true);
    setTimeout(() => {
      setIsReserving(false);
      alert(`Reserved ${quantity} item(s) for ${totalPoints} SmartPoints!`);
    }, 2000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl opacity-20" />
      </div>

      {/* Main Card Container */}
      <div className="relative w-full max-w-xs z-10">
        {/* Premium Compact Glass Card */}
        <div className="backdrop-blur-[50px] bg-gradient-to-br from-white/70 via-white/60 to-slate-50/50 rounded-[32px] overflow-hidden shadow-2xl ring-1 ring-white/40 border border-white/30">
          {/* Inner glow */}
          <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />

          {/* ===== TOP: PRODUCT WITH PRICE + POINTS BADGE ===== */}
          <div className="relative p-5 pb-4">
            <div className="flex gap-3 items-start">
              {/* Food Image - Smaller */}
              <div className="w-[72px] h-[72px] flex-shrink-0 rounded-[16px] overflow-hidden shadow-md ring-1 ring-white/30">
                <img
                  src={offer.image}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title + Price + Badge (Vertical Stack) */}
              <div className="flex-1 min-w-0 flex flex-col justify-between pt-1">
                {/* Category + Title + Price */}
                <div>
                  <p className="text-[11px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">
                    {offer.category}
                  </p>
                  <h1 className="text-[16px] font-black text-slate-900 leading-tight mb-1.5">
                    {offer.title}
                  </h1>
                  <p className="text-[18px] font-black text-slate-900">
                    ${offer.price}
                  </p>
                </div>

                {/* Points Badge */}
                <div className="inline-flex items-center gap-1 bg-gradient-to-br from-orange-400/40 to-orange-300/30 backdrop-blur-md rounded-full px-2.5 py-1 ring-1 ring-orange-400/50 border border-orange-300/40 w-fit mt-2">
                  <span className="text-[10px] font-bold text-orange-700">⚡</span>
                  <span className="text-[11px] font-bold text-orange-700">
                    {totalPoints} Points
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== PRICE SUMMARY (2-COL GLASS) ===== */}
          <div className="relative px-5 pb-4">
            <div className="backdrop-blur-[25px] bg-gradient-to-br from-white/60 to-white/40 rounded-[18px] p-4 border border-white/40 ring-1 ring-white/50 shadow-md flex items-center justify-between gap-4">
              {/* Pickup Price */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Pickup Price
                </p>
                <p className="text-[20px] font-black text-slate-900">
                  ${offer.price}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Pay at pickup</p>
              </div>

              {/* Divider */}
              <div className="w-px h-14 bg-gradient-to-b from-transparent via-slate-300/50 to-transparent" />

              {/* Reserve with Points */}
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Reserve with
                </p>
                <p className="text-[20px] font-black text-orange-600">
                  {totalPoints}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">SmartPoints</p>
              </div>
            </div>
          </div>

          {/* ===== BALANCE + ADD POINTS (INLINE) ===== */}
          <div className="relative px-5 pb-4">
            <div className="backdrop-blur-[25px] bg-gradient-to-br from-emerald-100/60 to-teal-50/40 rounded-[16px] px-4 py-2.5 border border-emerald-200/50 ring-1 ring-white/50 shadow-md flex items-center justify-between">
              <p className="text-[12px] font-bold text-slate-700">
                Balance: <span className="text-emerald-700">{userBalance} pts</span>
              </p>
              <button className="bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md transition-all active:scale-95">
                Add Points
              </button>
            </div>
          </div>

          {/* ===== QUANTITY SELECTOR (INLINE) ===== */}
          <div className="relative px-5 pb-4">
            <div className="flex items-center justify-between gap-3">
              {/* Counter */}
              <div className="flex items-center gap-2 bg-white/70 backdrop-blur-md rounded-full px-3 py-2 ring-1 ring-slate-200/50 border border-white/40">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-6 h-6 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all active:scale-90 flex items-center justify-center"
                >
                  <Minus className="w-3 h-3" strokeWidth={3} />
                </button>
                <span className="text-[16px] font-black text-slate-900 w-5 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="w-6 h-6 rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-30 disabled:bg-slate-300 transition-all active:scale-90 flex items-center justify-center shadow-sm"
                >
                  <Plus className="w-3 h-3" strokeWidth={3} />
                </button>
              </div>

              {/* Availability */}
              <p className="text-[11px] font-bold text-emerald-600">
                Max {maxQuantity} • {quantityLeft} left
              </p>
            </div>
          </div>

          {/* ===== PICKUP INFO (SINGLE GLASS CARD) ===== */}
          <div className="relative px-5 pb-4">
            <div className="backdrop-blur-[25px] bg-gradient-to-br from-white/60 to-white/40 rounded-[18px] p-4 border border-white/40 ring-1 ring-white/50 shadow-md space-y-3">
              {/* Pickup Window */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0 ring-1 ring-orange-400/30">
                  <Clock className="w-4 h-4 text-orange-600" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">
                    Pickup window
                  </p>
                  <p className="text-[13px] font-black text-slate-900">
                    {offer.pickupStart} – {offer.pickupEnd}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200/50 to-transparent" />

              {/* Location */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0 ring-1 ring-orange-400/30">
                  <MapPin className="w-4 h-4 text-orange-600" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wide mb-0.5">
                    Location
                  </p>
                  <p className="text-[13px] font-black text-slate-900">
                    {offer.location}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ===== PRIMARY BUTTON ===== */}
          <div className="relative px-5 py-4 bg-gradient-to-t from-white/30 via-white/15 to-transparent">
            <button
              onClick={handleReserve}
              disabled={isReserving}
              className="w-full py-3.5 rounded-[22px] bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-[14px] uppercase tracking-wide shadow-xl ring-1 ring-orange-400/50 transition-all active:scale-[0.97] disabled:opacity-50 relative overflow-hidden"
            >
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-[22px] bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />

              {isReserving ? (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Reserving...
                </span>
              ) : (
                <span className="relative z-10">
                  RESERVE FOR {totalPoints} SMARTPOINTS
                </span>
              )}
            </button>

            {/* Insufficient Points Warning */}
            {userBalance < totalPoints && (
              <div className="mt-2 backdrop-blur-md bg-gradient-to-br from-red-100/70 to-rose-50/50 rounded-[12px] px-3 py-2 border border-red-200/50 ring-1 ring-red-300/30 shadow-sm">
                <p className="text-[10px] font-bold text-red-700 text-center">
                  Need {totalPoints - userBalance} more point{totalPoints - userBalance > 1 ? 's' : ''} to reserve
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card Shadow */}
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-transparent to-black/15 pointer-events-none blur-2xl -z-10" />
      </div>

      {/* Demo Label */}
      <div className="absolute bottom-4 left-4 right-4 text-center z-10">
        <p className="text-white/50 text-xs font-medium">
          🎨 Compact Premium Reservation Modal
        </p>
      </div>
    </div>
  );
}

export default ReservationModalDemo;
