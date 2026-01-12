/**
 * URL Query Params Helper for Marketplace Filters
 * URL is the source of truth for all filter state.
 */

export type SortOption = "relevance" | "newest" | "price_asc" | "price_desc";

export interface MarketplaceFilters {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

/**
 * Parse search params into typed filter object
 */
export function parseFilters(searchParams: URLSearchParams): MarketplaceFilters {
  const filters: MarketplaceFilters = {};

  const q = searchParams.get("q");
  if (q) filters.q = q;

  const category = searchParams.get("category");
  if (category) filters.category = category;

  const minPrice = searchParams.get("minPrice");
  if (minPrice) filters.minPrice = Number(minPrice);

  const maxPrice = searchParams.get("maxPrice");
  if (maxPrice) filters.maxPrice = Number(maxPrice);

  const sort = searchParams.get("sort") as SortOption | null;
  if (sort && ["relevance", "newest", "price_asc", "price_desc"].includes(sort)) {
    filters.sort = sort;
  }

  const page = searchParams.get("page");
  if (page) filters.page = Number(page);

  const limit = searchParams.get("limit");
  if (limit) filters.limit = Number(limit);

  return filters;
}

/**
 * Build a new URL string with updated query params.
 * Pass null/undefined to remove a param. Passing empty object clears all.
 */
export function setQueryParams(
  pathname: string,
  currentParams: URLSearchParams,
  updates: Partial<Record<string, string | number | null | undefined>>,
  resetPage = false
): string {
  const newParams = new URLSearchParams(currentParams.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
  }

  // Reset page to 1 when filters change
  if (resetPage && !updates.page) {
    newParams.delete("page");
  }

  const queryString = newParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

/**
 * Build API query string from filters
 */
export function buildApiQueryString(filters: MarketplaceFilters): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  params.set("limit", String(filters.limit || 12));

  return params.toString();
}

/**
 * Clear all marketplace filters - returns clean pathname
 */
export function clearAllFilters(pathname: string): string {
  return pathname;
}
