import { Search, Mic, SlidersHorizontal } from 'lucide-react';

interface TopSearchBarProps {
  onFilterClick: () => void;
}

export function TopSearchBar({ onFilterClick }: TopSearchBarProps) {
  return (
    <div className="absolute top-4 left-0 right-0 z-20 px-4">
      <div className="bg-white rounded-2xl shadow-lg flex items-center gap-3 px-4 py-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search here..."
          className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-400"
        />
        <button className="p-1">
          <Mic className="w-5 h-5 text-gray-700" />
        </button>
        <button onClick={onFilterClick} className="p-1">
          <SlidersHorizontal className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
