import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const savingsPercent = Math.round(((originalPrice - smartPrice) / originalPrice) * 100);
  const canDecrease = quantity > 1 && !disabled;
  const canIncrease = quantity < Math.min(maxQuantity, availableStock) && !disabled;
  const hasEnoughPoints = balance >= cost;
  const pointsNeeded = Math.max(0, cost - balance);
  
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Simple Status Bar */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${hasEnoughPoints ? 'bg-mint-50/50' : 'bg-orange-50/50'}`}>
        {hasEnoughPoints ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-mint-600 text-lg">✓</span>
              <span className="text-sm font-medium text-gray-700">You have enough points</span>
            </div>
            <span className="text-xs text-gray-500">{balance} pts</span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-orange-600 text-lg">⚠</span>
              <span className="text-sm font-medium text-gray-700">Need {pointsNeeded} more points</span>
            </div>
            <span className="text-xs text-gray-500">{balance}/{cost} pts</span>
          </>
        )}
      </div>
      
      {/* Main Content */}
      <div className="p-5 space-y-5">
        {/* Hero Price Section */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-mint-600">{smartPrice.toFixed(2)}</span>
              <span className="text-lg font-medium text-gray-900">GEL</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-400 line-through">{originalPrice.toFixed(2)} GEL</span>
              <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded">
                Save {savingsPercent}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Quantity Selector */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrease}
              disabled={!canDecrease}
              className="h-12 w-12 rounded-full border-2 border-gray-300 hover:bg-mint-50 hover:border-mint-400 disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Minus className="h-5 w-5" />
            </Button>
            
            <div className="text-center min-w-[70px]">
              <p className="text-4xl font-bold text-gray-900">{quantity}</p>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleIncrease}
              disabled={!canIncrease}
              className="h-12 w-12 rounded-full border-2 border-gray-300 hover:bg-mint-50 hover:border-mint-400 disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="text-right">
            <p className="text-base font-semibold text-gray-700">{availableStock} left</p>
            <p className="text-xs text-gray-500">Max {maxQuantity}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
