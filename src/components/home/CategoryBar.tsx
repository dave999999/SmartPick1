/**
 * NEON 3D CATEGORY BAR
 * Matches reference image EXACTLY: cyan neon glow, radial gradients, 3D depth
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
        className="neon-category-circle"
        data-active={isActive}
        aria-label={category.label}
        style={{
          // Dark radial background matching reference
          background: isActive 
            ? 'radial-gradient(circle at center, #161D28 0%, #0A0E15 100%)'
            : 'radial-gradient(circle at center, #0D1219 0%, #050709 100%)',
          
          // Thin cyan neon ring (1.5px)
          border: isActive
            ? '1.5px solid #00F6FF'
            : '1.5px solid rgba(0, 246, 255, 0.25)',
          
          // Subtle outer glow matching reference
          boxShadow: isActive
            ? `
              0 0 10px rgba(0, 246, 255, 0.6),
              0 0 20px rgba(0, 246, 255, 0.3),
              inset 0 2px 4px rgba(0, 0, 0, 0.3)
            `
            : `
              0 0 4px rgba(0, 246, 255, 0.15),
              inset 0 2px 4px rgba(0, 0, 0, 0.3)
            `,
          
          // Smooth transitions
          transition: 'all 0.3s ease-out',
          transform: isActive ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        {/* Icon with strong 3D gradient effect */}
        <div 
          className="neon-icon-wrapper"
          style={{
            position: 'relative',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img 
            src={`/icons/categories/${category.value}.png`}
            alt={category.label}
            className="neon-icon"
            style={{
              width: '48px',
              height: '48px',
              objectFit: 'contain',
              opacity: isActive ? 1 : 0.8,
              // Strong 3D effect: bright top, dark bottom with enhanced contrast
              filter: `
                brightness(${isActive ? 1.4 : 1.2})
                contrast(1.3)
                saturate(1.5)
                drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5))
                drop-shadow(0 -2px 4px rgba(255, 255, 255, 0.08))
              `,
              // Add subtle gradient overlay effect via CSS
              WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,1) 100%)',
              maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,1) 100%)',
              transition: 'all 0.3s ease-out',
              // Active state: scale by 5% more
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        </div>

        {/* Very subtle pulse for active state only */}
        {isActive && (
          <div 
            className="neon-pulse"
            style={{
              position: 'absolute',
              inset: '-1.5px',
              borderRadius: '12px',
              background: 'transparent',
              border: '1px solid rgba(0, 246, 255, 0.3)',
              animation: 'neonPulse 2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
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
            className="neon-category-circle"
            aria-label="Show all categories"
            style={{
              background: 'radial-gradient(circle at center, #0D1219 0%, #050709 100%)',
              border: '1.5px solid rgba(0, 246, 255, 0.2)',
              boxShadow: `
                0 0 4px rgba(0, 246, 255, 0.12),
                inset 0 2px 4px rgba(0, 0, 0, 0.3)
              `,
            }}
          >
            <MoreHorizontal className="w-5 h-5 text-[#00F6FF] opacity-50" strokeWidth={2} />
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

        .neon-category-circle {
          position: relative;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 10px;
          cursor: pointer;
          overflow: visible;
        }

        .neon-category-circle:hover {
          transform: scale(1.08) !important;
        }

        .neon-category-circle[data-active="true"] .neon-icon {
          animation: iconFloat 0.6s ease-in-out;
        }

        @keyframes neonPulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.2;
            transform: scale(1.08);
          }
        }

        @keyframes iconFloat {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-1px);
          }
        }

        /* Ensure crisp rendering */
        .neon-category-circle,
        .neon-pulse {
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>
    </>
  );
}
