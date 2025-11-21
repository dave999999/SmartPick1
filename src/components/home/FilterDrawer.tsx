import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, SlidersHorizontal } from 'lucide-react';
import { FilterState, SortOption } from '@/components/SearchAndFilters';

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showDistanceFilter: boolean;
}

export function FilterDrawer({
  open,
  onOpenChange,
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  showDistanceFilter,
}: FilterDrawerProps) {
  // Check if filters are active
  const hasActiveFilters = 
    searchQuery.trim() !== '' ||
    filters.minPrice > 0 ||
    filters.maxPrice < 100 ||
    filters.maxDistance < 10 ||
    filters.availableNow ||
    sortBy !== 'newest';

  // Quick filter handlers
  const applyUnder10 = () => {
    onFiltersChange({ ...filters, minPrice: 0, maxPrice: 10 });
    onSortChange('cheapest');
  };

  const applyUnder20 = () => {
    onFiltersChange({ ...filters, minPrice: 0, maxPrice: 20 });
    onSortChange('cheapest');
  };

  const applyUnder50 = () => {
    onFiltersChange({ ...filters, minPrice: 0, maxPrice: 50 });
    onSortChange('cheapest');
  };

  const applyBestDiscount = () => {
    onSortChange('cheapest');
  };

  const applyExpiringSoon = () => {
    onSortChange('expiring');
  };

  const applyNearbyOnly = () => {
    if (showDistanceFilter) {
      onFiltersChange({ ...filters, maxDistance: 2 });
      onSortChange('nearest');
    }
  };

  const applyWithin5km = () => {
    if (showDistanceFilter) {
      onFiltersChange({ ...filters, maxDistance: 5 });
      onSortChange('nearest');
    }
  };

  const clearPriceFilter = () => {
    onFiltersChange({ ...filters, minPrice: 0, maxPrice: 100 });
  };

  const clearDistanceFilter = () => {
    onFiltersChange({ ...filters, maxDistance: 10 });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col bg-white">
        <SheetHeader className="flex-shrink-0 pb-2 border-b border-gray-200 px-4 pt-4">
          <SheetTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-mint-600" />
              <span className="font-bold text-gray-800">Filters</span>
              {hasActiveFilters && (
                <span className="px-1.5 py-0.5 bg-mint-500 text-white text-xs font-bold rounded-full">
                  •
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-3 px-4">
          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="bg-mint-50 border border-mint-200 rounded-lg p-2 text-xs">
              <div className="flex items-center gap-1 mb-1">
                <span className="font-bold text-mint-700">Active:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {searchQuery && (
                  <span className="bg-white border border-mint-300 rounded px-1.5 py-0.5 text-mint-700 font-semibold">
                    🔍 "{searchQuery}"
                  </span>
                )}
                {filters.maxPrice < 100 && (
                  <span className="bg-white border border-mint-300 rounded px-1.5 py-0.5 text-mint-700 font-semibold">
                    💰 Up to {filters.maxPrice}₾
                  </span>
                )}
                {filters.maxDistance < 10 && (
                  <span className="bg-white border border-blue-300 rounded px-1.5 py-0.5 text-blue-700 font-semibold">
                    📍 {filters.maxDistance}km
                  </span>
                )}
                {filters.availableNow && (
                  <span className="bg-white border border-mint-300 rounded px-1.5 py-0.5 text-mint-700 font-semibold">
                    ⚡ Available
                  </span>
                )}
                {sortBy !== 'newest' && (
                  <span className="bg-white border border-orange-300 rounded px-1.5 py-0.5 text-orange-700 font-semibold">
                    {sortBy === 'cheapest' && '₾ Cheapest'}
                    {sortBy === 'expiring' && '⏰ Expiring'}
                    {sortBy === 'nearest' && '📍 Nearest'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-1.5">
            <button 
              onClick={applyUnder10}
              className="px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-xs font-bold border border-mint-300 hover:bg-mint-500 hover:text-white hover:border-mint-500 transition-all active:scale-95"
            >
              💰 Under 10₾
            </button>
            <button 
              onClick={applyUnder20}
              className="px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-xs font-bold border border-mint-300 hover:bg-mint-500 hover:text-white hover:border-mint-500 transition-all active:scale-95"
            >
              💵 Under 20₾
            </button>
            <button 
              onClick={applyUnder50}
              className="px-2.5 py-1 rounded-full bg-mint-50 text-mint-700 text-xs font-bold border border-mint-300 hover:bg-mint-500 hover:text-white hover:border-mint-500 transition-all active:scale-95"
            >
              💸 Under 50₾
            </button>
            <button 
              onClick={applyBestDiscount}
              className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-300 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all active:scale-95"
            >
              🔥 Best Deals
            </button>
            <button 
              onClick={applyExpiringSoon}
              className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-300 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95"
            >
              ⏰ Expiring
            </button>
            {showDistanceFilter && (
              <>
                <button 
                  onClick={applyNearbyOnly}
                  className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all active:scale-95"
                >
                  📍 Nearby
                </button>
                <button 
                  onClick={applyWithin5km}
                  className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-300 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all active:scale-95"
                >
                  🚶 Within 5km
                </button>
              </>
            )}
          </div>

          {/* Search */}
          <div>
            <Label htmlFor="search" className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5 text-teal-500" />
              Search
            </Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="Search restaurants, cuisine, area..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-10 text-sm border-2 border-gray-200 focus:border-teal-500 rounded-xl bg-white"
                autoFocus
              />
            </div>
          </div>

          {/* Sort */}
          <div>
            <Label htmlFor="sort" className="text-xs font-bold text-gray-600 mb-1.5 block">Sort by</Label>
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger id="sort" className="h-9 text-sm border border-gray-300 focus:border-mint-500 rounded-lg bg-white">
                <SelectValue placeholder="Choose order" />
              </SelectTrigger>
              <SelectContent className="z-[10000]">
                <SelectItem value="cheapest">₾ Lowest Price</SelectItem>
                <SelectItem value="expiring">⏰ Expiring Soon</SelectItem>
                {showDistanceFilter && <SelectItem value="nearest">📍 Nearest</SelectItem>}
                <SelectItem value="newest">✨ Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-bold text-gray-600">Max Price</Label>
              {filters.maxPrice < 100 && (
                <button 
                  onClick={clearPriceFilter}
                  className="text-xs text-mint-600 hover:text-mint-700 font-semibold"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[filters.maxPrice]}
                onValueChange={([max]) => onFiltersChange({ ...filters, minPrice: 0, maxPrice: max })}
                className="w-full"
              />
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="bg-mint-50 border border-mint-300 rounded px-3 py-1 text-mint-700 font-bold">
                  Up to {filters.maxPrice}₾
                </span>
              </div>
            </div>
          </div>

          {/* Distance Filter */}
          {showDistanceFilter && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-bold text-gray-600">Distance</Label>
                {filters.maxDistance < 10 && (
                  <button 
                    onClick={clearDistanceFilter}
                    className="text-xs text-mint-600 hover:text-mint-700 font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <Slider
                  min={0.5}
                  max={10}
                  step={0.5}
                  value={[filters.maxDistance]}
                  onValueChange={([value]) => onFiltersChange({ ...filters, maxDistance: value })}
                  className="w-full"
                />
                <div className="flex items-center justify-center">
                  <span className="bg-blue-50 border border-blue-300 rounded px-2 py-0.5 text-blue-700 font-bold text-xs">
                    📍 {filters.maxDistance} km
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Available Now Toggle */}
          <div 
            className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-pointer ${
              filters.availableNow 
                ? 'bg-mint-500 border-mint-600' 
                : 'bg-gray-50 border-gray-300 hover:border-mint-400'
            }`}
            onClick={() => onFiltersChange({ ...filters, availableNow: !filters.availableNow })}
          >
            <input 
              type="checkbox" 
              id="availableNow" 
              checked={filters.availableNow ?? false} 
              onChange={e => onFiltersChange({ ...filters, availableNow: e.target.checked })} 
              className="accent-mint-600 h-4 w-4 cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
            <Label 
              htmlFor="availableNow" 
              className={`text-xs font-bold cursor-pointer flex-1 ${
                filters.availableNow ? 'text-white' : 'text-gray-700'
              }`}
            >
              ⚡ Available now only
            </Label>
          </div>

        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 flex gap-2 p-3 border-t border-gray-200 bg-white">
          <button
            onClick={() => {
              onSearchChange('');
              onFiltersChange({
                maxDistance: 10,
                minPrice: 0,
                maxPrice: 100,
                availableNow: false,
              });
              onSortChange('newest');
            }}
            className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-700 border border-gray-300 transition-all active:scale-95"
          >
            🔄 Reset
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 py-2 px-3 bg-mint-500 hover:bg-mint-600 rounded-lg text-sm font-bold text-white transition-all active:scale-95"
          >
            ✓ Apply
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
