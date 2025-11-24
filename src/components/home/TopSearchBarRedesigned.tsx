import { Search, SlidersHorizontal, Mic } from 'lucide-react';

interface TopSearchBarRedesignedProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
}

export function TopSearchBarRedesigned({ searchQuery, onSearchChange, onFilterClick }: TopSearchBarRedesignedProps) {
  return (
    <div className="
      relative
      h-[52px]
      bg-black/20 backdrop-blur-xl
      rounded-2xl
      border border-white/10
      shadow-lg shadow-black/20
      flex items-center gap-3 px-4
      transition-all duration-300
      hover:border-white/20
      focus-within:border-orange-500/50
      focus-within:shadow-orange-500/20
    ">
      {/* Search Icon */}
      <Search className="w-5 h-5 text-gray-300 flex-shrink-0" strokeWidth={2} />
      
      {/* Input */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search offers, partners..."
        className="
          flex-1 outline-none 
          text-sm font-medium text-white 
          placeholder-gray-400 
          bg-transparent
        "
      />
      
      {/* Voice Icon (Optional) */}
      <button 
        className="
          p-2 flex-shrink-0 
          hover:bg-white/10 
          rounded-full 
          transition-colors
          active:scale-95
        "
        aria-label="Voice search"
      >
        <Mic className="w-5 h-5 text-gray-300" strokeWidth={2} />
      </button>

      {/* Filter Button */}
      <button 
        onClick={onFilterClick} 
        className="
          p-2 flex-shrink-0 
          hover:bg-white/10 
          rounded-full 
          transition-colors
          active:scale-95
        "
        aria-label="Open filters"
      >
        <SlidersHorizontal className="w-5 h-5 text-gray-300" strokeWidth={2} />
      </button>
    </div>
  );
}
