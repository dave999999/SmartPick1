import { Search, SlidersHorizontal } from 'lucide-react';

interface TopSearchBarProps {
  onFilterClick: () => void;
}

export function TopSearchBar({ onFilterClick }: TopSearchBarProps) {
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-md flex items-center gap-2 px-4 py-2.5 border border-gray-100">
      <Search className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={2} />
      <input
        type="text"
        placeholder="Search..."
        className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400 bg-transparent"
        onClick={onFilterClick}
        readOnly
      />
      <button 
        onClick={onFilterClick} 
        className="p-1 flex-shrink-0 hover:bg-gray-100 rounded-full transition-colors"
      >
        <SlidersHorizontal className="w-4 h-4 text-gray-600" strokeWidth={2} />
      </button>
    </div>
  );
}
