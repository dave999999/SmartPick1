import { Minus, Plus, Coins } from 'lucide-react';
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
    <div className="bg-gradient-to-br from-white via-mint-50/30 to-emerald-50/20 rounded-xl border-2 border-mint-200/60 shadow-md overflow-hidden">
      {/* Balance Bar - Top */}
      <div className={`px-4 py-2.5 flex items-center justify-between border-b ${hasEnoughPoints ? 'bg-mint-50/80 border-mint-200/50' : 'bg-orange-50/80 border-orange-200/50'}`}>
        <div className="flex items-center gap-2">
          <div className="relative w-6 h-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 rounded-full shadow-lg transform rotate-12"></div>
            <div className="absolute inset-0.5 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-400 rounded-full"></div>
            <span className="relative text-white text-xs font-black drop-shadow-md z-10" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>$</span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600">Balance</p>
            <p className="text-sm font-bold text-gray-900">{balance.toLocaleString()} pts</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-600">Cost</p>
          <p className={`text-sm font-bold ${hasEnoughPoints ? 'text-mint-700' : 'text-orange-700'}`}>
            {cost} pts
          </p>
        </div>
      </div>
      
      {/* Price + Quantity Section - Bottom */}
      <div className="p-4 space-y-3">
        {/* Price Row */}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Smart Price</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-mint-600">{smartPrice.toFixed(2)} GEL</span>
              <span className="text-sm text-gray-400 line-through">{originalPrice.toFixed(2)} GEL</span>
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg px-3 py-1.5 border border-orange-200/50">
            <p className="text-xs font-bold text-orange-700">Save {savingsPercent}%</p>
          </div>
        </div>
        
        {/* Quantity Selector */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleDecrease}
              disabled={!canDecrease}
              className="h-8 w-8 rounded-full border-gray-300 hover:bg-mint-50 hover:border-mint-400 disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            
            <div className="text-center min-w-[50px]">
              <p className="text-2xl font-bold text-gray-900">{quantity}</p>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleIncrease}
              disabled={!canIncrease}
              className="h-8 w-8 rounded-full border-gray-300 hover:bg-mint-50 hover:border-mint-400 disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="text-right text-xs text-gray-500">
            <p>{availableStock} left</p>
            <p>Max {maxQuantity}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
