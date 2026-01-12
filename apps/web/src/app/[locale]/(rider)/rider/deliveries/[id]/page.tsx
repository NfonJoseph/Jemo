"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { RiderDelivery, DeliveryStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { DeliveryStatusBadge } from "@/components/shared/delivery-status-badge";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  ChevronLeft,
  MapPin,
  Phone,
  Store,
  Package,
  User,
  Loader2,
  CheckCircle,
  Truck,
  Box,
} from "lucide-react";

const STATUS_TRANSITIONS: Partial<Record<DeliveryStatus, { next: DeliveryStatus; label: string; icon: React.ElementType }>> = {
  ASSIGNED: { next: "PICKED_UP", label: "Mark as Picked Up", icon: Box },
  PICKED_UP: { next: "ON_THE_WAY", label: "Start Delivery", icon: Truck },
  ON_THE_WAY: { next: "DELIVERED", label: "Mark as Delivered", icon: CheckCircle },
};

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const deliveryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [delivery, setDelivery] = useState<RiderDelivery | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadDelivery();
  }, [deliveryId]);

  const loadDelivery = async () => {
    setLoading(true);
    try {
      // Fetch from /me list and find by id
      const deliveries = await api.get<RiderDelivery[]>("/rider/deliveries/me", true);
      const found = deliveries.find((d) => d.id === deliveryId);
      setDelivery(found || null);
    } catch (err) {
      console.error("Failed to load delivery:", err);
      toast.error("Failed to load delivery details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: DeliveryStatus) => {
    if (!delivery) return;

    setUpdating(true);
    try {
      await api.patch(`/rider/deliveries/${deliveryId}/status`, { status: newStatus }, true);
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ").toLowerCase()}`);
      
      // Reload delivery to get updated state
      await loadDelivery();
      
      // If delivered, redirect to my deliveries
      if (newStatus === "DELIVERED") {
        setTimeout(() => {
          router.push("/rider/deliveries/me");
        }, 1500);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to update status");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="space-y-6">
        <Link
          href="/rider/deliveries/me"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to My Deliveries
        </Link>
        <EmptyState
          title="Delivery Not Found"
          description="This delivery may have been removed or you don't have access to it."
          actionLabel="View My Deliveries"
          actionHref="/rider/deliveries/me"
        />
      </div>
    );
  }

  const transition = STATUS_TRANSITIONS[delivery.status];
  const pickupAddress = delivery.pickupAddress || delivery.vendorProfile?.businessAddress || "Vendor location";
  const dropoffAddress = delivery.dropoffAddress || delivery.order?.deliveryAddress || "Customer location";
  const vendorName = delivery.vendorProfile?.businessName || "Vendor";
  const customerPhone = delivery.order?.deliveryPhone || delivery.order?.customer?.phone;
  const customerName = delivery.order?.customer?.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/rider/deliveries/me"
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-sm text-gray-500">Delivery</p>
            <h1 className="text-lg font-bold text-gray-900">
              #{delivery.id.slice(-8)}
            </h1>
          </div>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
      </div>

      {/* Status Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className={delivery.status === "ASSIGNED" ? "text-jemo-orange font-medium" : ""}>Assigned</span>
          <span className={delivery.status === "PICKED_UP" ? "text-jemo-orange font-medium" : ""}>Picked Up</span>
          <span className={delivery.status === "ON_THE_WAY" ? "text-jemo-orange font-medium" : ""}>On The Way</span>
          <span className={delivery.status === "DELIVERED" ? "text-green-600 font-medium" : ""}>Delivered</span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-jemo-orange rounded-full transition-all duration-300"
            style={{
              width:
                delivery.status === "ASSIGNED" ? "25%" :
                delivery.status === "PICKED_UP" ? "50%" :
                delivery.status === "ON_THE_WAY" ? "75%" :
                delivery.status === "DELIVERED" ? "100%" : "0%",
            }}
          />
        </div>
      </div>

      {/* Locations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {/* Vendor/Pickup */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Store className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">Pickup from</p>
              <p className="font-medium text-gray-900">{vendorName}</p>
              <p className="text-sm text-gray-600 mt-1">{pickupAddress}</p>
            </div>
          </div>
        </div>

        {/* Customer/Dropoff */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">Deliver to</p>
              {customerName && (
                <p className="font-medium text-gray-900">{customerName}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">{dropoffAddress}</p>
              {customerPhone && (
                <a
                  href={`tel:${customerPhone}`}
                  className="inline-flex items-center gap-1 text-sm text-jemo-orange mt-2 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {customerPhone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      {delivery.order?.items && delivery.order.items.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-900">Order Items</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {delivery.order.items.map((item, index) => (
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
              {formatPrice(delivery.order?.totalAmount || "0")}
            </span>
          </div>
        </div>
      )}

      {/* Action Button */}
      {transition && (
        <Button
          className="w-full h-14 text-lg bg-jemo-orange hover:bg-jemo-orange/90"
          onClick={() => handleStatusUpdate(transition.next)}
          disabled={updating}
        >
          {updating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <transition.icon className="w-5 h-5 mr-2" />
              {transition.label}
            </>
          )}
        </Button>
      )}

      {delivery.status === "DELIVERED" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Delivery Completed!</p>
          <p className="text-sm text-green-700 mt-1">
            {delivery.deliveredAt && `Delivered at ${new Date(delivery.deliveredAt).toLocaleString()}`}
          </p>
        </div>
      )}
    </div>
  );
}

