import { AchievementDefinition, UserAchievement, getAchievementTierColor } from '@/lib/gamification-api';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface AchievementBadgeProps {
  definition: AchievementDefinition;
  userAchievement?: UserAchievement;
  showDetails?: boolean;
}

export function AchievementBadge({ definition, userAchievement, showDetails = false }: AchievementBadgeProps) {
  const isUnlocked = !!userAchievement;
  const isNew = userAchievement?.is_new || false;
  const tierColor = getAchievementTierColor(definition.tier);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`relative p-4 rounded-xl border-2 transition-all ${
        isUnlocked
          ? 'bg-gradient-to-br from-white to-gray-50 border-[#4CC9A8] shadow-md'
          : 'bg-gray-100 border-gray-300 opacity-60'
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
          className={`relative w-16 h-16 flex items-center justify-center rounded-full ${
            isUnlocked
              ? 'bg-gradient-to-br from-[#EFFFF8] to-[#C9F9E9]'
              : 'bg-gray-200'
          }`}
          style={isUnlocked ? { borderColor: tierColor, borderWidth: '3px' } : {}}
        >
          {isUnlocked ? (
            <span className="text-4xl">{definition.icon}</span>
          ) : (
            <Lock className="w-6 h-6 text-gray-400" />
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
        className={`text-center font-bold mb-1 ${
          isUnlocked ? 'text-gray-900' : 'text-gray-500'
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

      {/* Tier Badge */}
      <div className="flex justify-center">
        <Badge
          variant="outline"
          className="text-xs capitalize"
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
          <span className="text-xs font-semibold text-[#4CC9A8]">
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
