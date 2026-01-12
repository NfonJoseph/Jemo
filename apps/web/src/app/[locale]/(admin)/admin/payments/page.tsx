"use client";

import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { AdminPayment, PaymentStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  CreditCard,
  RefreshCw,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

const STATUS_FILTERS: { value: PaymentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "INITIATED", label: "Initiated" },
  { value: "SUCCESS", label: "Success" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

export default function AdminPaymentsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("INITIATED");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const data = await api.get<AdminPayment[]>(`/admin/payments${params}`, true);
      setPayments(data);
    } catch (err) {
      console.error("Failed to load payments:", err);
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/payments/${id}/confirm`, {}, true);
      toast.success("Payment confirmed");
      loadPayments();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to confirm payment");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleFail = async (id: string) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/payments/${id}/fail`, {}, true);
      toast.success("Payment marked as failed");
      loadPayments();
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to update payment");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const isCOD = (method: string) => method?.toUpperCase() === "COD";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="w-6 h-6 text-jemo-orange" />
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
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
          onClick={loadPayments}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="No payments match the selected filter."
        />
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(payment.amount)}
                    </p>
                    <StatusBadge status={payment.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    Payment #{payment.id.slice(-8)} • Order #{payment.orderId.slice(-8)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Method: {payment.paymentMethod}
                  </p>
                  {payment.order?.customer && (
                    <p className="text-sm text-gray-500">
                      Customer: {payment.order.customer.name || payment.order.customer.phone}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    Created: {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {payment.status === "INITIATED" && (
                  <div className="flex items-center gap-2">
                    {isCOD(payment.paymentMethod) ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <AlertCircle className="w-4 h-4" />
                        <span>COD - Confirm on delivery</span>
                      </div>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleConfirm(payment.id)}
                          disabled={processingId === payment.id}
                        >
                          {processingId === payment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Confirm
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleFail(payment.id)}
                          disabled={processingId === payment.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Fail
                        </Button>
                      </>
                    )}
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

