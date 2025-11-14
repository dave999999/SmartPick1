import { Button } from '@/components/ui/button';

interface ReserveButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  totalPrice?: number; // Optional now since we don't display it
  className?: string;
}

export default function ReserveButton({
  onClick,
  disabled,
  isLoading,
  className = ''
}: ReserveButtonProps) {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 pt-4 pb-3 -mx-5 px-5 md:static md:bg-transparent md:backdrop-blur-none md:border-0 md:pt-0 md:pb-0 md:mx-0 md:px-0 space-y-3">
      {/* Reserve Button with Price */}
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          w-full py-7 rounded-xl text-lg font-semibold 
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
          disabled:opacity-50 disabled:cursor-not-allowed
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
          'Reserve Price'
        )}
      </Button>
      
      {/* Footer hint */}
      <p className="text-xs text-center text-gray-500">
        Held for 1 hour
      </p>
    </div>
  );
}
