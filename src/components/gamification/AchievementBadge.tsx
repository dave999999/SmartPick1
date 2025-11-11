import { AchievementDefinition, UserAchievement, getAchievementTierColor } from '@/lib/gamification-api';
import { useState } from 'react';
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
  onClaim?: (achievementId: string) => void;
}

export function AchievementBadge({ 
  definition, 
  userAchievement, 
  showDetails = false,
  currentProgress = 0,
  targetProgress = 1,
  onClaim
}: AchievementBadgeProps) {
  const [claiming, setClaiming] = useState(false);
  const isUnlocked = !!userAchievement;
  const isNew = userAchievement?.is_new || false;
  // Check if reward was claimed - default to false if property doesn't exist (old records)
  const rewardClaimed = userAchievement?.reward_claimed === true;
  const tierColor = getAchievementTierColor(definition.tier);
  
  // Debug logging
  console.log(`Achievement ${definition.name}:`, {
    isUnlocked,
    hasUserAchievement: !!userAchievement,
    userAchievement,
    rewardClaimed
  });
  
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
          ? 'bg-gradient-to-br from-[#EFFFF8] via-white to-[#E8F9F3] border-[#4CC9A8] shadow-lg shadow-[#4CC9A8]/20'
          : 'bg-gray-50 border-gray-300 opacity-75'
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
              ? 'bg-gradient-to-br from-[#EFFFF8] to-[#C9F9E9] shadow-lg ring-4 ring-[#4CC9A8]/30'
              : 'bg-gray-200'
          }`}
          style={isUnlocked ? { borderColor: tierColor, borderWidth: '3px', borderStyle: 'solid' } : {}}
        >
          {/* Always show the emoji */}
          <span 
            className={`text-4xl ${!isUnlocked ? 'opacity-40 grayscale' : 'drop-shadow-lg'}`}
            role="img" 
            aria-label={definition.name}
          >
            {definition.icon}
          </span>

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
          
          {/* Checkmark badge for achieved */}
          {isUnlocked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#4CC9A8] rounded-full flex items-center justify-center shadow-md"
            >
              <Trophy className="w-3.5 h-3.5 text-white" />
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

      {/* Achieved Badge */}
      {isUnlocked && (
        <div className="flex justify-center mb-2">
          <Badge className="bg-[#4CC9A8] text-white text-xs px-2 py-0.5 font-bold">
            ✓ ACHIEVED
          </Badge>
        </div>
      )}

      {/* Description */}
      {showDetails && (
        <p className="text-xs text-center text-gray-600 mb-2">
          {definition.description}
        </p>
      )}

      {/* Progress Bar (only show for locked achievements with valid progress) */}
      {!isUnlocked && targetProgress > 0 && currentProgress < targetProgress && (
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

      {/* Claim button (unlocked but not claimed) */}
      {isUnlocked && !rewardClaimed && definition.reward_points > 0 && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={async () => {
              if (claiming) return;
              try {
                setClaiming(true);
                await onClaim?.(definition.id);
              } finally {
                // Let parent refresh userAchievement -> button disappears
                setClaiming(false);
              }
            }}
            disabled={claiming}
            className={`px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition ${claiming ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#4CC9A8] text-white hover:bg-[#3ab791]'}`}
          >
            {claiming ? 'Claiming…' : 'Claim Reward'}
          </button>
        </div>
      )}

      {/* Claimed indicator */}
      {isUnlocked && rewardClaimed && (
        <div className="mt-3 text-center">
          <span className="text-xs font-semibold text-green-600">Reward claimed</span>
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

