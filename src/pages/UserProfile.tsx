import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/lib/types';
import { getCurrentUser, updateUserProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User as UserIcon, Mail, Phone, Calendar, Shield, Sparkles, Edit, Coins, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { onPointsChange } from '@/lib/pointsEventBus';
import { logger } from '@/lib/logger';

// Gamification Components
import { SmartPointsWallet } from '@/components/SmartPointsWallet';
import { UserStatsCard } from '@/components/gamification/UserStatsCard';
import { StreakTracker } from '@/components/gamification/StreakTracker';
import { UserLevelCard } from '@/components/gamification/UserLevelCard';
import { ReferralCard } from '@/components/gamification/ReferralCard';
import { AchievementsGrid } from '@/components/gamification/AchievementsGrid';
import { checkUserPenaltyStatus, PenaltyStatus, liftPenaltyWithPoints } from '@/lib/penalty-system';
import { getUserStats, UserStats } from '@/lib/gamification-api';
import { motion } from 'framer-motion';

function PenaltyCountdown({ penaltyUntil, onExpire }: { penaltyUntil: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = new Date(penaltyUntil).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        onExpire?.();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [penaltyUntil, onExpire]);

  return (
    <div className="flex items-center justify-center gap-2 bg-white/70 rounded-lg p-3 border-2 border-orange-300">
      <Clock className="w-5 h-5 text-orange-600" />
      <div className="flex gap-1 text-2xl font-bold text-orange-700 font-mono">
        {timeLeft.hours > 0 && <span>{String(timeLeft.hours).padStart(2, '0')}:</span>}
        <span>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span>:</span>
        <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

function PenaltyStatusBlock({ userId, fallbackUntil, onUpdate }: { userId: string; fallbackUntil?: string; onUpdate?: () => void }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<PenaltyStatus | null>(null);
  const [isLifting, setIsLifting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await checkUserPenaltyStatus(userId);
      setStatus(s);
    } catch (err) {
      logger.warn('Failed to load penalty status', err);
    }
  }, [userId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleLiftPenalty = async () => {
    if (!status) return;

    setIsLifting(true);
    try {
      const result = await liftPenaltyWithPoints(userId);
      
      if (result.success) {
        toast.success(result.message);
        await loadStatus();
        onUpdate?.(); // Refresh parent
      } else {
        // If backend function is missing, provide clearer UI and avoid repeat attempts
        if ((result as any).migrationMissing) {
          toast.error(t('profile.backendFunctionMissing'));
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
  logger.error('Error lifting penalty:', error);
  toast.error(t('penalty.liftFailed'));
    } finally {
      setIsLifting(false);
    }
  };

  if (!status) {
    return fallbackUntil ? (
      <div className="space-y-3">
        <PenaltyCountdown penaltyUntil={fallbackUntil} onExpire={onUpdate} />
      </div>
    ) : null;
  }

  if (status.isBanned) {
    return (
      <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4">
  <p className="text-sm text-red-800 font-bold">🚫 {t('penalty.banned')}</p>
  <p className="text-xs text-red-600 mt-1">{t('penalty.contactSupport')}</p>
      </div>
    );
  }

  if (status.isPenalized && status.penaltyUntil) {
    const penaltyCount = status.penaltyCount;
    const canLift = penaltyCount === 1 || penaltyCount === 2;
    const pointsCost = penaltyCount === 1 ? 30 : penaltyCount === 2 ? 90 : 0;

    return (
      <div className="space-y-3">
        <PenaltyCountdown penaltyUntil={status.penaltyUntil} onExpire={onUpdate} />
        
        {canLift && (
          <Button
            onClick={handleLiftPenalty}
            disabled={isLifting}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
            size="sm"
          >
            {isLifting ? (
              t('penalty.processing')
            ) : (
              <>
                <Coins className="w-4 h-4 mr-2" />
                {t('penalty.lift')} ({pointsCost} points)
              </>
            )}
          </Button>
        )}

        {!canLift && penaltyCount >= 3 && (
          <div className="text-xs text-orange-700 bg-orange-100/50 p-2 rounded text-center">
            ⏳ {t('penalty.cannotLift')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3">
      <p className="text-sm text-green-800 font-semibold">✓ {t('penalty.noneActive')}</p>
    </div>
  );
}

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [unclaimedCount, setUnclaimedCount] = useState<number>(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  const navigate = useNavigate();
  const { t } = useI18n();

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const { user: currentUser } = await getCurrentUser();
      if (!currentUser) {
  toast.error(t('generic.signInRequired'));
        navigate('/');
        return;
      }
      setUser(currentUser);
      setFormData({
        name: currentUser.name || '',
        phone: currentUser.phone || '',
      });

      // Load user stats for gamification (optional - graceful degradation)
      try {
        const stats = await getUserStats(currentUser.id);
        setUserStats(stats);
        
        // Load unclaimed achievements count
        const { getUserAchievements } = await import('@/lib/gamification-api');
        const achievements = await getUserAchievements(currentUser.id);
        const unclaimed = achievements.filter(a => !a.reward_claimed).length;
        setUnclaimedCount(unclaimed);
      } catch (statsError) {
        logger.warn('Gamification stats not available (tables may not exist yet):', statsError);
        // Don't show error to user - profile will work without gamification
      }
    } catch (error) {
      logger.error('Error loading user:', error);
  toast.error(t('generic.failedLoadProfile'));
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  // Initial load on mount
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Listen to points changes to refresh stats
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onPointsChange((newBalance, changedUserId) => {
      // Only reload stats if it's the current user
      if (changedUserId === user.id && userStats) {
        logger.log('Points changed: Reloading user stats');
        getUserStats(user.id)
          .then(setUserStats)
          .catch(err => logger.warn('Failed to reload stats:', err));
      }
    });

    return unsubscribe;
  }, [user, userStats]);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        logger.log('Tab visible: Refreshing profile data');
        loadUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadUser, user]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { data, error } = await updateUserProfile(user.id, formData);
      if (error) throw error;

      if (data) {
        setUser(data);
        setIsEditing(false);
        toast.success(t('profile.updateSuccess'));
      }
    } catch (error) {
      logger.error('Error updating profile:', error);
      toast.error(t('profile.updateError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
      });
    }
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00C896]"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-10 w-10 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('profile.title')}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={`grid w-full ${userStats ? 'grid-cols-4' : 'grid-cols-2'} max-w-2xl mx-auto`}>
            <TabsTrigger value="overview">{t('profile.tabs.overview')}</TabsTrigger>
            {userStats && (
              <TabsTrigger value="achievements" className="relative">
                {t('profile.tabs.achievements')}
                {unclaimedCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse">
                    {unclaimedCount}
                  </span>
                )}
              </TabsTrigger>
            )}
            {userStats && <TabsTrigger value="wallet">{t('profile.tabs.wallet')}</TabsTrigger>}
            <TabsTrigger value="settings">{t('profile.tabs.settings')}</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Profile Header Card with Penalty Status on Right */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Profile Info - Left/Center (2 cols on large screens) */}
                <Card className="shadow-sm border border-gray-100 bg-white lg:col-span-2">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
                      <Avatar className="h-20 w-20 md:h-24 md:w-24 border-2 border-gray-200">
                        <AvatarFallback className="bg-gradient-to-br from-gray-800 to-gray-600 text-white text-2xl md:text-3xl font-bold">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{user.name}</h2>
                        <p className="text-base text-gray-500 mb-3">{user.email}</p>
                        <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                          <Badge
                            variant={user.role === 'ADMIN' ? 'default' : 'secondary'}
                            className={user.role === 'ADMIN' ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'}
                          >
                            {user.role === 'ADMIN' && <Shield className="w-3 h-3 mr-1" />}
                            {user.role}
                          </Badge>
                          {user.phone && (
                            <Badge variant="outline" className="gap-1 border-gray-300 text-gray-600">
                              <Phone className="w-3 h-3" />
                              {user.phone}
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1 border-gray-300 text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {t('profile.memberSince')} {formatDate(user.created_at)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Penalty Status - Right (1 col on large screens) */}
                <Card className={`shadow-xl border-2 ${
                  user.penalty_count && user.penalty_count > 0
                    ? 'border-orange-400 bg-gradient-to-br from-orange-900/40 to-red-900/40'
                    : 'border-green-400 bg-gradient-to-br from-green-900/40 to-emerald-900/40'
                }`}>
                  <CardHeader className="pb-2 md:pb-3">
                    <CardTitle className={`text-base md:text-lg flex items-center gap-2 ${
                      user.penalty_count && user.penalty_count > 0 ? 'text-orange-300' : 'text-green-300'
                    }`}>
                      {user.penalty_count && user.penalty_count > 0 ? '⚠️' : '✅'} {t('profile.accountStatus')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {user.penalty_count && user.penalty_count > 0 ? (
                      <div className="space-y-2 md:space-y-3">
                        <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-orange-700">
                          <p className="text-xs md:text-sm font-semibold text-orange-300 mb-2">
                            {t('penalty.pointsLabel')} {user.penalty_count}
                          </p>
                          <PenaltyStatusBlock userId={user.id} fallbackUntil={user.penalty_until} onUpdate={loadUser} />
                        </div>
                        <div className="text-xs text-orange-300 bg-orange-900/30 p-2 rounded">
                          <p className="font-semibold mb-1">{t('penalty.escalation')}</p>
                          <ul className="space-y-0.5 pl-3">
                            <li>{t('penalty.firstPenalty')}</li>
                            <li>{t('penalty.secondPenalty')}</li>
                            <li>{t('penalty.thirdPenalty')}</li>
                            <li>{t('penalty.fourthPenalty')}</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-green-700">
                          <p className="text-xs md:text-sm font-semibold text-gray-900 mb-1">✓ {t('profile.goodStanding')}</p>
                          <p className="text-xs md:text-sm text-green-400">{t('penalty.noneActive')}</p>
                        </div>
                        <p className="text-xs text-green-400">{t('penalty.encouragement')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Stats Row */}
            {userStats ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <UserStatsCard stats={userStats} />
              </motion.div>
            ) : (
              <Card className="shadow-lg border-yellow-200 bg-yellow-50">
                <CardContent className="py-8 text-center">
                  <p className="text-yellow-800 font-medium mb-2">🎮 Gamification Features Coming Soon!</p>
                  <p className="text-sm text-yellow-600">
                    Database tables need to be set up. Check GAMIFICATION_SETUP.md for instructions.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Level & Streak Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {userStats && (
                <>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <UserLevelCard stats={userStats} />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <StreakTracker stats={userStats} />
                  </motion.div>
                </>
              )}
            </div>

            {/* Referral Card */}
            {userStats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <ReferralCard userId={user.id} totalReferrals={userStats.total_referrals} />
              </motion.div>
            )}
          </TabsContent>

          {/* ACHIEVEMENTS TAB */}
          <TabsContent value="achievements" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AchievementsGrid 
                userId={user.id}
                onUnclaimedCountChange={setUnclaimedCount}
              />
            </motion.div>
          </TabsContent>

          {/* WALLET TAB */}
          <TabsContent value="wallet" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <SmartPointsWallet userId={user.id} />
            </motion.div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="shadow-lg bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-[#00C896]/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Edit className="w-5 h-5 text-[#00C896]" />
                    {t('profile.editCard.title')}
                  </CardTitle>
                  <CardDescription className="text-gray-400">{t('profile.editCard.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-300">{t('profile.name')}</Label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="pl-10 bg-gray-700 border-gray-600 text-white"
                            placeholder="Enter your name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-gray-300">{t('profile.phone')}</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="pl-10 bg-gray-700 border-gray-600 text-white"
                            placeholder="+995 XXX XXX XXX"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex-1 bg-[#00C896] hover:bg-[#009B77]"
                        >
                          {isSaving ? t('profile.saving') : t('profile.saveChanges')}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          disabled={isSaving}
                          variant="outline"
                          className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          {t('profile.cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span>{t('profile.email')}</span>
                          </div>
                          <p className="text-white font-medium">{user.email}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone className="w-4 h-4" />
                            <span>{t('profile.phone')}</span>
                          </div>
                          <p className="text-white font-medium">
                            {user.phone || 'Not provided'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{t('profile.memberSince')}</span>
                          </div>
                          <p className="text-white font-medium">
                            {formatDate(user.created_at)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Shield className="w-4 h-4" />
                            <span>{t('profile.role')}</span>
                          </div>
                          <p className="text-white font-medium capitalize">
                            {user.role.toLowerCase()}
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={() => setIsEditing(true)}
                        className="w-full md:w-auto bg-[#00C896] hover:bg-[#009B77]"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {t('profile.editProfile')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

