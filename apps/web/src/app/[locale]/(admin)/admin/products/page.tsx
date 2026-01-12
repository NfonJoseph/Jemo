"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useTranslations, useLocale } from "@/lib/translations";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Zap,
  Tag,
  Check,
  X,
  MoreHorizontal,
  Filter,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// Types
interface AdminProduct {
  id: string;
  name: string;
  nameEn: string | null;
  nameFr: string | null;
  price: number;
  stock: number;
  category: string;
  dealType: "TODAYS_DEAL" | "FLASH_SALE";
  isActive: boolean;
  flashSalePrice: number | null;
  flashSaleDiscountPercent: number | null;
  createdAt: string;
  vendorBusinessName: string;
  imageUrl: string | null;
}

interface ProductsResponse {
  data: AdminProduct[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Constants
const PAGE_SIZE = 20;
const DEAL_TYPES = ["ALL", "TODAYS_DEAL", "FLASH_SALE"] as const;
const CATEGORIES = [
  "ALL",
  "ELECTRONICS",
  "FASHION",
  "HOME_GARDEN",
  "COMPUTING",
  "HEALTH_BEAUTY",
  "SUPERMARKET",
  "BABY_KIDS",
  "GAMING",
  "SPORTS_OUTDOORS",
  "AUTOMOTIVE",
  "BOOKS_STATIONERY",
  "OTHER",
] as const;

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const t = useTranslations("admin.products");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // State
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  // Prevent duplicate error toasts
  const lastErrorRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filters from URL
  const page = parseInt(searchParams.get("page") || "1", 10);
  const q = searchParams.get("q") || "";
  const dealType = searchParams.get("dealType") || "ALL";
  const category = searchParams.get("category") || "ALL";
  const isActive = searchParams.get("isActive");

  // Stable params key
  const paramsKey = useMemo(() => searchParams.toString(), [searchParams]);

  // Fetch products - NO toast/t in dependencies to prevent infinite loop
  const fetchProducts = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("pageSize", PAGE_SIZE.toString());
      if (q) params.set("q", q);
      if (dealType && dealType !== "ALL") params.set("dealType", dealType);
      if (category && category !== "ALL") params.set("category", category);
      if (isActive !== null && isActive !== undefined) params.set("isActive", isActive);

      const response = await api.get<ProductsResponse>(`/admin/products?${params.toString()}`, true);
      setProducts(response.data);
      setMeta(response.meta);
      lastErrorRef.current = null; // Reset error ref on success
    } catch (err) {
      // Don't handle aborted requests
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to load products";
      console.error("Failed to fetch products:", err);
      setError(errorMessage);
      
      // Only toast if this is a new error (prevent infinite loop)
      if (lastErrorRef.current !== errorMessage) {
        lastErrorRef.current = errorMessage;
        // Don't call toast here - show inline error instead
      }
    } finally {
      setLoading(false);
    }
  }, [page, q, dealType, category, isActive]); // Removed toast and t from dependencies

  useEffect(() => {
    fetchProducts();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [paramsKey, fetchProducts]);

  // Update URL params
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "ALL") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    // Reset to page 1 when filters change
    if (!updates.page) {
      params.delete("page");
    }
    router.push(`/${locale}/admin/products?${params.toString()}`);
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/products/${id}`, true);
      toast.success(t("deleteSuccess"));
      setDeleteConfirmId(null);
      fetchProducts();
    } catch (err) {
      console.error("Failed to delete product:", err);
      toast.error(t("deleteError"));
    }
  };

  // Bulk actions
  const handleBulkDealType = async (newDealType: "TODAYS_DEAL" | "FLASH_SALE") => {
    if (selectedIds.size === 0) return;
    try {
      await api.post("/admin/products/bulk/deal-type", {
        ids: Array.from(selectedIds),
        dealType: newDealType,
      }, true);
      toast.success(t("bulkUpdateSuccess"));
      setSelectedIds(new Set());
      setBulkAction(null);
      fetchProducts();
    } catch (err) {
      console.error("Failed to bulk update:", err);
      toast.error(t("bulkUpdateError"));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.post("/admin/products/bulk/delete", {
        ids: Array.from(selectedIds),
      }, true);
      toast.success(t("bulkDeleteSuccess"));
      setSelectedIds(new Set());
      setBulkAction(null);
      fetchProducts();
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      toast.error(t("bulkDeleteError"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
          <Link href={`/${locale}/admin/products/new`}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addProduct")}
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={q}
                onChange={(e) => updateParams({ q: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
              />
            </div>
          </div>

          {/* Deal Type */}
          <select
            value={dealType}
            onChange={(e) => updateParams({ dealType: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
          >
            {DEAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === "ALL" ? t("allDealTypes") : t(`dealType.${type}`)}
              </option>
            ))}
          </select>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => updateParams({ category: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "ALL" ? t("allCategories") : t(`category.${cat}`)}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={isActive ?? ""}
            onChange={(e) => updateParams({ isActive: e.target.value || null })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="true">{t("active")}</option>
            <option value="false">{t("inactive")}</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-blue-700">
            {t("selectedCount", { count: selectedIds.size })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAction("dealType")}
            >
              <Tag className="w-4 h-4 mr-1" />
              {t("changeDealType")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setBulkAction("delete")}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t("deleteSelected")}
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Modals */}
      {bulkAction === "dealType" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t("selectDealType")}</h3>
            <div className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleBulkDealType("TODAYS_DEAL")}
              >
                <Tag className="w-4 h-4 mr-2 text-blue-600" />
                {t("dealType.TODAYS_DEAL")}
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => handleBulkDealType("FLASH_SALE")}
              >
                <Zap className="w-4 h-4 mr-2 text-orange-600" />
                {t("dealType.FLASH_SALE")}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setBulkAction(null)}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      )}

      {bulkAction === "delete" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">{t("confirmBulkDelete")}</h3>
            <p className="text-gray-600 mb-4">
              {t("bulkDeleteWarning", { count: selectedIds.size })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBulkAction(null)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleBulkDelete}
              >
                {t("deleteSelected")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("fetchError")}</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">{error}</p>
            <Button onClick={fetchProducts} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {tCommon("tryAgain")}
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">{t("noProducts")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === products.length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("product")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("category")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("price")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("stock")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("dealType")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("status")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Tag className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {product.vendorBusinessName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {t(`category.${product.category}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-900">
                          {formatPrice(product.price)}
                        </span>
                        {product.flashSalePrice && (
                          <span className="block text-xs text-orange-600">
                            Flash: {formatPrice(product.flashSalePrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-sm font-medium",
                        product.stock > 10 ? "text-green-600" : product.stock > 0 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        product.dealType === "FLASH_SALE"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {product.dealType === "FLASH_SALE" ? (
                          <Zap className="w-3 h-3" />
                        ) : (
                          <Tag className="w-3 h-3" />
                        )}
                        {t(`dealType.${product.dealType}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      )}>
                        {product.isActive ? (
                          <>
                            <Check className="w-3 h-3" />
                            {t("active")}
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            {t("inactive")}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link href={`/${locale}/admin/products/${product.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        {deleteConfirmId === product.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => setDeleteConfirmId(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {t("showing", { 
                from: (meta.page - 1) * meta.pageSize + 1, 
                to: Math.min(meta.page * meta.pageSize, meta.total), 
                total: meta.total 
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page <= 1}
                onClick={() => updateParams({ page: String(meta.page - 1) })}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={meta.page >= meta.totalPages}
                onClick={() => updateParams({ page: String(meta.page + 1) })}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
