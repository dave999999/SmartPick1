import React from 'react';
import { Card } from '@/components/ui/card';
import { Star, DollarSign, Flame, Gift, TrendingUp } from 'lucide-react';

interface StatsGridProps {
  stats: {
    totalReservations: number;
    moneySaved: number;
    currentStreak: number;
    referrals: number;
  };
}

/**
 * StatsGrid - Gamified 2×2 stats display
 * 
 * Mobile-first grid with:
 * - Bright icons with pastel backgrounds
 * - Numbers with animations on hover
 * - Friendly labels
 * - Clean, card-based design
 * 
 * Each stat: Icon (large) | Number (huge) | Label (small)
 */
export function StatsGrid({ stats }: StatsGridProps) {
  const statCards = [
    {
      icon: Star,
      value: stats.totalReservations,
      label: 'Reservations',
      gradient: 'from-yellow-400 to-amber-500',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      trend: stats.totalReservations > 0 ? '+' : ''
    },
    {
      icon: DollarSign,
      value: `₾${stats.moneySaved.toFixed(0)}`,
      label: 'Money saved',
      gradient: 'from-emerald-400 to-green-500',
      bg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      trend: stats.moneySaved > 0 ? '+' : ''
    },
    {
      icon: Flame,
      value: stats.currentStreak,
      label: 'Day streak',
      gradient: 'from-orange-400 to-red-500',
      bg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      trend: stats.currentStreak > 0 ? '🔥' : ''
    },
    {
      icon: Gift,
      value: stats.referrals,
      label: 'Referrals',
      gradient: 'from-purple-400 to-pink-500',
      bg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trend: stats.referrals > 0 ? '+' : ''
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {statCards.map((stat, index) => (
        <Card
          key={stat.label}
          className="border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="p-2.5 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[20px] font-bold text-gray-900 dark:text-gray-100 leading-none mb-0.5">
                {stat.value}
              </p>
              <p className="text-[9px] font-medium text-gray-600 dark:text-gray-400 leading-tight">
                {stat.label}
              </p>
            </div>
            <div className={`w-9 h-9 rounded-lg ${stat.bg} dark:opacity-80 flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.iconColor}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Add CSS animation to global styles or component
const styles = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
