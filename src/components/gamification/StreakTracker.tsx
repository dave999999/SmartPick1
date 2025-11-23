import { UserStats, getStreakEmoji } from '@/lib/gamification-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Flame, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface StreakTrackerProps {
  stats: UserStats;
}

export function StreakTracker({ stats }: StreakTrackerProps) {
  const streakDays = stats.current_streak_days;
  const longestStreak = stats.longest_streak_days;
  const emoji = getStreakEmoji(streakDays);

  // Generate last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date;
  });

  let lastActivityDate = stats.last_activity_date ? new Date(stats.last_activity_date) : null;
  const today = new Date();
  // Normalize to start of local day for consistent diff calculations
  today.setHours(0,0,0,0);
  if (lastActivityDate) {
    lastActivityDate.setHours(0,0,0,0);
    // Guard against future activity dates (clock skew)
    if (lastActivityDate.getTime() > today.getTime()) {
      lastActivityDate = today;
    }
  }

  const isDayActive = (date: Date) => {
    if (!lastActivityDate || streakDays <= 0) return false;
    // Normalize date to start of day
    const d = new Date(date.getTime());
    d.setHours(0,0,0,0);
    const daysDiff = Math.floor((lastActivityDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff < streakDays;
  };

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardHeader className="px-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Flame className="w-5 h-5 text-orange-400" />
              Activity Streak
            </CardTitle>
            <CardDescription className="text-gray-400">Keep the momentum going!</CardDescription>
          </div>
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'easeInOut'
            }}
            className="text-5xl"
          >
            {emoji}
          </motion.div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="text-center p-6 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl border-2 border-orange-500/30">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-6xl font-black text-orange-400"
          >
            {streakDays}
          </motion.div>
          <div className="text-lg font-semibold text-orange-300 mt-2">
            {streakDays === 1 ? 'Day' : 'Days'} Streak
          </div>
          {streakDays === 0 && (
            <p className="text-sm text-orange-300 mt-2">
              Make a reservation today to start your streak! 🔥
            </p>
          )}
        </div>

        {/* Calendar View */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Last 7 Days</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {last7Days.map((date, index) => {
              const isActive = isDayActive(date);
              const isToday = date.toDateString() === new Date().toDateString();

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative aspect-square rounded-lg flex flex-col items-center justify-center border-2 ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-400 to-yellow-400 border-orange-500'
                      : 'bg-gray-800 border-gray-600'
                  } ${isToday ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-[#2a2a2a]' : ''}`}
                >
                  <div className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })[0]}
                  </div>
                  <div className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {date.getDate()}
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 text-xs"
                    >
                      ✓
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Personal Best */}
        {longestStreak > 0 && (
          <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-orange-400/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-gray-300">Personal Best</span>
            </div>
            <span className="text-lg font-bold text-orange-400">{longestStreak} days</span>
          </div>
        )}

        {/* Streak Milestones */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 mb-2">Next Milestones:</p>
          {[
            { days: 3, reward: '+20 points', emoji: '🔥' },
            { days: 7, reward: '+50 points', emoji: '⚡' },
            { days: 30, reward: '+200 points', emoji: '🏆' }
          ]
            .filter(milestone => streakDays < milestone.days)
            .slice(0, 2)
            .map((milestone) => (
              <div
                key={milestone.days}
                className="flex items-center justify-between p-2 bg-black/20 rounded border border-orange-400/30"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{milestone.emoji}</span>
                  <span className="text-sm text-gray-300">{milestone.days} days</span>
                </div>
                <span className="text-xs font-semibold text-teal-400">{milestone.reward}</span>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

