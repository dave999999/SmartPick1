/**
 * SnapshotCard - Hero section showing today's key metrics
 * Large revenue number with supporting stats
 */

import { TrendingUp, Package, CheckCircle2 } from 'lucide-react';

interface SnapshotCardProps {
  todayRevenue: number;
  activeOffers: number;
  pickedUpToday: number;
}

export function SnapshotCard({ todayRevenue, activeOffers, pickedUpToday }: SnapshotCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 p-5">
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200 rounded-full opacity-20" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-teal-200 rounded-full opacity-20" />
      
      <div className="relative">
        {/* Title */}
        <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Today's Snapshot
        </h2>

        {/* Main Revenue */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span className="text-4xl font-bold text-gray-900">₾{todayRevenue.toFixed(0)}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Today's Revenue</p>
        </div>

        {/* Supporting Metrics */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-emerald-200 flex items-center justify-center">
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{activeOffers}</p>
              <p className="text-xs text-gray-600">Active</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{pickedUpToday}</p>
              <p className="text-xs text-gray-600">Picked Up</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
