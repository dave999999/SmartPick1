import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';

export interface FilterState {
  maxDistance: number;
  minPrice: number;
  maxPrice: number;
}

export type SortOption = 'nearest' | 'cheapest' | 'expiring' | 'newest';

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  showDistanceFilter: boolean;
}

export default function SearchAndFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  sortBy,
  onSortChange,
  showDistanceFilter,
}: SearchAndFiltersProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const handleClearFilters = () => {
    const defaultFilters: FilterState = {
      maxDistance: 50,
      minPrice: 0,
      maxPrice: 500,
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    setOpen(false);
  };

  const hasActiveFilters = () => {
    return (
      (showDistanceFilter && filters.maxDistance < 50) ||
      filters.minPrice > 0 ||
      filters.maxPrice < 500
    );
  };

  return (
    <div className="space-y-3">
      {/* Search and Sort Row */}
      <div className="flex gap-2 items-center">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="search"
            placeholder={t('search.placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 h-11 border-gray-300 focus:border-[#00C896] focus:ring-[#00C896]"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={() => onSearchChange('')}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="w-[160px] h-11 border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('sort.newest')}</SelectItem>
            <SelectItem value="nearest">{t('sort.nearest')}</SelectItem>
            <SelectItem value="cheapest">{t('sort.cheapest')}</SelectItem>
            <SelectItem value="expiring">{t('sort.expiring')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter Button */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`h-11 w-11 relative ${hasActiveFilters() ? 'border-[#00C896] bg-[#00C896]/10' : 'border-gray-300'}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters() && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#00C896] rounded-full" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[320px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle>{t('filter.title')}</SheetTitle>
              <SheetDescription>
                Refine your search results
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-6">
              {/* Distance Filter - Only show if user location is enabled */}
              {showDistanceFilter && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t('filter.distance')}</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[localFilters.maxDistance]}
                      onValueChange={(value) =>
                        setLocalFilters({ ...localFilters, maxDistance: value[0] })
                      }
                      min={1}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-sm text-gray-600 text-right">
                      {localFilters.maxDistance} km
                    </div>
                  </div>
                </div>
              )}

              {/* Price Range Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t('filter.priceRange')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">{t('filter.minPrice')}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={localFilters.maxPrice}
                      value={localFilters.minPrice}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          minPrice: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">{t('filter.maxPrice')}</Label>
                    <Input
                      type="number"
                      min={localFilters.minPrice}
                      max={500}
                      value={localFilters.maxPrice}
                      onChange={(e) =>
                        setLocalFilters({
                          ...localFilters,
                          maxPrice: Math.min(500, parseInt(e.target.value) || 500),
                        })
                      }
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="flex flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex-1"
              >
                {t('filter.clear')}
              </Button>
              <Button
                onClick={handleApplyFilters}
                className="flex-1 bg-[#00C896] hover:bg-[#00B588]"
              >
                {t('filter.apply')}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-600">Active filters:</span>
          {showDistanceFilter && filters.maxDistance < 50 && (
            <div className="px-2 py-1 bg-[#00C896]/10 text-[#00C896] text-xs rounded-full flex items-center gap-1">
              <span>≤ {filters.maxDistance} km</span>
              <button
                onClick={() => onFiltersChange({ ...filters, maxDistance: 50 })}
                className="hover:bg-[#00C896]/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {filters.minPrice > 0 && (
            <div className="px-2 py-1 bg-[#00C896]/10 text-[#00C896] text-xs rounded-full flex items-center gap-1">
              <span>≥ ₾{filters.minPrice}</span>
              <button
                onClick={() => onFiltersChange({ ...filters, minPrice: 0 })}
                className="hover:bg-[#00C896]/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {filters.maxPrice < 500 && (
            <div className="px-2 py-1 bg-[#00C896]/10 text-[#00C896] text-xs rounded-full flex items-center gap-1">
              <span>≤ ₾{filters.maxPrice}</span>
              <button
                onClick={() => onFiltersChange({ ...filters, maxPrice: 500 })}
                className="hover:bg-[#00C896]/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
