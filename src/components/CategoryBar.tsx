import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { BusinessType } from '@/lib/types';

interface CategoryBarProps {
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

interface Category {
  value: string;
  emoji: string;
  labelKey: string;
}

const CATEGORIES: Category[] = [
  { value: '', emoji: '🌍', labelKey: 'category.All' },
  { value: 'BAKERY', emoji: '🥐', labelKey: 'category.BAKERY' },
  { value: 'CAFE', emoji: '☕', labelKey: 'category.CAFE' },
  { value: 'RESTAURANT', emoji: '🍽️', labelKey: 'category.RESTAURANT' },
  { value: 'FAST_FOOD', emoji: '🍔', labelKey: 'category.FAST_FOOD' },
  { value: 'ALCOHOL', emoji: '🍷', labelKey: 'category.ALCOHOL' },
  { value: 'GROCERY', emoji: '🛒', labelKey: 'category.GROCERY' },
];

export default function CategoryBar({ selectedCategory, onCategorySelect }: CategoryBarProps) {
  const { t } = useI18n();

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Mobile: Horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category.value;

            return (
              <Button
                key={category.value}
                onClick={() => onCategorySelect(category.value)}
                variant={isActive ? 'default' : 'outline'}
                className={`
                  flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-all
                  ${isActive
                    ? 'bg-[#4CC9A8] text-white border-[#4CC9A8] hover:bg-[#3BA890] shadow-md'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-[#E8F9F4] hover:border-[#4CC9A8]'
                  }
                `}
              >
                <span className="text-lg">{category.emoji}</span>
                <span className="font-medium text-sm whitespace-nowrap">
                  {t(category.labelKey)}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
