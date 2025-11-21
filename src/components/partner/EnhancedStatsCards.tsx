import { Card, CardContent } from '@/components/ui/card';
import { Package, Clock, CheckCircle, Banknote, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsData {
  activeOffers: number;
  reservationsToday: number;
  itemsPickedUp: number;
  revenue: number;
  usedSlots?: number;
  totalSlots?: number;
  // Optional trend data
  reservationsTrend?: number; // percentage change from yesterday
  pickupTrend?: number;
  revenueTrend?: number;
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
    subtitle?: string;
    value: number | string;
    icon: any;
    bgColor: string;
    iconBg: string;
    iconColor: string;
    view: string;
    trend?: number;
  }> = [
    {
      title: 'Slots',
      subtitle: 'Active',
      value: stats.usedSlots !== undefined && stats.totalSlots !== undefined 
        ? `${stats.usedSlots}/${stats.totalSlots}` 
        : stats.activeOffers,
      icon: Package,
      bgColor: 'bg-white',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      view: 'offers',
    },
    {
      title: 'Active',
      subtitle: 'Today',
      value: stats.reservationsToday,
      icon: Clock,
      bgColor: 'bg-white',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      view: 'reservations',
      trend: stats.reservationsTrend,
    },
    {
      title: 'Picked Up',
      subtitle: 'Today',
      value: stats.itemsPickedUp,
      icon: CheckCircle,
      bgColor: 'bg-white',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      view: 'today',
      trend: stats.pickupTrend,
    },
    {
      title: 'Revenue',
      subtitle: 'All Time',
      value: `₾${stats.revenue.toFixed(0)}`,
      icon: Banknote,
      bgColor: 'bg-white',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      view: 'analytics',
      trend: stats.revenueTrend,
    },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 ${className}`}>
      {statsCards.map((stat, index) => {
        const Icon = stat.icon as React.ComponentType<{ className?: string }>;
        const isActive = activeView === stat.view;
        const hasTrend = stat.trend !== undefined && stat.trend !== 0;
        const isPositiveTrend = stat.trend && stat.trend > 0;
        
        return (
          <Card
            key={index}
            onClick={() => onCardClick?.(stat.view)}
            className={`
              ${stat.bgColor} transition-all duration-200 overflow-hidden group cursor-pointer
              ${isActive 
                ? 'border-2 border-teal-500 shadow-lg ring-2 ring-teal-100' 
                : 'border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
              }
            `}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`${stat.iconBg} p-3 rounded-xl transition-transform ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} strokeWidth={2} />
                </div>
                
                {/* Content */}
                <div className="flex flex-col min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold ${isActive ? 'text-teal-600' : 'text-gray-900'}`}>
                    {stat.value}
                  </p>
                  
                  {/* Trend Indicator */}
                  {hasTrend && (
                    <div className={`flex items-center gap-1 text-xs font-semibold mt-1 ${
                      isPositiveTrend ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {isPositiveTrend ? (
                        <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                      )}
                      <span>{Math.abs(stat.trend!)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

