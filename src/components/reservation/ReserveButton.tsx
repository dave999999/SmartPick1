import { Button } from '@/components/ui/button';

interface ReserveButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  totalPrice: number;
  className?: string;
}

export default function ReserveButton({
  onClick,
  disabled,
  isLoading,
  totalPrice,
  className = ''
}: ReserveButtonProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 pt-3 pb-2 -mx-5 px-5 md:static md:bg-transparent md:backdrop-blur-none md:border-0 md:pt-0 md:pb-0 md:mx-0 md:px-0 space-y-2">
      {/* Reserved Price Row */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-mint-50 to-emerald-50 rounded-lg border border-mint-200/50">
        <span className="text-sm font-semibold text-gray-700">Reserved Price</span>
        <span className="text-xl font-bold text-mint-600">{totalPrice.toFixed(2)} GEL</span>
      </div>
      
      {/* Reserve Button */}
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          w-full py-6 rounded-xl text-base font-semibold 
          shadow-lg hover:shadow-2xl 
          transition-all duration-200 
          hover:scale-[1.02] 
          active:scale-95
          relative overflow-hidden
          before:absolute before:inset-0 
          before:bg-white before:opacity-0 
          active:before:opacity-20
          before:rounded-xl
          before:transition-opacity before:duration-300
          ${className}
        `}
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Creating Reservation...
          </span>
        ) : (
          'Reserve Now'
        )}
      </Button>
      
      {/* Footer hint */}
      <p className="text-xs text-center text-gray-500">
        Held for 1 hour
      </p>
    </div>
  );
}
