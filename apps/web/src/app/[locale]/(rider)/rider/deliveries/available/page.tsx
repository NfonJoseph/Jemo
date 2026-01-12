"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { RiderDelivery } from "@/lib/types";
import { DeliveryCard, DeliveryCardSkeleton } from "@/components/shared/delivery-card";
import { EmptyState } from "@/components/shared";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RefreshCw } from "lucide-react";

export default function AvailableDeliveriesPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<RiderDelivery[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<RiderDelivery[]>("/rider/deliveries/available", true);
      setDeliveries(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("KYC approval required to view deliveries");
      } else {
        console.error("Failed to load deliveries:", err);
        toast.error("Failed to load available deliveries");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (deliveryId: string) => {
    setAcceptingId(deliveryId);
    try {
      await api.post(`/rider/deliveries/${deliveryId}/accept`, {}, true);
      toast.success("Delivery accepted! Proceed to pickup.");
      router.push("/rider/deliveries/me");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to accept delivery");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/rider"
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Available Deliveries</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDeliveries}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Content */}
      {error ? (
        <EmptyState
          type="error"
          title="Cannot access deliveries"
          description={error}
          actionLabel="Go to Dashboard"
          actionHref="/rider"
        />
      ) : loading ? (
        <div className="space-y-4">
          <DeliveryCardSkeleton />
          <DeliveryCardSkeleton />
          <DeliveryCardSkeleton />
        </div>
      ) : deliveries.length === 0 ? (
        <EmptyState
          title="No Deliveries Available"
          description="Check back later for new delivery requests."
          actionLabel="Refresh"
          onAction={loadDeliveries}
        />
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              showAcceptButton
              onAccept={handleAccept}
              isAccepting={acceptingId === delivery.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

