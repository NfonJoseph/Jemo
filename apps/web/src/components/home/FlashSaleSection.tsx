"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";
import { api } from "@/lib/api";
import type { ProductListItem, PaginatedResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

// Maximum products to render for performance
const MAX_FLASH_PRODUCTS = 12;

// ============================================
// COUNTDOWN HOOK - Resets at midnight daily
// ============================================
function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0); // Next midnight

      const diff = midnight.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return timeLeft;
}

// ============================================
// FLASH SALE INFO CARD (Left Side)
// ============================================
function FlashSaleCard() {
  const t = useTranslations();
  const locale = useLocale();
  const { hours, minutes, seconds } = useCountdown();

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="w-full lg:w-[240px] shrink-0 bg-jemo-orange rounded-2xl p-5 flex flex-col justify-between text-white">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-6 h-6 fill-white" />
          <h2 className="text-xl font-bold">{t("flashSale.title")}</h2>
        </div>
        <p className="text-lg font-semibold text-white/90">{t("flashSale.discount")}</p>
      </div>

      {/* Countdown */}
      <div className="my-4">
        <p className="text-sm text-white/80 mb-2">{t("flashSale.endsIn")}</p>
        <div className="flex items-center gap-2">
          <div className="bg-white text-jemo-orange font-bold text-lg rounded-lg px-3 py-2 min-w-[48px] text-center">
            {pad(hours)}
          </div>
          <span className="text-xl font-bold">:</span>
          <div className="bg-white text-jemo-orange font-bold text-lg rounded-lg px-3 py-2 min-w-[48px] text-center">
            {pad(minutes)}
          </div>
          <span className="text-xl font-bold">:</span>
          <div className="bg-white text-jemo-orange font-bold text-lg rounded-lg px-3 py-2 min-w-[48px] text-center">
            {pad(seconds)}
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <Button
        asChild
        className="w-full bg-white text-jemo-orange hover:bg-gray-100 font-semibold"
      >
        <Link href={`/${locale}/marketplace`}>
          {t("flashSale.viewAll")}
        </Link>
      </Button>
    </div>
  );
}

// ============================================
// FLASH SALE PRODUCT CARD
// ============================================
interface FlashProductCardProps {
  product: ProductListItem;
  locale: string;
}

function FlashProductCard({ product, locale }: FlashProductCardProps) {
  const imageUrl = product.imageUrl || "/placeholder-product.svg";

  return (
    <Link
      href={`/${locale}/products/${product.id}`}
      className="flex-none w-[160px] sm:w-[180px] bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="180px"
          className="object-contain group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-700 line-clamp-2 h-10 mb-2">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-jemo-orange font-bold text-base">
            {formatPrice(product.discountPrice || product.price)}
          </span>
          {product.discountPrice && product.discountPrice < product.price && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ============================================
// FLASH SALE PRODUCTS SLIDER (Right Side)
// ============================================
interface FlashProductsSliderProps {
  products: ProductListItem[];
  locale: string;
}

function FlashProductsSlider({ products, locale }: FlashProductsSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Limit products for performance
  const visibleProducts = products.slice(0, MAX_FLASH_PRODUCTS);

  if (visibleProducts.length === 0) {
    return null; // Hide if no products
  }

  return (
    <div className="flex-1 min-w-0 relative">
      {/* Left Arrow */}
      <button
        onClick={() => scroll("left")}
        className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md items-center justify-center hover:bg-gray-50 transition-colors -ml-2"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      {/* Slider Container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x h-full"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex gap-3 px-1 py-2 h-full">
          {visibleProducts.map((product) => (
            <FlashProductCard
              key={product.id}
              product={product}
              locale={locale}
            />
          ))}
        </div>
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll("right")}
        className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md items-center justify-center hover:bg-gray-50 transition-colors -mr-2"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
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

// ============================================
// SKELETON LOADER
// ============================================
function FlashSaleSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[280px] lg:h-[260px]">
      {/* Left Card Skeleton */}
      <div className="w-full lg:w-[240px] shrink-0 bg-gray-200 rounded-2xl animate-pulse" />
      
      {/* Products Skeleton */}
      <div className="flex-1 min-w-0 flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-none w-[160px] sm:w-[180px] bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN FLASH SALE SECTION
// ============================================
export function FlashSaleSection() {
  const locale = useLocale();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only Flash Sale products
      // Pass auth: true so backend can return isFavorited status for logged-in users
      const response = await api.get<PaginatedResponse<ProductListItem>>("/products?limit=12&dealType=FLASH_SALE", true);
      setProducts(response.data);
    } catch (err) {
      console.error("Failed to fetch flash sale products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Hide section entirely if no flash sale products (after loading)
  if (!loading && products.length === 0) {
    return null;
  }

  return (
    <section className="py-6 bg-gray-100">
      {/* Use same container as hero for consistent width */}
      <div className="container-main">
        {loading ? (
          <FlashSaleSkeleton />
        ) : (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Flash Sale Info Card */}
            <FlashSaleCard />

            {/* Right: Products Slider */}
            <FlashProductsSlider products={products} locale={locale} />
          </div>
        )}
      </div>
    </section>
  );
}
