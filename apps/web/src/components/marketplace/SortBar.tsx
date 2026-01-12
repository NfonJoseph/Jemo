"use client";

import { useTranslations } from "@/lib/translations";
import { ChevronDown } from "lucide-react";
import type { SortOption } from "@/lib/query";

interface SortBarProps {
  currentSort: SortOption | undefined;
  totalResults: number;
  onSortChange: (sort: SortOption) => void;
}

export function SortBar({
  currentSort,
  totalResults,
  onSortChange,
}: SortBarProps) {
  const t = useTranslations("marketplace");

  const SORT_OPTIONS: { value: SortOption; labelKey: keyof typeof t }[] = [
    { value: "relevance", labelKey: "sortBy.relevance" as keyof typeof t },
    { value: "newest", labelKey: "sortBy.newest" as keyof typeof t },
    { value: "price_asc", labelKey: "sortBy.priceAsc" as keyof typeof t },
    { value: "price_desc", labelKey: "sortBy.priceDesc" as keyof typeof t },
  ];

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-200">
      <p className="text-small text-gray-500">
        <span className="font-medium text-gray-900">{totalResults}</span>{" "}
        {totalResults === 1 ? "product" : "products"}
      </p>

      <div className="relative">
        <select
          value={currentSort || "relevance"}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
          className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-small text-gray-700 focus:outline-none focus:ring-2 focus:ring-jemo-orange focus:border-transparent cursor-pointer"
        >
          <option value="relevance">{t("sortBy.relevance")}</option>
          <option value="newest">{t("sortBy.newest")}</option>
          <option value="price_asc">{t("sortBy.priceAsc")}</option>
          <option value="price_desc">{t("sortBy.priceDesc")}</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
