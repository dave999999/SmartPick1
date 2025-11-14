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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5" />
            Search & Filters
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search offers..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <Label htmlFor="sort">Sort by</Label>
            <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
              <SelectTrigger id="sort">
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
            <Label>Price Range</Label>
            <div className="space-y-4">
              <Slider
                min={0}
                max={500}
                step={5}
                value={[filters.minPrice, filters.maxPrice]}
                onValueChange={([min, max]) => onFiltersChange({ ...filters, minPrice: min, maxPrice: max })}
                className="w-full"
              />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{filters.minPrice} ₾</span>
                <span className="text-gray-600">{filters.maxPrice} ₾</span>
              </div>
            </div>
          </div>

          {/* Distance Filter */}
          {showDistanceFilter && (
            <div className="space-y-3">
              <Label>Maximum Distance</Label>
              <div className="space-y-4">
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[filters.maxDistance]}
                  onValueChange={([value]) => onFiltersChange({ ...filters, maxDistance: value })}
                  className="w-full"
                />
                <div className="text-sm text-gray-600">
                  {filters.maxDistance} km
                  {filters.maxDistance >= 50 && ' (All)'}
                </div>
              </div>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={() => {
              onSearchChange('');
              onFiltersChange({
                maxDistance: 50,
                minPrice: 0,
                maxPrice: 500,
              });
              onSortChange('newest');
            }}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
