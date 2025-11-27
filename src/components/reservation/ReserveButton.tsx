import { Button } from '@/components/ui/button';

interface ReserveButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  totalPrice?: number; // Total points to be deducted at pickup
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
    <div className="space-y-2.5 px-5 pb-6 pt-3">
      {/* CTA Button - Premium Orange */}
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          w-full h-14 rounded-xl text-base font-semibold 
          bg-[#F97316] hover:bg-[#EA580C] active:bg-[#DC2626]
          text-white
          transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-md hover:shadow-lg
          ${className}
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            <span>Reserving...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="text-base">🪙</span>
            <span>Reserve This Deal</span>
          </span>
        )}
      </Button>
      
      {/* Footer hint - small muted */}
      <p className="text-xs text-center text-gray-400 font-medium">
        Reservation held for 1 hour
      </p>
    </div>
  );
}
