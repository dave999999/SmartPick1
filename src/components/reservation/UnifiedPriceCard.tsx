import { Minus, Plus } from 'lucide-react';
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
  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
      role="group"
      aria-labelledby={priceGroupId}
    >
      {/* Status & Points Summary Bar */}
      <div
        className={`px-3 py-2 ${hasEnoughPoints ? 'bg-mint-50/50' : 'bg-orange-50/50'}`}
        aria-live="polite"
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-xl ${hasEnoughPoints ? 'text-mint-600' : 'text-orange-600'}`} aria-hidden>
              {hasEnoughPoints ? '✓' : '⚠'}
            </span>
            <span className="text-base font-semibold text-gray-700">
              {hasEnoughPoints ? 'Ready to reserve' : `Need ${pointsNeeded.toLocaleString()} more points`}
            </span>
          </div>
        </div>

        {/* Points breakdown */}
        <div className="flex items-center gap-2 text-sm">
          <div>
            <span className="text-gray-500">Need: </span>
            <span className="font-bold text-gray-900">{totalCost.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-500">Balance: </span>
            <span className={`font-bold ${hasEnoughPoints ? 'text-mint-600' : 'text-orange-600'}`}> 
              {balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 space-y-2">
        {/* Price Section */}
        <div id={priceGroupId} className="space-y-1.5">
          {/* Per-item price */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-mint-600" aria-label={`Smart price ${displaySmartPrice} GEL`}>{displaySmartPrice}</span>
                <span className="text-sm font-medium text-gray-900" aria-hidden>GEL</span>
              </div>
              <p className="text-[10px] text-gray-500">per item</p>
            </div>
            {showSavings && (
              <div className="text-right">
                <span className="text-base text-slate-400 line-through block" style={{color: '#6B7A90'}} aria-label={`Original price ${originalPrice.toFixed(2)} GEL`}>{originalPrice.toFixed(2)} GEL</span>
                <span
                  className="inline-block bg-orange-100 text-orange-700 text-base font-bold px-2 py-1 rounded mt-1"
                  aria-label={`Save ${savingsPercent} percent`}
                >
                  Save {savingsPercent}%
                </span>
              </div>
            )}
          </div>

          {/* Total breakdown - only show when quantity > 1 */}
          {quantity > 1 && (
            <div className="pt-1.5 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600">× {quantity} items</span>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">{totalPrice.toFixed(2)}</span>
                    <span className="text-xs font-medium text-gray-600">GEL</span>
                  </div>
                  <p className="text-[10px] text-mint-600 font-medium mt-0.5">Pay at pickup</p>
                </div>
              </div>
            </div>
          )}
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

          <div className="text-right">
            <p className="text-xs font-semibold text-gray-700">{availableStock} left</p>
            <p className="text-[10px] text-gray-500">Max {maxQuantity}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
