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
  const displaySmartPrice = formatter.format(smartPrice).replace('GEL', '').trim(); // we show GEL separately for layout control
  const showSavings = originalPrice > smartPrice && originalPrice > 0;
  const savingsPercent = showSavings ? Math.round(((originalPrice - smartPrice) / originalPrice) * 100) : 0;
  const canDecrease = quantity > 1 && !disabled;
  const canIncrease = quantity < Math.min(maxQuantity, availableStock) && !disabled;

  // Total calculations
  const totalPrice = smartPrice * quantity;
  const totalCost = cost; // cost is already total (passed as POINTS_PER_UNIT * quantity from parent)
  const hasEnoughPoints = balance >= totalCost;
  const pointsNeeded = Math.max(0, totalCost - balance);
  const progressRatio = totalCost > 0 ? Math.min(1, balance / totalCost) : 0;

  // ---------- Handlers ----------
  const handleDecrease = () => canDecrease && onQuantityChange(quantity - 1);
  const handleIncrease = () => canIncrease && onQuantityChange(quantity + 1);

  // ---------- Accessibility labels ----------
  const decreaseLabel = `Decrease quantity to ${quantity - 1}`;
  const increaseLabel = `Increase quantity to ${quantity + 1}`;
  const quantityLabelId = 'price-card-quantity-label';
  const priceGroupId = 'price-card-price-group';

  return (
    <section
  className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-xl border border-white/10 shadow-xl overflow-hidden"
      role="group"
      aria-labelledby={priceGroupId}
    >
      {/* Top Bar: Balance & Current Price */}
      <div
        className={`px-4 py-2.5 ${hasEnoughPoints ? 'bg-[#00cc66]/10' : 'bg-orange-500/10'} flex items-center justify-between`}
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <span className="text-white text-lg">💰</span>
          </div>
          <div>
            <p className="text-xs text-gray-400">Your Balance</p>
            <p className={`text-lg font-bold ${hasEnoughPoints ? 'text-[#00cc66]' : 'text-orange-500'}`}>
              {balance.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Current Price</p>
          <div className="flex items-baseline gap-1 justify-end">
            <span className={`text-xl font-bold ${hasEnoughPoints ? 'text-[#00cc66]' : 'text-orange-500'}`} aria-label={`Total price ${totalPrice.toFixed(2)} GEL`}>
              {totalPrice.toFixed(2)}
            </span>
            <span className="text-xs font-medium text-gray-400">GEL</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3">
        {/* Price Section */}
        <div id={priceGroupId}>
          <div className="flex items-start justify-between gap-6">
            {/* Left: Points Cost */}
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">Cost</p>
              <p className="text-2xl font-bold text-orange-400">{quantity * 5} points</p>
            </div>
            
            {/* Right: Original Price */}
            {showSavings && (
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-400 mb-1">Original Price</p>
                <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-lg font-bold text-gray-400 line-through" aria-label={`Original price ${originalPrice.toFixed(2)} GEL`}>
                    {originalPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-400">GEL</span>
                </div>
              </div>
            )}
          </div>
          <div className="text-center bg-blue-500/10 text-blue-400 text-xs px-3 py-2 rounded-lg mt-3">
            💳 Pay at pickup
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
          <div className="flex items-center gap-2" aria-describedby={quantityLabelId}>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrease}
              disabled={!canDecrease}
              aria-label={decreaseLabel}
              className="h-8 w-8 rounded-full border-2 border-gray-300 hover:bg-mint-50 hover:border-mint-400 disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Minus className="h-3 w-3" aria-hidden />
            </Button>

            <div className="text-center min-w-[50px]" aria-live="polite">
              <p id={quantityLabelId} className="text-2xl font-bold text-gray-900" aria-label={`Quantity ${quantity}`}>{quantity}</p>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleIncrease}
              disabled={!canIncrease}
              aria-label={increaseLabel}
              className="h-8 w-8 rounded-full border-2 border-gray-300 hover:bg-mint-50 hover:border-mint-400 disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Plus className="h-3 w-3" aria-hidden />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-orange-500">MAX {maxQuantity}</p>
            {onUnlockClick && maxQuantity < 10 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnlockClick}
                className="h-7 px-3 text-xs font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-md"
              >
                <Unlock className="w-3 h-3 mr-1" />
                Unlock
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
