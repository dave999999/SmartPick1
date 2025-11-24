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
    <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0a] via-[#1a1a1a] to-transparent backdrop-blur-md border-t border-white/10 pt-4 -mx-5 px-5 md:static md:bg-transparent md:backdrop-blur-none md:border-0 md:pt-0 md:pb-0 md:mx-0 md:px-0 space-y-3" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Reserve Button with Price - Cosmic Orange */}
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          w-full py-7 rounded-xl text-lg font-semibold 
          bg-gradient-to-r from-orange-500 to-orange-600
          hover:from-orange-600 hover:to-orange-700
          shadow-lg shadow-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/60
          transition-all duration-200 
          hover:scale-[1.02] 
          active:scale-95
          relative overflow-hidden
          before:absolute before:inset-0 
          before:bg-white before:opacity-0 
          active:before:opacity-10
          before:rounded-xl
          before:transition-opacity before:duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          text-white
          ${className}
        `}
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Creating Reservation...
          </span>
        ) : (
          '🎫 Reserve for Free'
        )}
      </Button>
      
      {/* Footer hint */}
      <p className="text-xs text-center text-gray-400">
        Reservation held for 1 hour
      </p>
    </div>
  );
}
