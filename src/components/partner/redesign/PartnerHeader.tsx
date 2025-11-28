/**
 * PartnerHeader - Compact top header
 * Shows partner name, role, points balance, and settings
 */

import { Wallet, Settings } from 'lucide-react';

interface PartnerHeaderProps {
  partnerName: string;
  pointBalance: number;
}

export function PartnerHeader({ partnerName, pointBalance }: PartnerHeaderProps) {
  return (
    <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between">
        {/* Left: Partner Info */}
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">{partnerName}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Partner Dashboard</p>
        </div>

        {/* Right: Points & Settings */}
        <div className="flex items-center gap-2">
          {/* Points Balance */}
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{pointBalance}</span>
          </div>

          {/* Settings Icon */}
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
