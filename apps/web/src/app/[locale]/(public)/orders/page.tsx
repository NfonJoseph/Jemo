"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useTranslations, useLocale } from "@/lib/translations";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ChevronRight, Calendar, Truck, Store } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("orders");
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      router.push(`/${locale}/login?redirect=/orders`);
      return;
    }

    async function fetchOrders() {
      try {
        const data = await api.get<Order[]>("/orders/me", true);
        setOrders(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/${locale}/login?redirect=/orders`);
          return;
        }
        setError("Failed to load orders");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [isLoggedIn, authLoading, router, locale]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (authLoading || (!isLoggedIn && loading)) {
    return (
      <div className="py-6">
        <div className="container-main">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6">
        <div className="container-main">
          <h1 className="text-h2 text-gray-900 mb-6">{t("title")}</h1>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="error"
            title="Failed to load orders"
            description={error}
            actionLabel="Try Again"
            onAction={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="products"
            title={t("noOrders")}
            description={t("noOrdersText")}
            actionLabel={t("startShopping")}
            actionHref={`/${locale}/products`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="container-main">
        <h1 className="text-h2 text-gray-900 mb-6">{t("title")}</h1>

        <div className="space-y-4">
          {orders.map((order) => {
            const isJemoDelivery = order.deliveryMethod === "JEMO_RIDER";
            
            return (
              <Link
                key={order.id}
                href={`/${locale}/orders/${order.id}`}
                className="card block p-4 hover:shadow-card-hover transition-shadow tap-highlight-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-small text-gray-500 font-mono">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <StatusBadge status={order.status} />
                      {order.deliveryMethod && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isJemoDelivery 
                            ? "bg-purple-100 text-purple-700" 
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {isJemoDelivery ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                          {isJemoDelivery ? "Jemo" : "Vendor"}
                        </span>
                      )}
                    </div>

                    <p className="text-h3 text-jemo-orange font-bold mb-1">
                      {formatPrice(order.totalAmount)}
                    </p>

                    <div className="flex items-center gap-1 text-small text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
