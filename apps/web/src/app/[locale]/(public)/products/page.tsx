"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { ProductCard, EmptyState, SkeletonProductGrid } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 12;

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addItem } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = searchParams.get("q") || "";
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      if (query) {
        params.set("q", query);
      }

      // Pass auth: true so backend can return isFavorited status for logged-in users
      const data = await api.get<Product[]>(`/products?${params}`, true);
      setProducts(data);
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (err) {
      setError("Failed to load products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
    setPage(1);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    router.push(`/products?${params}`);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentQuery = searchParams.get("q");

  return (
    <div className="py-6">
      <div className="container-main">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-h1 text-gray-900 mb-2">
            {currentQuery ? `Search: "${currentQuery}"` : "All Products"}
          </h1>
          <p className="text-body text-gray-500">
            {loading
              ? "Loading..."
              : `${products.length} product${products.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <Button type="submit">Search</Button>
          </div>
        </form>

        {/* Products Grid */}
        {loading ? (
          <SkeletonProductGrid count={ITEMS_PER_PAGE} />
        ) : error ? (
          <EmptyState
            type="error"
            title="Something went wrong"
            description={error}
            actionLabel="Try Again"
            onAction={fetchProducts}
          />
        ) : products.length === 0 ? (
          <EmptyState
            type="search"
            title={currentQuery ? "No results found" : "No products available"}
            description={
              currentQuery
                ? `We couldn't find any products matching "${currentQuery}". Try a different search term.`
                : "Check back soon for new products!"
            }
            actionLabel={currentQuery ? "Clear Search" : undefined}
            actionHref={currentQuery ? "/products" : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <span className="text-body text-gray-500">Page {page}</span>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={!hasMore}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

