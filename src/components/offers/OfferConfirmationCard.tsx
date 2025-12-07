import { useState } from 'react';
import { Clock, MapPin, Minus, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OfferConfirmationCardProps {
  offer: {
    id: string;
    name: string;
    category: string;
    image: string;
    price: number;
    pointsRequired: number;
    maxQuantity: number;
    pickupWindow: {
      start: string;
      end: string;
    };
    location: string;
  };
  userBalance: number;
  onReserve: (quantity: number) => void;
  onAddPoints: () => void;
}

export function OfferConfirmationCard({
  offer,
  userBalance,
  onReserve,
  onAddPoints,
}: OfferConfirmationCardProps) {
  const [quantity, setQuantity] = useState(1);

  const totalPoints = offer.pointsRequired * quantity;
  const hasEnoughPoints = userBalance >= totalPoints;

  const handleIncrement = () => {
    if (quantity < offer.maxQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-orange-900/30 backdrop-blur-3xl">
      {/* Main Glass Card Container */}
      <div className="relative w-full max-w-sm">
        {/* Glowing Aura */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-orange-600/20 blur-3xl rounded-[32px]" />

        {/* Main Card */}
        <div className="relative bg-white/10 backdrop-blur-2xl rounded-[24px] sm:rounded-[28px] border border-white/20 shadow-2xl overflow-hidden">
          {/* Subtle Top Glow */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

          {/* Content Container */}
          <div className="p-4 space-y-3">
            {/* TOP SECTION - Product Overview */}
            <div className="flex gap-3">
              {/* Product Image */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-orange-600/20 rounded-xl blur-lg" />
                <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/30 bg-white/5 shadow-lg">
                  <img
                    src={offer.image}
                    alt={offer.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              </div>

              {/* Product Info */}
              <div className="flex-1 flex flex-col justify-center space-y-1">
                <h3 className="text-base font-semibold text-white tracking-tight leading-tight">
                  {offer.name}
                </h3>
                <p className="text-xs text-white/60 font-light tracking-wide">
                  {offer.category}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-500/30 to-orange-600/30 border border-orange-400/30 backdrop-blur-sm">
                    <span className="text-xs font-medium text-orange-100 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      {offer.pointsRequired} Points
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MIDDLE SECTION - Glass Info Blocks */}
            <div className="space-y-2">
              {/* Price Summary Block */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-xl blur" />
                <div className="relative bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3 shadow-lg">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-light text-white/70">Pickup Price</span>
                    <span className="text-base font-semibold text-white">${offer.price.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-1.5" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-light text-white/70">Reserve with Points</span>
                    <span className="text-base font-bold bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                      {totalPoints} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Balance & Add Points Block */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl blur" />
                <div className="relative bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-light text-white/60 mb-0.5">Your SmartPoints Balance</p>
                      <p className="text-xl font-bold text-white tracking-tight">{userBalance} pts</p>
                    </div>
                    <Button
                      onClick={onAddPoints}
                      className="px-3 py-1.5 h-auto rounded-lg bg-gradient-to-br from-emerald-400/20 to-emerald-500/20 border border-emerald-400/30 text-emerald-100 hover:from-emerald-400/30 hover:to-emerald-500/30 backdrop-blur-sm shadow-lg transition-all duration-300 text-xs font-medium"
                    >
                      Add Points
                    </Button>
                  </div>
                  {!hasEnoughPoints && (
                    <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-400/20">
                      <p className="text-[10px] text-red-200 font-light">Insufficient balance</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity Selector Block */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-xl blur" />
                <div className="relative bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-light text-white/70">Quantity</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handleDecrement}
                        disabled={quantity <= 1}
                        className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/15 transition-all duration-200 active:scale-95"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-lg font-semibold text-white min-w-[1.75rem] text-center">
                        {quantity}
                      </span>
                      <button
                        onClick={handleIncrement}
                        disabled={quantity >= offer.maxQuantity}
                        className="w-7 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/15 transition-all duration-200 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/50 font-light mt-1.5 text-right">
                    Max {offer.maxQuantity} left
                  </p>
                </div>
              </div>
            </div>

            {/* LOCATION & TIME BLOCK */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl blur" />
              <div className="relative bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-lg">
                {/* Pickup Window */}
                <div className="p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-400/30 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-orange-200" />
                  </div>
                  <div>
                    <p className="text-[10px] font-light text-white/60 mb-0.5">Pickup Window</p>
                    <p className="text-xs font-medium text-white">
                      {offer.pickupWindow.start} - {offer.pickupWindow.end}
                    </p>
                  </div>
                </div>

                {/* Gradient Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-orange-400/20 to-transparent" />

                {/* Location */}
                <div className="p-2.5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-400/30 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-orange-200" />
                  </div>
                  <div>
                    <p className="text-[10px] font-light text-white/60 mb-0.5">Location</p>
                    <p className="text-xs font-medium text-white">{offer.location}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM ACTION BUTTON (MAIN CTA) */}
            <div className="relative pt-1">
              {/* Button Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/40 via-orange-600/40 to-orange-500/40 blur-2xl rounded-2xl" />

              {/* Main Button */}
              <button
                onClick={() => onReserve(quantity)}
                disabled={!hasEnoughPoints}
                className="relative w-full py-3 px-5 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-500 border border-orange-400/50 shadow-2xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed group/button transition-all duration-300 active:scale-[0.98]"
              >
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />

                {/* Button Text */}
                <span className="relative text-sm font-semibold text-white tracking-wide drop-shadow-lg flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Reserve for {totalPoints} SmartPoints
                </span>

                {/* Hover Shine Effect */}
                <div className="absolute inset-0 opacity-0 group-hover/button:opacity-100 transition-opacity duration-500">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-1000" />
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Glow */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}
