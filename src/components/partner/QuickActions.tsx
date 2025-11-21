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

  // Mobile: Fixed bottom bar
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
        <div className="grid grid-cols-2 gap-3 p-4">
          {/* New Offer Button */}
          <button
            onClick={onNewOffer}
            className="group h-14 rounded-xl bg-gradient-to-r from-[#00C896] to-[#009B77] shadow-md hover:shadow-lg active:scale-95 transition-all duration-200"
          >
            <div className="flex items-center justify-center h-full gap-2">
              <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
              <span className="text-sm font-bold text-white">New Offer</span>
            </div>
          </button>

          {/* Scan QR Button */}
          <button
            onClick={onScanQR}
            className="group h-14 rounded-xl bg-white border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50/50 shadow-sm hover:shadow-md active:scale-95 transition-all duration-200"
          >
            <div className="flex items-center justify-center h-full gap-2">
              <QrCode className="w-5 h-5 text-teal-600" strokeWidth={2.5} />
              <span className="text-sm font-bold text-gray-700">Scan QR</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Desktop: Horizontal buttons
  return (
    <div className="flex gap-4">
      {/* New Offer Button */}
      <button
        onClick={onNewOffer}
        className="group flex-1 h-14 rounded-xl bg-gradient-to-r from-[#00C896] to-[#009B77] shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
      >
        <div className="flex items-center justify-center h-full gap-3">
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
          <span className="text-base font-bold text-white">Create New Offer</span>
        </div>
      </button>

      {/* Scan QR Button */}
      <button
        onClick={onScanQR}
        className="group flex-1 h-14 rounded-xl bg-white border-2 border-gray-200 hover:border-teal-400 hover:bg-teal-50/50 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
      >
        <div className="flex items-center justify-center h-full gap-3">
          <QrCode className="w-5 h-5 text-teal-600" strokeWidth={2.5} />
          <span className="text-base font-bold text-gray-700">Scan QR Code</span>
        </div>
      </button>
    </div>
  );
}

