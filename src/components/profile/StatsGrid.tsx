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
      emoji: '⭐',
      value: stats.totalReservations,
      label: 'Reservations',
      hint: stats.totalReservations > 5 ? 'Amazing!' : stats.totalReservations > 0 ? 'Great!' : 'Start!',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      border: 'border-amber-200'
    },
    {
      icon: DollarSign,
      emoji: '💰',
      value: `₾${stats.moneySaved.toFixed(0)}`,
      label: 'Saved',
      hint: stats.moneySaved > 50 ? 'Wow!' : stats.moneySaved > 0 ? 'Nice!' : 'Save!',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      border: 'border-emerald-200'
    },
    {
      icon: Flame,
      emoji: '🔥',
      value: stats.currentStreak,
      label: 'Streak',
      hint: stats.currentStreak > 7 ? 'Hot!' : stats.currentStreak > 0 ? 'Yes!' : 'Go!',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      border: 'border-orange-200'
    },
    {
      icon: Gift,
      emoji: '🎁',
      value: stats.referrals,
      label: 'Referrals',
      hint: stats.referrals > 5 ? 'Star!' : stats.referrals > 0 ? 'Cool!' : 'Share!',
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      border: 'border-purple-200'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {statCards.map((stat) => (
        <Card
          key={stat.label}
          className={`${stat.bg} dark:bg-gray-800 border ${stat.border} dark:border-gray-700 shadow-sm rounded-xl hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
        >
          <div className="p-2.5">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <p className="text-[22px] font-black text-gray-900 dark:text-gray-100 leading-none">
                  {stat.value}
                </p>
                <p className="text-[9px] font-extrabold text-gray-700 dark:text-gray-300 leading-tight mt-1">
                  {stat.label}
                </p>
              </div>
              
              <div className={`w-9 h-9 rounded-xl ${stat.iconBg} dark:bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor} dark:text-gray-300`} />
              </div>
            </div>
            
            <div className="text-[8px] font-bold text-gray-600 dark:text-gray-400 leading-tight">
              {stat.hint}
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
