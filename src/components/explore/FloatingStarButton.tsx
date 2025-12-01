/**
 * FloatingStarButton - Smart Discovery Button
 * 
 * Transforms based on context:
 * - Default: Opens Explore Sheet
 * - When Explore Open: Shows Sort Menu
 * 
 * Features:
 * - Smooth animations
 * - Radial sort menu
 * - Cosmic orange theme
 * - Spring physics
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MapPin, DollarSign, Clock, Sparkles, X } from 'lucide-react';

type SortOption = 'recommended' | 'nearest' | 'cheapest' | 'expiring' | 'newest';

interface FloatingStarButtonProps {
  exploreOpen: boolean;
  onOpenExplore: () => void;
  onSortChange?: (sort: SortOption) => void;
  currentSort?: SortOption;
}

interface SortMenuItem {
  id: SortOption;
  label: string;
  emoji: string;
  icon: any;
}

const SORT_MENU: SortMenuItem[] = [
  { id: 'recommended', label: 'Recommended', emoji: '⭐', icon: Star },
  { id: 'nearest', label: 'Nearest', emoji: '📍', icon: MapPin },
  { id: 'cheapest', label: 'Cheapest', emoji: '💸', icon: DollarSign },
  { id: 'expiring', label: 'Ending Soon', emoji: '⏳', icon: Clock },
  { id: 'newest', label: 'Newest', emoji: '🆕', icon: Sparkles },
];

export function FloatingStarButton({
  exploreOpen,
  onOpenExplore,
  onSortChange,
  currentSort = 'recommended',
}: FloatingStarButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleMainClick = () => {
    if (exploreOpen) {
      setShowMenu(!showMenu);
    } else {
      onOpenExplore();
    }
  };

  const handleSortSelect = (sort: SortOption) => {
    onSortChange?.(sort);
    setShowMenu(false);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      {/* Menu Items */}
      <AnimatePresence>
        {showMenu && exploreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl p-2 min-w-[200px]"
          >
            <div className="text-xs font-bold text-gray-500 px-3 py-2 uppercase tracking-wide">
              Sort by:
            </div>
            
            {SORT_MENU.map((item) => {
              const Icon = item.icon;
              const isActive = currentSort === item.id;
              
              return (
                <motion.button
                  key={item.id}
                  onClick={() => handleSortSelect(item.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="ml-auto w-2 h-2 bg-white rounded-full"
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        onClick={handleMainClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          exploreOpen && showMenu
            ? 'bg-gray-900'
            : 'bg-gradient-to-r from-orange-500 to-orange-600'
        }`}
        style={{
          boxShadow: exploreOpen && showMenu
            ? '0 10px 30px rgba(0, 0, 0, 0.3)'
            : '0 10px 30px rgba(249, 115, 22, 0.4)',
        }}
      >
        <AnimatePresence mode="wait">
          {exploreOpen && showMenu ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="star"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Star className="w-6 h-6 text-white fill-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse Animation Ring */}
        {!exploreOpen && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-orange-400"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.button>
    </div>
  );
}
