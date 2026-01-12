"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { RiderDelivery } from "@/lib/types";
import { DeliveryCard, DeliveryCardSkeleton } from "@/components/shared/delivery-card";
import { EmptyState } from "@/components/shared";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RefreshCw } from "lucide-react";

export default function MyDeliveriesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<RiderDelivery[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<RiderDelivery[]>([]);

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<RiderDelivery[]>("/rider/deliveries/me", true);
      
      const active = data.filter(
        (d) => d.status !== "DELIVERED" && d.status !== "CANCELLED"
      );
      const completed = data.filter(
        (d) => d.status === "DELIVERED" || d.status === "CANCELLED"
      );
      
      setActiveDeliveries(active);
      setCompletedDeliveries(completed);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError("KYC approval required to view deliveries");
      } else {
        console.error("Failed to load deliveries:", err);
        toast.error("Failed to load your deliveries");
      }
    } finally {
      setLoading(false);
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
          <h1 className="text-xl font-bold text-gray-900">My Deliveries</h1>
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
        </div>
      ) : activeDeliveries.length === 0 && completedDeliveries.length === 0 ? (
        <EmptyState
          title="No Deliveries Yet"
          description="Accept available deliveries to get started."
          actionLabel="Find Deliveries"
          actionHref="/rider/deliveries/available"
        />
      ) : (
        <div className="space-y-8">
          {/* Active Deliveries */}
          {activeDeliveries.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Active ({activeDeliveries.length})
              </h2>
              <div className="space-y-4">
                {activeDeliveries.map((delivery) => (
                  <DeliveryCard key={delivery.id} delivery={delivery} />
                ))}
              </div>
            </section>
          )}

          {/* Completed Deliveries */}
          {completedDeliveries.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                History ({completedDeliveries.length})
              </h2>
              <div className="space-y-4">
                {completedDeliveries.map((delivery) => (
                  <DeliveryCard key={delivery.id} delivery={delivery} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

