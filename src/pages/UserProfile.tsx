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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, User as UserIcon, Mail, Phone, Calendar, Shield, Edit, Coins, Clock, Bell, Lock, CreditCard, Settings, HelpCircle, ChevronRight, Globe, Utensils, MapPin, Moon, Sun, Trash2, Key, FileText, Gift } from 'lucide-react';
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
import { getUserStats, UserStats } from '@/lib/gamification-api';
const BuyPointsModal = lazy(() => import('@/components/wallet/BuyPointsModal').then(m => ({ default: m.BuyPointsModal })));
import { requestPartnerForgiveness, checkForgivenessStatus } from '@/lib/forgiveness-api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Send, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PenaltyWarningDialog } from '@/components/PenaltyWarningDialog';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { supabase } from '@/lib/supabase';
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

          {/* OVERVIEW TAB - ULTRA COMPACT */}
          <TabsContent value="overview" className="px-4 space-y-2.5 mt-2">
            {/* Compact info card (2x2 grid) - Height: ~90px */}
            <ProfileInfoCard 
              user={user}
              onAddPhone={() => {
                setIsEditing(true);
                setActiveTab('settings');
              }}
            />

            {/* Stats grid (2x2) - Height: ~90px */}
            {userStats && (
              <StatsGrid 
                stats={{
                  totalReservations: userStats.total_reservations || 0,
                  moneySaved: userStats.money_saved || 0,
                  currentStreak: userStats.current_streak || 0,
                  referrals: userStats.total_referrals || 0
                }}
              />
            )}

            {/* Single-line journey message - Height: ~16px */}
            {userStats && (
              <div className="py-1.5">
                <p className="text-[11px] text-gray-600 dark:text-gray-400 text-center leading-tight">
                  {userStats.total_reservations === 0 && "Ready to start your journey? 🚀"}
                  {userStats.total_reservations > 0 && userStats.total_reservations < 5 && "You're off to a strong start — keep going! 🚀"}
                  {userStats.total_reservations >= 5 && userStats.total_reservations < 15 && "Great progress — you're on fire! 🔥"}
                  {userStats.total_reservations >= 15 && "Amazing! You're a SmartPick superstar! ⭐"}
                </p>
              </div>
            )}

            {/* Action buttons - Height: ~40px */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                onClick={() => setActiveTab('settings')}
                variant="outline"
                size="sm"
                className="h-10 text-[12px] font-medium"
              >
                <UserIcon className="w-4 h-4 mr-1.5" />
                Update Profile
              </Button>
              <Button
                onClick={() => {
                  const referralCode = user.referral_code || user.id.substring(0, 8);
                  navigator.clipboard.writeText(`https://smartpick.ge?ref=${referralCode}`);
                  toast.success('Referral link copied!');
                }}
                size="sm"
                className="h-10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-[12px] font-medium"
              >
                <Gift className="w-4 h-4 mr-1.5" />
                Invite Friends
              </Button>
            </div>
          </TabsContent>

          {/* ACHIEVEMENTS TAB */}
          <TabsContent value="achievements" className="px-4 space-y-3 mt-2">
            <AchievementsGrid
              userId={user.id}
              onUnclaimedCountChange={setUnclaimedCount}
            />
          </TabsContent>

          {/* WALLET TAB */}
          <TabsContent value="wallet" className="px-4 space-y-3 mt-2">
            {/* Buy Points Button */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Buy SmartPoints</h3>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">Get more points to enjoy our services 🪙</p>
                  </div>
                  <Button
                    onClick={() => setIsBuyPointsModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white h-9"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Buy Points
                  </Button>
                </div>
              </CardContent>
            </Card>

            <SmartPointsWallet userId={user.id} />

            {/* Buy Points Modal */}
            <BuyPointsModal
              isOpen={isBuyPointsModalOpen}
              onClose={() => setIsBuyPointsModalOpen(false)}
              currentBalance={0}
              userId={user.id}
            />
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="px-4 space-y-2 mt-2">
            {/* ACCOUNT INFORMATION */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-semibold">
                  <UserIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-gray-700 dark:text-gray-300 text-xs font-medium">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300 text-xs font-medium">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-8 text-sm"
                        placeholder="+995 XXX XXX XXX"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-xs"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        disabled={isSaving}
                        variant="outline"
                        className="h-8 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">Email</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium truncate">{user.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 mb-0.5">Phone</p>
                        <p className="text-gray-900 dark:text-gray-100 font-medium">{user.phone || 'Add phone 📱'}</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="w-full h-8 text-xs border-emerald-600 dark:border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Update Profile ✏️
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RESERVATION CAPACITY */}
            <ReservationCapacitySection
              userId={user.id}
              currentBalance={0}
              onBalanceChange={loadUser}
            />

            {/* NOTIFICATIONS */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-sm font-semibold">
                  <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {/* Telegram Integration */}
                <TelegramConnect userId={user.id} userType="customer" />

                {/* Compact Notification Toggles */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Email</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.email}
                      onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, email: checked })}
                      className="scale-75"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">Push</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.push}
                      onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, push: checked })}
                      className="scale-75"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                      <span className="text-xs text-gray-700 dark:text-gray-300">SMS</span>
                    </div>
                    <Switch
                      checked={notificationPrefs.sms}
                      onCheckedChange={(checked) => setNotificationPrefs({ ...notificationPrefs, sms: checked })}
                      className="scale-75"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SECURITY & MORE - Accordion Style */}
            <Accordion type="single" collapsible className="space-y-2">
              {/* Security */}
              <AccordionItem value="security" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg px-3">
                <AccordionTrigger className="py-2.5 hover:no-underline text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Security</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-3">
                  {/* Set/Change Password */}
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user?.email?.includes('@') && !(user as any)?.app_metadata?.provider ? 'Change Password' : 'Set Password'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="New password (min 6 characters)"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="text-sm"
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handlePasswordChange}
                        disabled={isChangingPassword || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                        className="w-full"
                      >
                        {isChangingPassword ? 'Updating...' : 'Update Password'}
                      </Button>
                      <p className="text-xs text-gray-500">
                        {user?.email?.includes('google') ? 'Set a password to enable email login alongside Google' : 'Use this to change your login password'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => toast.error('Requires admin approval')}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                      <span className="text-xs text-red-600 dark:text-red-400">Delete Account</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  </button>
                </AccordionContent>
              </AccordionItem>

              {/* Preferences */}
              <AccordionItem value="preferences" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg px-3">
                <AccordionTrigger className="py-2.5 hover:no-underline text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Preferences</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-1.5">
                  <button
                    onClick={() => toast.info('🌍 Check the top-right menu to change language', { duration: 3000 })}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">Language</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                  </button>
                  {/* Location and dietary preferences hidden until implementation */}
                </AccordionContent>
              </AccordionItem>

              {/* Notifications */}
              <AccordionItem value="notifications" className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] border-white/10 rounded-lg px-3">
                <AccordionTrigger className="py-2.5 hover:no-underline text-white">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">Notifications</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-3">
                  {!pushSupported ? (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">Push notifications are not supported in your browser.</p>
                    </div>
                  ) : !subscription ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">Get notified about offers near you, from favorite partners, and expiring deals.</p>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (user) {
                            const success = await subscribeToPush(user.id);
                            if (success) {
                              toast.success('🔔 Push notifications enabled!');
                            } else {
                              toast.error('Failed to enable notifications');
                            }
                          }
                        }}
                        className="w-full"
                      >
                        <Bell className="w-3.5 h-3.5 mr-1.5" />
                        Enable Notifications
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 rounded hover:bg-blue-50">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          <div>
                            <p className="text-xs font-medium text-gray-900">Nearby Offers</p>
                            <p className="text-[10px] text-gray-500">Get alerts for new offers near you</p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.nearby}
                          onCheckedChange={async (checked) => {
                            setNotificationSettings(prev => ({ ...prev, nearby: checked }));
                            if (user) {
                              const success = await updateNotificationTypes(user.id, { nearby: checked });
                              if (success) {
                                toast.success(checked ? 'Nearby alerts enabled' : 'Nearby alerts disabled');
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded hover:bg-blue-50">
                        <div className="flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5 text-pink-500" />
                          <div>
                            <p className="text-xs font-medium text-gray-900">Favorite Partners</p>
                            <p className="text-[10px] text-gray-500">Updates from partners you favorited</p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.favorite_partner}
                          onCheckedChange={async (checked) => {
                            setNotificationSettings(prev => ({ ...prev, favorite_partner: checked }));
                            if (user) {
                              const success = await updateNotificationTypes(user.id, { favorite_partner: checked });
                              if (success) {
                                toast.success(checked ? 'Favorite partner alerts enabled' : 'Favorite partner alerts disabled');
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded hover:bg-blue-50">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          <div>
                            <p className="text-xs font-medium text-gray-900">Expiring Soon</p>
                            <p className="text-[10px] text-gray-500">Alerts for offers expiring in 30 min</p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationSettings.expiring}
                          onCheckedChange={async (checked) => {
                            setNotificationSettings(prev => ({ ...prev, expiring: checked }));
                            if (user) {
                              const success = await updateNotificationTypes(user.id, { expiring: checked });
                              if (success) {
                                toast.success(checked ? 'Expiring alerts enabled' : 'Expiring alerts disabled');
                              }
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (user) {
                            const success = await unsubscribeFromPush(user.id);
                            if (success) {
                              toast.success('Push notifications disabled');
                            }
                          }
                        }}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disable All Notifications
                      </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Support */}
              <AccordionItem value="support" className="border border-gray-200 rounded-lg bg-white px-3">
                <AccordionTrigger className="py-2.5 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-gray-900">Support</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-1.5">
                  <a
                    href="mailto:support@smartpick.ge"
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-teal-50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-teal-500" />
                      <span className="text-xs text-gray-700 font-medium">Contact Support</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </a>
                  <button
                    onClick={() => setShowTutorial(true)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-teal-50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-xs text-gray-700 font-medium">View Tutorial</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  <button
                    onClick={() => window.open('https://smartpick.ge/terms', '_blank')}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-teal-50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-teal-500" />
                      <span className="text-xs text-gray-700 font-medium">Terms & Privacy</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* APP INFO - Compact Footer */}
            <div className="text-center py-3 text-xs text-gray-400">
              <p>SmartPick v1.0.0</p>
              <p className="text-gray-400">© 2025 SmartPick</p>
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
    </div>
  );
}

