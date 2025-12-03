/**
 * BottomNavPremium - Premium iOS-Style Glassmorphism Navigation
 * 
 * 🎨 DESIGN PHILOSOPHY:
 * - Maximum iOS aesthetic with frosted glass blur
 * - Ultra-premium feel matching Uber Eats / Wolt / Apple Wallet
 * - Translucent backdrop-blur with 18px blur radius
 * - Large floating center button (60px) with glow effect
 * - Spring-based micro-animations (60fps)
 * - Perfect spacing: 2px margin, 16px safe area
 * 
 * 📐 SPECIFICATIONS:
 * - Container: rounded-[28px], backdrop-blur-[18px], bg-white/75
 * - Height: 72px navigation bar
 * - Center Button: 60px diameter, -32px top offset, shadow glow
 * - Icons: 24px (inactive), 30px (center), stroke 2-2.5px
 * - Labels: 10px font-semibold, color-transition 200ms
 * - Safe Area: max(env(safe-area-inset-bottom), 16px)
 * 
 * 🎯 INTERACTION:
 * - Floating button: scale 1.12 on hover, rotate ±5deg on tap
 * - Tab selection: scale 1.15, y-offset -3px, spring transition
 * - Active pill: layoutId animation with backdrop-blur-sm
 * - Ripple feedback: iOS-style tap response
 * 
 * Built with: React + Framer Motion + Lucide Icons + Tailwind
 */

import { Home, Heart, Sparkles, User, Menu } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { MenuDrawer } from '../MenuDrawer';

// Haptic feedback utility
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    // Vibration API for Android and modern browsers
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 20]
    };
    navigator.vibrate(patterns[style]);
  }
  
  // iOS Haptic Feedback API (if available)
  if ('Haptics' in window && (window as any).Haptics) {
    const hapticStyles = {
      light: 'impactLight',
      medium: 'impactMedium',
      heavy: 'impactHeavy'
    };
    (window as any).Haptics.impact({ style: hapticStyles[style] });
  }
};

interface BottomNavPremiumProps {
  onCenterClick?: () => void;
}

export function BottomNavPremium({ onCenterClick }: BottomNavPremiumProps) {
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
        <div className="relative pointer-events-none">
          {/* Glassmorphism Container */}
          <div 
            className="
              backdrop-blur-[18px]
              bg-white/75
              dark:bg-gray-900/85
              shadow-[0_4px_16px_rgba(0,0,0,0.08)]
              dark:shadow-[0_4px_16px_rgba(0,0,0,0.30)]
              border-t border-white/20
              dark:border-gray-800/30
              relative
              h-[56px]
              pointer-events-auto
            "
            style={{
              backdropFilter: 'blur(18px) saturate(180%)',
              WebkitBackdropFilter: 'blur(18px) saturate(180%)',
            }}
          >
            {/* Tab Grid */}
            <div className="flex items-center justify-between h-full px-3">
              {tabs.map((tab) => {
                if (tab.id === 'center') {
                  return (
                    <div key={tab.id} className="relative flex items-center justify-center">
                      {/* Center Button */}
                      <motion.button
                        onClick={() => {
                          triggerHaptic('medium');
                          onCenterClick?.();
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="
                          w-[44px] h-[44px]
                          rounded-full
                          bg-gradient-to-br from-[#FF8A00] via-[#FF7A00] to-[#FF6B00]
                          shadow-lg shadow-orange-500/25
                          flex items-center justify-center
                          transition-shadow duration-300
                        "
                        aria-label="Search Offers"
                      >
                        <Sparkles 
                          size={22} 
                          className="text-white" 
                          strokeWidth={2.5} 
                        />
                      </motion.button>
                    </div>
                  );
                }

                return (
                  <GlassTabButton
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
            padding-bottom: max(env(safe-area-inset-bottom), 16px);
          }

          @supports (backdrop-filter: blur(18px)) {
            .backdrop-blur-\\[18px\\] {
              backdrop-filter: blur(18px) saturate(180%);
              -webkit-backdrop-filter: blur(18px) saturate(180%);
            }
          }

          /* Fallback for browsers without backdrop-filter support */
          @supports not (backdrop-filter: blur(18px)) {
            .backdrop-blur-\\[18px\\] {
              background-color: rgba(255, 255, 255, 0.95);
            }
            .dark .backdrop-blur-\\[18px\\] {
              background-color: rgba(17, 17, 17, 0.95);
            }
          }
        `}</style>
      </nav>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

// ============================================
// GLASS TAB BUTTON COMPONENT
// ============================================

interface GlassTabButtonProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function GlassTabButton({ icon: Icon, label, isActive, onClick }: GlassTabButtonProps) {
  const scale = useMotionValue(1);
  const opacity = useTransform(scale, [1, 1.1], [0.7, 1]);
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const addRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setRipples([...ripples, { x, y, id: Date.now() }]);
    
    setTimeout(() => {
      setRipples((prev) => prev.slice(1));
    }, 600);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(e);
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.9 }}
      onHoverStart={() => scale.set(1.05)}
      onHoverEnd={() => scale.set(1)}
      className="
        flex flex-col items-center justify-center
        min-w-[50px] h-full
        relative
        overflow-hidden
      "
      aria-label={label}
    >
      {/* Ripple Effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-[#FF7A00]/20 pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ width: 0, height: 0, x: 0, y: 0 }}
          animate={{ 
            width: 80, 
            height: 80, 
            x: -40, 
            y: -40, 
            opacity: [0.5, 0] 
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Background Pill (Active State) */}
      {isActive && (
        <motion.div
          layoutId="glassActiveTab"
          className="absolute inset-0 mx-auto w-[44px] rounded-full bg-[#FF7A00]/10 dark:bg-[#FF7A00]/20 backdrop-blur-sm"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      {/* Icon */}
      <motion.div
        animate={{
          scale: isActive ? 1.1 : 1,
          y: isActive ? -3 : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          relative z-10
          transition-colors duration-200
          ${isActive ? 'text-[#FF7A00]' : 'text-gray-500 dark:text-gray-400'}
        `}
      >
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
      </motion.div>

      {/* Label */}
      <motion.span
        style={{ opacity }}
        className={`
          text-[9px] font-semibold mt-0.5 relative z-10
          transition-colors duration-200
          ${isActive ? 'text-[#FF7A00]' : 'text-gray-500 dark:text-gray-400'}
        `}
      >
        {label}
      </motion.span>
    </motion.button>
  );
}
