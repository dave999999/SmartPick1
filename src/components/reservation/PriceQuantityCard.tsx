import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PriceQuantityCardProps {
  smartPrice: number;
  originalPrice: number;
  quantity: number;
  maxQuantity: number;
  availableStock: number;
  onQuantityChange: (newQuantity: number) => void;
  disabled?: boolean;
}

export default function PriceQuantityCard({
  smartPrice,
  originalPrice,
  quantity,
  maxQuantity,
  availableStock,
  onQuantityChange,
  disabled = false
}: PriceQuantityCardProps) {
  const savingsPercent = Math.round(((originalPrice - smartPrice) / originalPrice) * 100);
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
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
      {/* Price row */}
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs text-gray-600 mb-1">Smart Price</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {smartPrice.toFixed(2)} GEL
            </span>
            <span className="text-base text-gray-400 line-through">
              {originalPrice.toFixed(2)} GEL
            </span>
          </div>
        </div>
      </div>
      
      {/* Savings label */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg px-3 py-1.5 border border-orange-200/50">
        <p className="text-sm font-medium text-orange-700">
          🎉 Save {savingsPercent}% with SmartPick
        </p>
      </div>
      
      {/* Quantity selector */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleDecrease}
            disabled={!canDecrease}
            className="h-9 w-9 rounded-full border-gray-200 hover:bg-mint-50 hover:border-mint-300 transition-all duration-200 active:scale-110"
          >
            <Minus className="h-4 w-4 text-gray-600" />
          </Button>
          
          <div className="text-center min-w-[60px]">
            <p className="text-2xl font-bold text-gray-900">{quantity}</p>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={handleIncrease}
            disabled={!canIncrease}
            className="h-9 w-9 rounded-full border-gray-200 hover:bg-mint-50 hover:border-mint-300 transition-all duration-200 active:scale-110"
          >
            <Plus className="h-4 w-4 text-gray-600" />
          </Button>
        </div>
        
        {/* Stock and max info */}
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
          <span>{availableStock} left</span>
          <span className="text-gray-300">•</span>
          <span>Max {maxQuantity} per offer</span>
        </div>
      </div>
    </div>
  );
}
