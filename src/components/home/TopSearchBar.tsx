import { Search, SlidersHorizontal } from 'lucide-react';

interface TopSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
}

export function TopSearchBar({ searchQuery, onSearchChange, onFilterClick }: TopSearchBarProps) {
  return (
    <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md rounded-full shadow-2xl flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-white/10">
      <Search className="w-4 h-4 text-gray-600 dark:text-gray-300 flex-shrink-0" strokeWidth={2} />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search restaurants, cuisine..."
        className="flex-1 outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-transparent"
      />
      <button 
        onClick={onFilterClick} 
        className="p-1 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
        aria-label="Open filters"
      >
        <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" strokeWidth={2} />
      </button>
    </div>
  );
}
