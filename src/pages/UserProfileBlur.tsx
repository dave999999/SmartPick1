// 🍎 Apple-Level Profile - iOS BLUR VARIANT (Ultimate Glassmorphism)
// Translucent frosted surfaces, backdrop-blur-xl, iOS 17+ style

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Coins, Trophy, Users, HelpCircle, Bell, Lock, Globe, CreditCard, ChevronRight, Sparkles, TrendingUp, Calendar, Gift, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/ui/avatar';
import { BottomNavBar as BottomNavPremium } from '../components/navigation/BottomNavBar';

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
    transition: { staggerChildren: 0.07, delayChildren: 0.08 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 450, damping: 32 }
  }
};

// 🎯 BLUR HEADER
const BlurHeader = ({ user }: { user: User }) => {
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
      <div
        className="rounded-[20px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.5)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 ring-2 ring-white/50 shadow-lg">
              <div className="w-full h-full bg-gradient-to-br from-[#FF8A00] via-[#FFB84D] to-[#FFC266] flex items-center justify-center text-white text-xl font-bold">
                {user.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
            </Avatar>
            <div>
              <h1 className="text-[22px] font-semibold text-[#1A1A1A] leading-tight drop-shadow-sm">
                {greeting()}, {user.full_name?.split(' ')[0] || 'User'}!
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px] text-[#6F6F6F] flex items-center gap-1 font-medium">
                  <Sparkles size={14} className="text-[#FF8A00]" />
                  Level {user.level} · {levelName(user.level)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Coins size={12} className="text-[#FF8A00]" />
                <span className="text-[13px] font-semibold text-[#FF8A00]">
                  {user.smart_points} SmartPoints
                </span>
              </div>
            </div>
          </div>
          {user.is_partner && (
            <div
              className="px-3 py-1.5 rounded-full shadow-sm"
              style={{
                background: 'rgba(0, 122, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(0, 122, 255, 0.3)'
              }}
            >
              <span className="text-[11px] font-bold text-[#007AFF] uppercase tracking-wide">
                Partner
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// 🎯 BLUR QUICK ACTIONS
const BlurActions = ({ onNavigate }: { onNavigate: (route: string) => void }) => {
  const actions = [
    { icon: Coins, label: 'Wallet', color: '#FF8A00' },
    { icon: Trophy, label: 'Awards', color: '#34C759' },
    { icon: Users, label: 'Referrals', color: '#007AFF' },
    { icon: HelpCircle, label: 'Support', color: '#FF9500' }
  ];

  return (
    <motion.div variants={cardVariants}>
      <div
        className="rounded-[20px] p-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        style={{
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.5)'
        }}
      >
        <div className="grid grid-cols-4 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.label.toLowerCase())}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/40 active:scale-95 transition-all"
              style={{
                backdropFilter: 'blur(8px)'
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-md"
                style={{
                  background: `linear-gradient(135deg, ${action.color}20 0%, ${action.color}40 100%)`,
                  border: `1px solid ${action.color}30`
                }}
              >
                <action.icon size={22} strokeWidth={2.5} style={{ color: action.color }} />
              </div>
              <span className="text-[11px] font-semibold text-[#1A1A1A]">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// 🎯 BLUR STATS
const BlurStats = ({ stats }: { stats: UserStats }) => {
  const statCards = [
    {
      value: stats.total_reservations,
      label: 'Picks',
      color: '#FF8A00',
      icon: TrendingUp
    },
    {
      value: `₾${stats.money_saved}`,
      label: 'Saved',
      color: '#34C759',
      icon: Coins
    },
    {
      value: `${stats.current_streak}`,
      label: 'Streak',
      color: '#FF9500',
      icon: Calendar
    },
    {
      value: stats.successful_referrals,
      label: 'Friends',
      color: '#007AFF',
      icon: Gift
    }
  ];

  return (
    <motion.div variants={cardVariants}>
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="relative overflow-hidden rounded-[18px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{
              background: `linear-gradient(135deg, ${stat.color}25 0%, ${stat.color}35 100%)`,
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: `1px solid ${stat.color}40`
            }}
          >
            <div className="relative z-10">
              <stat.icon size={20} strokeWidth={2.5} style={{ color: stat.color }} className="mb-2 drop-shadow-sm" />
              <div className="text-[32px] font-bold leading-none mb-1 drop-shadow-sm" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="text-[13px] font-semibold" style={{ color: stat.color }}>
                {stat.label}
              </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full" style={{ background: `${stat.color}15` }} />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// 🎯 BLUR LEVEL PROGRESS
const BlurProgress = ({ stats }: { stats: UserStats }) => {
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
      <div
        className="rounded-[20px] p-5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.5)'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[17px] font-semibold text-[#1A1A1A] flex items-center gap-2">
            <Sparkles size={18} className="text-[#FF8A00]" strokeWidth={2.5} />
            Level {stats.level} — {levelName(stats.level)}
          </h3>
          <span className="text-[13px] font-bold text-[#6F6F6F]">
            {Math.round(stats.progress_percentage)}%
          </span>
        </div>

        <div className="relative h-3 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(0, 0, 0, 0.08)' }}>
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full shadow-md"
            style={{
              background: 'linear-gradient(90deg, #FF8A00 0%, #FFB84D 50%, #34C759 100%)'
            }}
            initial={{ width: 0 }}
            animate={{ width: `${stats.progress_percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>

        <p className="text-[13px] text-[#6F6F6F] font-medium">
          <span className="font-semibold text-[#1A1A1A]">{picksToNextLevel} more picks</span> to next level
        </p>
      </div>
    </motion.div>
  );
};

// 🎯 BLUR SETTINGS
const BlurSettings = ({ onNavigate, onLogout }: { onNavigate: (route: string) => void; onLogout: () => void }) => {
  const settings = [
    { icon: Bell, label: 'Notifications', route: 'notifications' },
    { icon: Lock, label: 'Privacy & Security', route: 'security' },
    { icon: Globe, label: 'Language & Region', route: 'language' },
    { icon: CreditCard, label: 'Payment Methods', route: 'payments' },
    { icon: HelpCircle, label: 'Help & Support', route: 'support' }
  ];

  return (
    <motion.div variants={cardVariants}>
      <div
        className="rounded-[20px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
        style={{
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.5)'
        }}
      >
        {settings.map((setting, index) => (
          <button
            key={setting.label}
            onClick={() => onNavigate(setting.route)}
            className={`w-full flex items-center justify-between px-5 py-4 hover:bg-white/30 transition-all ${
              index !== settings.length - 1 ? 'border-b border-white/40' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <setting.icon size={20} strokeWidth={2} className="text-[#6F6F6F]" />
              <span className="text-[15px] font-medium text-[#1A1A1A]">{setting.label}</span>
            </div>
            <ChevronRight size={18} strokeWidth={2} className="text-[#6F6F6F]" />
          </button>
        ))}

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-between px-5 py-4 border-t border-white/40 hover:bg-red-50/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <LogOut size={20} strokeWidth={2.5} className="text-[#FF3B30]" />
            <span className="text-[15px] font-bold text-[#FF3B30]">Sign Out</span>
          </div>
        </button>
      </div>
    </motion.div>
  );
};

// 🍎 MAIN BLUR COMPONENT
export default function UserProfileBlur() {
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #F8F9FB 0%, #E8EBF0 100%)'
        }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#FF8A00] border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #F8F9FB 0%, #E8EBF0 100%)'
      }}
    >
      <div className="h-11" />

      <motion.div
        className="px-4 pb-32"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="space-y-4">
          <BlurHeader user={user} />
          <BlurActions onNavigate={handleNavigate} />
          <BlurStats stats={stats} />
          <BlurProgress stats={stats} />
          <BlurSettings onNavigate={handleNavigate} onLogout={handleLogout} />
        </div>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0">
        <BottomNavPremium onCenterClick={() => navigate('/')} />
      </div>
    </div>
  );
}
