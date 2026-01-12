"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "@/lib/translations";
import { X, SlidersHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { MarketplaceFilters } from "@/lib/query";

const CATEGORY_KEYS = [
  "electronics",
  "fashion",
  "homeGarden",
  "babyKids",
  "healthBeauty",
  "foodGrocery",
  "sportsOutdoors",
  "automotive",
  "booksStationery",
  "other",
] as const;

interface FiltersPanelProps {
  filters: MarketplaceFilters;
  onFilterChange: (updates: Partial<MarketplaceFilters>) => void;
  onClearAll: () => void;
  className?: string;
}

export function FiltersPanel({
  filters,
  onFilterChange,
  onClearAll,
  className,
}: FiltersPanelProps) {
  const t = useTranslations("marketplace");
  const tCat = useTranslations("categories");
  const tCommon = useTranslations("common");
  const tHeader = useTranslations("header");
  
  const [minPrice, setMinPrice] = useState(filters.minPrice?.toString() || "");
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice?.toString() || "");
  const [searchValue, setSearchValue] = useState(filters.q || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when URL filters change
  useEffect(() => {
    setMinPrice(filters.minPrice?.toString() || "");
    setMaxPrice(filters.maxPrice?.toString() || "");
    setSearchValue(filters.q || "");
  }, [filters.minPrice, filters.maxPrice, filters.q]);

  // Debounced search update
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);

      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce URL update
      debounceRef.current = setTimeout(() => {
        onFilterChange({ q: value.trim() || undefined });
      }, 300);
    },
    [onFilterChange]
  );

  // Immediate search submit (on Enter)
  const handleSearchSubmit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        // Clear debounce and update immediately
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        onFilterChange({ q: searchValue.trim() || undefined });
      }
    },
    [onFilterChange, searchValue]
  );

  // Clear search
  const handleSearchClear = useCallback(() => {
    setSearchValue("");
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onFilterChange({ q: undefined });
  }, [onFilterChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handlePriceApply = () => {
    onFilterChange({
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  const handlePriceReset = () => {
    setMinPrice("");
    setMaxPrice("");
    onFilterChange({ minPrice: undefined, maxPrice: undefined });
  };

  const hasActiveFilters = !!(
    filters.q ||
    filters.category ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Clear All */}
      <div className="flex items-center justify-between">
        <h2 className="text-h3 font-semibold text-gray-900 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5" />
          {t("filters")}
        </h2>
        {hasActiveFilters && (
          <Button
            variant="link"
            size="sm"
            onClick={onClearAll}
            className="text-small text-gray-500 hover:text-jemo-orange p-0 h-auto"
          >
            {tCommon("clearAll")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <label className="text-small font-medium text-gray-700">{t("searchProducts")}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={tHeader("searchPlaceholder")}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchSubmit}
            className="h-10 pl-9 pr-8"
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={tCommon("clear")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <label className="text-small font-medium text-gray-700">{t("category")}</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((key) => {
            const categoryName = tCat(key);
            return (
              <button
                key={key}
                onClick={() =>
                  onFilterChange({
                    category: filters.category === categoryName ? undefined : categoryName,
                  })
                }
                className={cn(
                  "px-3 py-1.5 rounded-full text-small font-medium transition-colors",
                  filters.category === categoryName
                    ? "bg-jemo-orange text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {categoryName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <label className="text-small font-medium text-gray-700">
          {t("priceRange")} ({tCommon("currency")})
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={t("min")}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-10"
            min={0}
          />
          <span className="text-gray-400">–</span>
          <Input
            type="number"
            placeholder={t("max")}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-10"
            min={0}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handlePriceApply}
            className="flex-1"
          >
            {tCommon("apply")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePriceReset}
            className="flex-1"
          >
            {tCommon("reset")}
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <p className="text-small font-medium text-gray-700">{t("activeFilters")}:</p>
          <div className="flex flex-wrap gap-2">
            {filters.q && (
              <FilterTag
                label={`"${filters.q}"`}
                onRemove={() => onFilterChange({ q: undefined })}
              />
            )}
            {filters.category && (
              <FilterTag
                label={filters.category}
                onRemove={() => onFilterChange({ category: undefined })}
              />
            )}
            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <FilterTag
                label={`${filters.minPrice || 0} - ${filters.maxPrice || "∞"} ${tCommon("currency")}`}
                onRemove={handlePriceReset}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-jemo-orange/10 text-jemo-orange text-small rounded-md">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-jemo-orange/20 rounded-full p-0.5"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// Mobile drawer wrapper
interface FilterDrawerProps extends FiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FilterDrawer({
  isOpen,
  onClose,
  ...panelProps
}: FilterDrawerProps) {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-out shadow-xl md:hidden overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-jemo-orange sticky top-0">
          <span className="text-white font-semibold">{t("filters")}</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
            onClick={onClose}
            aria-label={tCommon("close")}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Drawer Content */}
        <div className="p-4">
          <FiltersPanel {...panelProps} />
        </div>

        {/* Apply Button (sticky at bottom) */}
        <div className="sticky bottom-0 p-4 bg-white border-t border-gray-200">
          <Button onClick={onClose} className="w-full">
            {tCommon("apply")} {t("filters")}
          </Button>
        </div>
      </div>
    </>
  );
}
