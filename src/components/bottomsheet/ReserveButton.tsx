/**
 * ReserveButton - Primary CTA button
 */

import { Button } from '@/components/ui/button';

interface ReserveButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  totalPrice?: number;
}

export function ReserveButton({
  onClick,
  disabled,
  isLoading,
  totalPrice
}: ReserveButtonProps) {
  return (
    <div className="space-y-1.5 pt-2">
      {/* CTA Button */}
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        className="w-full h-11 rounded-xl text-sm font-semibold bg-[#F97316] hover:bg-[#EA580C] active:bg-[#DC2626] text-white transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            <span>Reserving...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            <span className="text-sm">🪙</span>
            <span>Reserve This Deal</span>
          </span>
        )}
      </Button>
      
      {/* Footer hint */}
      <p className="text-[10px] text-center text-gray-400 font-medium">
        Reservation held for 1 hour
      </p>
    </div>
  );
}
