import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Package, ShoppingBag, DollarSign, Star } from 'lucide-react';

interface StatsData {
  activeOffers: number;
  reservationsToday: number;
  itemsPickedUp: number;
  revenue: number;
}

interface EnhancedStatsCardsProps {
  stats: StatsData;
  className?: string;
}

export default function EnhancedStatsCards({ stats, className = '' }: EnhancedStatsCardsProps) {
  const statsCards = [
    {
      title: 'Offers Live',
      value: stats.activeOffers,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: null, // Can add comparison later
    },
    {
      title: 'Picked Up Today',
      value: stats.reservationsToday,
      icon: ShoppingBag,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: null,
    },
    {
      title: 'Items Sold',
      value: stats.itemsPickedUp,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: null,
    },
    {
      title: 'SmartPick Revenue',
      value: `${stats.revenue.toFixed(2)} ₾`,
      icon: DollarSign,
      color: 'text-coral-600',
      bgColor: 'bg-coral-50',
      trend: null,
    },
  ];

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 ${className}`}>
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={index}
            className="border-l-4"
            style={{ borderLeftColor: stat.color.replace('text-', '#') }}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">
                    {stat.title}
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                  {stat.trend && (
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trend > 0 ? (
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                      )}
                      <span
                        className={`text-xs sm:text-sm font-medium ${
                          stat.trend > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {Math.abs(stat.trend)}%
                      </span>
                      <span className="text-xs text-gray-500">vs last week</span>
                    </div>
                  )}
                </div>
                <div className={`p-2 sm:p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
