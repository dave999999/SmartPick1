/**
 * REFACTORED: Premium Dark Category Bar
 * Glassy scrollable category pills with soft neon glow on active state
 * Shows 6-7 core categories + More button
 */

import { useState } from 'react';
import { getAllCategories } from '@/lib/categories';
import { MoreHorizontal } from 'lucide-react';
import { CategoryGridFullScreen } from './CategoryGridFullScreen';

interface CategoryBarProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const CORE_CATEGORIES = [
  'RESTAURANT',
  'FAST_FOOD',
  'BAKERY',
  'DESSERTS_SWEETS',
  'DRINKS_JUICE',
  'GROCERY',
  'CAFE'
];

export function CategoryBar({ selectedCategory, onCategorySelect }: CategoryBarProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  const allCategories = getAllCategories();
  const coreCategories = allCategories.filter(cat => CORE_CATEGORIES.includes(cat.value));
  
  const renderCategoryPill = (category: typeof allCategories[0]) => {
    const isActive = selectedCategory === category.value;
    
    return (
      <button
        key={category.value}
        onClick={() => onCategorySelect(isActive ? '' : category.value)}
        className={`
          relative flex-shrink-0 flex flex-col items-center justify-center gap-1
          w-[56px] h-[56px] rounded-full
          transition-all duration-200 ease-out
          ${isActive 
            ? 'bg-gradient-to-br from-sp-surface2 to-sp-surface1 scale-105 shadow-[0_0_18px_rgba(255,138,48,0.3)]' 
            : 'bg-sp-surface-glass backdrop-blur-md hover:bg-white/5 hover:scale-105'
          }
          border ${isActive ? 'border-sp-accent-orange-soft' : 'border-sp-border-soft'}
        `}
        aria-label={category.label}
      >
        {/* Glow ring for active */}
        {isActive && (
          <div className="absolute inset-0 rounded-full ring-2 ring-sp-accent-orange opacity-60 animate-pulse" />
        )}
        
        {/* Icon */}
        <div className={`relative ${isActive ? 'scale-110' : ''} transition-transform`}>
          <img 
            src={`/icons/categories/${category.value}.png`}
            alt={category.label}
            className="w-[32px] h-[32px] object-contain"
            style={{ 
              filter: isActive 
                ? 'brightness(1.2) drop-shadow(0 2px 8px rgba(255,138,48,0.4))' 
                : 'brightness(0.95) drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
            }}
          />
        </div>
        
        {/* Active indicator */}
        {isActive && (
          <div className="absolute -bottom-1 w-2 h-2 bg-sp-accent-mint rounded-full border-2 border-sp-bg animate-bounce" />
        )}
      </button>
    );
  };

  return (
    <>
      <div className="relative w-full bg-sp-surface-glass backdrop-blur-xl border-b border-sp-border-soft py-3 px-4">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {coreCategories.map(cat => renderCategoryPill(cat))}

          {/* More Button */}
          <button
            onClick={() => setShowAllCategories(true)}
            className="
              flex-shrink-0 flex items-center justify-center
              w-[56px] h-[56px] rounded-full
              bg-sp-surface-glass backdrop-blur-md
              border border-sp-border-soft
              hover:bg-white/5 hover:scale-105
              transition-all duration-200
            "
            aria-label="Show all categories"
          >
            <MoreHorizontal className="w-6 h-6 text-sp-text-secondary" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <CategoryGridFullScreen
        isOpen={showAllCategories}
        onClose={() => setShowAllCategories(false)}
        selectedCategory={selectedCategory}
        onCategorySelect={onCategorySelect}
      />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}
