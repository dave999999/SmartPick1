import React from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { getBusinessCategoryOptions } from "../helpers/businessCategories";
import { Input } from "./Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { Button } from "./Button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./Collapsible";
import styles from "./ProductFilters.module.css";

export interface FilterState {
  search: string;
  minPrice: string;
  maxPrice: string;
  businessType: string;
  distance: string;
  sortBy: string;
}

interface ProductFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  resultsCount: number;
  totalCount: number;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  resultsCount,
  totalCount,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const hasActiveFilters =
    filters.search ||
    filters.minPrice ||
    filters.maxPrice ||
    (filters.businessType && filters.businessType !== "__all") ||
    (filters.distance && filters.distance !== "__all") ||
    (filters.sortBy && filters.sortBy !== "__none");

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className={styles.container}>
      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} size={20} />
        <Input
          type="search"
          placeholder="Search products by name or description..."
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Filter Section */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={styles.filterHeader}>
          <CollapsibleTrigger className={styles.filterTrigger}>
            <Filter size={18} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className={styles.activeBadge}>Active</span>
            )}
            <ChevronDown
              size={18}
              className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
            />
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className={styles.clearButton}
            >
              <X size={16} />
              Clear all
            </Button>
          )}
        </div>

        <CollapsibleContent>
          <div className={styles.filterGrid}>
            {/* Price Range */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Price Range</label>
              <div className={styles.priceInputs}>
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                  min="0"
                  step="0.01"
                />
                <span className={styles.priceSeparator}>-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Business Type */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Business Type</label>
              <Select
                value={filters.businessType}
                onValueChange={(value) => handleFilterChange("businessType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All types</SelectItem>
                  {getBusinessCategoryOptions().map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Distance */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Distance</label>
              <Select
                value={filters.distance}
                onValueChange={(value) => handleFilterChange("distance", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any distance</SelectItem>
                  <SelectItem value="1">Within 1 km</SelectItem>
                  <SelectItem value="3">Within 3 km</SelectItem>
                  <SelectItem value="5">Within 5 km</SelectItem>
                  <SelectItem value="10">Within 10 km</SelectItem>
                  <SelectItem value="20">Within 20 km</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Sort By</label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange("sortBy", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Default</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="distance">Distance: Nearest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results Count */}
      <div className={styles.resultsCount}>
        Showing <strong>{resultsCount}</strong> of <strong>{totalCount}</strong>{" "}
        products
      </div>
    </div>
  );
};