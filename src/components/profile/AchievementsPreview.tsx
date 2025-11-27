import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Star, CheckCircle2, Trophy } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
}

interface AchievementsPreviewProps {
  achievements: Achievement[];
  onViewAll?: () => void;
}

/**
 * AchievementsPreview - Preview of user's achievements
 * 
 * Shows:
 * - Unlocked achievements with checkmark
 * - Locked achievements with lock icon + progress
 * - Friendly emoji badges
 * - "View all" link
 * 
 * Compact, gamified, encouraging
 */
export function AchievementsPreview({ achievements, onViewAll }: AchievementsPreviewProps) {
  // Show first 4 achievements
  const previewAchievements = achievements.slice(0, 4);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <Card className="border-gray-200 shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Achievements</h3>
              <p className="text-[11px] text-gray-600">
                {unlockedCount} of {achievements.length} unlocked
              </p>
            </div>
          </div>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700"
            >
              View all →
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
              style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Achievement grid */}
        <div className="grid grid-cols-2 gap-2">
          {previewAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`
                relative p-3 rounded-xl border-2 transition-all
                ${achievement.unlocked
                  ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm'
                  : 'border-gray-200 bg-gray-50'
                }
              `}
            >
              {/* Badge emoji */}
              <div className="text-[28px] leading-none mb-2 relative">
                {achievement.emoji}
                {achievement.unlocked && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
                {!achievement.unlocked && (
                  <div className="absolute inset-0 bg-gray-400/50 rounded-lg backdrop-blur-[2px] flex items-center justify-center">
                    <Lock className="w-5 h-5 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Name */}
              <h4 className={`text-[11px] font-semibold mb-1 leading-tight ${achievement.unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                {achievement.name}
              </h4>

              {/* Progress or status */}
              {!achievement.unlocked && achievement.progress !== undefined && achievement.total !== undefined && (
                <p className="text-[10px] text-gray-600">
                  {achievement.progress}/{achievement.total}
                </p>
              )}
              {achievement.unlocked && (
                <p className="text-[10px] text-amber-700 font-medium">
                  Unlocked! ✨
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Encouragement */}
        {unlockedCount === 0 && (
          <p className="text-[12px] text-center text-gray-600 mt-3">
            Start your journey to unlock achievements! 🚀
          </p>
        )}
        {unlockedCount > 0 && unlockedCount < achievements.length && (
          <p className="text-[12px] text-center text-gray-600 mt-3">
            Keep going! {achievements.length - unlockedCount} more to unlock 💪
          </p>
        )}
        {unlockedCount === achievements.length && (
          <p className="text-[12px] text-center text-amber-700 font-medium mt-3">
            All achievements unlocked! You're amazing! 🎉
          </p>
        )}
      </div>
    </Card>
  );
}
