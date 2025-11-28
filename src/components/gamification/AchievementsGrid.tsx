import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AchievementBadge } from './AchievementBadge';
import { getUserAchievements, getAllAchievements, AchievementDefinition, UserAchievement, getUserStats, markAchievementViewed, claimAchievement, getLevelProgress } from '@/lib/gamification-api';
import { Award, Lock, TrendingUp } from 'lucide-react';
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // Realtime: listen for new achievements
  useEffect(() => {
    if (!userId) return;
    // Cleanup existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase
      .channel(`achievements-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          // Refresh data
          const [userAch, stats] = await Promise.all([
            getUserAchievements(userId),
            getUserStats(userId)
          ]);
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

          // Toast
          const achievement = allAchievements.find(a => a.id === payload.new.achievement_id);
          const name = achievement?.name || 'Achievement Unlocked';
          const icon = achievement?.icon || '🎉';
          const points = achievement?.reward_points || 0;
          toast.success(`${icon} ${name} +${points} points`);
        }
      )
      .subscribe((status) => {
        // no-op, but could log if needed
      });
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [userId, allAchievements]);

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
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-24">
      {/* Ultra-Compact Header - TikTok Style */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold text-gray-900 dark:text-gray-100 leading-none">
                Achievements
              </h2>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-semibold mt-0.5">
                Unlock badges & earn rewards!
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-black text-emerald-600 dark:text-emerald-400 leading-none">
              {unlockedCount}<span className="text-gray-400 dark:text-gray-600">/{totalCount}</span>
            </div>
            <div className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">{completionPercentage}% Done</div>
          </div>
        </div>

        {/* Super Thin Progress Bar */}
        <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* TikTok/Instagram Style Scrollable Category Chips - ONE ROW ONLY */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2.5">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-200
                ${activeCategory === cat.id
                  ? 'bg-[#16A34A] text-white shadow-sm'
                  : 'bg-[#F3F4F6] dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }
              `}
            >
              <span className="text-[14px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Achievement Cards - 2 Column Grid */}
      <div className="px-2 py-3">
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-12">
            <Lock className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
            <p className="text-[13px] text-gray-600 dark:text-gray-400 font-semibold">No achievements here yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredAchievements.map((achievement) => {
              const progress = calculateProgress(achievement);
              const userAch = getUserAchievementForDefinition(achievement.id);
              const isUnlocked = !!userAch;
              const isComplete = progress.current >= progress.target;
              const progressPercent = Math.min(100, Math.round((progress.current / progress.target) * 100));
              const isClaimed = userAch?.reward_claimed || false;
              const canClaim = isComplete && !isClaimed;

              return (
                <Card
                  key={achievement.id}
                  className={`
                    bg-white dark:bg-gray-800 border rounded-xl shadow-sm hover:shadow-md transition-all duration-200
                    ${isComplete ? 'border-emerald-200 dark:border-emerald-800' : 'border-gray-200 dark:border-gray-700'}
                  `}
                >
                  <CardContent className="p-2.5">
                    {/* Centered Badge Icon */}
                    <div className="flex justify-center mb-2">
                      <div className={`
                        w-14 h-14 rounded-xl flex items-center justify-center text-[28px]
                        ${isComplete
                          ? 'bg-emerald-50 dark:bg-emerald-900/30'
                          : 'bg-gray-100 dark:bg-gray-700 grayscale opacity-50'
                        }
                      `}>
                        {achievement.icon}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-center mb-2">
                      <h3 className="text-[12px] font-extrabold text-gray-900 dark:text-gray-100 leading-tight mb-1">
                        {achievement.name}
                      </h3>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-snug line-clamp-2 mb-2">
                        {achievement.description}
                      </p>
                    </div>

                    {/* Compact Progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                          {isComplete ? '✓' : `${progress.current}/${progress.target}`}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isComplete
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Reward + Claim Button */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-center px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-full">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          +{achievement.reward_points} pts 🪙
                        </span>
                      </div>

                      {canClaim && (
                        <button
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
                          className="w-full px-2.5 py-1.5 bg-[#16A34A] hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold rounded-lg shadow-sm hover:scale-105 active:scale-95 transition-all"
                        >
                          Claim
                        </button>
                      )}

                      {isClaimed && (
                        <div className="text-center text-[10px] font-semibold text-gray-500 dark:text-gray-500 py-1">
                          Claimed ✓
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Level Progress Section - Profile Style */}
      {userStats && (
        <div className="px-4 pb-4 pt-2">
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 shadow-sm">
            <CardContent className="p-4">
              {(() => {
                const { currentLevel, nextLevel, progress, reservationsToNext } = getLevelProgress(userStats.total_reservations);
                
                return (
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 leading-none">
                            Level Progress
                          </h3>
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                            Keep going to unlock perks! 🎯
                          </p>
                        </div>
                      </div>
                      <div className="text-[20px]">{currentLevel.icon}</div>
                    </div>

                    {/* Current Level Badge */}
                    <div 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ backgroundColor: `${currentLevel.color}20`, borderWidth: '1px', borderColor: currentLevel.color }}
                    >
                      <span className="text-[13px] font-bold" style={{ color: currentLevel.color }}>
                        {currentLevel.name}
                      </span>
                      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">
                        (Lvl {currentLevel.level})
                      </span>
                    </div>

                    {nextLevel ? (
                      <>
                        {/* Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {userStats.total_reservations} / {nextLevel.minReservations} reservations
                            </span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 transition-all duration-500"
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                            {reservationsToNext} more {reservationsToNext === 1 ? 'reservation' : 'reservations'} to reach <span className="font-bold" style={{ color: nextLevel.color }}>{nextLevel.name}</span> {nextLevel.icon}
                          </p>
                        </div>

                        {/* Next Level Benefits Preview */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-[16px]">{nextLevel.icon}</span>
                            <div>
                              <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 leading-none">
                                Next: {nextLevel.name}
                              </p>
                              <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium mt-0.5">
                                Unlock these benefits:
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            {nextLevel.benefits.slice(0, 2).map((benefit, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div 
                                  className="w-1 h-1 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: nextLevel.color }}
                                />
                                <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                                  {benefit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <div className="text-[28px] mb-1">🏆</div>
                        <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                          Max Level Reached!
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium mt-1">
                          You're a legend! 🎉
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

