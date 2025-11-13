import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
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
  const handleReset = () => {
    onSearchChange('');
    onFiltersChange({
      maxDistance: 50,
      minPrice: 0,
      maxPrice: 500,
    });
    onSortChange('newest');
  };

  const handleApply = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[90vw] sm:w-[400px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base font-semibold">
            <SlidersHorizontal className="h-5 w-5" />
            Search & Filters
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search offers..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 h-11 rounded-lg border-gray-200 focus:border-[#00C896] focus:ring-[#00C896]"
              />
            </div>
            {searchQuery && (
              <p className="text-xs text-gray-500">
                Searching in titles, restaurants, and categories
              </p>
            )}
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <Label htmlFor="sort" className="text-sm font-medium text-gray-700">Sort by</Label>
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger id="sort" className="h-11 rounded-lg border-gray-200 focus:border-[#00C896] focus:ring-[#00C896]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="cheapest">Lowest Price</SelectItem>
                {showDistanceFilter && <SelectItem value="nearest">Nearest</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Price Range</Label>
            <div className="space-y-3 pt-2">
              <Slider
                min={0}
                max={500}
                step={5}
                value={[filters.minPrice, filters.maxPrice]}
                onValueChange={([min, max]) => onFiltersChange({ ...filters, minPrice: min, maxPrice: max })}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-gray-700">{filters.minPrice} ₾</span>
                <span className="text-gray-700">{filters.maxPrice} ₾</span>
              </div>
            </div>
          </div>

          {/* Distance Filter */}
          {showDistanceFilter && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Maximum Distance</Label>
              <div className="space-y-3 pt-2">
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[filters.maxDistance]}
                  onValueChange={([value]) => onFiltersChange({ ...filters, maxDistance: value })}
                  className="w-full"
                />
                <div className="text-sm font-medium text-gray-700">
                  Within {filters.maxDistance} km
                  {filters.maxDistance >= 50 && ' (All locations)'}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Reset Filters
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2.5 px-4 bg-[#00C896] hover:bg-[#00b285] text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Apply
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
