"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { AdminDispute, DisputeStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  Loader2,
} from "lucide-react";

const STATUS_FILTERS: { value: DisputeStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function AdminDisputesPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [statusFilter, setStatusFilter] = useState<DisputeStatus | "ALL">("OPEN");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadDisputes();
  }, [statusFilter]);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const data = await api.get<AdminDispute[]>(`/admin/disputes${params}`, true);
      setDisputes(data);
    } catch (err) {
      console.error("Failed to load disputes:", err);
      toast.error("Failed to load disputes");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id: string) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/disputes/${id}/resolve`, {}, true);
      toast.success("Dispute resolved");
      loadDisputes();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to resolve dispute");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/disputes/${id}/reject`, {}, true);
      toast.success("Dispute rejected");
      loadDisputes();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to reject dispute");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-jemo-orange" />
        <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
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
        <Button
          variant="outline"
          size="sm"
          onClick={loadDisputes}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Disputes List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <EmptyState
          title="No disputes found"
          description={
            statusFilter === "OPEN"
              ? "No open disputes to review."
              : "No disputes match the selected filter."
          }
        />
      ) : (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900">
                      Dispute #{dispute.id.slice(-8)}
                    </p>
                    <StatusBadge status={dispute.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    Order #{dispute.orderId.slice(-8)}
                    {dispute.order?.totalAmount && ` • ${formatPrice(dispute.order.totalAmount)}`}
                  </p>
                  {(dispute.customer || dispute.order?.customer) && (
                    <p className="text-sm text-gray-500">
                      Customer: {dispute.customer?.name || dispute.order?.customer?.name || "Unknown"}
                      {(dispute.customer?.phone || dispute.order?.customer?.phone) && 
                        ` (${dispute.customer?.phone || dispute.order?.customer?.phone})`
                      }
                    </p>
                  )}
                  <div className="pt-2">
                    <p className="text-sm font-medium text-gray-700">Reason:</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {dispute.reason || "No reason provided"}
                    </p>
                  </div>
                  {dispute.resolution && (
                    <div className="pt-2">
                      <p className="text-sm font-medium text-gray-700">Resolution:</p>
                      <p className="text-sm text-gray-600 mt-1">{dispute.resolution}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 pt-2">
                    Created: {new Date(dispute.createdAt).toLocaleDateString()}
                    {dispute.resolvedAt && ` • Resolved: ${new Date(dispute.resolvedAt).toLocaleDateString()}`}
                  </p>
                </div>

                {dispute.status === "OPEN" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleResolve(dispute.id)}
                      disabled={processingId === dispute.id}
                    >
                      {processingId === dispute.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Resolve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleReject(dispute.id)}
                      disabled={processingId === dispute.id}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

