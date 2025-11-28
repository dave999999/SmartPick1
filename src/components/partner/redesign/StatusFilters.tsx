/**
 * StatusFilters - Horizontal segmented chips for filtering offers
 * Compact, scrollable, with active state highlighting
 */

interface StatusFiltersProps {
  selected: 'active' | 'paused' | 'ended' | 'all';
  onSelect: (status: 'active' | 'paused' | 'ended' | 'all') => void;
  counts: {
    active: number;
    paused: number;
    ended: number;
  };
}

export function StatusFilters({ selected, onSelect, counts }: StatusFiltersProps) {
  const filters = [
    { id: 'all' as const, label: 'All', count: counts.active + counts.paused + counts.ended },
    { id: 'active' as const, label: 'Active', count: counts.active },
    { id: 'paused' as const, label: 'Paused', count: counts.paused },
    { id: 'ended' as const, label: 'Ended', count: counts.ended },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map((filter) => {
        const isSelected = selected === filter.id;
        return (
          <button
            key={filter.id}
            onClick={() => onSelect(filter.id)}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all
              ${isSelected
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            <span>{filter.label}</span>
            <span className={`
              text-xs font-bold px-1.5 py-0.5 rounded-full
              ${isSelected ? 'bg-emerald-600' : 'bg-gray-100 text-gray-600'}
            `}>
              {filter.count}
            </span>
          </button>
        );
      })}
      
      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
