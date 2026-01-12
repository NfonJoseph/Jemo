"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { AdminOrder } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { StatusBadge, EmptyState } from "@/components/shared";
import { DeliveryStatusBadge } from "@/components/shared/delivery-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  ChevronLeft,
  User,
  Store,
  MapPin,
  Phone,
  CreditCard,
  Truck,
  Package,
} from "lucide-react";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const toast = useToast();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const orders = await api.get<AdminOrder[]>("/admin/orders", true);
      const found = orders.find((o) => o.id === orderId);
      setOrder(found || null);
    } catch (err) {
      console.error("Failed to load order:", err);
      toast.error("Failed to load order details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/orders"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Orders
        </Link>
        <EmptyState
          title="Order Not Found"
          description="This order may have been removed."
          actionLabel="View All Orders"
          actionHref="/admin/orders"
        />
      </div>
    );
  }

  const vendorName = order.items?.[0]?.product?.vendorProfile?.businessName || "Unknown Vendor";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-sm text-gray-500">Order</p>
            <h1 className="text-lg font-bold text-gray-900">
              #{order.id.slice(-8)}
            </h1>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Customer</h2>
        </div>
        <div className="space-y-2 text-sm">
          <p className="text-gray-900 font-medium">{order.customer?.name || "Unknown"}</p>
          <p className="text-gray-600">{order.customer?.phone || order.customer?.email}</p>
          <div className="flex items-start gap-2 pt-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <p className="text-gray-600">{order.deliveryAddress}</p>
          </div>
          {order.deliveryPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <p className="text-gray-600">{order.deliveryPhone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Vendor Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Store className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Vendor</h2>
        </div>
        <p className="text-gray-900 font-medium">{vendorName}</p>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Items</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {order.items?.map((item, index) => (
            <div key={item.id || index} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Package className="w-4 h-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {item.product?.name || "Product"}
                  </p>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900">
                {formatPrice(item.unitPrice)}
              </p>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="font-semibold text-gray-900">Total</span>
          <span className="font-bold text-lg text-jemo-orange">
            {formatPrice(order.totalAmount)}
          </span>
        </div>
      </div>

      {/* Payment Info */}
      {order.payment && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Payment</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{order.payment.paymentMethod}</p>
              <p className="text-sm font-medium text-gray-900">
                {formatPrice(order.payment.amount)}
              </p>
            </div>
            <StatusBadge status={order.payment.status} />
          </div>
        </div>
      )}

      {/* Delivery Info */}
      {order.delivery && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Truck className="w-5 h-5 text-jemo-orange" />
            </div>
            <h2 className="font-semibold text-gray-900">Delivery</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              {order.delivery.riderProfile?.user && (
                <p className="text-sm text-gray-900 font-medium">
                  {order.delivery.riderProfile.user.name}
                </p>
              )}
              {order.delivery.riderProfile?.user?.phone && (
                <p className="text-sm text-gray-600">
                  {order.delivery.riderProfile.user.phone}
                </p>
              )}
              {!order.delivery.riderProfile && (
                <p className="text-sm text-gray-500">No rider assigned</p>
              )}
            </div>
            <DeliveryStatusBadge status={order.delivery.status} />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-sm text-gray-500 text-center">
        Created: {new Date(order.createdAt).toLocaleString()}
      </div>
    </div>
  );
}

