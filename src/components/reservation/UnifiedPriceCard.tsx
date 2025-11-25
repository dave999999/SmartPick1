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
      className="rounded-xl overflow-hidden relative"
      role="group"
      aria-labelledby={priceGroupId}
      style={{
        background: 'linear-gradient(135deg, #050A12 0%, #0C1622 100%)',
        border: '1.5px solid #00F6FF',
        boxShadow: '0 0 8px rgba(0, 246, 255, 0.4), 0 4px 16px rgba(0, 246, 255, 0.2)'
      }}
    >
      {/* Top Bar: Balance & Current Price - NEON ORANGE & TEAL */}
      <div
        className="px-4 py-3 flex items-center justify-between relative"
        aria-live="polite"
        style={{
          background: 'rgba(0, 246, 255, 0.05)',
          borderBottom: '1px solid rgba(0, 246, 255, 0.2)'
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, #FF8A00 0%, #FFBD42 100%)',
              boxShadow: '0 0 12px rgba(255, 138, 0, 0.5)'
            }}
          >
            <span className="text-white text-lg">💰</span>
          </div>
          <div>
            <p className="text-xs text-gray-400"
              style={{ textShadow: '0 0 4px rgba(0, 246, 255, 0.2)' }}
            >
              Your Balance
            </p>
            <p className="text-lg font-bold"
              style={{
                color: '#FFB443',
                textShadow: '0 0 8px rgba(255, 180, 67, 0.4)'
              }}
            >
              {balance.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400"
            style={{ textShadow: '0 0 4px rgba(0, 246, 255, 0.2)' }}
          >
            Current Price
          </p>
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-xl font-bold" aria-label={`Total price ${totalPrice.toFixed(2)} GEL`}
              style={{
                color: '#00F6FF',
                textShadow: '0 0 10px rgba(0, 246, 255, 0.5)'
              }}
            >
              {totalPrice.toFixed(2)}
            </span>
            <span className="text-xs font-medium text-gray-400">GEL</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Price Section */}
        <div id={priceGroupId}>
          <div className="flex items-start justify-between gap-6 mb-3">
            {/* Left: Points Cost - NEON ORANGE */}
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1"
                style={{ textShadow: '0 0 4px rgba(0, 246, 255, 0.2)' }}
              >
                Cost
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <p className="text-2xl font-bold"
                  style={{
                    color: '#FFB443',
                    textShadow: '0 0 10px rgba(255, 180, 67, 0.5)'
                  }}
                >
                  {quantity * 5} points
                </p>
              </div>
            </div>
            
            {/* Right: Original Price */}
            {showSavings && (
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-400 mb-1"
                  style={{ textShadow: '0 0 4px rgba(0, 246, 255, 0.2)' }}
                >
                  Original Price
                </p>
                <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-lg font-bold text-gray-500 line-through" aria-label={`Original price ${originalPrice.toFixed(2)} GEL`}>
                    {originalPrice.toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-400">GEL</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Neon Teal Divider */}
          <div className="w-full h-[1px] mb-3"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #00F6FF 50%, transparent 100%)',
              boxShadow: '0 0 6px rgba(0, 246, 255, 0.4)'
            }}
          />
          
          <div className="text-center px-3 py-2 rounded-lg"
            style={{
              background: 'rgba(0, 246, 255, 0.08)',
              border: '1px solid rgba(0, 246, 255, 0.2)',
              boxShadow: '0 0 8px rgba(0, 246, 255, 0.15)'
            }}
          >
            <span className="text-xs font-medium"
              style={{
                color: '#00F6FF',
                textShadow: '0 0 6px rgba(0, 246, 255, 0.4)'
              }}
            >
              💳 Pay at pickup
            </span>
          </div>
        </div>

        {/* Quantity Selector - NEON GLOWING CIRCLES */}
        <div className="flex items-center justify-between pt-4"
          style={{
            borderTop: '1px solid rgba(0, 246, 255, 0.15)'
          }}
        >
          <div className="flex items-center gap-3" aria-describedby={quantityLabelId}>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrease}
              disabled={!canDecrease}
              aria-label={decreaseLabel}
              className="h-10 w-10 rounded-full transition-all duration-200"
              style={{
                background: canDecrease ? 'rgba(0, 246, 255, 0.08)' : 'rgba(0, 0, 0, 0.3)',
                border: canDecrease ? '1.5px solid #00F6FF' : '1.5px solid rgba(100, 100, 100, 0.3)',
                boxShadow: canDecrease ? '0 0 10px rgba(0, 246, 255, 0.3)' : 'none',
              }}
            >
              <Minus className="h-4 w-4" aria-hidden 
                style={{ color: canDecrease ? '#00F6FF' : '#555' }}
              />
            </Button>

            <div className="text-center min-w-[60px]" aria-live="polite">
              <p id={quantityLabelId} className="text-3xl font-bold" aria-label={`Quantity ${quantity}`}
                style={{
                  color: '#00F6FF',
                  textShadow: '0 0 12px rgba(0, 246, 255, 0.6)'
                }}
              >
                {quantity}
              </p>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleIncrease}
              disabled={!canIncrease}
              aria-label={increaseLabel}
              className="h-10 w-10 rounded-full transition-all duration-200"
              style={{
                background: canIncrease ? 'rgba(0, 246, 255, 0.08)' : 'rgba(0, 0, 0, 0.3)',
                border: canIncrease ? '1.5px solid #00F6FF' : '1.5px solid rgba(100, 100, 100, 0.3)',
                boxShadow: canIncrease ? '0 0 10px rgba(0, 246, 255, 0.3)' : 'none',
              }}
            >
              <Plus className="h-4 w-4" aria-hidden 
                style={{ color: canIncrease ? '#00F6FF' : '#555' }}
              />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-base font-bold"
              style={{
                color: '#FFB443',
                textShadow: '0 0 8px rgba(255, 180, 67, 0.4)'
              }}
            >
              MAX {maxQuantity}
            </p>
            {onUnlockClick && maxQuantity < 10 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUnlockClick}
                className="h-7 px-3 text-xs font-semibold text-white border-0 transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #FF8A00 0%, #FFBD42 100%)',
                  boxShadow: '0 0 10px rgba(255, 138, 0, 0.4)'
                }}
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
