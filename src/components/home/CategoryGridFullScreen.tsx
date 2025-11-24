import { X } from 'lucide-react';
import { getAllCategories } from '@/lib/categories';
import { useI18n } from '@/lib/i18n';

interface CategoryGridFullScreenProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onCategorySelect: (category: string) => void;
}

export function CategoryGridFullScreen({
  isOpen,
  onClose,
  selectedCategory,
  onCategorySelect,
}: CategoryGridFullScreenProps) {
  const { t } = useI18n();
  const allCategories = getAllCategories();

  if (!isOpen) return null;

  return (
    <div 
      className="
        fixed inset-0 z-50 
        bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a]
        overflow-y-auto
        animate-in fade-in-0 slide-in-from-bottom-4
      "
      style={{ paddingBottom: 'max(80px, env(safe-area-inset-bottom) + 80px)' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-[#0a0a0a] to-transparent backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-2xl font-bold text-white">All Categories</h2>
          <button
            onClick={onClose}
            className="
              w-10 h-10 
              flex items-center justify-center 
              rounded-full 
              bg-white/10 hover:bg-white/20 
              transition-colors
              active:scale-95
            "
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* All Categories Grid */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-4">
          {allCategories.map((category) => {
            const isActive = selectedCategory === category.value;
            
            return (
              <button
                key={category.value}
                onClick={() => {
                  onCategorySelect(isActive ? '' : category.value);
                  onClose();
                }}
                className={`
                  relative flex flex-col items-center gap-3 p-4
                  rounded-2xl
                  transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 scale-105' 
                    : 'bg-gradient-to-br from-slate-700 to-slate-800 hover:scale-105 hover:shadow-md'
                  }
                `}
              >
                {/* Icon */}
                <div className={`
                  w-14 h-14 
                  flex items-center justify-center 
                  rounded-xl
                  ${isActive ? 'bg-white/20' : 'bg-white/10'}
                `}>
                  <img 
                    src={`/icons/categories/${category.value}.png`}
                    alt={category.label}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                </div>

                {/* Label */}
                <span className={`
                  text-xs font-medium text-center leading-tight
                  ${isActive ? 'text-white' : 'text-gray-300'}
                `}>
                  {t(category.labelKey)}
                </span>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#37E5AE] rounded-full border-2 border-[#0a0a0a] flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
