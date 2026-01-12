"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { VendorOrder, OrderStatus } from "@/lib/types";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  ChevronLeft,
  Package,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  Loader2,
  CheckCircle,
  Truck,
} from "lucide-react";

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus | null> = {
  PENDING_PAYMENT: null,
  CONFIRMED: "PREPARING",
  PREPARING: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: null,
  DELIVERED: null,
  CANCELLED: null,
};

const STATUS_BUTTON_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "",
  CONFIRMED: "Start Preparing",
  PREPARING: "Ready for Delivery",
  OUT_FOR_DELIVERY: "",
  DELIVERED: "",
  CANCELLED: "",
};

export default function VendorOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const orders = await api.get<VendorOrder[]>("/vendor/orders", true);
        const found = orders.find((o) => o.id === params.id);
        if (found) {
          setOrder(found);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [params.id]);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    try {
      await api.patch(`/vendor/orders/${order.id}/status`, { status: newStatus }, true);
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success("Order status updated successfully!");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to update status");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const nextStatus = order ? STATUS_TRANSITIONS[order.status] : null;
  const nextStatusLabel = order ? STATUS_BUTTON_LABELS[order.status] : "";

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        type="error"
        title="Order not found"
        description="The order you're looking for doesn't exist or you don't have access."
        actionLabel="Back to Orders"
        actionHref="/vendor/orders"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/vendor/orders"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Orders</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-gray-400" />
              <h1 className="text-h2 text-gray-900">
                Order #{order.id.slice(-8).toUpperCase()}
              </h1>
            </div>
            <div className="flex items-center gap-1 text-small text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>Placed on {formatDate(order.createdAt)}</span>
            </div>
          </div>
          <StatusBadge status={order.status} className="self-start sm:self-auto" />
        </div>
      </div>

      {/* Status Update Section */}
      {nextStatus && nextStatusLabel && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">Update Order Status</p>
              <p className="text-sm text-gray-600">
                {order.status === "CONFIRMED"
                  ? "Start preparing this order"
                  : "Mark this order as ready for delivery"}
              </p>
            </div>
            <Button
              onClick={() => handleStatusUpdate(nextStatus)}
              disabled={updating}
              className="bg-jemo-orange hover:bg-jemo-orange/90"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  {order.status === "CONFIRMED" ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <Truck className="w-4 h-4 mr-2" />
                  )}
                  {nextStatusLabel}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h2 className="text-h3 text-gray-900 mb-4">Order Items</h2>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                    <Image
                      src={item.product?.images?.[0]?.url || "/placeholder-product.svg"}
                      alt={item.product?.name || "Product"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-1">
                      {item.product?.name || "Product"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                    <p className="font-semibold text-jemo-orange">
                      {formatPrice(parseFloat(item.unitPrice) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Delivery Info */}
          <div className="card p-4">
            <h2 className="text-h3 text-gray-900 mb-4">Customer & Delivery</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Customer Phone</p>
                  <p className="text-gray-900">
                    {order.customer?.phone || order.deliveryPhone || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Delivery Address</p>
                  <p className="text-gray-900">{order.deliveryAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-4 sticky top-24">
            <h2 className="text-h3 text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between text-body">
                <span className="text-gray-500">
                  Items ({order.items?.length || 0})
                </span>
                <span className="text-gray-900">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>

            <div className="flex justify-between text-h3 mb-6">
              <span className="text-gray-900">Total</span>
              <span className="text-jemo-orange font-bold">
                {formatPrice(order.totalAmount)}
              </span>
            </div>

            {/* Payment Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Payment</span>
              </div>
              <p className="text-gray-900 font-medium">
                {order.payment?.paymentMethod === "COD"
                  ? "Pay on Delivery"
                  : order.payment?.paymentMethod || "Pay on Delivery"}
              </p>
              {order.payment && (
                <div className="mt-2">
                  <StatusBadge status={order.payment.status} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

