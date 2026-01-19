"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "@/lib/translations";
import { ProductCard, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/lib/types";

interface FavoriteItem {
  id: string;
  productId: string;
  createdAt: string;
  product: Product;
}

interface FavoritesResponse {
  data: FavoriteItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("header");
  const tEmpty = useTranslations("empty");
  const tCommon = useTranslations("common");
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      router.push(`/${locale}/login?redirect=/favorites`);
      return;
    }

    fetchFavorites();
  }, [isLoggedIn, authLoading, router, locale, page]);

  const fetchFavorites = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await api.get<FavoritesResponse>(`/favorites?page=${page}&pageSize=20`, true);
      
      if (page === 1) {
        setFavorites(result.data);
      } else {
        setFavorites((prev) => [...prev, ...result.data]);
      }
      
      setTotalCount(result.pagination.total);
      setHasMore(page < result.pagination.totalPages);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/${locale}/login?redirect=/favorites`);
        return;
      }
      console.error("Failed to fetch favorites:", err);
      setError("Failed to load favorites");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId: string) => {
    try {
      await api.delete(`/favorites/${productId}`, true);
      setFavorites((prev) => prev.filter((f) => f.productId !== productId));
      setTotalCount((prev) => prev - 1);
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    }
  };

  // Loading state
  if (authLoading || (!isLoggedIn && loading)) {
    return (
      <div className="py-6">
        <div className="container-main">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="error"
            title={tCommon("error")}
            description={error}
            actionLabel={tCommon("tryAgain")}
            onAction={fetchFavorites}
          />
        </div>
      </div>
    );
  }

  // Empty state
  if (!loading && favorites.length === 0) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="favorites"
            title={tEmpty("favorites")}
            description={tEmpty("favoritesText")}
            actionLabel={tCommon("viewAll")}
            actionHref={`/${locale}/products`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="container-main">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-jemo-orange" />
            <h1 className="text-h2 text-gray-900">{t("favorites")}</h1>
            {totalCount > 0 && (
              <span className="text-sm text-gray-500">({totalCount})</span>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {favorites.map((favorite) => (
            <div key={favorite.id} className="relative group">
              <ProductCard
                product={{
                  ...favorite.product,
                  isFavorited: true, // These are all favorited
                }}
              />
              {/* Remove button overlay */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFavorite(favorite.productId)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label="Remove from favorites"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="mt-8 text-center">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Load More
            </Button>
          </div>
        )}

        {/* Loading more indicator */}
        {loading && favorites.length > 0 && (
          <div className="mt-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-jemo-orange" />
          </div>
        )}
      </div>
    </div>
  );
}
