"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { VendorOrder, OrderStatus } from "@/lib/types";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Calendar, Phone, ChevronRight, Truck, Store } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";

// Status hint based on order status
function getStatusHint(status: OrderStatus, deliveryMethod: string | undefined, t: (key: string) => string): string {
  switch (status) {
    case "PENDING":
      return t("statusHints.PENDING");
    case "CONFIRMED":
      return deliveryMethod === "JEMO_RIDER" ? t("statusHints.CONFIRMED") : t("statusHints.CONFIRMED");
    case "IN_TRANSIT":
      return t("statusHints.IN_TRANSIT");
    case "DELIVERED":
      return t("statusHints.DELIVERED");
    case "COMPLETED":
      return t("statusHints.COMPLETED");
    case "CANCELLED":
      return t("statusHints.CANCELLED");
    default:
      return "";
  }
}

export default function VendorOrdersPage() {
  const t = useTranslations("vendorOrders");
  const locale = useLocale();
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
    return new Date(dateString).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
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
        actionHref={`/${locale}/vendor`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-6 h-6 text-gray-400" />
        <h1 className="text-h1 text-gray-900">{t("title")}</h1>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <EmptyState
          type="empty"
          title={t("noOrders")}
          description={t("noOrdersDescription")}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/${locale}/vendor/orders/${order.id}`}
              className="card p-4 block hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Order ID & Status */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {t("orderNumber", { id: order.id.slice(-8).toUpperCase() })}
                    </span>
                    <StatusBadge status={order.status} />
                    {/* Delivery method badge */}
                    {order.deliveryMethod && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.deliveryMethod === "JEMO_RIDER" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {order.deliveryMethod === "JEMO_RIDER" ? (
                          <Truck className="w-3 h-3" />
                        ) : (
                          <Store className="w-3 h-3" />
                        )}
                        {t(`deliveryMethods.${order.deliveryMethod}`)}
                      </span>
                    )}
                  </div>

                  {/* Status hint */}
                  <p className="text-xs text-gray-500 mb-2">
                    {getStatusHint(order.status, order.deliveryMethod, t)}
                  </p>

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
                    {order.items?.length || 0} {t("items")}
                  </p>
                </div>

                {/* Total & Arrow */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-jemo-orange">
                      {formatPrice(order.totalAmount)}
                    </p>
                    {order.deliveryFee && order.deliveryFee > 0 && (
                      <p className="text-xs text-gray-500">
                        +{formatPrice(order.deliveryFee)} {t("deliveryFee").toLowerCase()}
                      </p>
                    )}
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
