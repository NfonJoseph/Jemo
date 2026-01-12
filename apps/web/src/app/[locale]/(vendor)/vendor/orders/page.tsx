"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { VendorOrder } from "@/lib/types";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Calendar, Phone, ChevronRight } from "lucide-react";

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api.get<VendorOrder[]>("/vendor/orders", true);
        setOrders(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setError("KYC required to access orders");
        } else {
          setError("Failed to load orders");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        type="error"
        title="Cannot access orders"
        description={error}
        actionLabel="Go to Dashboard"
        actionHref="/vendor"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-6 h-6 text-gray-400" />
        <h1 className="text-h1 text-gray-900">Orders</h1>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <EmptyState
          type="empty"
          title="No orders yet"
          description="Orders will appear here when customers purchase your products"
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/vendor/orders/${order.id}`}
              className="card p-4 block hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Order ID & Status */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{order.customer?.phone || order.deliveryPhone || "N/A"}</span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>

                  {/* Items Summary */}
                  <p className="text-sm text-gray-500 mt-2">
                    {order.items?.length || 0} item(s)
                  </p>
                </div>

                {/* Total & Arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-jemo-orange">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

