/**
 * StickyActions - Fixed bottom bar with primary actions
 * Always visible for quick access to create offer and scan QR
 */

import { Plus, QrCode } from 'lucide-react';

interface StickyActionsProps {
  onCreateOffer: () => void;
  onScanQR: () => void;
}

export function StickyActions({ onCreateOffer, onScanQR }: StickyActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg">
      <div className="px-4 py-3 flex gap-3">
        {/* Primary: Create Offer */}
        <button
          onClick={onCreateOffer}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3 rounded-xl font-semibold shadow-md transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>New Offer</span>
        </button>

        {/* Secondary: Scan QR */}
        <button
          onClick={onScanQR}
          className="px-5 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 py-3 rounded-xl font-semibold transition-all active:scale-95"
        >
          <QrCode className="w-5 h-5" />
          <span>Scan</span>
        </button>
      </div>
    </div>
  );
}
