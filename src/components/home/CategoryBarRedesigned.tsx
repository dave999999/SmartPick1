import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { getAllCategories } from '@/lib/categories';
import { MoreHorizontal } from 'lucide-react';
import { CategoryGridFullScreen } from './CategoryGridFullScreen';

interface CategoryBarRedesignedProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

// Core 7 categories to show in bar
const CORE_CATEGORIES = [
  'RESTAURANT',
  'FAST_FOOD',
  'BAKERY',
  'DESSERTS_SWEETS',
  'DRINKS_JUICE',
  'GROCERY',
  'CAFE'
];

export function CategoryBarRedesigned({ selectedCategory, onCategorySelect }: CategoryBarRedesignedProps) {
  const { t } = useI18n();
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  const allCategories = getAllCategories();
  const coreCategories = allCategories.filter(cat => CORE_CATEGORIES.includes(cat.value));
  
  const renderCategoryIcon = (category: typeof allCategories[0], isActive: boolean) => (
    <button
      key={category.value}
      onClick={() => {
        onCategorySelect(isActive ? '' : category.value);
      }}
      className={`
        relative flex-shrink-0 flex items-center justify-center 
        w-[44px] h-[44px] rounded-full
        transition-all duration-300
        ${isActive 
          ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 scale-110' 
          : 'bg-white/10 backdrop-blur-md hover:bg-white/20 hover:scale-105'
        }
      `}
      aria-label={t(category.labelKey)}
    >
      {/* Orange glow ring for active */}
      {isActive && (
        <div className="absolute inset-0 rounded-full ring-4 ring-orange-500/40 animate-pulse" />
      )}
      
      {/* Custom Category Icon */}
      <img 
        src={`/icons/categories/${category.value}.png`}
        alt={category.label}
        className={`w-8 h-8 object-cover ${isActive ? 'scale-110 brightness-110' : ''} transition-transform`}
        style={{ borderRadius: '6px' }}
      />
      
      {/* Micro-animation dot */}
      {isActive && (
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#37E5AE] rounded-full border-2 border-[#0a0a0a] animate-bounce" />
      )}
    </button>
  );

  return (
    <>
      {/* Category Bar - Glassmorphism Style */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#0a0a0a] via-[#0f0f0f]/95 to-transparent backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            {/* Core 7 Categories */}
            {coreCategories.map(cat => renderCategoryIcon(cat, selectedCategory === cat.value))}

            {/* More Button */}
            <button
              onClick={() => setShowAllCategories(true)}
              className="
                flex-shrink-0 flex items-center justify-center
                w-[44px] h-[44px] rounded-full
                bg-white/10 backdrop-blur-md
                hover:bg-white/20
                transition-all duration-300 hover:scale-105
                border border-white/10
              "
              aria-label="Show all categories"
            >
              <MoreHorizontal className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Full Category Grid Modal */}
      <CategoryGridFullScreen
        isOpen={showAllCategories}
        onClose={() => setShowAllCategories(false)}
        selectedCategory={selectedCategory}
        onCategorySelect={onCategorySelect}
      />

      <style>{`
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px rgba(255, 138, 0, 0.6));
        }
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
