/**
 * LIGHT EMOJI CATEGORY BAR
 * Clean design with emoji icons matching reference image
 */

import { useState } from 'react';
import { getAllCategories } from '@/lib/categories';
import { MoreHorizontal } from 'lucide-react';
import { CategoryGridFullScreen } from './CategoryGridFullScreen';

interface CategoryBarProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export function CategoryBar({ selectedCategory, onCategorySelect }: CategoryBarProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  const allCategories = getAllCategories();
  
  const renderCategoryPill = (category: typeof allCategories[0]) => {
    const isActive = selectedCategory === category.value;
    const emoji = category.emoji;
    const label = category.label;
    
    return (
      <button
        key={category.value}
        onClick={() => onCategorySelect(isActive ? '' : category.value)}
        className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200"
        style={{
          background: isActive ? '#FFE8E0' : '#F5F5F5',
          border: 'none',
          boxShadow: 'none',
        }}
      >
        <span className="text-xl">{emoji}</span>
        <span 
          className="text-sm font-medium whitespace-nowrap"
          style={{
            color: isActive ? '#FF5722' : '#666666'
          }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        {/* Horizontal scrollable categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {allCategories.map(renderCategoryPill)}
        </div>
      </div>

      {/* Full Screen Category Grid Modal */}
      {showAllCategories && (
        <CategoryGridFullScreen
          onClose={() => setShowAllCategories(false)}
          onCategorySelect={(category) => {
            onCategorySelect(category);
            setShowAllCategories(false);
          }}
          selectedCategory={selectedCategory}
        />
      )}

      {/* Scoped Styles */}
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
