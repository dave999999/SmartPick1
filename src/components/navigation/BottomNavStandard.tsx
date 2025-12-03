/**
 * BottomNavStandard - Clean White Professional Navigation
 * 
 * 🎨 DESIGN PHILOSOPHY:
 * - Clean, professional, universal appeal
 * - Solid white background with subtle shadow
 * - Standard floating center button (56px)
 * - Clear active indicators with smooth animations
 * - Perfect for broad audience and older devices
 * 
 * 📐 SPECIFICATIONS:
 * - Container: rounded-[24px], bg-white, shadow-soft
 * - Height: 68px navigation bar
 * - Center Button: 56px diameter, -28px top offset
 * - Icons: 24px, stroke 2px
 * - Labels: 10px font-medium, color-transition 200ms
 * - Safe Area: max(env(safe-area-inset-bottom), 12px)
 * 
 * 🎯 INTERACTION:
 * - Center button: scale 1.08 on hover, 0.92 on tap
 * - Tab selection: scale 1.1, y-offset -2px, spring transition
 * - Active indicator: 32px width bottom line
 * - Smooth color transitions: 200ms duration
 * 
 * Built with: React + Framer Motion + Lucide Icons + Tailwind
 */

import { Home, Heart, Sparkles, User, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { MenuDrawer } from '../MenuDrawer';

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 20]
    };
    navigator.vibrate(patterns[style]);
  }
  if ('Haptics' in window && (window as any).Haptics) {
    const hapticStyles = {
      light: 'impactLight',
      medium: 'impactMedium',
      heavy: 'impactHeavy'
    };
    (window as any).Haptics.impact({ style: hapticStyles[style] });
  }
};

interface BottomNavStandardProps {
  onCenterClick?: () => void;
}

export function BottomNavStandard({ onCenterClick }: BottomNavStandardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const tabs = [
    { id: 'home', path: '/', icon: Home, label: 'Home' },
    { id: 'favorites', path: '/favorites', icon: Heart, label: 'Saved' },
    { id: 'center', path: null, icon: Sparkles, label: 'Offers' },
    { id: 'profile', path: '/profile', icon: User, label: 'Profile' },
    { id: 'menu', path: null, icon: Menu, label: 'Menu' },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.id === 'menu') {
      setMenuOpen(true);
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        {/* Safe Area Container */}
        <div className="pb-safe pointer-events-none">
          {/* Navigation Container */}
          <div 
            className="
              mx-3 mb-3
              bg-white
              dark:bg-gray-900
              rounded-[24px]
              shadow-[0_4px_16px_rgba(0,0,0,0.08)]
              dark:shadow-[0_4px_16px_rgba(0,0,0,0.30)]
              border border-gray-100
              dark:border-gray-800
              relative
              h-[68px]
              pointer-events-auto
            "
          >
            {/* Tab Grid */}
            <div className="flex items-center justify-between h-full px-3">
              {tabs.map((tab) => {
                if (tab.id === 'center') {
                  return (
                    <div key={tab.id} className="relative flex items-center justify-center w-[72px]">
                      {/* Floating Center Button */}
                      <motion.button
                        onClick={() => {
                          triggerHaptic('medium');
                          onCenterClick?.();
                        }}
                        initial={{ scale: 0, y: 10 }}
                        animate={{ 
                          scale: 1, 
                          y: 0,
                          transition: {
                            type: 'spring',
                            stiffness: 300,
                            damping: 20,
                            delay: 0.2
                          }
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        className="
                          absolute -top-[28px]
                          w-[56px] h-[56px]
                          rounded-full
                          bg-gradient-to-br from-[#FF8A00] to-[#FF6B00]
                          shadow-[0_4px_16px_rgba(255,138,0,0.30)]
                          hover:shadow-[0_6px_24px_rgba(255,138,0,0.45)]
                          active:shadow-[0_2px_8px_rgba(255,138,0,0.25)]
                          flex items-center justify-center
                          transition-shadow duration-300
                        "
                        aria-label="Search Offers"
                      >
                        <Sparkles size={28} className="text-white" strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  );
                }

                return (
                  <TabButton
                    key={tab.id}
                    icon={tab.icon}
                    label={tab.label}
                    isActive={tab.path ? isActive(tab.path) : false}
                    onClick={() => handleTabClick(tab)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <style>{`
          .pb-safe {
            padding-bottom: max(env(safe-area-inset-bottom), 12px);
          }
        `}</style>
      </nav>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

// ============================================
// TAB BUTTON COMPONENT
// ============================================

interface TabButtonProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ icon: Icon, label, isActive, onClick }: TabButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      className="
        flex flex-col items-center justify-center
        min-w-[56px] h-full
        relative
      "
      aria-label={label}
    >
      {/* Icon */}
      <motion.div
        animate={{
          scale: isActive ? 1.1 : 1,
          y: isActive ? -2 : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className={`
          transition-colors duration-200
          ${isActive ? 'text-[#FF7A00]' : 'text-gray-600 dark:text-gray-400'}
        `}
      >
        <Icon size={24} strokeWidth={2} />
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{
          opacity: isActive ? 1 : 0.7,
          y: isActive ? 0 : 1,
        }}
        transition={{ duration: 0.2 }}
        className={`
          text-[10px] font-medium mt-1
          transition-colors duration-200
          ${isActive ? 'text-[#FF7A00]' : 'text-gray-600 dark:text-gray-400'}
        `}
      >
        {label}
      </motion.span>

      {/* Active Indicator Line */}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute -bottom-1 w-8 h-0.5 bg-[#FF7A00] rounded-full"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
