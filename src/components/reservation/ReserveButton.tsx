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
    <div className="sticky bottom-0 left-0 right-0 backdrop-blur-md pt-4 -mx-5 px-5 md:static md:bg-transparent md:backdrop-blur-none md:border-0 md:pt-0 md:pb-0 md:mx-0 md:px-0 space-y-3"
      style={{
        background: 'linear-gradient(to top, #03060B 0%, rgba(3, 6, 11, 0.8) 80%, transparent 100%)',
        borderTop: '1px solid rgba(0, 246, 255, 0.15)',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* Reserve Button with Price - HERO NEON ORANGE GLOW */}
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          w-full py-7 rounded-xl text-lg font-semibold 
          text-white
          transition-all duration-300
          relative overflow-hidden
          disabled:opacity-40 disabled:cursor-not-allowed
          ${className}
        `}
        style={{
          background: disabled ? 'rgba(50, 50, 50, 0.5)' : 'linear-gradient(135deg, #FF8A00 0%, #FFC36A 100%)',
          boxShadow: disabled 
            ? 'none' 
            : '0 0 20px rgba(255, 138, 0, 0.6), 0 8px 24px rgba(255, 138, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
          transform: 'translateZ(0)'
        }}
        size="lg"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            <span style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.5)' }}>
              Creating Reservation...
            </span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2"
            style={{ textShadow: '0 0 10px rgba(255, 255, 255, 0.5)' }}
          >
            <span className="text-xl">💰</span>
            <span>Reserve for Free</span>
          </span>
        )}
      </Button>
      
      {/* Footer hint with neon teal shadow */}
      <p className="text-xs text-center text-gray-400"
        style={{ textShadow: '0 0 6px rgba(0, 246, 255, 0.3)' }}
      >
        Reservation held for 1 hour
      </p>
    </div>
  );
}
