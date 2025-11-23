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
      color: '#60A5FA',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.3)'
    },
    {
      icon: DollarSign,
      label: 'Money Saved',
      value: formatMoneySaved(stats.total_money_saved),
      color: '#34D399',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    {
      icon: TrendingUp,
      label: 'Current Streak',
      value: `${stats.current_streak_days} days`,
      color: '#FBBF24',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.3)'
    },
    {
      icon: Target,
      label: 'Friends Referred',
      value: stats.total_referrals,
      color: '#A78BFA',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.3)'
    }
  ];

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="px-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="w-5 h-5 text-teal-400" />
          Your Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative p-4 rounded-xl border hover:shadow-lg transition-all"
              style={{
                backgroundColor: item.bgColor,
                borderColor: item.borderColor
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: item.bgColor }}
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {item.value}
              </div>
              <div className="text-xs text-gray-400">{item.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Longest Streak */}
        {stats.longest_streak_days > stats.current_streak_days && (
          <div className="mt-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
            <p className="text-sm text-gray-300">
              🏆 <strong className="text-white">Personal Best:</strong> {stats.longest_streak_days} day streak
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

