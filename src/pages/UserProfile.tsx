import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User } from '@/lib/types';
import { getCurrentUser, updateUserProfile, updatePassword } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
// Removed Badge (unused)
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, User as UserIcon, Mail, Phone, Calendar, Shield, Edit, Coins, Clock, Bell, Lock, CreditCard, Settings, HelpCircle, ChevronRight, Globe, Utensils, MapPin, Moon, Sun, Trash2, Key, FileText, Gift, BookOpen, Unlock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';

// NEW: Warm, friendly profile components (ULTRA COMPACT)
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileInfoCard } from '@/components/profile/ProfileInfoCard';
import { StatsGrid } from '@/components/profile/StatsGrid';
import { TabsNav } from '@/components/profile/TabsNav';
import { onPointsChange } from '@/lib/pointsEventBus';
import { logger } from '@/lib/logger';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Gamification Components
// Lazy-loaded heavy gamification & wallet components to reduce initial profile chunk size
const SmartPointsWallet = lazy(() => import('@/components/SmartPointsWallet').then(m => ({ default: m.SmartPointsWallet })));
const UserStatsCard = lazy(() => import('@/components/gamification/UserStatsCard').then(m => ({ default: m.UserStatsCard })));
const StreakTracker = lazy(() => import('@/components/gamification/StreakTracker').then(m => ({ default: m.StreakTracker })));
const UserLevelCard = lazy(() => import('@/components/gamification/UserLevelCard').then(m => ({ default: m.UserLevelCard })));
const ReferralCard = lazy(() => import('@/components/gamification/ReferralCard').then(m => ({ default: m.ReferralCard })));
const AchievementsGrid = lazy(() => import('@/components/gamification/AchievementsGrid').then(m => ({ default: m.AchievementsGrid })));
import { TelegramConnect } from '@/components/TelegramConnect';
import { ReservationCapacitySection } from '@/components/ReservationCapacitySection';
import { getUserStats, UserStats, getLevelProgress } from '@/lib/gamification-api';
const BuyPointsModal = lazy(() => import('@/components/wallet/BuyPointsModal').then(m => ({ default: m.BuyPointsModal })));
import { requestPartnerForgiveness, checkForgivenessStatus } from '@/lib/forgiveness-api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Send, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PenaltyWarningDialog } from '@/components/PenaltyWarningDialog';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { supabase } from '@/lib/supabase';
// motion import removed (unused in this file after refactor)
import { BottomNavBar as FloatingBottomNav } from '@/components/navigation/BottomNavBar';

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
  const [status, setStatus] = useState<any | null>(null);
  const [isLifting, setIsLifting] = useState(false);
  const [showForgivenessRequest, setShowForgivenessRequest] = useState(false);
  const [forgivenessReason, setForgivenessReason] = useState('');
  const [isRequestingForgiveness, setIsRequestingForgiveness] = useState(false);
  const [forgivenessStatus, setForgivenessStatus] = useState<{
    requested: boolean;
    approved: boolean;
    denied: boolean;
  }>({ requested: false, approved: false, denied: false });

  const loadStatus = useCallback(async () => {
    try {
      // Old penalty system removed - using new penalty.ts system
      setStatus(null);
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
      logger.error('Error lifting penalty:', error instanceof Error ? error.message : String(error));
      toast.error(t('penalty.liftFailed'));
    } finally {
      setIsLifting(false);
    }
  };

  const handleRequestForgiveness = async () => {
    if (!status?.reservationId) return;

    setIsRequestingForgiveness(true);
    try {
      const result = await requestPartnerForgiveness(
        userId,
        status.reservationId,
        forgivenessReason
      );

      if (result.success) {
        toast.success(result.message);
        setShowForgivenessRequest(false);
        setForgivenessReason('');
        await loadStatus();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      logger.error('Error requesting forgiveness:', error instanceof Error ? error.message : String(error));
      toast.error('Failed to send forgiveness request');
    } finally {
      setIsRequestingForgiveness(false);
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
      <div className="space-y-3">
        <PenaltyCountdown penaltyUntil={status.penaltyUntil} onExpire={onUpdate} />

        {/* Partner Forgiveness Info */}
        {status.canRequestForgiveness && !forgivenessStatus.requested && (
          <Alert className="border-blue-200 bg-blue-50">
            <Heart className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-900">
              <strong>Did you know?</strong> Partners can forgive penalties if you had a valid reason for missing pickup.
            </AlertDescription>
          </Alert>
        )}

        {/* Forgiveness Request Status */}
        {forgivenessStatus.requested && !forgivenessStatus.approved && !forgivenessStatus.denied && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-900">
              Forgiveness request pending. The partner will review your case.
            </AlertDescription>
          </Alert>
        )}

        {forgivenessStatus.approved && (
          <Alert className="border-green-200 bg-green-50">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs text-green-900">
              ✓ Partner has forgiven this penalty. Thank you for your honesty!
            </AlertDescription>
          </Alert>
        )}

        {forgivenessStatus.denied && (
          <Alert className="border-red-200 bg-red-50">
            <Info className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-xs text-red-900">
              Forgiveness request was not approved. Please use points or wait for the penalty to expire.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {canLift && (
            <Button
              onClick={handleLiftPenalty}
              disabled={isLifting}
              className="h-9 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg text-xs"
            >
              {isLifting ? (
                t('penalty.processing')
              ) : (
                <>
                  <Coins className="w-3.5 h-3.5 mr-1" />
                  {t('penalty.lift')} ({pointsCost}pts)
                </>
              )}
            </Button>
          )}

          {status.canRequestForgiveness && !forgivenessStatus.requested && (
            <Button
              onClick={() => setShowForgivenessRequest(!showForgivenessRequest)}
              variant="outline"
              className="h-9 border-blue-300 text-blue-700 hover:bg-blue-50 font-medium rounded-lg text-xs"
            >
              <Heart className="w-3.5 h-3.5 mr-1" />
              Request Forgiveness
            </Button>
          )}
        </div>

        {/* Forgiveness Request Form */}
        {showForgivenessRequest && !forgivenessStatus.requested && (
          <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="text-xs font-medium text-blue-900">
              Explain what happened (optional):
            </label>
            <Textarea
              value={forgivenessReason}
              onChange={(e) => setForgivenessReason(e.target.value)}
              placeholder="e.g., Emergency came up, family situation, misread the time..."
              className="text-xs min-h-[60px] bg-white"
              maxLength={500}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleRequestForgiveness}
                disabled={isRequestingForgiveness}
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                {isRequestingForgiveness ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    Send Request
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowForgivenessRequest(false);
                  setForgivenessReason('');
                }}
                size="sm"
                variant="outline"
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!canLift && penaltyCount >= 3 && !status.canRequestForgiveness && (
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
  const [isBuyPointsModalOpen, setIsBuyPointsModalOpen] = useState(false);
  const [showPenaltyWarning, setShowPenaltyWarning] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    nearby: true,
    favorite_partner: true,
    expiring: true
  });
  const { subscribeToPush, unsubscribeFromPush, updateNotificationTypes, subscription, isSupported: pushSupported } = usePushNotifications();
  
  // Get initial tab from navigation state or default to "overview"
  const initialTab = (location.state as any)?.tab || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Settings preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    telegram: false,
    email: true,
    push: true,
    sms: false,
  });

  // Section collapse states
  const [sectionsOpen, setSectionsOpen] = useState({
    notifications: true,
    security: true,
    preferences: true,
    support: true,
  });

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

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
        logger.warn('Gamification stats not available (tables may not exist yet):', statsError instanceof Error ? statsError.message : String(statsError));
        // Don't show error to user - profile will work without gamification
      }
    } catch (error) {
      logger.error('Error loading user:', error instanceof Error ? error.message : String(error));
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

  // Check if user needs to see penalty warning (first-time no-show)
  useEffect(() => {
    if (user && user.penalty_count === 0 && !user.penalty_warning_shown) {
      // Check if they have any no-show reservations
      supabase
        .from('reservations')
        .select('id')
        .eq('customer_id', user.id)
        .eq('no_show', true)
        .limit(1)
        .maybeSingle() // Use maybeSingle() instead of single() to handle 0 or 1 results
        .then(({ data, error }) => {
          if (error) {
            logger.error('Error checking no-show reservations:', error instanceof Error ? error.message : String(error));
            return;
          }
          if (data) {
            setShowPenaltyWarning(true);
          }
        });
    }
  }, [user]);

  // Handle payment success/error messages from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const purchaseStatus = params.get('purchase');
    const orderId = params.get('orderId');

    if (purchaseStatus === 'success' && orderId) {
      toast.success(`Payment successful! Points have been added to your wallet. Order ID: ${orderId}`);
      setActiveTab('wallet'); // Switch to wallet tab
      // Clean URL
      navigate(location.pathname, { replace: true });
    } else if (purchaseStatus === 'failed' || purchaseStatus === 'cancelled') {
      const status = purchaseStatus === 'failed' ? 'failed' : 'cancelled';
      toast.error(`Payment ${status}. No charges were made.`);
      // Clean URL
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

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
      logger.error('Error updating profile:', error instanceof Error ? error.message : String(error));
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

  const handlePasswordChange = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await updatePassword(passwordForm.newPassword);
      if (error) throw error;

      toast.success('✅ Password updated successfully! You can now use email login.');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      logger.error('Error updating password:', error);
      toast.error('Failed to update password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAcknowledgePenaltyWarning = async () => {
    if (!user) return;
    
    try {
      // Update user to mark warning as shown
      await supabase
        .from('users')
        .update({ penalty_warning_shown: true })
        .eq('id', user.id);
      
      setShowPenaltyWarning(false);
      toast.success('Thank you for understanding our policy!');
      
      // Reload user to get updated data
      await loadUser();
    } catch (error) {
      logger.error('Error acknowledging penalty warning:', error instanceof Error ? error.message : String(error));
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* NEW: Warm, friendly profile header */}
      <ProfileHeader 
        user={user} 
        onEdit={() => setIsEditing(true)}
      />

      {/* Penalty Alert - if active */}
      {(user.penalty_count ?? 0) > 0 && (
        <div className="px-4 mt-2">
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800 shadow-sm">
            <CardContent className="p-3">
              <PenaltyStatusBlock userId={user.id} fallbackUntil={user.penalty_until || undefined} onUpdate={loadUser} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* NEW: Friendly tabs navigation */}
      <TabsNav 
        activeTab={activeTab as 'overview' | 'achievements' | 'wallet' | 'settings'}
        onTabChange={(tab) => setActiveTab(tab)}
        unclaimedCount={unclaimedCount}
      />

      {/* Content */}
      <div className="container mx-auto max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="hidden">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {userStats && (
              <TabsTrigger value="achievements" className="relative text-xs text-gray-400 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/50">
                Achievements
                {unclaimedCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg">
                    {unclaimedCount}
                  </span>
                )}
              </TabsTrigger>
            )}
            {userStats && <TabsTrigger value="wallet" className="text-xs text-gray-400 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/50">Wallet</TabsTrigger>}
            <TabsTrigger value="settings" className="text-xs text-gray-400 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/50">Settings</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB - FRIENDLY & MOTIVATING */}
          <TabsContent value="overview" className="px-4 space-y-3 mt-2 pb-6">
            {/* Compact info card (2x2 grid) */}
            <ProfileInfoCard 
              user={user}
              onAddPhone={() => {
                setIsEditing(true);
                setActiveTab('settings');
              }}
            />

            {/* Friendly Motivational Card */}
            {userStats && (
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800 shadow-sm">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="text-[28px]">
                      {userStats.total_reservations === 0 && "🌟"}
                      {userStats.total_reservations > 0 && userStats.total_reservations < 5 && "💪"}
                      {userStats.total_reservations >= 5 && userStats.total_reservations < 15 && "🔥"}
                      {userStats.total_reservations >= 15 && "⭐"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-0.5">
                        {userStats.total_reservations === 0 && "You're off to a great start!"}
                        {userStats.total_reservations > 0 && userStats.total_reservations < 5 && "You're doing amazing!"}
                        {userStats.total_reservations >= 5 && userStats.total_reservations < 15 && "You're on fire!"}
                        {userStats.total_reservations >= 15 && "You're a legend!"}
                      </p>
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                        {userStats.total_reservations === 0 ? "Ready to save? Let's go! 🚀" : "Keep going — you're unstoppable! ✨"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats Grid with Friendly Labels */}
            {userStats && (
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Reservations */}
                    <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                      <div className="text-[22px] font-black text-amber-700 dark:text-amber-400 leading-none mb-1">
                        {userStats.total_reservations || 0}
                      </div>
                      <div className="text-[9px] font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wide leading-none mb-1.5">
                        Reservations
                      </div>
                      <div className="text-[11px] font-bold text-amber-700 dark:text-amber-500">
                        {userStats.total_reservations === 0 ? "Start now! 🎯" : "Nice! 👏"}
                      </div>
                    </div>

                    {/* Money Saved */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
                      <div className="text-[22px] font-black text-emerald-700 dark:text-emerald-400 leading-none mb-1">
                        ₾{Math.round(userStats.money_saved || 0)}
                      </div>
                      <div className="text-[9px] font-extrabold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide leading-none mb-1.5">
                        Saved
                      </div>
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-500">
                        {userStats.money_saved > 0 ? "Save more! 💰" : "Let's save! 💚"}
                      </div>
                    </div>

                    {/* Streak */}
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-3 border border-orange-200 dark:border-orange-800">
                      <div className="text-[22px] font-black text-orange-700 dark:text-orange-400 leading-none mb-1">
                        {userStats.current_streak || 0}
                      </div>
                      <div className="text-[9px] font-extrabold text-orange-900 dark:text-orange-300 uppercase tracking-wide leading-none mb-1.5">
                        Streak
                      </div>
                      <div className="text-[11px] font-bold text-orange-700 dark:text-orange-500">
                        {userStats.current_streak > 0 ? "Go! 🔥" : "Start! 🚀"}
                      </div>
                    </div>

                    {/* Referrals */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
                      <div className="text-[22px] font-black text-purple-700 dark:text-purple-400 leading-none mb-1">
                        {userStats.total_referrals || 0}
                      </div>
                      <div className="text-[9px] font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wide leading-none mb-1.5">
                        Referrals
                      </div>
                      <div className="text-[11px] font-bold text-purple-700 dark:text-purple-500">
                        Share! 🎁
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Level Progress System */}
            {userStats && (() => {
              const { currentLevel, nextLevel, progress, reservationsToNext } = getLevelProgress(userStats.total_reservations);
              
              return (
                <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200 dark:border-teal-800 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-[24px]"
                        style={{ backgroundColor: `${currentLevel.color}20` }}
                      >
                        {currentLevel.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 leading-none mb-1">
                          Your Level
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <span 
                            className="text-[13px] font-extrabold leading-none"
                            style={{ color: currentLevel.color }}
                          >
                            Level {currentLevel.level}
                          </span>
                          <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
                            — {currentLevel.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {nextLevel && (
                      <>
                        {/* Progress Bar */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              Progress to {nextLevel.name}
                            </span>
                            <span className="font-bold text-teal-600 dark:text-teal-400">
                              {Math.round(progress)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 transition-all duration-500"
                              style={{ width: `${Math.min(100, progress)}%` }}
                            />
                          </div>
                        </div>

                        {/* Next Level Info */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-2.5 flex items-center justify-between">
                          <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-300">
                            {reservationsToNext} more {reservationsToNext === 1 ? 'reservation' : 'reservations'} until Level {nextLevel.level}!
                          </span>
                          <span className="text-[18px]">{nextLevel.icon}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Referral Progress Tracker */}
            {userStats && (
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 shadow-sm">
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Gift className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                      Referral Progress
                    </h3>
                  </div>
                  
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {userStats.total_referrals || 0} of 3 friends invited
                      </span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {Math.round(((userStats.total_referrals || 0) / 3) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, ((userStats.total_referrals || 0) / 3) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 text-center">
                    {(userStats.total_referrals || 0) >= 3 
                      ? "Bonus unlocked! You're amazing! 🎉"
                      : `${3 - (userStats.total_referrals || 0)} more ${3 - (userStats.total_referrals || 0) === 1 ? 'friend' : 'friends'} to unlock your bonus! 🎁`
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                onClick={() => setActiveTab('settings')}
                variant="outline"
                size="sm"
                className="h-11 text-[13px] font-bold border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <UserIcon className="w-4 h-4 mr-1.5" />
                Update ✏️
              </Button>
              <Button
                onClick={() => setShowReferralModal(true)}
                size="sm"
                className="h-11 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-[13px] font-extrabold rounded-2xl shadow-md shadow-purple-600/30 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Gift className="w-4 h-4 mr-1.5" />
                Invite 🚀
              </Button>
            </div>
          </TabsContent>

          {/* ACHIEVEMENTS TAB */}
          <TabsContent value="achievements" className="mt-0 h-full overflow-y-auto">
            <AchievementsGrid
              userId={user.id}
              onUnclaimedCountChange={setUnclaimedCount}
            />
          </TabsContent>

          {/* WALLET TAB */}
          <TabsContent value="wallet" className="px-4 space-y-3 mt-2">
            <SmartPointsWallet userId={user.id} />

            {/* Buy Points Modal */}
            <BuyPointsModal
              isOpen={isBuyPointsModalOpen}
              onClose={() => setIsBuyPointsModalOpen(false)}
              currentBalance={userStats?.points || 0}
              userId={user.id}
            />
          </TabsContent>

          {/* SETTINGS TAB - COMPLETELY REDESIGNED */}
          <TabsContent value="settings" className="px-4 pb-6 space-y-2.5 mt-2">
            {/* Tiny Header */}
            <div className="pb-1">
              <h2 className="text-[16px] font-bold text-gray-900 dark:text-gray-100 leading-tight mb-0.5">
                Settings ⚙️
              </h2>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
                Manage your SmartPick account
              </p>
            </div>

            {/* Account Info Card - Compact */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <CardContent className="p-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="name" className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-9 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-9 text-sm mt-1"
                        placeholder="+995 XXX XXX XXX"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-9 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        disabled={isSaving}
                        variant="outline"
                        className="h-9 text-xs font-bold"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Email</p>
                          <p className="text-[12px] text-gray-900 dark:text-gray-100 font-bold truncate max-w-[200px]">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">Phone</p>
                          <p className="text-[12px] text-gray-900 dark:text-gray-100 font-bold">{user.phone || 'Not added 📱'}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => setIsEditing(true)}
                      size="sm"
                      className="w-full h-9 mt-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                    >
                      <Edit className="w-3 h-3 mr-1.5" />
                      Update Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reservation Capacity - Compact */}
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                      Reservation Capacity 📋
                    </h3>
                  </div>
                  <span className="text-[16px] font-black text-orange-600 dark:text-orange-400">
                    3 items
                  </span>
                </div>
                
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      3 / 10 slots unlocked
                    </span>
                    <span className="font-bold text-orange-600 dark:text-orange-400">
                      30%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                      style={{ width: '30%' }}
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-gray-700 dark:text-gray-300 font-semibold">
                    Next unlock: <span className="text-orange-600 dark:text-orange-400 font-bold">4th slot → 100 pts</span>
                  </p>
                </div>

                <details className="group">
                  <summary className="text-[10px] font-bold text-gray-600 dark:text-gray-400 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                    View Future Upgrades ▼
                  </summary>
                  <div className="mt-2 space-y-1 text-[10px] text-gray-600 dark:text-gray-400 pl-2">
                    <p>• 5th slot → 200 pts</p>
                    <p>• 6th slot → 400 pts</p>
                    <p>• 7th slot → 800 pts</p>
                  </div>
                </details>

                <Button
                  onClick={() => toast.info('Slot upgrade coming soon!')}
                  size="sm"
                  className="w-full h-9 mt-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-xs font-bold"
                >
                  <Unlock className="w-3 h-3 mr-1.5" />
                  Upgrade Slot
                </Button>
              </CardContent>
            </Card>

            {/* Notifications - Collapsible */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 shadow-sm">
              <CardContent className="p-3">
                <button
                  onClick={() => toggleSection('notifications')}
                  className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                      Notifications
                    </h3>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${sectionsOpen.notifications ? 'rotate-90' : ''}`} />
                </button>

                {sectionsOpen.notifications && (
                  <div className="space-y-1.5">
                    {/* Telegram Toggle */}
                    <div className="flex items-center justify-between py-1.5 border-b border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <Send className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Telegram</span>
                      </div>
                      <Switch
                        checked={notificationPrefs.telegram}
                        onCheckedChange={(checked) => {
                          setNotificationPrefs({ ...notificationPrefs, telegram: checked });
                          if (checked) {
                            toast.success('🔵 Telegram notifications enabled!');
                          } else {
                            toast.info('Telegram notifications disabled');
                          }
                        }}
                        className="scale-75"
                      />
                    </div>
                    {/* Email, Push, SMS Toggles */}
                  <div className="flex items-center justify-between py-1.5 border-b border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Email</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.email}
                      onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, email: checked })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Push</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.push}
                      onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, push: checked })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">SMS</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.sms}
                      onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, sms: checked })}
                      className="scale-75"
                    />
                  </div>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Security - Collapsible */}
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 shadow-sm">
              <CardContent className="p-3">
                <button
                  onClick={() => toggleSection('security')}
                  className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                      Security
                    </h3>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${sectionsOpen.security ? 'rotate-90' : ''}`} />
                </button>

                {sectionsOpen.security && (
                  <div className="space-y-1.5">
                  <button
                    onClick={() => toast.info('Change password feature coming soon')}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Key className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Change Password</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </button>
                  <button
                    onClick={() => toast.info('Manage devices feature coming soon')}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Manage Devices</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </button>
                  <button
                    onClick={() => toast.info('Two-factor authentication coming soon')}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Two-Factor Auth</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preferences - Collapsible */}
            <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-800 shadow-sm">
              <CardContent className="p-3">
                <button
                  onClick={() => toggleSection('preferences')}
                  className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                      Preferences
                    </h3>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${sectionsOpen.preferences ? 'rotate-90' : ''}`} />
                </button>

                {sectionsOpen.preferences && (
                  <div className="space-y-1.5">
                  <button
                    onClick={() => toast.info('🌍 Check the top-right menu to change language')}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Language</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </button>
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2">
                      <Coins className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Currency</span>
                    </div>
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">GEL (₾)</span>
                  </div>
                  <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2">
                      {isDarkMode ? <Sun className="w-3 h-3 text-teal-600 dark:text-teal-400" /> : <Moon className="w-3 h-3 text-teal-600 dark:text-teal-400" />}
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Theme</span>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      {isDarkMode ? 'Light' : 'Dark'}
                    </button>
                  </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support - Collapsible */}
            <Card className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-800 shadow-sm">
              <CardContent className="p-3">
                <button
                  onClick={() => toggleSection('support')}
                  className="w-full flex items-center justify-between mb-2 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    <h3 className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                      Support & Help
                    </h3>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${sectionsOpen.support ? 'rotate-90' : ''}`} />
                </button>

                {sectionsOpen.support && (
                  <div className="space-y-1.5">
                  <button
                    onClick={() => toast.info('📖 Help Center coming soon!')}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Help Center</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </button>
                  <a
                    href="mailto:support@smartpick.ge"
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Contact Support</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </a>
                  <button
                    onClick={() => setShowTutorial(true)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">View Tutorial</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </button>
                  <button
                    onClick={() => window.open('https://smartpick.ge/terms', '_blank')}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/30 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Terms & Privacy</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center pt-2 pb-4">
              <p className="text-[10px] text-gray-400 dark:text-gray-600">
                SmartPick v1.0.0 © 2025 SmartPick
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Penalty Warning Dialog */}
      <PenaltyWarningDialog
        open={showPenaltyWarning}
        onOpenChange={setShowPenaltyWarning}
        onAcknowledge={handleAcknowledgePenaltyWarning}
      />

      {/* Onboarding Tutorial */}
      <OnboardingDialog
        open={showTutorial}
        onComplete={() => setShowTutorial(false)}
        userName={(user as any)?.full_name || (user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'}
      />

      {/* Referral Modal - Playful & Full Screen */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 px-6 py-8 text-center relative">
              <button
                onClick={() => setShowReferralModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <span className="text-white text-xl">×</span>
              </button>
              <div className="text-[48px] mb-3">🎁</div>
              <h2 className="text-[24px] font-black text-white mb-2">
                Refer Friends, Earn Rewards!
              </h2>
              <p className="text-[14px] text-white/90 font-medium">
                Share SmartPick and get amazing bonuses!
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Progress Tracker */}
              {userStats && (
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-bold text-gray-900 dark:text-gray-100">
                        Your Progress
                      </span>
                      <span className="text-[20px] font-black text-purple-600 dark:text-purple-400">
                        {userStats.total_referrals || 0}/3
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 transition-all duration-500"
                        style={{ width: `${Math.min(100, ((userStats.total_referrals || 0) / 3) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 text-center">
                      {(userStats.total_referrals || 0) >= 3 
                        ? "🎉 Bonus unlocked! You're amazing!"
                        : `${3 - (userStats.total_referrals || 0)} more ${3 - (userStats.total_referrals || 0) === 1 ? 'friend' : 'friends'} to unlock bonus!`
                      }
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* How it Works */}
              <div className="space-y-3">
                <h3 className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
                  How It Works:
                </h3>
                
                <div className="space-y-2.5">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 text-[16px] font-black text-purple-600 dark:text-purple-400">
                      1
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                        Share your invite link
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">
                        Send your unique link to friends via WhatsApp, Telegram, or social media
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center flex-shrink-0 text-[16px] font-black text-pink-600 dark:text-pink-400">
                      2
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                        They sign up & save
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">
                        Your friend joins SmartPick and starts enjoying great deals
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 text-[16px] font-black text-purple-600 dark:text-purple-400">
                      3
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                        You both get rewards! 🎉
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">
                        Earn SmartPoints and unlock exclusive bonuses together
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => {
                    const referralCode = user?.referral_code || user?.id.substring(0, 8);
                    const text = `Join SmartPick and save on amazing deals! 🎉 Use my invite link: https://smartpick.ge?ref=${referralCode}`;
                    navigator.clipboard.writeText(`https://smartpick.ge?ref=${referralCode}`);
                    toast.success('Invite link copied! 🎉');
                  }}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-[14px] rounded-2xl shadow-lg"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Copy Invite Link
                </Button>

                <Button
                  onClick={() => {
                    const referralCode = user?.referral_code || user?.id.substring(0, 8);
                    const text = `Join SmartPick and save on amazing deals! 🎉`;
                    const url = `https://smartpick.ge?ref=${referralCode}`;
                    if (navigator.share) {
                      navigator.share({ title: 'SmartPick Referral', text, url });
                    } else {
                      navigator.clipboard.writeText(`${text} ${url}`);
                      toast.success('Link copied! Share it with friends! 🎉');
                    }
                  }}
                  variant="outline"
                  className="w-full h-12 border-2 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-bold text-[14px] rounded-2xl"
                >
                  <Gift className="w-5 h-5 mr-2" />
                  Share Invite
                </Button>
              </div>

              {/* Bonus Info */}
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
                <CardContent className="p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="text-[24px]">✨</div>
                    <div className="flex-1">
                      <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 mb-1">
                        Unlock Your Bonus!
                      </p>
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                        Invite 3 friends to unlock exclusive rewards, bonus points, and special perks!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      <FloatingBottomNav 
        onCenterClick={() => {
          // Navigate to home
          window.location.href = '/';
        }}
      />
    </div>
  );
}

