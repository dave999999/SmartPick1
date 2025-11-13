import { useRef, useEffect } from 'react';

interface CategoryTabsProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

const categories = [
  { id: '', label: 'All', emoji: '🌍' },
  { id: 'RESTAURANT', label: 'Restaurant', emoji: '🍽️' },
  { id: 'CAFE', label: 'Café', emoji: '☕' },
  { id: 'BAKERY', label: 'Bakery', emoji: '🍰' },
  { id: 'GROCERY', label: 'Grocery', emoji: '🛍️' },
  { id: 'FAST_FOOD', label: 'Fast Food', emoji: '�' },
  { id: 'ALCOHOL', label: 'Alcohol', emoji: '�' },
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
    <div className="bg-slate-800/60 backdrop-blur-sm border-b border-white/10 sticky top-14 md:top-16 z-40">
      <div className="container mx-auto px-4">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide py-3 scroll-smooth snap-x snap-mandatory"
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
                  flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap
                  transition-all duration-200 snap-center shrink-0
                  ${
                    isActive
                      ? 'bg-[#00C896] text-white shadow-lg shadow-[#00C896]/30 scale-105'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                  }
                `}
              >
                <span className="text-base">{category.emoji}</span>
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
