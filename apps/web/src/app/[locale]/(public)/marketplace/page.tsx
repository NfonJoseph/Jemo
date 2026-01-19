"use client";

import { useEffect, useState, useCallback, useMemo, Suspense, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "@/lib/translations";
import { SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import {
  parseFilters,
  setQueryParams,
  buildApiQueryString,
  type MarketplaceFilters,
  type SortOption,
} from "@/lib/query";
import type { ProductListItem } from "@/lib/types";
import { ProductCard, EmptyState, SkeletonProductGrid } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import {
  FiltersPanel,
  FilterDrawer,
  SortBar,
  Pagination,
} from "@/components/marketplace";

interface ProductsApiResponse {
  data?: ProductListItem[];
  items?: ProductListItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function MarketplaceContent() {
  const t = useTranslations("marketplace");
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { addItem } = useCart();

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [drawerOpen, setDrawerOpen] = useState(false);

  // STABLE dependency key - only changes when URL params actually change
  const paramsKey = useMemo(() => searchParams.toString(), [searchParams]);
  
  // Parse filters from the stable params key
  const filters = useMemo(() => parseFilters(searchParams), [paramsKey]);
  
  // Track if we're already fetching to prevent double-fetch
  const fetchingRef = useRef(false);

  // Navigate with updated params - only push if URL actually changes
  const updateFilters = useCallback(
    (updates: Partial<MarketplaceFilters>, resetPage = true) => {
      const newUrl = setQueryParams(
        pathname,
        searchParams,
        updates as Record<string, string | number | null | undefined>,
        resetPage
      );
      const currentUrl = pathname + (paramsKey ? `?${paramsKey}` : "");
      if (newUrl !== currentUrl) {
        router.push(newUrl);
      }
    },
    [pathname, paramsKey, router, searchParams]
  );

  const handleSortChange = useCallback(
    (sort: SortOption) => {
      updateFilters({ sort }, true);
    },
    [updateFilters]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateFilters({ page }, false);
    },
    [updateFilters]
  );

  const handleClearAll = useCallback(() => {
    const currentUrl = pathname + (paramsKey ? `?${paramsKey}` : "");
    if (currentUrl !== pathname) {
      router.push(pathname);
    }
  }, [pathname, paramsKey, router]);

  // Fetch products - only when paramsKey changes
  useEffect(() => {
    // Prevent double-fetch
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryString = buildApiQueryString(filters);
        // Pass auth: true so backend can return isFavorited status for logged-in users
        const response = await api.get<ProductsApiResponse>(`/products?${queryString}`, true);

        // Handle different API response shapes
        const productList = response.data || response.items || [];
        const responseMeta = response.meta || {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: Array.isArray(response) ? response.length : productList.length,
          totalPages: 1,
        };

        // If response is just an array (fallback)
        if (Array.isArray(response)) {
          setProducts(response as unknown as ProductListItem[]);
          setMeta({
            page: 1,
            limit: 12,
            total: response.length,
            totalPages: 1,
          });
        } else {
          setProducts(productList);
          setMeta(responseMeta);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError(tCommon("error"));
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchProducts();
  }, [paramsKey, tCommon]);

  // Manual retry function for error state
  const handleRetry = useCallback(() => {
    fetchingRef.current = false;
    setLoading(true);
    const fetchProducts = async () => {
      setError(null);
      try {
        const queryString = buildApiQueryString(filters);
        // Pass auth: true so backend can return isFavorited status for logged-in users
        const response = await api.get<ProductsApiResponse>(`/products?${queryString}`, true);
        const productList = response.data || response.items || [];
        const responseMeta = response.meta || {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: productList.length,
          totalPages: 1,
        };
        setProducts(productList);
        setMeta(responseMeta);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError(tCommon("error"));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [filters, tCommon]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="container-main py-6 md:py-8">
          <h1 className="text-h1 text-gray-900 mb-1">{t("title")}</h1>
          <p className="text-body text-gray-500">
            {t("subtitle")}
          </p>
        </div>
      </section>

      <div className="container-main py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            <div className="sticky top-20 bg-white rounded-lg border border-gray-200 p-4">
              <FiltersPanel
                filters={filters}
                onFilterChange={updateFilters}
                onClearAll={handleClearAll}
              />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Mobile Filter Button + Sort Bar */}
            <div className="flex items-center gap-3 mb-4 md:hidden">
              <Button
                variant="secondary"
                onClick={() => setDrawerOpen(true)}
                className="gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {t("filters")}
              </Button>
            </div>

            {/* Sort Bar */}
            <SortBar
              currentSort={filters.sort}
              totalResults={meta.total}
              onSortChange={handleSortChange}
            />

            {/* Product Grid */}
            <div className="mt-6">
              {loading ? (
                <SkeletonProductGrid count={12} />
              ) : error ? (
                <EmptyState
                  type="error"
                  title={tCommon("error")}
                  description={error}
                  actionLabel={tCommon("tryAgain")}
                  onAction={handleRetry}
                />
              ) : products.length === 0 ? (
                <EmptyState
                  type="search"
                  title={t("noProductsFound")}
                  description={t("adjustFilters")}
                  actionLabel={tCommon("clearAll")}
                  onAction={handleClearAll}
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && !error && products.length > 0 && (
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPages}
                onPageChange={handlePageChange}
                disabled={loading}
              />
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onFilterChange={updateFilters}
        onClearAll={handleClearAll}
      />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<MarketplacePageSkeleton />}>
      <MarketplaceContent />
    </Suspense>
  );
}

function MarketplacePageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-white border-b border-gray-200">
        <div className="container-main py-6 md:py-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-72 bg-gray-100 rounded animate-pulse" />
        </div>
      </section>
      <div className="container-main py-6">
        <SkeletonProductGrid count={12} />
      </div>
    </div>
  );
}
