import { UserStats, getLevelProgress } from '@/lib/gamification-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface UserLevelCardProps {
  stats: UserStats;
}

export function UserLevelCard({ stats }: UserLevelCardProps) {
  const { currentLevel, nextLevel, progress, reservationsToNext } = getLevelProgress(stats.total_reservations);

  return (
    <Card className="shadow-lg border-[#4CC9A8]/30 bg-gradient-to-br from-white to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-purple-600" />
          Your Level
        </CardTitle>
        <CardDescription>Unlock exclusive benefits as you level up!</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Level Display */}
        <div
          className="relative p-6 rounded-xl border-3 overflow-hidden"
          style={{
            backgroundColor: `${currentLevel.color}15`,
            borderColor: currentLevel.color,
            borderWidth: '3px'
          }}
        >
          {/* Decorative background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 text-6xl">{currentLevel.icon}</div>
            <div className="absolute bottom-0 left-0 text-6xl">{currentLevel.icon}</div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
                style={{ backgroundColor: `${currentLevel.color}30` }}
              >
                {currentLevel.icon}
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-600">Level {currentLevel.level}</span>
                  <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                </div>
                <h3 className="text-3xl font-black" style={{ color: currentLevel.color }}>
                  {currentLevel.name}
                </h3>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 mb-2">Your Benefits:</p>
              {currentLevel.benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4CC9A8]"></div>
                  {benefit}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress to Next Level */}
        {nextLevel ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: currentLevel.color }}>
                  {currentLevel.name}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
                <span className="text-lg font-bold" style={{ color: nextLevel.color }}>
                  {nextLevel.name}
                </span>
              </div>
              <span className="text-xl">{nextLevel.icon}</span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600">
                  Progress
                </span>
                <span className="font-bold text-[#4CC9A8]">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress
                value={progress}
                className="h-3"
                style={{
                  background: `linear-gradient(to right, ${currentLevel.color}30, ${nextLevel.color}30)`
                }}
              />
              <p className="text-xs text-gray-500 text-center">
                {reservationsToNext} more {reservationsToNext === 1 ? 'reservation' : 'reservations'} to reach {nextLevel.name}
              </p>
            </div>

            {/* Next Level Preview */}
            <div className="p-4 bg-white rounded-lg border-2 border-dashed" style={{ borderColor: nextLevel.color }}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{nextLevel.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Next: {nextLevel.name}</p>
                  <p className="text-xs text-gray-500">New benefits to unlock:</p>
                </div>
              </div>
              <div className="space-y-1">
                {nextLevel.benefits.slice(0, 2).map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: nextLevel.color }}></div>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300">
            <div className="text-4xl mb-2">🏆</div>
            <h4 className="text-xl font-bold text-gray-900 mb-1">Maximum Level Reached!</h4>
            <p className="text-sm text-gray-600">You've unlocked all benefits. You're a SmartPick Legend!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
