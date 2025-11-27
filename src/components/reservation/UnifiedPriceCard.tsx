import { Minus, Plus, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * UnifiedPriceCard
 * Displays current smart price, original price savings, user point balance status
 * and a quantity stepper with stock / max constraints.
 *
 * Keep prop names stable (cost represents points required) to avoid breaking external usage.
 */

interface UnifiedPriceCardProps {
  balance: number;
  cost: number;
  smartPrice: number;
  originalPrice: number;
  quantity: number;
  maxQuantity: number;
  availableStock: number;
  onQuantityChange: (newQuantity: number) => void;
  onUnlockClick?: () => void; // Optional callback for unlock button
  disabled?: boolean;
}

export default function UnifiedPriceCard({
  balance,
  cost,
  smartPrice,
  originalPrice,
  quantity,
  maxQuantity,
  availableStock,
  onQuantityChange,
  onUnlockClick,
  disabled = false
}: UnifiedPriceCardProps) {
  // ---------- Derived values ----------
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'GEL', minimumFractionDigits: 2 });
  const showSavings = originalPrice > smartPrice && originalPrice > 0;
  const canDecrease = quantity > 1 && !disabled;
  const canIncrease = quantity < Math.min(maxQuantity, availableStock) && !disabled;

  // Total calculations
  const totalPrice = smartPrice * quantity;
  const totalCost = cost; // cost is already total (passed as POINTS_PER_UNIT * quantity from parent)

  // ---------- Handlers ----------
  const handleDecrease = () => canDecrease && onQuantityChange(quantity - 1);
  const handleIncrease = () => canIncrease && onQuantityChange(quantity + 1);

  return (
    <div className="space-y-4 px-5">
      {/* Small Balance Pill */}
      <div className="inline-flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-sm border border-gray-100">
        <span className="text-base">🪙</span>
        <span className="text-sm font-medium text-gray-700">Your Balance:</span>
        <span className="text-sm font-bold text-gray-900">{balance.toLocaleString()}</span>
        <span className="text-xs text-gray-500">Points</span>
      </div>

      {/* Pickup Price Section - Clean Text (No Big Box) */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pickup Price Today</p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-[#059669]">
            {totalPrice.toFixed(2)}
          </span>
          <span className="text-base font-medium text-[#059669]">GEL</span>
        </div>
        {showSavings && (
          <p className="text-sm text-[#9CA3AF] line-through">
            Original Price: {(originalPrice * quantity).toFixed(2)} GEL
          </p>
        )}
      </div>

      {/* MAIN: Reservation Cost Block - Visually Dominant */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 shadow-md border border-orange-200/50">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">✨</span>
            <h4 className="text-base font-semibold text-gray-700">Reservation Cost</h4>
          </div>
          <p className="text-5xl font-bold text-[#F97316] tracking-tight">
            {totalCost}
          </p>
          <p className="text-lg font-medium text-[#F97316]">Points</p>
          <div className="pt-2 border-t border-orange-200/50">
            <p className="text-sm text-gray-600 leading-relaxed max-w-[280px] mx-auto">
              Reserving costs points.<br />
              <span className="font-medium">Payment is completed at pickup.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quantity Selector - Integrated Design */}
      {maxQuantity > 1 && (
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrease}
              disabled={!canDecrease}
              aria-label="Decrease quantity"
              className="h-11 w-11 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 transition-colors disabled:opacity-40"
            >
              <Minus className="h-5 w-5" />
            </Button>

            <div className="text-center min-w-[80px]">
              <p className="text-4xl font-bold text-gray-900 leading-none">{quantity}</p>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1.5">MAX {maxQuantity}</p>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleIncrease}
              disabled={!canIncrease}
              aria-label="Increase quantity"
              className="h-11 w-11 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 transition-colors disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
