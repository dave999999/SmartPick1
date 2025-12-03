// 🍎 Apple-Level Profile - MINIMAL VARIANT (Pure Apple Clean White)
// Ultra-clean, zero gradients, pure white cards, subtle shadows only

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Coins, Trophy, Users, HelpCircle, Bell, Lock, Globe, CreditCard, ChevronRight, Sparkles, TrendingUp, Calendar, Gift, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Avatar } from '../components/ui/avatar';
import { BottomNavPremium } from '../components/navigation/BottomNavPremium';

// Types (same as Premium)
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
  full_name: string;
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
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 500, damping: 35 }
  }
};

// 🎯 MINIMAL HEADER
const MinimalHeader = ({ user }: { user: User }) => {
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
      <Card className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[#E5E5EA]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Avatar className="w-12 h-12 ring-1 ring-[#E5E5EA]">
              <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center text-white text-lg font-semibold">
                {user.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
            </Avatar>
            <div>
              <h1 className="text-[20px] font-semibold text-[#1A1A1A] leading-tight">
                {greeting()}, {user.full_name?.split(' ')[0] || 'User'}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[12px] text-[#6F6F6F]">
                  Level {user.level} · {levelName(user.level)}
                </span>
              </div>
              <span className="text-[12px] font-medium text-[#FF8A00]">
                {user.smart_points} Points
              </span>
            </div>
          </div>
          {user.is_partner && (
            <div className="px-2.5 py-1 bg-[#1A1A1A] rounded-md">
              <span className="text-[10px] font-semibold text-white uppercase tracking-wider">
                Partner
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// 🎯 MINIMAL QUICK ACTIONS
const MinimalActions = ({ onNavigate }: { onNavigate: (route: string) => void }) => {
  const actions = [
    { icon: Coins, label: 'Wallet', route: 'wallet' },
    { icon: Trophy, label: 'Awards', route: 'achievements' },
    { icon: Users, label: 'Refer', route: 'referrals' },
    { icon: HelpCircle, label: 'Help', route: 'support' }
  ];

  return (
    <motion.div variants={cardVariants}>
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onNavigate(action.route)}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-[#E5E5EA] hover:border-[#D1D1D6] active:scale-[0.97] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <action.icon size={20} strokeWidth={2} className="text-[#1A1A1A]" />
            <span className="text-[10px] font-medium text-[#6F6F6F]">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

// 🎯 MINIMAL STATS (NO GRADIENTS)
const MinimalStats = ({ stats }: { stats: UserStats }) => {
  const statCards = [
    { value: stats.total_reservations, label: 'Picks', icon: TrendingUp },
    { value: `₾${stats.money_saved}`, label: 'Saved', icon: Coins },
    { value: `${stats.current_streak}`, label: 'Streak', icon: Calendar },
    { value: stats.successful_referrals, label: 'Friends', icon: Gift }
  ];

  return (
    <motion.div variants={cardVariants}>
      <div className="grid grid-cols-2 gap-2.5">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className="bg-white rounded-xl p-4 border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <stat.icon size={18} strokeWidth={2} className="text-[#6F6F6F] mb-2" />
            <div className="text-[28px] font-bold text-[#1A1A1A] leading-none mb-1">
              {stat.value}
            </div>
            <div className="text-[12px] font-medium text-[#6F6F6F]">
              {stat.label}
            </div>
          </Card>
        ))}
      </div>
    </motion.div>
  );
};

// 🎯 MINIMAL LEVEL PROGRESS
const MinimalProgress = ({ stats }: { stats: UserStats }) => {
  const levelName = (level: number) => {
    if (level >= 10) return 'Legend';
    if (level >= 7) return 'Expert';
    if (level >= 5) return 'Foodie';
    if (level >= 3) return 'Explorer';
    return 'Newbie';
  };

  const picksToNextLevel = Math.ceil((100 - stats.progress_percentage) / 10);

  return (
    <motion.div variants={cardVariants}>
      <Card className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold text-[#1A1A1A]">
            Level {stats.level} — {levelName(stats.level)}
          </h3>
          <span className="text-[12px] font-medium text-[#6F6F6F]">
            {Math.round(stats.progress_percentage)}%
          </span>
        </div>

        <div className="relative h-2 bg-[#E5E5EA] rounded-full overflow-hidden mb-2.5">
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full bg-[#1A1A1A]"
            initial={{ width: 0 }}
            animate={{ width: `${stats.progress_percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          />
        </div>

        <p className="text-[12px] text-[#6F6F6F]">
          {picksToNextLevel} more picks to next level
        </p>
      </Card>
    </motion.div>
  );
};

// 🎯 MINIMAL SETTINGS
const MinimalSettings = ({ onNavigate, onLogout }: { onNavigate: (route: string) => void; onLogout: () => void }) => {
  const settings = [
    { icon: Bell, label: 'Notifications', route: 'notifications' },
    { icon: Lock, label: 'Privacy', route: 'security' },
    { icon: Globe, label: 'Language', route: 'language' },
    { icon: CreditCard, label: 'Payments', route: 'payments' },
    { icon: HelpCircle, label: 'Support', route: 'support' }
  ];

  return (
    <motion.div variants={cardVariants}>
      <Card className="bg-white rounded-2xl overflow-hidden border border-[#E5E5EA] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {settings.map((setting, index) => (
          <button
            key={setting.label}
            onClick={() => onNavigate(setting.route)}
            className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#F8F9FB] transition-colors ${
              index !== settings.length - 1 ? 'border-b border-[#E5E5EA]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <setting.icon size={18} strokeWidth={2} className="text-[#6F6F6F]" />
              <span className="text-[14px] text-[#1A1A1A]">{setting.label}</span>
            </div>
            <ChevronRight size={16} strokeWidth={2} className="text-[#C7C7CC]" />
          </button>
        ))}

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-4 py-3.5 border-t border-[#E5E5EA] hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut size={18} strokeWidth={2} className="text-[#FF3B30]" />
            <span className="text-[14px] font-medium text-[#FF3B30]">Sign Out</span>
          </div>
        </button>
      </Card>
    </motion.div>
  );
};

// 🍎 MAIN MINIMAL COMPONENT
export default function UserProfileMinimal() {
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

      if (userData) setUser(userData);

      // Load stats from user_stats table
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', authUser.id)
        .single();

      if (statsData && !statsError) {
        setStats({
          total_reservations: statsData.total_reservations || 0,
          money_saved: statsData.total_money_saved || 0,
          current_streak: statsData.current_streak_days || 0,
          successful_referrals: statsData.total_referrals || 0,
          level: userData?.level || 1,
          progress_percentage: 0
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
    console.log('Navigate to:', route);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#1A1A1A] border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <div className="h-11" />

      <motion.div
        className="px-4 pb-32"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-3">
          <MinimalHeader user={user} />
          <MinimalActions onNavigate={handleNavigate} />
          <MinimalStats stats={stats} />
          <MinimalProgress stats={stats} />
          <MinimalSettings onNavigate={handleNavigate} onLogout={handleLogout} />
        </div>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0">
        <BottomNavPremium onCenterClick={() => navigate('/')} />
      </div>
    </div>
  );
}
