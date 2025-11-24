import { useRef, useEffect } from 'react';
import { getAllCategories } from '@/lib/categories';

interface CategoryTabsProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const categories = [
  { id: '', label: 'All', emoji: '🌍' },
  ...getAllCategories().map(cat => ({
    id: cat.value,
    label: cat.label,
    emoji: cat.emoji,
  })),
];

export function CategoryTabs({ selectedCategory, onCategorySelect }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && selectedCategory) {
      const activeButton = scrollRef.current.querySelector(`[data-category="${selectedCategory}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedCategory]);

  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-4">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide py-4 scroll-smooth snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                data-category={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`
                  flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap
                  transition-all duration-200 snap-center shrink-0 font-medium
                  ${
                    isActive
                      ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/30'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-lg">{category.emoji}</span>
                <span className="text-sm">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
