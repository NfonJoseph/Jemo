"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";
import { getAllCategories, type Category } from "@/config/categories";
import { cn } from "@/lib/utils";

interface CategoryTileProps {
  category: Category;
  locale: string;
  t: (key: string) => string;
}

function CategoryTile({ category, locale, t }: CategoryTileProps) {
  const Icon = category.icon;
  
  return (
    <Link
      href={`/${locale}/marketplace?category=${category.slug}`}
      className="flex-shrink-0 w-[120px] group"
    >
      <div className="bg-white rounded-lg shadow-card overflow-hidden hover:shadow-card-hover transition-all">
        {/* Image placeholder with gradient fallback */}
        <div className="aspect-square relative bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <Icon className="w-10 h-10 text-gray-400 group-hover:text-jemo-orange transition-colors" />
        </div>
        <div className="p-2 text-center">
          <span className="text-xs font-medium text-gray-700 line-clamp-2">
            {t(category.labelKey)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function CategoryStrip() {
  const t = useTranslations();
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const categories = getAllCategories();

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-6 bg-gray-100">
      <div className="container-main relative">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors -ml-2"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-6 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {categories.map((category) => (
            <div key={category.id} className="snap-start">
              <CategoryTile category={category} locale={locale} t={t} />
            </div>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors -mr-2"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </section>
  );
}
