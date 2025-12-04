import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { getUserAchievements, getAllAchievements, AchievementDefinition, UserAchievement, getUserStats, markAchievementViewed, claimAchievement, getLevelProgress } from '@/lib/gamification-api';
import { Award, Lock, TrendingUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface AchievementsGridProps {
  userId: string;
  onUnclaimedCountChange?: (count: number) => void;
}

export function AchievementsGrid({ userId, onUnclaimedCountChange }: AchievementsGridProps) {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      logger.log('Loading achievements for user:', userId);
      const [userAch, allAch, stats] = await Promise.all([
        getUserAchievements(userId),
        getAllAchievements(),
        getUserStats(userId)
      ]);
      logger.log('Achievements loaded:', {
        userAchievements: userAch.length,
        allAchievements: allAch.length,
        hasStats: !!stats
      });
      setUserAchievements(userAch);
      setAllAchievements(allAch);
      setUserStats(stats);
      
      // Update unclaimed count - count achievements that are complete but not claimed
      const unclaimedCount = allAch.filter(achievement => {
        const progress = calculateProgress(achievement, stats);
        const isComplete = progress.current >= progress.target;
        const userAchievement = userAch.find(ua => ua.achievement_id === achievement.id);
        const isClaimed = userAchievement?.reward_claimed || false;
        return isComplete && !isClaimed;
      }).length;
      onUnclaimedCountChange?.(unclaimedCount);
    } catch (error) {
      logger.error('Error loading achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  // Polling for new achievements (replaces realtime to stay under channel limits)
  // Poll every 60 seconds - achievements don't need instant updates
  useEffect(() => {
    if (!userId) return;
    
    const interval = setInterval(async () => {
      try {
        // Refresh data
        const [userAch, stats] = await Promise.all([
          getUserAchievements(userId),
          getUserStats(userId)
        ]);
        
        // Only update if data changed
        if (JSON.stringify(userAch) !== JSON.stringify(userAchievements)) {
          setUserAchievements(userAch);
          setUserStats(stats);
          
          // Recalculate unclaimed count
          const unclaimedCount = allAchievements.filter(achievement => {
            const progress = calculateProgress(achievement, stats);
            const isComplete = progress.current >= progress.target;
            const userAchievement = userAch.find(ua => ua.achievement_id === achievement.id);
            const isClaimed = userAchievement?.reward_claimed || false;
            return isComplete && !isClaimed;
          }).length;
          onUnclaimedCountChange?.(unclaimedCount);

          // Check for newly unlocked achievements to show toast
          const newUnlocked = userAch.filter(ua => {
            const wasUnlocked = userAchievements.some(prev => prev.achievement_id === ua.achievement_id);
            return !wasUnlocked;
          });
          
          newUnlocked.forEach(ua => {
            const achievement = allAchievements.find(a => a.id === ua.achievement_id);
            if (achievement) {
              toast.success(`${achievement.icon} ${achievement.name} +${achievement.reward_points} points`);
            }
          });
        }
      } catch (error) {
        console.error('Failed to poll achievements:', error);
      }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [userId, allAchievements, userAchievements, onUnclaimedCountChange]);

  const getUserAchievementForDefinition = (defId: string): UserAchievement | undefined => {
    return userAchievements.find(ua => ua.achievement_id === defId);
  };

  // Auto mark newly viewed achievements (remove NEW badge after showing toast)
  useEffect(() => {
    const newlyUnlocked = userAchievements.filter(a => a.is_new);
    if (newlyUnlocked.length === 0) return;
    // Mark them viewed (fire and forget)
    newlyUnlocked.forEach(async (ua) => {
      try {
        await markAchievementViewed(ua.achievement_id, userId);
      } catch (e) {
        logger.warn('Failed to mark achievement viewed', ua.achievement_id, e);
      }
    });
  }, [userAchievements, userId]);

  // Calculate progress for an achievement based on its requirement type
  const calculateProgress = (achievement: AchievementDefinition): { current: number; target: number } => {
    if (!userStats || !achievement.requirement) {
      return { current: 0, target: 1 };
    }

    const req = achievement.requirement;
    
    switch (req.type) {
      case 'reservations':
        return {
          current: userStats.total_reservations || 0,
          target: req.count || 1
        };
      
      case 'money_saved':
        return {
          current: Math.floor(userStats.total_money_saved || 0),
          target: req.amount || 1
        };
      
      case 'streak':
        return {
          current: userStats.current_streak_days || 0,
          target: req.days || 1
        };
      
      case 'referrals':
        return {
          current: userStats.total_referrals || 0,
          target: req.count || 1
        };
      
      case 'category':
          const categoryCount = userStats.category_counts?.[req.name] || 0;
          return {
            current: categoryCount,
            target: req.count || 1
          };
      
      case 'unique_partners':
          return {
            current: userStats.unique_partners_visited || 0,
            target: req.count || 1
          };
      
      case 'partner_loyalty':
          const maxPartnerVisits = userStats.partner_visit_counts
              ? Math.max(...Object.values(userStats.partner_visit_counts).map(v => Number(v) || 0), 0)
            : 0;
          return {
            current: maxPartnerVisits,
            target: req.count || 1
          };
      
      default:
        return { current: 0, target: 1 };
    }
  };

  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;
  const completionPercentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Group by category
  const achievementsByCategory = allAchievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, AchievementDefinition[]>);

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CC9A8]"></div>
        </CardContent>
      </Card>
    );
  }
  
  const categories = [
    { id: 'all', label: 'All', icon: '🏆' },
    { id: 'savings', label: 'Savings', icon: '💰' },
    { id: 'milestone', label: 'Milestones', icon: '⭐' },
    { id: 'engagement', label: 'Streak', icon: '🔥' },
    { id: 'social', label: 'Social', icon: '🎁' }
  ];

  const filteredAchievements = activeCategory === 'all'
    ? allAchievements
    : allAchievements.filter(a => a.category === activeCategory);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-b from-[#FAFAFA] via-[#F8F9FB] to-white pb-28"
    >
      {/* Premium Apple Header */}
      <div className="px-5 pt-8 pb-5">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#FFB868] to-[#FF8A00] flex items-center justify-center shadow-[0_4px_12px_rgba(255,138,0,0.2)]">
                  <Award size={22} strokeWidth={2.5} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#3CD878] rounded-full flex items-center justify-center shadow-sm">
                  <Sparkles size={12} className="text-white" strokeWidth={3} />
                </div>
              </div>
              <div>
                <h1 className="text-[22px] font-semibold text-[#1A1A1A] leading-[1.2] tracking-tight">
                  Achievements
                </h1>
                <p className="text-[14px] text-[#6F6F6F] leading-tight font-medium mt-0.5">
                  Complete challenges, earn rewards
                </p>
              </div>
            </div>
          </div>

          {/* Premium Glass Progress Card */}
          <Card className="relative overflow-hidden bg-[rgba(255,255,255,0.85)] backdrop-blur-xl rounded-[20px] shadow-[0_8px_28px_rgba(0,0,0,0.06)] border border-[rgba(0,0,0,0.06)]">
            {/* Decorative blur elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#FFB868]/20 to-[#FF8A00]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#3CD878]/10 rounded-full blur-2xl" />
            
            <CardContent className="relative p-5 pb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[13px] text-[#6F6F6F] font-medium mb-1.5">Overall Progress</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[32px] font-bold text-[#1A1A1A] leading-none tracking-tight">
                      {unlockedCount}
                    </span>
                    <span className="text-[20px] font-semibold text-[#8E8E93] leading-none">
                      /{totalCount}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#FFB868] to-[#FF8A00] rounded-[14px] shadow-[0_4px_12px_rgba(255,138,0,0.15)]">
                    <span className="text-[28px] font-bold text-white leading-none tracking-tight">
                      {completionPercentage}
                    </span>
                    <span className="text-[16px] font-semibold text-white/90 leading-none">%</span>
                  </div>
                  <p className="text-[12px] text-[#6F6F6F] font-medium mt-2">Complete</p>
                </div>
              </div>
              
              {/* iOS Fitness-Style Ultra-Thin Progress Bar */}
              <div className="h-[6px] bg-[#E5E5EA] rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-[#3CD878] via-[#FFB868] to-[#FF8A00] rounded-full shadow-[0_0_8px_rgba(60,216,120,0.5)]"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* iOS Segmented Control-Style Filters */}
        <div className="w-full px-1">
          <div className="flex flex-wrap justify-center gap-1.5 w-full">
            {categories.map((cat, index) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  flex-1 min-w-[70px] max-w-[105px] inline-flex items-center justify-center gap-1 px-2.5 h-[30px] rounded-[10px] 
                  text-[10px] font-semibold whitespace-nowrap
                  transition-all duration-300 active:scale-95
                  ${activeCategory === cat.id
                    ? 'bg-[#1A1A1A] text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                    : 'bg-[rgba(255,255,255,0.72)] text-[#1A1A1A] border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm hover:bg-white hover:border-[rgba(0,0,0,0.1)]'
                  }
                `}
              >
                <span className="text-[13px] leading-none">{cat.icon}</span>
                <span className="leading-none">{cat.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Premium Achievement Cards - Responsive Grid */}
      <div className="px-2 py-3 w-full overflow-x-hidden">
        {filteredAchievements.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12"
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-[14px] bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <Lock size={24} className="text-gray-400" strokeWidth={2} />
            </div>
            <p className="text-[14px] text-[#6F6F6F] font-semibold">No achievements here yet</p>
            <p className="text-[12px] text-[#8E8E93] mt-1">Keep exploring to unlock rewards</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 w-full">
            <AnimatePresence mode="popLayout">
              {filteredAchievements.map((achievement, index) => {
                const progress = calculateProgress(achievement);
                const userAch = getUserAchievementForDefinition(achievement.id);
                const isUnlocked = !!userAch;
                const isComplete = progress.current >= progress.target;
                const progressPercent = Math.min(100, Math.round((progress.current / progress.target) * 100));
                const isClaimed = userAch?.reward_claimed || false;
                const canClaim = isComplete && !isClaimed;

                return (
                  <motion.div
                    key={achievement.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="w-full min-w-0"
                  >
                    <Card
                      className={`
                        relative overflow-hidden w-full
                        bg-[rgba(255,255,255,0.85)] backdrop-blur-sm
                        rounded-[14px] border-[1.5px]
                        shadow-[0_4px_16px_rgba(0,0,0,0.06)]
                        transition-all duration-300
                        active:scale-[0.97]
                        ${isComplete 
                          ? 'border-[#3CD878]/30 hover:shadow-[0_8px_20px_rgba(60,216,120,0.15)]' 
                          : 'border-[rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]'
                        }
                      `}
                    >
                      {/* Soft glow for completed */}
                      {isComplete && (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#3CD878]/5 via-transparent to-[#FFB868]/5 pointer-events-none" />
                      )}

                      <CardContent className="relative p-2 w-full overflow-hidden">
                        {/* Icon in Frosted Circular Plate */}
                        <div className="flex justify-center mb-1.5">
                          <div className={`
                            relative w-[40px] h-[40px] rounded-[12px] flex items-center justify-center text-[22px]
                            transition-all duration-300
                            ${isComplete
                              ? 'bg-gradient-to-br from-[#3CD878]/10 to-[#FFB868]/10 backdrop-blur-md shadow-[0_2px_8px_rgba(60,216,120,0.12)]'
                              : 'bg-[rgba(250,250,250,0.92)] backdrop-blur-sm grayscale opacity-40'
                            }
                          `}>
                            {achievement.icon}
                            {isComplete && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-gradient-to-br from-[#3CD878] to-[#30D158] rounded-full flex items-center justify-center shadow-lg"
                              >
                                <Sparkles size={8} className="text-white" strokeWidth={2.5} />
                              </motion.div>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="text-center mb-1.5 w-full overflow-hidden px-0.5">
                          <h3 className="text-[11px] font-semibold text-[#1A1A1A] leading-[1.2] mb-0.5 tracking-tight break-words">
                            {achievement.name}
                          </h3>
                          <p className="text-[9px] text-[#6F6F6F] leading-[1.2] line-clamp-2 font-normal break-words">
                            {achievement.description}
                          </p>
                        </div>

                        {/* iOS Fitness-Style Progress */}
                        <div className="mb-1.5 w-full">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-medium text-[#1A1A1A] truncate">
                              {isComplete ? '✓' : `${progress.current}/${progress.target}`}
                            </span>
                            <span className={`text-[9px] font-bold flex-shrink-0 ml-0.5 ${
                              isComplete ? 'text-[#3CD878]' : 'text-[#8E8E93]'
                            }`}>
                              {progressPercent}%
                            </span>
                          </div>
                          <div className="h-[2.5px] bg-[#E5E5EA] rounded-full overflow-hidden shadow-inner w-full">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                isComplete
                                  ? 'bg-gradient-to-r from-[#3CD878] to-[#30D158] shadow-[0_0_8px_rgba(60,216,120,0.4)]'
                                  : 'bg-[#C7C7CC]'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Reward Badge */}
                        <div className="flex items-center justify-center mb-1 w-full">
                          <div className={`
                            inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[6px] max-w-full
                            ${isComplete 
                              ? 'bg-gradient-to-r from-[#FFB868] to-[#FF8A00] shadow-[0_1px_4px_rgba(255,138,0,0.15)]' 
                              : 'bg-[rgba(250,250,250,0.92)] border border-[rgba(0,0,0,0.06)]'
                            }
                          `}>
                            <span className={`text-[9px] font-bold ${
                              isComplete ? 'text-white' : 'text-[#8E8E93]'
                            }`}>
                              +{achievement.reward_points}
                            </span>
                            <span className="text-[11px] leading-none">{isComplete ? '🪙' : '🔒'}</span>
                          </div>
                        </div>

                        {/* Claim Button / Status */}
                        {canClaim && (
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={async () => {
                              const res = await claimAchievement(achievement.id);
                              if (!res) {
                                toast.error('Failed to claim');
                                return;
                              }
                              if (res.awarded_now) {
                                toast.success(`+${res.reward_points} points! 🎉`);
                              } else if (res.success) {
                                toast.success('Achievement claimed! 🎉');
                              }
                              await loadAchievements();
                            }}
                            className="w-full h-[28px] bg-gradient-to-r from-[#3CD878] to-[#30D158] hover:from-[#30D158] hover:to-[#3CD878] text-white text-[10px] font-semibold rounded-[8px] shadow-[0_1px_4px_rgba(60,216,120,0.2)] active:shadow-[0_1px_2px_rgba(60,216,120,0.15)] transition-all"
                          >
                            Claim
                          </motion.button>
                        )}

                        {isClaimed && (
                          <div className="flex items-center justify-center gap-0.5 h-[28px] bg-[rgba(250,250,250,0.92)] rounded-[8px] border border-[rgba(0,0,0,0.06)] w-full">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#3CD878] to-[#30D158] flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">✓</span>
                            </div>
                            <span className="text-[9px] font-semibold text-[#6F6F6F]">Claimed</span>
                          </div>
                        )}

                        {!isComplete && !isClaimed && (
                          <div className="flex items-center justify-center gap-0.5 h-[28px] bg-[rgba(250,250,250,0.92)] rounded-[8px] border border-[rgba(0,0,0,0.06)] w-full">
                            <Lock size={9} className="text-[#8E8E93]" strokeWidth={2.5} />
                            <span className="text-[9px] font-medium text-[#8E8E93]">Locked</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Premium Level Progress Section */}
      {userStats && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="px-4 pb-6 pt-2"
        >
          <Card className="relative overflow-hidden bg-[rgba(255,255,255,0.85)] backdrop-blur-xl rounded-[20px] shadow-[0_8px_28px_rgba(0,0,0,0.06)] border border-[rgba(0,0,0,0.06)]">
            {/* Decorative gradients */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[#4D8EFF]/10 to-[#FF6A6A]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FFB868]/10 rounded-full blur-2xl" />
            
            <CardContent className="relative p-5">
              {(() => {
                const { currentLevel, nextLevel, progress, reservationsToNext } = getLevelProgress(userStats.total_reservations);
                
                return (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#4D8EFF] to-[#4D8EFF]/70 flex items-center justify-center shadow-[0_4px_12px_rgba(77,142,255,0.2)]">
                          <TrendingUp size={20} strokeWidth={2.5} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[#1A1A1A] leading-tight">
                            Level Progress
                          </h3>
                          <p className="text-[13px] text-[#6F6F6F] font-medium mt-0.5">
                            Keep going to unlock perks! 🎯
                          </p>
                        </div>
                      </div>
                      <div className="text-[28px] leading-none">{currentLevel.icon}</div>
                    </div>

                    {/* Current Level Badge */}
                    <div 
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] shadow-sm"
                      style={{ 
                        backgroundColor: `${currentLevel.color}15`, 
                        borderWidth: '1.5px', 
                        borderColor: `${currentLevel.color}40` 
                      }}
                    >
                      <span className="text-[15px] font-bold tracking-tight" style={{ color: currentLevel.color }}>
                        {currentLevel.name}
                      </span>
                      <span className="text-[13px] font-medium text-[#6F6F6F]">
                        (Level {currentLevel.level})
                      </span>
                    </div>

                    {nextLevel ? (
                      <>
                        {/* Progress Section */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-medium text-[#1A1A1A]">
                              {userStats.total_reservations} / {nextLevel.minReservations} reservations
                            </span>
                            <span className="text-[14px] font-bold text-[#4D8EFF]">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          
                          {/* iOS Fitness-Style Progress Bar */}
                          <div className="h-[6px] bg-[#E5E5EA] rounded-full overflow-hidden shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, progress)}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full bg-gradient-to-r from-[#4D8EFF] via-[#FF6A6A] to-[#FFB868] rounded-full shadow-[0_0_8px_rgba(77,142,255,0.4)]"
                            />
                          </div>
                          
                          <p className="text-[13px] text-[#6F6F6F] font-medium leading-[1.4]">
                            {reservationsToNext} more {reservationsToNext === 1 ? 'reservation' : 'reservations'} to reach{' '}
                            <span className="font-bold" style={{ color: nextLevel.color }}>
                              {nextLevel.name}
                            </span>{' '}
                            {nextLevel.icon}
                          </p>
                        </div>

                        {/* Next Level Benefits Preview */}
                        <div className="bg-[rgba(255,255,255,0.92)] backdrop-blur-sm rounded-[16px] p-4 border border-[rgba(0,0,0,0.06)] shadow-sm">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[rgba(250,250,250,0.92)] to-white flex items-center justify-center text-[24px] border border-[rgba(0,0,0,0.04)]">
                              {nextLevel.icon}
                            </div>
                            <div className="flex-1">
                              <p className="text-[15px] font-semibold text-[#1A1A1A] leading-tight">
                                Next: {nextLevel.name}
                              </p>
                              <p className="text-[13px] text-[#6F6F6F] font-medium mt-0.5">
                                Unlock these benefits:
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {nextLevel.benefits.slice(0, 2).map((benefit, index) => (
                              <div key={index} className="flex items-center gap-2.5">
                                <div 
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-sm" 
                                  style={{ backgroundColor: nextLevel.color }}
                                />
                                <span className="text-[13px] text-[#1A1A1A] font-medium leading-tight">
                                  {benefit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6 bg-gradient-to-br from-[#FFB868]/10 to-[#FF8A00]/5 rounded-[16px] border border-[#FFB868]/20">
                        <div className="text-[40px] mb-2 leading-none">🏆</div>
                        <p className="text-[15px] font-bold text-[#1A1A1A] leading-tight">
                          Max Level Reached!
                        </p>
                        <p className="text-[13px] text-[#6F6F6F] font-medium mt-1">
                          You're a legend! 🎉
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

