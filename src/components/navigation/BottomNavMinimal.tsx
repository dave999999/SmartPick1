/**
 * BottomNavMinimal - Ultra-Clean Flat Navigation
 * 
 * 🎨 DESIGN PHILOSOPHY:
 * - Ultra-clean, borderless, maximum content focus
 * - Flat design with no shadows or rounded corners
 * - Minimal visual weight for power users
 * - Inline center button (not floating)
 * - Icon-only interface (no labels)
 * 
 * 📐 SPECIFICATIONS:
 * - Container: Flat, no rounded corners, top border only
 * - Height: 64px navigation bar
 * - Center Button: 48px diameter, inline with other icons
 * - Icons: 24px, stroke 2px
 * - No labels, no shadows, no gradients
 * - Safe Area: max(env(safe-area-inset-bottom), 8px)
 * 
 * 🎯 INTERACTION:
 * - Center button: scale 1.1 on hover, 0.9 on tap
 * - Tab selection: icon color change only
 * - Minimal animations: simple scale feedback
 * - Instant response: no spring physics
 * 
 * Built with: React + Framer Motion + Lucide Icons + Tailwind
 */

import { Home, Heart, Plus, User, Menu } from 'lucide-react';
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

interface BottomNavMinimalProps {
  onCenterClick?: () => void;
}

export function BottomNavMinimal({ onCenterClick }: BottomNavMinimalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const tabs = [
    { id: 'home', path: '/', icon: Home },
    { id: 'favorites', path: '/favorites', icon: Heart },
    { id: 'center', path: null, icon: Plus },
    { id: 'profile', path: '/profile', icon: User },
    { id: 'menu', path: null, icon: Menu },
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
      <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="pb-safe bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between h-[64px] px-4">
            {tabs.map((tab) => {
              if (tab.id === 'center') {
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => {
                      triggerHaptic('medium');
                      onCenterClick?.();
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="
                      w-[48px] h-[48px]
                      rounded-full
                      bg-[#FF7A00]
                      flex items-center justify-center
                      shadow-sm
                      hover:shadow-md
                      active:shadow-none
                      transition-shadow duration-200
                    "
                    aria-label="Add Offer"
                  >
                    <Plus size={24} className="text-white" strokeWidth={2.5} />
                  </motion.button>
                );
              }

              const TabIcon = tab.icon;
              const active = tab.path ? isActive(tab.path) : false;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center justify-center w-[48px] h-[48px]"
                  aria-label={tab.id}
                >
                  <TabIcon
                    size={24}
                    strokeWidth={2}
                    className={`
                      transition-colors duration-200
                      ${active ? 'text-[#FF7A00]' : 'text-gray-400 dark:text-gray-500'}
                    `}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>

        <style>{`
          .pb-safe {
            padding-bottom: max(env(safe-area-inset-bottom), 8px);
          }
        `}</style>
      </nav>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
