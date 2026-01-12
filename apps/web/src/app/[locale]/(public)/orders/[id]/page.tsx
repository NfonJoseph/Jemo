"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  Package,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  Truck,
  Store,
} from "lucide-react";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const findOrderFromList = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      const orders = await api.get<Order[]>("/orders/me", true);
      const found = orders.find((o) => o.id === orderId);
      return found || null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw err;
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      router.push(`/login?redirect=/orders/${params.id}`);
      return;
    }

    async function fetchOrder() {
      const orderId = params.id as string;
      if (!orderId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch all user orders and find by ID
        let foundOrder = await findOrderFromList(orderId);

        // If not found immediately, retry once after 500ms (handles timing)
        if (!foundOrder) {
          if (process.env.NODE_ENV === "development") {
            console.log("[OrderDetail] Order not found, retrying in 500ms...");
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
          foundOrder = await findOrderFromList(orderId);
        }

        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          setError("Order not found");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            router.push(`/login?redirect=/orders/${params.id}`);
            return;
          }
          setError("Failed to load order details");
        } else {
          setError("Something went wrong");
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [params.id, isLoggedIn, authLoading, router, findOrderFromList]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || (!isLoggedIn && loading)) {
    return (
      <div className="py-6">
        <div className="container-main">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6">
        <div className="container-main">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="error"
            title="Order not found"
            description={error || "The order you're looking for doesn't exist or may still be processing."}
            actionLabel="View All Orders"
            actionHref="/orders"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="container-main">
        {/* Back button */}
        <Link
          href="/orders"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 tap-highlight-none"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-body">Back to Orders</span>
        </Link>

        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-4">
              <h2 className="text-h3 text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                      <Image
                        src={
                          item.product?.images?.[0]?.url ||
                          "/placeholder-product.svg"
                        }
                        alt={item.product?.name || "Product"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.productId}`}
                        className="text-body font-medium text-gray-900 hover:text-jemo-orange line-clamp-2"
                      >
                        {item.product?.name || "Product"}
                      </Link>
                      <p className="text-small text-gray-500 mt-1">
                        Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                      </p>
                      <p className="text-body font-semibold text-jemo-orange mt-1">
                        {formatPrice(
                          parseFloat(item.unitPrice) * item.quantity
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="card p-4">
              <h2 className="text-h3 text-gray-900 mb-4">Delivery Information</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-small text-gray-500">Delivery Address</p>
                    <p className="text-body text-gray-900">
                      {order.deliveryAddress || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-small text-gray-500">Contact Phone</p>
                    <p className="text-body text-gray-900">{order.deliveryPhone || "Not specified"}</p>
                  </div>
                </div>
                {order.delivery && (
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-small text-gray-500">Delivery Status</p>
                      <StatusBadge status={order.delivery.status} />
                    </div>
                  </div>
                )}
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
                    Subtotal ({order.items?.length || 0} items)
                  </span>
                  <span className="text-gray-900">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-body">
                  <span className="text-gray-500">Delivery</span>
                  <span className="text-gray-900">Included</span>
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
                  <span className="text-small text-gray-500">Payment Method</span>
                </div>
                <p className="text-body text-gray-900 font-medium">
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

              {/* Vendor Info */}
              {order.items?.[0]?.product?.vendorProfile && (
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-gray-400" />
                    <span className="text-small text-gray-500">Vendor</span>
                  </div>
                  <p className="text-body text-gray-900 font-medium">
                    {order.items[0].product.vendorProfile.businessName}
                  </p>
                  <p className="text-small text-gray-500">
                    {order.items[0].product.vendorProfile.businessAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
