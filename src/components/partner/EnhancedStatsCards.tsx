import { Card, CardContent } from '@/components/ui/card';
import { Package, Clock, CheckCircle, Banknote } from 'lucide-react';

interface StatsData {
  activeOffers: number;
  reservationsToday: number;
  itemsPickedUp: number;
  revenue: number;
  usedSlots?: number;
  totalSlots?: number;
}

interface EnhancedStatsCardsProps {
  stats: StatsData;
  className?: string;
  activeView?: string;
  onCardClick?: (view: string) => void;
}

export default function EnhancedStatsCards({ stats, className = '', activeView = 'reservations', onCardClick }: EnhancedStatsCardsProps) {
  const statsCards: Array<{
    title: string;
    value: number | string;
    icon: any;
    gradient: string;
    iconBg: string;
    view: string;
  }> = [
    {
      title: 'Listing Slots',
      value: stats.usedSlots !== undefined && stats.totalSlots !== undefined 
        ? `${stats.usedSlots}/${stats.totalSlots}` 
        : stats.activeOffers,
      icon: Package,
      gradient: 'from-teal-50 to-teal-100/50',
      iconBg: 'bg-gradient-to-br from-teal-500 to-teal-600',
      view: 'offers',
    },
    {
      title: 'Active Reservations',
      value: stats.reservationsToday,
      icon: Clock,
      gradient: 'from-orange-50 to-orange-100/50',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      view: 'reservations',
    },
    {
      title: 'Picked Up Today',
      value: stats.itemsPickedUp,
      icon: CheckCircle,
      gradient: 'from-emerald-50 to-emerald-100/50',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      view: 'today',
    },
    {
      title: 'Today\'s Revenue',
      value: `₾${stats.revenue.toFixed(2)}`,
      icon: Banknote,
      gradient: 'from-rose-50 to-rose-100/50',
      iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
      view: 'analytics',
    },
  ];

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {statsCards.map((stat, index) => {
        const Icon = stat.icon as React.ComponentType<{ className?: string }>;
        return (
          <Card
            key={index}
            onClick={() => onCardClick?.(stat.view)}
            className={`bg-gradient-to-br ${stat.gradient} border-none shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer ${
              activeView === stat.view ? 'ring-4 ring-offset-2 ring-teal-400 scale-105' : 'hover:scale-102'
            }`}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 font-semibold mb-2 uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 group-hover:scale-105 transition-transform">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.iconBg} p-2.5 sm:p-3 rounded-xl shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

