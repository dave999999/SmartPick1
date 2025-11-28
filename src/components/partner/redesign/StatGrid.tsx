/**
 * StatGrid - Compact 2x2 grid of key metrics
 * Equal-sized cards with minimal padding
 */

import { Package, TrendingUp, CheckCircle2, Wallet } from 'lucide-react';

interface StatGridProps {
  slotsUsed: number;
  slotsTotal: number;
  activeOffers: number;
  pickedUpToday: number;
  totalRevenue: number;
}

export function StatGrid({ slotsUsed, slotsTotal, activeOffers, pickedUpToday, totalRevenue }: StatGridProps) {
  const stats = [
    {
      icon: Package,
      value: `${slotsUsed}/${slotsTotal}`,
      label: 'Slots',
      color: 'emerald',
    },
    {
      icon: TrendingUp,
      value: activeOffers.toString(),
      label: 'Active Offers',
      color: 'teal',
    },
    {
      icon: CheckCircle2,
      value: pickedUpToday.toString(),
      label: 'Picked Up',
      color: 'green',
    },
    {
      icon: Wallet,
      value: `₾${totalRevenue.toFixed(0)}`,
      label: 'Total Revenue',
      color: 'cyan',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const iconColors = {
          emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
          teal: 'text-teal-600 bg-teal-50 border-teal-200',
          green: 'text-green-600 bg-green-50 border-green-200',
          cyan: 'text-cyan-600 bg-cyan-50 border-cyan-200',
        };

        return (
          <div
            key={index}
            className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg ${iconColors[stat.color as keyof typeof iconColors]} border flex items-center justify-center`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
            <p className="text-xs text-gray-600">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
}
