/**
 * PriceInfo - Pickup price display with original price crossed out
 */

interface PriceInfoProps {
  smartPrice: number;
  originalPrice: number;
}

export function PriceInfo({ smartPrice, originalPrice }: PriceInfoProps) {
  const showSavings = originalPrice > smartPrice && originalPrice > 0;

  return (
    <div className="space-y-0">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
        Pickup Price Today
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl font-bold text-[#059669]">
          {smartPrice.toFixed(2)}
        </span>
        <span className="text-sm font-medium text-[#059669]">GEL</span>
      </div>
      {showSavings && (
        <p className="text-sm text-[#9CA3AF]">
          Original Price: <span className="line-through">{originalPrice.toFixed(2)} GEL</span>
        </p>
      )}
    </div>
  );
}
