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
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Eye,
} from "lucide-react";

// Types
type ProductStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";

interface AdminProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  stockStatus: string;
  city: string;
  category: { id: string; slug: string; nameEn: string; nameFr: string } | null;
  dealType: "TODAYS_DEAL" | "FLASH_SALE";
  status: ProductStatus;
  condition: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
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
const STATUS_TABS: { value: ProductStatus | "ALL"; label: string; icon: React.ReactNode }[] = [
  { value: "PENDING_APPROVAL", label: "Pending Review", icon: <Clock className="w-4 h-4" /> },
  { value: "APPROVED", label: "Approved", icon: <CheckCircle className="w-4 h-4" /> },
  { value: "REJECTED", label: "Rejected", icon: <XCircle className="w-4 h-4" /> },
  { value: "SUSPENDED", label: "Suspended", icon: <Ban className="w-4 h-4" /> },
  { value: "ALL", label: "All Products", icon: <Tag className="w-4 h-4" /> },
];

// Status Badge Component
function StatusBadge({ status }: { status: ProductStatus }) {
  const config: Record<ProductStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    PENDING_APPROVAL: { bg: "bg-yellow-100", text: "text-yellow-700", icon: <Clock className="w-3 h-3" />, label: "Pending" },
    APPROVED: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle className="w-3 h-3" />, label: "Approved" },
    REJECTED: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-3 h-3" />, label: "Rejected" },
    SUSPENDED: { bg: "bg-gray-100", text: "text-gray-700", icon: <Ban className="w-3 h-3" />, label: "Suspended" },
  };
  const { bg, text, icon, label } = config[status] || config.PENDING_APPROVAL;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
}

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
  const [actionModal, setActionModal] = useState<{ type: "approve" | "reject" | "suspend" | "delete"; productId: string } | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Prevent duplicate requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Filters from URL
  const page = parseInt(searchParams.get("page") || "1", 10);
  const q = searchParams.get("q") || "";
  const status = (searchParams.get("status") as ProductStatus | "ALL") || "PENDING_APPROVAL";

  // Stable params key
  const paramsKey = useMemo(() => searchParams.toString(), [searchParams]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
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
      if (status && status !== "ALL") params.set("status", status);

      const response = await api.get<ProductsResponse>(`/admin/products?${params.toString()}`, true);
      setProducts(response.data);
      setMeta(response.meta);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const errorMessage = err instanceof Error ? err.message : "Failed to load products";
      console.error("Failed to fetch products:", err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, q, status]);

  useEffect(() => {
    fetchProducts();
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
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    if (!updates.page) {
      params.delete("page");
    }
    router.push(`/${locale}/admin/products?${params.toString()}`);
  };

  // Approve product
  const handleApprove = async (productId: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/products/${productId}/approve`, {}, true);
      toast.success("Product approved successfully");
      setActionModal(null);
      fetchProducts();
    } catch (err) {
      console.error("Failed to approve:", err);
      toast.error("Failed to approve product");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject product
  const handleReject = async (productId: string) => {
    if (!rejectComment.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/admin/products/${productId}/reject`, { comment: rejectComment.trim() }, true);
      toast.success("Product rejected");
      setActionModal(null);
      setRejectComment("");
      fetchProducts();
    } catch (err) {
      console.error("Failed to reject:", err);
      toast.error("Failed to reject product");
    } finally {
      setActionLoading(false);
    }
  };

  // Suspend product
  const handleSuspend = async (productId: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/products/${productId}/suspend`, { comment: rejectComment.trim() || "Suspended by admin" }, true);
      toast.success("Product suspended");
      setActionModal(null);
      setRejectComment("");
      fetchProducts();
    } catch (err) {
      console.error("Failed to suspend:", err);
      toast.error("Failed to suspend product");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete product
  const handleDelete = async (productId: string) => {
    setActionLoading(true);
    try {
      await api.delete(`/admin/products/${productId}`, true);
      toast.success("Product deleted");
      setActionModal(null);
      fetchProducts();
    } catch (err) {
      console.error("Failed to delete:", err);
      toast.error("Failed to delete product");
    } finally {
      setActionLoading(false);
    }
  };

  // Get status counts for tabs (from current page - could be improved with API)
  const getTabCount = (tabStatus: ProductStatus | "ALL") => {
    if (tabStatus === "ALL") return meta.total;
    return tabStatus === status ? meta.total : "?";
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

      {/* Status Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => updateParams({ status: tab.value === "PENDING_APPROVAL" ? null : tab.value })}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                status === tab.value || (tab.value === "PENDING_APPROVAL" && !searchParams.get("status"))
                  ? "bg-jemo-orange text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={q}
            onChange={(e) => updateParams({ q: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
          />
        </div>
      </div>

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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load products</h3>
            <p className="text-gray-500 mb-4 max-w-md mx-auto">{error}</p>
            <Button onClick={fetchProducts} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} width={48} height={48} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Tag className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[200px]">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{product.vendorBusinessName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{formatPrice(product.price)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status} />
                      {product.rejectionReason && (
                        <p className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={product.rejectionReason}>
                          {product.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{new Date(product.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${locale}/admin/products/${product.id}/edit`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>

                        {product.status === "PENDING_APPROVAL" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setActionModal({ type: "approve", productId: product.id })}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setActionModal({ type: "reject", productId: product.id })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {product.status === "APPROVED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-700"
                            onClick={() => setActionModal({ type: "suspend", productId: product.id })}
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setActionModal({ type: "delete", productId: product.id })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
              Showing {(meta.page - 1) * meta.pageSize + 1} to {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={meta.page <= 1} onClick={() => updateParams({ page: String(meta.page - 1) })}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-600">{meta.page} / {meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => updateParams({ page: String(meta.page + 1) })}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modals */}
      {actionModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => !actionLoading && setActionModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl p-6 z-50 w-[90%] max-w-md">
            {actionModal.type === "approve" && (
              <>
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Approve Product</h3>
                    <p className="text-sm text-gray-600 mt-1">This product will become visible on the public marketplace.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(actionModal.productId)} disabled={actionLoading}>
                    {actionLoading ? "Approving..." : "Approve"}
                  </Button>
                </div>
              </>
            )}

            {actionModal.type === "reject" && (
              <>
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Reject Product</h3>
                    <p className="text-sm text-gray-600 mt-1">Please provide a reason for rejection. The vendor will see this message.</p>
                  </div>
                </div>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Enter rejection reason (required)..."
                  className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleReject(actionModal.productId)} disabled={actionLoading || !rejectComment.trim()}>
                    {actionLoading ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              </>
            )}

            {actionModal.type === "suspend" && (
              <>
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Ban className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Suspend Product</h3>
                    <p className="text-sm text-gray-600 mt-1">This product will be hidden from the marketplace.</p>
                  </div>
                </div>
                <textarea
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="Enter reason (optional)..."
                  className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  rows={2}
                />
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button className="flex-1 bg-gray-600 hover:bg-gray-700" onClick={() => handleSuspend(actionModal.productId)} disabled={actionLoading}>
                    {actionLoading ? "Suspending..." : "Suspend"}
                  </Button>
                </div>
              </>
            )}

            {actionModal.type === "delete" && (
              <>
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Delete Product</h3>
                    <p className="text-sm text-gray-600 mt-1">This action cannot be undone. Products with orders will be suspended instead.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setActionModal(null)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => handleDelete(actionModal.productId)} disabled={actionLoading}>
                    {actionLoading ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
