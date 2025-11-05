import { UserStats, formatMoneySaved } from '@/lib/gamification-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingBag, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserStatsCardProps {
  stats: UserStats;
}

export function UserStatsCard({ stats }: UserStatsCardProps) {
  const statItems = [
    {
      icon: ShoppingBag,
      label: 'Total Reservations',
      value: stats.total_reservations,
      color: '#3B82F6',
      bgColor: '#EFF6FF'
    },
    {
      icon: DollarSign,
      label: 'Money Saved',
      value: formatMoneySaved(stats.total_money_saved),
      color: '#10B981',
      bgColor: '#ECFDF5'
    },
    {
      icon: TrendingUp,
      label: 'Current Streak',
      value: `${stats.current_streak_days} days`,
      color: '#F59E0B',
      bgColor: '#FFFBEB'
    },
    {
      icon: Target,
      label: 'Friends Referred',
      value: stats.total_referrals,
      color: '#8B5CF6',
      bgColor: '#F5F3FF'
    }
  ];

  return (
    <Card className="shadow-lg border-[#4CC9A8]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#4CC9A8]" />
          Your Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-4 rounded-xl border-2 hover:shadow-md transition-all"
              style={{
                backgroundColor: item.bgColor,
                borderColor: `${item.color}40`
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: `${item.color}20` }}
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {item.value}
              </div>
              <div className="text-xs text-gray-600">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Longest Streak */}
        {stats.longest_streak_days > stats.current_streak_days && (
          <div className="mt-4 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
            <p className="text-sm text-gray-700">
              🏆 <strong>Personal Best:</strong> {stats.longest_streak_days} day streak
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
