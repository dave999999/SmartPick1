/**
 * CategoryRow.tsx
 * Horizontal scrolling category pills - Using SmartPick 12 categories
 */

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { getAllCategories, MainCategory } from '@/lib/categories';

interface CategoryRowProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const ALL_CATEGORY = {
  value: 'ALL',
  label: 'All',
  emoji: '🌟',
  iconName: 'all',
  labelKey: 'category.ALL',
};

const CATEGORIES = [ALL_CATEGORY, ...getAllCategories()];

export function CategoryRow({ selectedCategory, onSelectCategory }: CategoryRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative">
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth px-4"
      >
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.value;
          
          return (
            <button
              key={category.value}
              onClick={() => onSelectCategory(category.value)}
              className={cn(
                "flex-shrink-0 snap-start",
                "flex flex-col items-center justify-center gap-1.5",
                "w-20 h-[72px] rounded-2xl",
                "transition-all duration-200 active:scale-95",
                isSelected ? [
                  "bg-[#FF6B35] shadow-[0_2px_8px_rgba(255,107,53,0.3)]",
                ] : [
                  "bg-[#F5F5F5] active:bg-[#E8E8E8]",
                ]
              )}
            >
              <span 
                className={cn(
                  "text-2xl transition-all",
                  isSelected && "scale-110"
                )}
              >
                {category.emoji}
              </span>
              <span 
                className={cn(
                  "text-[10px] font-medium leading-tight text-center px-1 line-clamp-2",
                  isSelected ? "text-white" : "text-[#6B6B6B]"
                )}
              >
                {category.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Fade effect at edges */}
      <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-white to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  );
}
