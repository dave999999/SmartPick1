/**
 * BottomNavBar - Premium Apple-Style Floating 3D Glass Dock
 * 
 * 🎨 VisionOS-INSPIRED DESIGN
 * Floating glass dock with frosted backdrop blur, superellipse radius,
 * and cosmic orange 3D center bubble. World-class premium aesthetic.
 * 
 * 📐 SPECIFICATIONS:
 * - Dock: 64px height, rounded-[28px] superellipse, backdrop-blur-xl
 * - Material: bg-white/20, border-white/30, floating shadow
 * - Center Button: 72px bubble (64px on small screens), gradient glow
 * - Icons: 2px stroke, thin outline, Apple-style rounded
 * - Active State: glowing glass capsule with orange accent
 * - Spacing: Perfectly centered, 8-10px float above map
 * 
 * 🌟 INTERACTIONS:
 * - Center bubble: bubbleTap animation (180ms glow pulse)
 * - Active tabs: soft upward lift, glowing capsule background
 * - Haptic feedback: 10ms vibration on tap
 * - Small screen: scales to 90% width, reduces center button to 64px
 * 
 * Built with: React + Framer Motion + Lucide Icons + Tailwind
 */

import { Home, Heart, Sparkles, User, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { MenuDrawer } from '../MenuDrawer';

// Haptic feedback utility (10ms vibration)
const triggerHaptic = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
};

interface BottomNavBarProps {
  onCenterClick?: () => void;
}

export function BottomNavBar({ onCenterClick }: BottomNavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [centerPressed, setCenterPressed] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const tabs = [
    { id: 'home', path: '/', icon: Home, label: 'Home' },
    { id: 'favorites', path: '/favorites', icon: Heart, label: 'Saved' },
    { id: 'center', path: null, icon: Sparkles, label: 'Offers' },
    { id: 'profile', path: '/profile', icon: User, label: 'Profile' },
    { id: 'menu', path: null, icon: Menu, label: 'Menu' },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    triggerHaptic();
    if (tab.id === 'menu') {
      setMenuOpen(true);
    } else if (tab.path) {
      navigate(tab.path);
    }
  };

  const handleCenterClick = () => {
    triggerHaptic();
    setCenterPressed(true);
    setTimeout(() => setCenterPressed(false), 180);
    onCenterClick?.();
  };

  return (
    <>
      {/* Floating 3D Glass Dock */}
      <nav className="fixed bottom-4 left-0 right-0 z-50 pointer-events-none px-4">
        <div className="relative max-w-md mx-auto pointer-events-auto">
          {/* Glass Dock Container */}
          <div
            className="
              h-[64px]
              px-5
              rounded-[28px]
              backdrop-blur-xl
              bg-white/20
              border border-white/30
              shadow-[0_8px_25px_rgba(0,0,0,0.12)]
              relative
              flex items-center justify-between
              transition-all duration-300
              max-[360px]:w-[90%] max-[360px]:mx-auto
            "
            style={{
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            }}
          >
            {/* Navigation Tabs */}
            {tabs.map((tab, index) => {
              if (tab.id === 'center') {
                return (
                  <div key={tab.id} className="relative flex items-center justify-center -translate-y-2">
                    {/* SmartPick Icon Button */}
                    <motion.button
                      onClick={handleCenterClick}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      animate={{ 
                        y: [0, -8, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={`
                        flex items-center justify-center
                        transition-all duration-200
                        ${centerPressed ? 'animate-bubbleTap' : ''}
                      `}
                      aria-label="Search Offers"
                    >
                      <img 
                        src="/favicon_io/smartpick icon.ico" 
                        alt="SmartPick"
                        className="w-[160px] h-auto max-[360px]:w-[140px]"
                      />
                    </motion.button>
                  </div>
                );
              }

              return (
                <GlassDockTab
                  key={tab.id}
                  icon={tab.icon}
                  label={tab.label}
                  isActive={tab.path ? isActive(tab.path) : false}
                  onClick={() => handleTabClick(tab)}
                />
              );
            })}
          </div>

          {/* Subtle refraction hint overlay */}
          <div 
            className="absolute inset-0 rounded-[28px] pointer-events-none opacity-20"
            style={{
              background: 'linear-gradient(135deg, rgba(166,217,205,0.1) 0%, rgba(255,138,0,0.05) 100%)',
            }}
          />
        </div>
      </nav>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

// ============================================
// GLASS DOCK TAB COMPONENT
// ============================================

interface GlassDockTabProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function GlassDockTab({ icon: Icon, label, isActive, onClick }: GlassDockTabProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className="
        flex flex-col items-center justify-center
        relative
        px-2
        h-full
        group
      "
      aria-label={label}
    >
      {/* Glowing Glass Capsule (Active State) */}
      {isActive && (
        <motion.div
          layoutId="activeGlassTab"
          className="
            absolute inset-0
            bg-white/40
            backdrop-blur-md
            rounded-xl
            shadow-sm
            px-3 py-1
          "
          transition={{ 
            type: 'spring', 
            stiffness: 500, 
            damping: 35,
            mass: 0.8
          }}
        />
      )}

      {/* Icon with Lift Effect */}
      <motion.div
        animate={{
          y: isActive ? -2 : 0,
        }}
        transition={{ 
          type: 'spring', 
          stiffness: 400, 
          damping: 25 
        }}
        className={`
          relative z-10
          transition-colors duration-200
          ${isActive ? 'text-[#FF7A00]' : 'text-neutral-400'}
        `}
      >
        <Icon size={22} strokeWidth={2} />
      </motion.div>

      {/* Label */}
      <motion.span
        animate={{
          opacity: isActive ? 1 : 0.7,
        }}
        className={`
          text-[10px] font-medium mt-1 relative z-10
          transition-colors duration-200
          max-[360px]:text-[9px]
          ${isActive ? 'text-[#FF7A00]' : 'text-neutral-400'}
        `}
      >
        {label}
      </motion.span>
    </motion.button>
  );
}

// Export as BottomNavPremium for backwards compatibility
export { BottomNavBar as BottomNavPremium };
