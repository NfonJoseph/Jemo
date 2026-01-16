"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { VendorProduct, ProductStatus } from "@/lib/types";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { Plus, Pencil, Trash2, Package, AlertTriangle, Clock, CheckCircle, XCircle, Ban } from "lucide-react";

// Status badge component for product status
function StatusBadge({ status }: { status: ProductStatus }) {
  const config: Record<ProductStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    PENDING_APPROVAL: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      icon: <Clock className="w-3 h-3" />,
      label: "Pending Review",
    },
    APPROVED: {
      bg: "bg-green-100",
      text: "text-green-700",
      icon: <CheckCircle className="w-3 h-3" />,
      label: "Approved",
    },
    REJECTED: {
      bg: "bg-red-100",
      text: "text-red-700",
      icon: <XCircle className="w-3 h-3" />,
      label: "Rejected",
    },
    SUSPENDED: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      icon: <Ban className="w-3 h-3" />,
      label: "Suspended",
    },
  };

  const { bg, text, icon, label } = config[status] || config.PENDING_APPROVAL;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
}

export default function VendorProductsPage() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const fetchProducts = async () => {
    try {
      const data = await api.get<VendorProduct[]>("/vendor/products", true);
      setProducts(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("KYC required to access products");
      } else {
        setError("Failed to load products");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await api.delete(`/vendor/products/${deleteId}`, true);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success("Product deleted successfully");
    } catch (err) {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        type="error"
        title="Cannot access products"
        description={error}
        actionLabel="Go to Dashboard"
        actionHref="/vendor"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-h1 text-gray-900">My Products</h1>
        <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
          <Link href="/vendor/products/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <EmptyState
          type="empty"
          title="No products yet"
          description="Start selling by adding your first product"
          actionLabel="Add Product"
          actionHref="/vendor/products/new"
        />
      ) : (
        <div className="space-y-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="card p-4 flex gap-4 items-start"
            >
              {/* Product Image */}
              <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={product.images?.[0]?.url || "/placeholder-product.svg"}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/vendor/products/${product.id}/edit`}
                  className="font-medium text-gray-900 hover:text-jemo-orange line-clamp-1"
                >
                  {product.name}
                </Link>
                <p className="text-lg font-bold text-jemo-orange mt-1">
                  {formatPrice(product.price)}
                </p>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Stock: {product.stock}
                  </span>
                  <StatusBadge status={product.status} />
                </div>
                {product.status === "REJECTED" && product.rejectionReason && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{product.rejectionReason}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="icon" asChild>
                  <Link href={`/vendor/products/${product.id}/edit`}>
                    <Pencil className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteId(product.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setDeleteId(null)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 z-50 w-[90%] max-w-md">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Product</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Are you sure you want to delete this product? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

