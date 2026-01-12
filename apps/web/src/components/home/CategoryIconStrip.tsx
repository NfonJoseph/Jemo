"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";
import { getAllCategories, type Category } from "@/config/categories";

// Safety limit - never render more than this
const MAX_ICON_CATEGORIES = 10;

interface CategoryIconProps {
  category: Category;
  locale: string;
  t: (key: string) => string;
}

function CategoryIcon({ category, locale, t }: CategoryIconProps) {
  const Icon = category.icon;

  return (
    <Link
      href={`/${locale}/marketplace?category=${category.slug}`}
      className="flex-none h-[76px] w-[76px] sm:h-[92px] sm:w-[92px] rounded-xl border border-gray-200 bg-white hover:border-jemo-orange hover:shadow-md transition-all flex flex-col items-center justify-center gap-1 group"
    >
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 group-hover:bg-jemo-orange/10 flex items-center justify-center transition-colors">
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 group-hover:text-jemo-orange transition-colors" />
      </div>
      <span className="text-[10px] sm:text-xs text-gray-600 group-hover:text-jemo-orange text-center max-w-[68px] sm:max-w-[80px] truncate transition-colors">
        {t(category.labelKey)}
      </span>
    </Link>
  );
}

function MoreCategoriesIcon({ locale, t }: { locale: string; t: (key: string) => string }) {
  return (
    <Link
      href={`/${locale}/marketplace`}
      className="flex-none h-[76px] w-[76px] sm:h-[92px] sm:w-[92px] rounded-xl border border-gray-200 bg-gray-50 hover:border-jemo-orange hover:shadow-md transition-all flex flex-col items-center justify-center gap-1 group"
    >
      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-jemo-orange/10 flex items-center justify-center">
        <Grid3X3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-jemo-orange" />
      </div>
      <span className="text-[10px] sm:text-xs text-jemo-orange font-medium text-center max-w-[68px] sm:max-w-[80px] truncate">
        {t("hero.moreCategories")}
      </span>
    </Link>
  );
}

export function CategoryIconStrip() {
  const t = useTranslations();
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get all categories but only render limited amount
  const allCategories = getAllCategories();
  const visibleCategories = allCategories.slice(0, MAX_ICON_CATEGORIES);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -240 : 240,
      behavior: "smooth",
    });
  };

  return (
    <div className="h-full w-full overflow-hidden border-t border-gray-100 bg-white relative flex items-center">
      {/* Left arrow - desktop only */}
      <button
        onClick={() => scroll("left")}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-sm items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-4 h-4 text-gray-600" />
      </button>

      {/* Scrollable container - native scroll for stability */}
      <div
        ref={scrollRef}
        className="w-full max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x whitespace-nowrap"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex flex-nowrap gap-2 px-3 py-2">
          {visibleCategories.map((category) => (
            <CategoryIcon
              key={category.id}
              category={category}
              locale={locale}
              t={t}
            />
          ))}
          {/* Always show "More" card at the end */}
          <MoreCategoriesIcon locale={locale} t={t} />
        </div>
      </div>

      {/* Right arrow - desktop only */}
      <button
        onClick={() => scroll("right")}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-sm items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </button>

      {/* Hide scrollbar */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
