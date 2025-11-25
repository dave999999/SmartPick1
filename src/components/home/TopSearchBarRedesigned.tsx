/**
 * REFACTORED: Premium Dark Design System
 * Glassy search bar with soft neon accents
 */

import { Search, SlidersHorizontal } from 'lucide-react';

interface TopSearchBarRedesignedProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
}

export function TopSearchBarRedesigned({ searchQuery, onSearchChange, onFilterClick }: TopSearchBarRedesignedProps) {
  return (
    <div className="
      relative h-[50px]
      bg-sp-surface-glass backdrop-blur-xl
      rounded-full
      border border-sp-border-soft
      shadow-[0_8px_24px_rgba(0,0,0,0.6)]
      flex items-center gap-3 px-5
      transition-all duration-300
      hover:border-sp-border-strong hover:shadow-[0_12px_32px_rgba(0,0,0,0.7)]
      focus-within:border-sp-accent-orange-soft focus-within:shadow-[0_0_18px_rgba(255,138,48,0.25)]
    ">
      <Search className="w-5 h-5 text-sp-text-muted flex-shrink-0" strokeWidth={2.5} />
      
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search deals, places..."
        className="
          flex-1 outline-none 
          text-[15px] font-medium text-sp-text-primary 
          placeholder-sp-text-muted 
          bg-transparent
        "
      />
      
      <button 
        onClick={onFilterClick}
        className="
          p-2.5 flex-shrink-0 
          hover:bg-white/10 
          rounded-full 
          transition-all duration-200
          active:scale-95
          border border-sp-border-soft
        "
        aria-label="Open filters"
      >
        <SlidersHorizontal className="w-4.5 h-4.5 text-sp-text-secondary" strokeWidth={2.5} />
      </button>
    </div>
  );
}
