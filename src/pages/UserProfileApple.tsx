// 🍎 Apple-Level Profile Page Redesign - Premium Variant
// Merges Apple Wallet + Apple Fitness aesthetics
// Maintains ALL existing business logic

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Coins, Trophy, Users, HelpCircle, Bell, Lock, Globe, CreditCard, ChevronRight, Sparkles, TrendingUp, Calendar, Gift, Shield, LogOut, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar } from '../components/ui/avatar';
import { BottomNavBar as BottomNavPremium } from '../components/navigation/BottomNavBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

// Lazy-loaded components for better performance
const SmartPointsWallet = lazy(() => import('@/components/SmartPointsWallet').then(m => ({ default: m.SmartPointsWallet })));
const AchievementsGrid = lazy(() => import('@/components/gamification/AchievementsGrid').then(m => ({ default: m.AchievementsGrid })));
const ReferralCard = lazy(() => import('@/components/gamification/ReferralCard').then(m => ({ default: m.ReferralCard })));

// Types
interface UserStats {
  total_reservations: number;
  money_saved: number;
  current_streak: number;
  successful_referrals: number;
  level: number;
  progress_percentage: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  smart_points: number;
  level: number;
  is_partner: boolean;
}

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30
    }
  }
};

// 🎯 (A) TOP HEADER CARD
const ProfileHeader = ({ user }: { user: User }) => {
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const levelName = (level: number) => {
    if (level >= 10) return 'Legend';
    if (level >= 7) return 'Expert';
    if (level >= 5) return 'Foodie';
    if (level >= 3) return 'Explorer';
    return 'Newbie';
  };

  return (
    <motion.div variants={cardVariants}>
      <Card className="bg-white rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 ring-2 ring-[#FF8A00]/20">
              <div className="w-full h-full bg-gradient-to-br from-[#FF8A00] to-[#FFB84D] flex items-center justify-center text-white text-xl font-semibold">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
            </Avatar>
            <div>
              <h1 className="text-[22px] font-semibold text-[#1A1A1A] leading-tight">
                {greeting()}, {user.name?.split(' ')[0] || 'User'}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px] text-[#6F6F6F] flex items-center gap-1">
                  <Sparkles size={14} className="text-[#FF8A00]" />
                  Level {user.level} · {levelName(user.level)}
                </span>
              </div>
              <span className="text-[13px] font-medium text-[#FF8A00]">
                {user.smart_points || 0} SmartPoints
              </span>
            </div>
          </div>
          {user.is_partner && (
            <div className="px-3 py-1.5 bg-[#007AFF]/10 rounded-full">
              <span className="text-[11px] font-semibold text-[#007AFF] uppercase tracking-wide">
                Partner
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// 🎯 (B) QUICK ACTIONS ROW
const QuickActions = ({ onNavigate }: { onNavigate: (route: string) => void }) => {
  const actions = [
    { icon: Coins, label: 'Wallet', color: '#FF8A00', route: 'wallet' },
    { icon: Trophy, label: 'Achievements', color: '#34C759', route: 'achievements' },
    { icon: Users, label: 'Referrals', color: '#007AFF', route: 'referrals' },
    { icon: HelpCircle, label: 'Support', color: '#FF9500', route: 'support' }
  ];

  const triggerHaptic = (intensity: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator) {
      const patterns = { light: 10, medium: 20, heavy: 30 };
      navigator.vibrate(patterns[intensity]);
    }
  };

  return (
    <motion.div variants={cardVariants}>
      <Card className="bg-white rounded-[18px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-4 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                triggerHaptic('light');
                onNavigate(action.route);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-[#F8F9FB] active:scale-95 transition-all"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${action.color}15` }}>
                <action.icon size={22} strokeWidth={2} style={{ color: action.color }} />
              </div>
              <span className="text-[11px] font-medium text-[#1A1A1A]">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

// 🎯 (C) STATS OVERVIEW - 2×2 Grid
const StatsOverview = ({ stats }: { stats: UserStats }) => {
  const statCards = [
    {
      value: stats.total_reservations,
      label: 'Picks',
      gradient: 'linear-gradient(135deg, #FF8A00 0%, #FFB84D 100%)',
      icon: TrendingUp
    },
    {
      value: `₾${stats.money_saved}`,
      label: 'Saved',
      gradient: 'linear-gradient(135deg, #34C759 0%, #66D97A 100%)',
      icon: Coins
    },
    {
      value: `${stats.current_streak} Days`,
      label: 'Streak',
      gradient: 'linear-gradient(135deg, #FF9500 0%, #FFAA33 100%)',
      icon: Calendar
    },
    {
      value: stats.successful_referrals,
      label: 'Friends',
      gradient: 'linear-gradient(135deg, #007AFF 0%, #3395FF 100%)',
      icon: Gift
    }
  ];

  return (
    <motion.div variants={cardVariants}>
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat, index) => (
          <Card
            key={stat.label}
            className="relative overflow-hidden rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
            style={{ background: stat.gradient }}
          >
            <div className="relative z-10">
              <stat.icon size={20} strokeWidth={2} className="text-white/80 mb-2" />
              <div className="text-[32px] font-bold text-white leading-none mb-1">
                {stat.value}
              </div>
              <div className="text-[13px] font-medium text-white/90">
                {stat.label}
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/10" />
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

// 🎯 (D) LEVEL PROGRESS - Apple Fitness Style
const LevelProgress = ({ stats }: { stats: UserStats }) => {
  const levelName = (level: number) => {
    if (level >= 10) return 'Legend';
    if (level >= 7) return 'Expert';
    if (level >= 5) return 'Foodie';
    if (level >= 3) return 'Explorer';
    return 'Newbie';
  };

  const nextLevelName = (level: number) => {
    if (level >= 9) return 'Legend';
    if (level >= 6) return 'Expert';
    if (level >= 4) return 'Foodie';
    if (level >= 2) return 'Explorer';
    return 'Foodie';
  };

  const picksToNextLevel = Math.ceil((100 - stats.progress_percentage) / 10);

  return (
    <motion.div variants={cardVariants}>
      <Card className="bg-white rounded-[18px] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[17px] font-semibold text-[#1A1A1A] flex items-center gap-2">
            <Sparkles size={18} className="text-[#FF8A00]" />
            Level {stats.level} — {levelName(stats.level)}
          </h3>
          <span className="text-[13px] font-medium text-[#6F6F6F]">
            {Math.round(stats.progress_percentage)}% to Level {stats.level + 1}
          </span>
        </div>

        {/* Apple Fitness-Style Progress Bar */}
        <div className="relative h-3 bg-[#E5E5EA] rounded-full overflow-hidden mb-3">
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #FF8A00 0%, #FFB84D 50%, #34C759 100%)'
            }}
            initial={{ width: 0 }}
            animate={{ width: `${stats.progress_percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>

        <p className="text-[13px] text-[#6F6F6F]">
          <span className="font-medium text-[#1A1A1A]">{picksToNextLevel} more picks</span> to reach {nextLevelName(stats.level)}
        </p>
      </Card>
    </motion.div>
  );
};

// 🎯 (E) SETTINGS SECTION - Apple Settings Style
const SettingsSection = ({ onNavigate, onLogout }: { onNavigate: (route: string) => void; onLogout: () => void }) => {
  const settings = [
    { icon: Bell, label: 'Notifications', route: 'notifications' },
    { icon: Lock, label: 'Privacy & Security', route: 'security' },
    { icon: Globe, label: 'Language & Region', route: 'language' },
    { icon: CreditCard, label: 'Payment Methods', route: 'payments' },
    { icon: HelpCircle, label: 'Help & Support', route: 'support' }
  ];

  return (
    <motion.div variants={cardVariants}>
      <Card className="bg-white rounded-[18px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {settings.map((setting, index) => (
          <button
            key={setting.label}
            onClick={() => onNavigate(setting.route)}
            className={`w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8F9FB] transition-colors ${
              index !== settings.length - 1 ? 'border-b border-[rgba(0,0,0,0.07)]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <setting.icon size={20} strokeWidth={2} className="text-[#6F6F6F]" />
              <span className="text-[15px] text-[#1A1A1A]">{setting.label}</span>
            </div>
            <ChevronRight size={18} strokeWidth={2} className="text-[#6F6F6F]" />
          </button>
        ))}

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-5 py-4 border-t-2 border-[rgba(0,0,0,0.07)] hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut size={20} strokeWidth={2} className="text-[#FF3B30]" />
            <span className="text-[15px] font-medium text-[#FF3B30]">Sign Out</span>
          </div>
        </button>
      </Card>
    </motion.div>
  );
};

// 🍎 MAIN COMPONENT
export default function UserProfileApple() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats>({
    total_reservations: 0,
    money_saved: 0,
    current_streak: 0,
    successful_referrals: 0,
    level: 1,
    progress_percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'wallet' | 'achievements' | 'referrals' | 'support' | 'notifications' | 'security' | 'language' | 'payments' | null>(null);
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    newOffers: true,
    reservationReminders: true,
    pointsUpdates: true,
    achievements: true,
    referralRewards: true
  });

  // Load user data (preserve existing logic)
  const loadUser = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // Load SmartPoints balance from user_points table
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', authUser.id)
        .single();

      if (userData) {
        setUser({
          ...userData,
          smart_points: pointsData?.balance || 0
        });
      }

      // Load stats from user_stats table
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (statsData && !statsError) {
        const reservations = statsData.total_reservations || 0;
        const currentLevel = Math.floor(reservations / 10) + 1;
        const progressInLevel = reservations % 10;
        const progressPercentage = (progressInLevel / 10) * 100;
        
        setStats({
          total_reservations: reservations,
          money_saved: statsData.total_money_saved || 0,
          current_streak: statsData.current_streak_days || 0,
          successful_referrals: statsData.total_referrals || 0,
          level: currentLevel,
          progress_percentage: progressPercentage
        });
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNavigate = (route: string) => {
    if (route === 'wallet') setActiveModal('wallet');
    else if (route === 'achievements') setActiveModal('achievements');
    else if (route === 'referrals') setActiveModal('referrals');
    else if (route === 'notifications') setActiveModal('notifications');
    else if (route === 'security') setActiveModal('security');
    else if (route === 'language') setActiveModal('language');
    else if (route === 'payments') setActiveModal('payments');
    else if (route === 'support') navigate('/contact');
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    toast.success('Notification preferences updated');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FF8A00] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Status Bar Safe Area */}
      <div className="h-11" />

      {/* Main Content */}
      <motion.div
        className="px-4 pb-32"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-4">
          <ProfileHeader user={user} />
          <QuickActions onNavigate={handleNavigate} />
          <StatsOverview stats={stats} />
          <LevelProgress stats={stats} />
          <SettingsSection onNavigate={handleNavigate} onLogout={handleLogout} />
        </div>
      </motion.div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0">
        <BottomNavPremium onCenterClick={() => navigate('/')} />
      </div>

      {/* Wallet Modal */}
      <Dialog open={activeModal === 'wallet'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="text-[#FF8A00]" size={24} />
              SmartPoints Wallet
            </DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-8 text-center">Loading wallet...</div>}>
            <SmartPointsWallet userId={user?.id || ''} />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Achievements Modal */}
      <Dialog open={activeModal === 'achievements'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="text-[#34C759]" size={24} />
              Your Achievements
            </DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-8 text-center">Loading achievements...</div>}>
            <AchievementsGrid userId={user?.id || ''} />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Referrals Modal */}
      <Dialog open={activeModal === 'referrals'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="text-[#007AFF]" size={24} />
              Refer Friends
            </DialogTitle>
          </DialogHeader>
          <Suspense fallback={<div className="p-8 text-center">Loading referrals...</div>}>
            <ReferralCard userId={user?.id || ''} totalReferrals={stats.successful_referrals} />
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Notifications Settings Modal */}
      <Dialog open={activeModal === 'notifications'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="text-[#FF8A00]" size={24} />
              Notification Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="new-offers" className="text-[15px] font-medium">New Offers</Label>
                <p className="text-[13px] text-[#6F6F6F]">Get notified when new offers are available</p>
              </div>
              <Switch
                id="new-offers"
                checked={notificationSettings.newOffers}
                onCheckedChange={() => handleNotificationToggle('newOffers')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reminders" className="text-[15px] font-medium">Reservation Reminders</Label>
                <p className="text-[13px] text-[#6F6F6F]">Reminders before your reservation time</p>
              </div>
              <Switch
                id="reminders"
                checked={notificationSettings.reservationReminders}
                onCheckedChange={() => handleNotificationToggle('reservationReminders')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="points" className="text-[15px] font-medium">SmartPoints Updates</Label>
                <p className="text-[13px] text-[#6F6F6F]">When you earn or spend points</p>
              </div>
              <Switch
                id="points"
                checked={notificationSettings.pointsUpdates}
                onCheckedChange={() => handleNotificationToggle('pointsUpdates')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="achievements" className="text-[15px] font-medium">Achievements</Label>
                <p className="text-[13px] text-[#6F6F6F]">When you unlock new achievements</p>
              </div>
              <Switch
                id="achievements"
                checked={notificationSettings.achievements}
                onCheckedChange={() => handleNotificationToggle('achievements')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="referrals" className="text-[15px] font-medium">Referral Rewards</Label>
                <p className="text-[13px] text-[#6F6F6F]">When friends join using your code</p>
              </div>
              <Switch
                id="referrals"
                checked={notificationSettings.referralRewards}
                onCheckedChange={() => handleNotificationToggle('referralRewards')}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy & Security Modal */}
      <Dialog open={activeModal === 'security'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="text-[#FF3B30]" size={24} />
              Privacy & Security
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className="p-4 bg-[#F8F9FB]">
              <p className="text-[13px] text-[#6F6F6F] mb-3">
                Your account is protected with email verification and secure authentication.
              </p>
              <Button
                onClick={() => toast.info('Password change feature coming soon')}
                variant="outline"
                className="w-full"
              >
                <Lock size={16} className="mr-2" />
                Change Password
              </Button>
            </Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="text-[15px] font-medium">Email</p>
                  <p className="text-[13px] text-[#6F6F6F]">{user?.email}</p>
                </div>
                <Shield size={20} className="text-[#34C759]" />
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div>
                  <p className="text-[15px] font-medium">Two-Factor Auth</p>
                  <p className="text-[13px] text-[#6F6F6F]">Coming soon</p>
                </div>
                <Shield size={20} className="text-[#6F6F6F]" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Language & Region Modal */}
      <Dialog open={activeModal === 'language'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="text-[#007AFF]" size={24} />
              Language & Region
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <button
              onClick={() => toast.success('Language changed to English')}
              className="w-full flex items-center justify-between p-4 bg-[#007AFF]/10 rounded-lg border-2 border-[#007AFF]"
            >
              <span className="text-[15px] font-medium">🇬🇧 English</span>
              <ChevronRight size={18} className="text-[#007AFF]" />
            </button>
            <button
              onClick={() => toast.info('Georgian language coming soon')}
              className="w-full flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-[#F8F9FB]"
            >
              <span className="text-[15px] font-medium">🇬🇪 ქართული (Georgian)</span>
              <ChevronRight size={18} className="text-[#6F6F6F]" />
            </button>
            <button
              onClick={() => toast.info('Russian language coming soon')}
              className="w-full flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-[#F8F9FB]"
            >
              <span className="text-[15px] font-medium">🇷🇺 Русский (Russian)</span>
              <ChevronRight size={18} className="text-[#6F6F6F]" />
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Methods Modal */}
      <Dialog open={activeModal === 'payments'} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="text-[#34C759]" size={24} />
              Payment Methods
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className="p-4 bg-gradient-to-br from-[#34C759]/10 to-[#66D97A]/10 border border-[#34C759]/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[15px] font-semibold">Bank of Georgia</p>
                  <p className="text-[13px] text-[#6F6F6F]">Active payment provider</p>
                </div>
                <Shield size={24} className="text-[#34C759]" />
              </div>
              <p className="text-[12px] text-[#6F6F6F]">
                All payments are securely processed through Bank of Georgia's payment gateway.
              </p>
            </Card>
            <div className="space-y-2">
              <p className="text-[13px] font-medium">Accepted Payment Methods:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white rounded-lg border text-center">
                  <CreditCard size={20} className="mx-auto mb-1 text-[#6F6F6F]" />
                  <p className="text-[12px] font-medium">Credit Card</p>
                </div>
                <div className="p-3 bg-white rounded-lg border text-center">
                  <CreditCard size={20} className="mx-auto mb-1 text-[#6F6F6F]" />
                  <p className="text-[12px] font-medium">Debit Card</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
