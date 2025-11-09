import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AchievementBadge } from './AchievementBadge';
import { getUserAchievements, getAllAchievements, AchievementDefinition, UserAchievement, getUserStats, markAchievementViewed, claimAchievement } from '@/lib/gamification-api';
import { Award, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface AchievementsGridProps {
  userId: string;
}

export function AchievementsGrid({ userId }: AchievementsGridProps) {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<any>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  const loadAchievements = async () => {
    setLoading(true);
    try {
      console.log('Loading achievements for user:', userId);
      const [userAch, allAch, stats] = await Promise.all([
        getUserAchievements(userId),
        getAllAchievements(),
        getUserStats(userId)
      ]);
      console.log('Achievements loaded:', {
        userAchievements: userAch.length,
        allAchievements: allAch.length,
        hasStats: !!stats
      });
      setUserAchievements(userAch);
      setAllAchievements(allAch);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading achievements:', error);
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
        console.warn('Failed to mark achievement viewed', ua.achievement_id, e);
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

  return (
    <Card className="shadow-lg border-[#4CC9A8]/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#4CC9A8]" />
              Achievements
            </CardTitle>
            <CardDescription>Unlock badges and earn rewards!</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-[#4CC9A8]">
              {unlockedCount}/{totalCount}
            </div>
            <div className="text-xs text-gray-500">{completionPercentage}% Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4CC9A8] to-[#3db891] transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="milestone">Milestones</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="savings">Savings</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            {allAchievements.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No achievements available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {allAchievements.map((achievement) => {
                  const progress = calculateProgress(achievement);
                  return (
                    <AchievementBadge
                      key={achievement.id}
                      definition={achievement}
                      userAchievement={getUserAchievementForDefinition(achievement.id)}
                      currentProgress={progress.current}
                      targetProgress={progress.target}
                      showDetails
                      onClaim={async (achievementId) => {
                        // Guard: prevent parallel claims by setting loading state locally
                        const res = await claimAchievement(achievementId);
                        if (!res) {
                          toast.error('Failed to claim reward');
                          return;
                        }
                        if (res.awarded_now) {
                          toast.success(`+${res.reward_points} SmartPoints added!`);
                        } else {
                          toast.success('Already claimed');
                        }
                        await loadAchievements();
                      }}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          {Object.entries(achievementsByCategory).map(([category, achievements]) => (
            <TabsContent key={category} value={category} className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {achievements.map((achievement) => {
                  const progress = calculateProgress(achievement);
                  return (
                    <AchievementBadge
                      key={achievement.id}
                      definition={achievement}
                      userAchievement={getUserAchievementForDefinition(achievement.id)}
                      currentProgress={progress.current}
                      targetProgress={progress.target}
                      showDetails
                      onClaim={async (achievementId) => {
                        const res = await claimAchievement(achievementId);
                        if (!res) {
                          toast.error('Failed to claim reward');
                          return;
                        }
                        if (res.awarded_now) {
                          toast.success(`+${res.reward_points} SmartPoints added!`);
                        } else {
                          toast.success('Already claimed');
                        }
                        await loadAchievements();
                      }}
                    />
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
