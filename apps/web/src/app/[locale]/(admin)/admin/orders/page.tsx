"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminOrder, OrderStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useTranslations, useLocale } from "@/lib/translations";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  ShoppingBag,
  Search,
  ChevronRight,
  RefreshCw,
  Truck,
  Store,
  Calendar,
  XCircle,
} from "lucide-react";

export default function AdminOrdersPage() {
  const toast = useToast();
  const locale = useLocale();
  const t = useTranslations("admin.orders");
  const tStatus = useTranslations("statusBadge");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const STATUS_FILTERS: { value: OrderStatus | "ALL"; label: string }[] = [
    { value: "ALL", label: t("filters.all") },
    { value: "PENDING", label: t("filters.pending") },
    { value: "CONFIRMED", label: t("filters.confirmed") },
    { value: "IN_TRANSIT", label: t("filters.inTransit") },
    { value: "DELIVERED", label: t("filters.delivered") },
    { value: "COMPLETED", label: t("filters.completed") },
    { value: "CANCELLED", label: t("filters.cancelled") },
  ];

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const data = await api.get<AdminOrder[]>(`/admin/orders${params}`, true);
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.id.toLowerCase().includes(query) ||
      order.customer?.phone?.toLowerCase().includes(query) ||
      order.customer?.name?.toLowerCase().includes(query)
    );
  });

  const getVendorName = (order: AdminOrder): string => {
    const firstItem = order.items?.[0];
    return firstItem?.product?.vendorProfile?.businessName || "Unknown Vendor";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-6 h-6 text-jemo-orange" />
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                statusFilter === filter.value
                  ? "bg-jemo-orange text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadOrders}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </Button>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={t("noOrdersFound")}
          description={
            searchQuery
              ? t("noOrdersFoundSearch")
              : t("noOrdersFoundFilter")
          }
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("order")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("customer")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                    {t("vendor")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("total")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t("status")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">
                    {t("deliveryMethod")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden xl:table-cell">
                    {t("assignedAgency")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">
                    {t("date")}
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const isJemoDelivery = order.deliveryMethod === "JEMO_RIDER";
                  const isCancelled = order.status === "CANCELLED";
                  
                  return (
                    <tr key={order.id} className={`hover:bg-gray-50 ${isCancelled ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm font-mono">
                          #{order.id.slice(-8)}
                        </p>
                        {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            +{formatPrice(order.deliveryFee)} delivery
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{order.customer?.name || "—"}</p>
                        <p className="text-xs text-gray-500">{order.customer?.phone || order.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-600">{getVendorName(order)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-sm">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                        {isCancelled && order.cancelReason && (
                          <div className="mt-1 flex items-start gap-1">
                            <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-600 line-clamp-2" title={order.cancelReason}>
                              {order.cancelReason}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          isJemoDelivery ? "text-purple-700" : "text-gray-600"
                        }`}>
                          {isJemoDelivery ? (
                            <Truck className="w-3 h-3" />
                          ) : (
                            <Store className="w-3 h-3" />
                          )}
                          {t(`deliveryMethods.${order.deliveryMethod || "VENDOR_SELF"}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {order.deliveryJob?.agency ? (
                          <div>
                            <p className="text-sm text-gray-900 font-medium">
                              {order.deliveryJob.agency.name}
                            </p>
                            <StatusBadge status={order.deliveryJob.status} className="mt-0.5" />
                          </div>
                        ) : isJemoDelivery ? (
                          <span className="text-xs text-amber-600">{t("noAgency")}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(order.createdAt)}
                          </p>
                          {order.confirmedAt && (
                            <p className="text-xs text-blue-600">
                              ✓ {formatDate(order.confirmedAt)}
                            </p>
                          )}
                          {order.deliveredAt && (
                            <p className="text-xs text-green-600">
                              ✓ {formatDate(order.deliveredAt)}
                            </p>
                          )}
                          {order.cancelledAt && (
                            <p className="text-xs text-red-600">
                              ✗ {formatDate(order.cancelledAt)}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/${locale}/admin/orders/${order.id}`}>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
