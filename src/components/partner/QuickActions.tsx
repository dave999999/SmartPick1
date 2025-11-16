import { Plus, QrCode } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface QuickActionsProps {
  onNewOffer: () => void;
  onScanQR: () => void;
  onViewAnalytics?: () => void;
  onHelp?: () => void;
}

export default function QuickActions({
  onNewOffer,
  onScanQR,
}: QuickActionsProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Mobile: Fixed bottom bar with elegant redesigned buttons
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-2xl safe-bottom">
        <div className="grid grid-cols-2 gap-3 p-4">
          {/* New Offer Button - Primary CTA */}
          <button
            onClick={onNewOffer}
            className="group relative h-16 rounded-2xl bg-gradient-to-br from-[#00C896] via-[#00B588] to-[#009B77] shadow-lg hover:shadow-2xl active:scale-[0.98] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex flex-col items-center justify-center h-full gap-1.5">
              <Plus className="w-6 h-6 text-white drop-shadow-md" strokeWidth={2.5} />
              <span className="text-sm font-bold text-white tracking-wide">New Offer</span>
            </div>
            {/* Shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </button>

          {/* Scan QR Button - Secondary elegant style */}
          <button
            onClick={onScanQR}
            className="group relative h-16 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#00C896] shadow-md hover:shadow-xl active:scale-[0.98] transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00C896]/5 to-[#009B77]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex flex-col items-center justify-center h-full gap-1.5">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#00C896]/10 to-[#009B77]/10 group-hover:from-[#00C896]/20 group-hover:to-[#009B77]/20 transition-colors duration-300">
                <QrCode className="w-5 h-5 text-[#00C896]" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-[#00C896] transition-colors duration-300">Scan QR</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Desktop: Elegant horizontal buttons with breathing room
  return (
    <div className="flex gap-4 items-stretch">
      {/* New Offer Button - Primary CTA */}
      <button
        onClick={onNewOffer}
        className="group relative flex-1 h-14 rounded-2xl bg-gradient-to-br from-[#00C896] via-[#00B588] to-[#009B77] shadow-lg hover:shadow-2xl active:scale-[0.99] transition-all duration-300 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative flex items-center justify-center h-full gap-3 px-6">
          <Plus className="w-5 h-5 text-white drop-shadow-md" strokeWidth={2.5} />
          <span className="text-base font-bold text-white tracking-wide">New Offer</span>
        </div>
        {/* Shine effect */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </button>

      {/* Scan QR Button - Secondary elegant style */}
      <button
        onClick={onScanQR}
        className="group relative flex-1 h-14 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#00C896] shadow-md hover:shadow-xl active:scale-[0.99] transition-all duration-300 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#00C896]/5 to-[#009B77]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative flex items-center justify-center h-full gap-3 px-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#00C896]/10 to-[#009B77]/10 group-hover:from-[#00C896]/20 group-hover:to-[#009B77]/20 transition-colors duration-300">
            <QrCode className="w-5 h-5 text-[#00C896]" strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-gray-700 group-hover:text-[#00C896] transition-colors duration-300">Scan QR</span>
        </div>
      </button>
    </div>
  );
}

