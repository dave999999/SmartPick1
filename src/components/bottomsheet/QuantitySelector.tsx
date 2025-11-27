/**
 * QuantitySelector - Centered quantity control with integrated MAX badge
 */

import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuantitySelectorProps {
  quantity: number;
  maxQuantity: number;
  availableStock: number;
  onQuantityChange: (newQuantity: number) => void;
  disabled?: boolean;
}

export function QuantitySelector({
  quantity,
  maxQuantity,
  availableStock,
  onQuantityChange,
  disabled = false
}: QuantitySelectorProps) {
  const canDecrease = quantity > 1 && !disabled;
  const canIncrease = quantity < Math.min(maxQuantity, availableStock) && !disabled;

  const handleDecrease = () => {
    if (canDecrease) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (canIncrease) {
      onQuantityChange(quantity + 1);
    }
  };

  return (
    <div className="rounded-xl bg-white p-2.5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-center gap-4">
        {/* Minus Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleDecrease}
          disabled={!canDecrease}
          className="h-9 w-9 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 transition-colors disabled:opacity-40"
          aria-label="Decrease quantity"
        >
          <Minus className="h-4 w-4" />
        </Button>

        {/* Quantity Display */}
        <div className="text-center min-w-[60px]">
          <p className="text-2xl font-bold text-gray-900 leading-none">{quantity}</p>
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
            MAX {maxQuantity}
          </p>
        </div>

        {/* Plus Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleIncrease}
          disabled={!canIncrease}
          className="h-9 w-9 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 transition-colors disabled:opacity-40"
          aria-label="Increase quantity"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
