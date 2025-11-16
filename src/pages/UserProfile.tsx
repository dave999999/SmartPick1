import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '@/lib/types';
import { getCurrentUser, updateUserProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// Removed Badge (unused)
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, User as UserIcon, Mail, Phone, Calendar, Shield, Edit, Coins, Clock, Bell, Lock, CreditCard, Settings, HelpCircle, ChevronRight, Globe, Utensils, MapPin, Moon, Sun, Trash2, Key, FileText } from 'lucide-react';
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
import { TelegramConnect } from '@/components/TelegramConnect';
import { checkUserPenaltyStatus, PenaltyStatus, liftPenaltyWithPoints } from '@/lib/penalty-system';
import { getUserStats, UserStats } from '@/lib/gamification-api';
// motion import removed (unused in this file after refactor)

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
    <div className="flex items-center justify-center gap-2 bg-orange-50 rounded-lg p-2 border border-orange-200">
      <Clock className="w-4 h-4 text-orange-600" />
      <div className="flex gap-0.5 text-lg font-bold text-orange-700 font-mono">
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
      <div className="space-y-2">
        <PenaltyCountdown penaltyUntil={fallbackUntil} onExpire={onUpdate} />
      </div>
    ) : null;
  }

  if (status.isBanned) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-2">
        <p className="text-xs text-red-700 font-semibold">🚫 {t('penalty.banned')}</p>
        <p className="text-xs text-red-600 mt-0.5">{t('penalty.contactSupport')}</p>
      </div>
    );
  }

  if (status.isPenalized && status.penaltyUntil) {
    const penaltyCount = status.penaltyCount;
    const canLift = penaltyCount === 1 || penaltyCount === 2;
    const pointsCost = penaltyCount === 1 ? 30 : penaltyCount === 2 ? 90 : 0;

    return (
      <div className="space-y-2">
        <PenaltyCountdown penaltyUntil={status.penaltyUntil} onExpire={onUpdate} />

        {canLift && (
          <Button
            onClick={handleLiftPenalty}
            disabled={isLifting}
            className="w-full h-8 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg text-xs"
          >
            {isLifting ? (
              t('penalty.processing')
            ) : (
              <>
                <Coins className="w-3.5 h-3.5 mr-1.5" />
                {t('penalty.lift')} ({pointsCost} points)
              </>
            )}
          </Button>
        )}

        {!canLift && penaltyCount >= 3 && (
          <div className="text-xs text-orange-700 bg-orange-50 p-2 rounded-lg text-center border border-orange-200">
            ⏳ {t('penalty.cannotLift')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-2">
      <p className="text-xs text-green-700 font-medium">✓ {t('penalty.noneActive')}</p>
    </div>
  );
}

export default function UserProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [unclaimedCount, setUnclaimedCount] = useState<number>(0);
  
  // Get initial tab from navigation state or default to "overview"
  const initialTab = (location.state as any)?.tab || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  // Settings preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    sms: false,
  });

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
      {/* Header - Compact */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="h-9 w-9 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">
              {t('profile.title')}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className={`grid w-full ${userStats ? 'grid-cols-4' : 'grid-cols-2'} max-w-xl mx-auto h-9`}>
            <TabsTrigger value="overview" className="text-xs">{t('profile.tabs.overview')}</TabsTrigger>
            {userStats && (
              <TabsTrigger value="achievements" className="relative text-xs">
                {t('profile.tabs.achievements')}
                {unclaimedCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md animate-pulse">
                    {unclaimedCount}
                  </span>
                )}
              </TabsTrigger>
            )}
            {userStats && <TabsTrigger value="wallet" className="text-xs">{t('profile.tabs.wallet')}</TabsTrigger>}
            <TabsTrigger value="settings" className="text-xs">{t('profile.tabs.settings')}</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            {/* Account Status - Top Priority */}
            <Card className={`border-2 ${
              user.penalty_count && user.penalty_count > 0
                ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50'
                : 'border-green-200 bg-gradient-to-br from-green-50 to-green-100/50'
            } shadow-sm`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${
                    user.penalty_count && user.penalty_count > 0
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                      : 'bg-gradient-to-br from-green-500 to-green-600'
                  }`}>
                    <span className="text-2xl">
                      {user.penalty_count && user.penalty_count > 0 ? '⚠️' : '✅'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${
                      user.penalty_count && user.penalty_count > 0 ? 'text-orange-700' : 'text-green-700'
                    }`}>
                      {user.penalty_count && user.penalty_count > 0 ? t('penalty.pointsLabel') : t('profile.goodStanding')}
                    </p>
                    {user.penalty_count && user.penalty_count > 0 ? (
                      <p className="text-xs text-orange-600">{user.penalty_count} penalty points</p>
                    ) : (
                      <p className="text-xs text-green-600">{t('penalty.noneActive')}</p>
                    )}
                  </div>
                  <Avatar className="h-12 w-12 border-2 border-white">
                    <AvatarFallback className="bg-gradient-to-br from-teal-600 to-teal-700 text-white text-base font-bold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Penalty Details */}
                {user.penalty_count && user.penalty_count > 0 && (
                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <PenaltyStatusBlock userId={user.id} fallbackUntil={user.penalty_until || undefined} onUpdate={loadUser} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Info - Compact */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-gray-600">
                <UserIcon className="w-3.5 h-3.5" />
                <span className="truncate">{user.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-gray-600">
                <Shield className="w-3.5 h-3.5" />
                <span>{user.role}</span>
              </div>
            </div>

            {/* Tabs for Stats/Level/Streak/Referral */}
            {userStats ? (
              <Tabs defaultValue="stats" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-8">
                  <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
                  <TabsTrigger value="level" className="text-xs">Level</TabsTrigger>
                  <TabsTrigger value="streak" className="text-xs">Streak</TabsTrigger>
                  <TabsTrigger value="referral" className="text-xs">Refer</TabsTrigger>
                </TabsList>

                <TabsContent value="stats" className="mt-3">
                  <UserStatsCard stats={userStats} />
                </TabsContent>

                <TabsContent value="level" className="mt-3">
                  <UserLevelCard stats={userStats} />
                </TabsContent>

                <TabsContent value="streak" className="mt-3">
                  <StreakTracker stats={userStats} />
                </TabsContent>

                <TabsContent value="referral" className="mt-3">
                  <ReferralCard userId={user.id} totalReferrals={userStats.total_referrals} />
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="border-yellow-200 bg-yellow-50 shadow-sm">
                <CardContent className="p-3 text-center">
                  <p className="text-yellow-800 font-medium text-xs mb-1">🎮 Gamification Features Coming Soon!</p>
                  <p className="text-xs text-yellow-600">
                    Database tables need to be set up.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ACHIEVEMENTS TAB */}
          <TabsContent value="achievements" className="space-y-4">
            <AchievementsGrid
              userId={user.id}
              onUnclaimedCountChange={setUnclaimedCount}
            />
          </TabsContent>

          {/* WALLET TAB */}
          <TabsContent value="wallet" className="space-y-4">
            <SmartPointsWallet userId={user.id} />
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-3">
            {/* ACCOUNT INFORMATION */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-gray-800 to-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-sm">
                  <UserIcon className="w-4 h-4 text-teal-400" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-gray-300 text-xs">{t('profile.name')}</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="pl-9 h-9 bg-gray-700 border-gray-600 text-white text-sm"
                          placeholder="Enter your name"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-gray-300 text-xs">{t('profile.phone')}</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-9 h-9 bg-gray-700 border-gray-600 text-white text-sm"
                          placeholder="+995 XXX XXX XXX"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-9 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm"
                      >
                        {isSaving ? t('profile.saving') : t('profile.saveChanges')}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        disabled={isSaving}
                        variant="outline"
                        className="h-9 border-gray-600 text-gray-300 hover:bg-gray-800 text-sm"
                      >
                        {t('profile.cancel')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{t('profile.email')}</span>
                        </div>
                        <p className="text-white font-medium text-sm truncate">{user.email}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{t('profile.phone')}</span>
                        </div>
                        <p className="text-white font-medium text-sm">
                          {user.phone || 'Not provided'}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{t('profile.memberSince')}</span>
                        </div>
                        <p className="text-white font-medium text-sm">
                          {formatDate(user.created_at)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{t('profile.role')}</span>
                        </div>
                        <p className="text-white font-medium text-sm capitalize">
                          {user.role.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setIsEditing(true)}
                      className="w-full h-9 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" />
                      {t('profile.editProfile')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* NOTIFICATIONS */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-gray-800 to-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-sm">
                  <Bell className="w-4 h-4 text-blue-400" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-gray-400 text-xs">
                  Manage how you receive updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Telegram Integration */}
                <div className="mb-3">
                  <TelegramConnect userId={user.id} userType="customer" />
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30">
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-white text-sm font-medium">Email Notifications</p>
                      <p className="text-gray-400 text-xs">Receive updates via email</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.email}
                    onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, email: checked })}
                  />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30">
                  <div className="flex items-start gap-3">
                    <Bell className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-white text-sm font-medium">Push Notifications</p>
                      <p className="text-gray-400 text-xs">Browser push alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.push}
                    onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, push: checked })}
                  />
                </div>

                {/* SMS Notifications */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30">
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-white text-sm font-medium">SMS Notifications</p>
                      <p className="text-gray-400 text-xs">Text message alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationPrefs.sms}
                    onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, sms: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* PRIVACY & SECURITY */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-gray-800 to-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-sm">
                  <Lock className="w-4 h-4 text-purple-400" />
                  Privacy & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => toast.info('Password change feature coming soon')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Key className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-white text-sm font-medium">Change Password</p>
                      <p className="text-gray-400 text-xs">Update your password</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => toast.info('Account deletion requires admin approval')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-red-900/30 hover:bg-red-900/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-red-400 text-sm font-medium">Delete Account</p>
                      <p className="text-gray-400 text-xs">Permanently remove your account</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>

            {/* PREFERENCES */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-gray-800 to-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-sm">
                  <Settings className="w-4 h-4 text-orange-400" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => toast.info('Language settings in top-right menu')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-white text-sm font-medium">Language</p>
                      <p className="text-gray-400 text-xs">Change app language</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => toast.info('Location preferences coming soon')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-white text-sm font-medium">Default Location</p>
                      <p className="text-gray-400 text-xs">Set your preferred area</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => toast.info('Dietary preferences coming soon')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Utensils className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-white text-sm font-medium">Dietary Restrictions</p>
                      <p className="text-gray-400 text-xs">Vegan, vegetarian, allergies</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>

            {/* SUPPORT */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-gray-800 to-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white text-sm">
                  <HelpCircle className="w-4 h-4 text-green-400" />
                  Support & Legal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => toast.info('Help center coming soon')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-white text-sm font-medium">Help Center</p>
                      <p className="text-gray-400 text-xs">FAQs and guides</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => toast.info('Contact support: support@smartpick.ge')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-white text-sm font-medium">Contact Support</p>
                      <p className="text-gray-400 text-xs">Get help from our team</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => toast.info('Terms & Privacy coming soon')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-white text-sm font-medium">Terms & Privacy</p>
                      <p className="text-gray-400 text-xs">Legal information</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>

            {/* APP INFO */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-gray-800 to-gray-900">
              <CardContent className="pt-6 pb-4">
                <div className="text-center space-y-1">
                  <p className="text-gray-400 text-xs">SmartPick v1.0.0</p>
                  <p className="text-gray-500 text-xs">© 2025 SmartPick. All rights reserved.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

