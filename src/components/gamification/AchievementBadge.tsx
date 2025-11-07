import { AchievementDefinition, UserAchievement, getAchievementTierColor } from '@/lib/gamification-api';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles, Trophy, Target, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

interface AchievementBadgeProps {
  definition: AchievementDefinition;
  userAchievement?: UserAchievement;
  showDetails?: boolean;
  currentProgress?: number; // Current value (e.g., 3 reservations out of 5)
  targetProgress?: number;  // Target value (e.g., 5 reservations)
}

export function AchievementBadge({ 
  definition, 
  userAchievement, 
  showDetails = false,
  currentProgress = 0,
  targetProgress = 1
}: AchievementBadgeProps) {
  const isUnlocked = !!userAchievement;
  const isNew = userAchievement?.is_new || false;
  const tierColor = getAchievementTierColor(definition.tier);
  
  // Calculate progress percentage
  const progressPercentage = targetProgress > 0 
    ? Math.min(100, Math.round((currentProgress / targetProgress) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`relative p-4 rounded-xl border-2 transition-all ${
        isUnlocked
          ? 'bg-gradient-to-br from-white to-gray-50 border-[#4CC9A8] shadow-md'
          : 'bg-gray-50 border-gray-300'
      }`}
    >
      {/* New Badge */}
      {isNew && (
        <motion.div
          initial={{ rotate: -12, scale: 0 }}
          animate={{ rotate: -12, scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="absolute -top-2 -right-2 z-10"
        >
          <Badge className="bg-red-500 text-white font-bold px-2 py-1 text-xs">
            NEW!
          </Badge>
        </motion.div>
      )}

      {/* Icon */}
      <div className="flex items-center justify-center mb-3">
        <div
          className={`relative w-16 h-16 flex items-center justify-center rounded-full transition-all ${
            isUnlocked
              ? 'bg-gradient-to-br from-[#EFFFF8] to-[#C9F9E9] shadow-lg'
              : 'bg-gray-200'
          }`}
          style={isUnlocked ? { borderColor: tierColor, borderWidth: '3px', borderStyle: 'solid' } : {}}
        >
          {isUnlocked ? (
            <span className="text-4xl" role="img" aria-label={definition.name}>
              {definition.icon}
            </span>
          ) : (
            <div className="relative">
              <span className="text-3xl opacity-30" role="img" aria-label={definition.name}>
                {definition.icon}
              </span>
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-5 h-5 text-gray-500" />
              </div>
            </div>
          )}

          {/* Sparkle effect for unlocked */}
          {isUnlocked && isNew && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-1 -right-1"
            >
              <Sparkles className="w-4 h-4 text-yellow-400" fill="currentColor" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Name */}
      <h4
        className={`text-center font-bold mb-1 text-sm ${
          isUnlocked ? 'text-gray-900' : 'text-gray-600'
        }`}
      >
        {definition.name}
      </h4>

      {/* Description */}
      {showDetails && (
        <p className="text-xs text-center text-gray-600 mb-2">
          {definition.description}
        </p>
      )}

      {/* Progress Bar (only show for locked achievements) */}
      {!isUnlocked && targetProgress > 0 && (
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Progress</span>
            <span className="text-[#4CC9A8] font-bold">
              {currentProgress}/{targetProgress}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="text-center">
            <span className="text-xs text-gray-400">{progressPercentage}%</span>
          </div>
        </div>
      )}

      {/* Tier Badge */}
      <div className="flex justify-center mt-2">
        <Badge
          variant="outline"
          className="text-xs capitalize font-semibold"
          style={{
            borderColor: tierColor,
            color: tierColor,
            backgroundColor: isUnlocked ? `${tierColor}20` : undefined
          }}
        >
          {definition.tier}
        </Badge>
      </div>

      {/* Reward Points */}
      {definition.reward_points > 0 && (
        <div className="mt-2 text-center">
          <span className={`text-xs font-semibold ${isUnlocked ? 'text-[#4CC9A8]' : 'text-gray-500'}`}>
            +{definition.reward_points} points
          </span>
        </div>
      )}

      {/* Unlock Date */}
      {isUnlocked && userAchievement && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-400">
            Unlocked {new Date(userAchievement.unlocked_at).toLocaleDateString()}
          </span>
        </div>
      )}
    </motion.div>
  );
}
