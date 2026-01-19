"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslations, useLocale } from "@/lib/translations";
import { api } from "@/lib/api";
import type { ProductListItem, PaginatedResponse } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { ProductCard, SectionHeader, EmptyState } from "@/components/shared";
import { HomeHeroJumia, FlashSaleSection, SellerCtaBanner } from "@/components/home";
import { Skeleton } from "@/components/ui/skeleton";

// Product limits: Desktop 75 (5×15), Tablet 60 (4×15), Mobile 30 (2×15)
const PRODUCTS_LIMIT = 75;

// Skeleton card component
function ProductSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-3">
      <Skeleton className="aspect-[1/1] w-full rounded-md mb-3" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-5 w-1/2 mt-2" />
      <Skeleton className="h-3 w-1/3 mt-1" />
    </div>
  );
}

export default function HomePage() {
  const t = useTranslations("home");
  const tEmpty = useTranslations("empty");
  const locale = useLocale();
  
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useCart();
  
  // Track if we've shown an error to prevent toast loops
  const errorShownRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    errorShownRef.current = false;
    
    try {
      // Fetch exactly 75 products (server-side limit enforced)
      // Pass auth: true so backend can return isFavorited status for logged-in users
      const response = await api.get<PaginatedResponse<ProductListItem>>(`/products?limit=${PRODUCTS_LIMIT}`, true);
      setProducts(response.data);
    } catch (err) {
      // Silent error - show skeleton fallback, no toasts
      console.error("Failed to fetch products:", err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Memoize products to prevent unnecessary re-renders
  const memoizedProducts = useMemo(() => products, [products]);

  return (
    <div className="pb-12">
      {/* New Jumia-style Hero Section */}
      <HomeHeroJumia />

      {/* Flash Sale Section */}
      <FlashSaleSection />

      {/* Popular Products - Today's Picks */}
      <section className="py-8">
        <div className="container-main">
          <SectionHeader
            title={t("popularPicks")}
            viewAllHref={`/${locale}/marketplace`}
          />

          {/* 
            Stable grid layout:
            - Desktop (lg+): 5 columns, up to 75 products
            - Tablet (sm-lg): 4 columns, up to 60 products  
            - Mobile: 2 columns, up to 30 products
            Uses explicit column counts (no auto-fit/auto-fill)
            Grid grows naturally - no fixed height
          */}
          {loading || error ? (
            // Show skeleton grid on loading or error (safe fallback - no toasts)
            <div className="homepage-product-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <ProductSkeleton key={`skeleton-${i}`} />
              ))}
            </div>
          ) : memoizedProducts.length === 0 ? (
            <EmptyState
              type="products"
              title={tEmpty("products")}
              description={tEmpty("productsText")}
            />
          ) : (
            <div className="homepage-product-grid">
              {memoizedProducts.map((product, index) => {
                // Responsive visibility: Mobile ≤30, Tablet ≤60, Desktop ≤75
                const visibilityClass = 
                  index >= 75 ? 'hidden' :
                  index >= 60 ? 'hidden lg:block' :
                  index >= 30 ? 'hidden sm:block' : '';
                
                return (
                  <div key={product.id} className={visibilityClass}>
                    <ProductCard
                      product={product}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Premium Seller CTA Banner */}
      <SellerCtaBanner />
    </div>
  );
}
