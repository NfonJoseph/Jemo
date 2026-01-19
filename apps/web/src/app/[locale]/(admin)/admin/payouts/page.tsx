"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "@/lib/translations";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { useToast } from "@/components/ui/toaster";
import {
  Wallet,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  X,
} from "lucide-react";

type PayoutStatus = "REQUESTED" | "PROCESSING" | "SUCCESS" | "FAILED";

interface PayoutVendor {
  id: string;
  businessName: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface PayoutWallet {
  availableBalance: number;
  pendingBalance: number;
  withdrawalsLocked: boolean;
}

interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  method: "CM_MOMO" | "CM_OM";
  destinationPhone: string;
  appTransactionRef: string;
  providerRef: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  vendor: PayoutVendor;
  wallet: PayoutWallet;
}

interface PayoutStats {
  totalPayouts: number;
  byStatus: {
    requested: number;
    processing: number;
    success: number;
    failed: number;
  };
  totalPaidOutAmount: number;
  lockedWallets: number;
}

export default function AdminPayoutsPage() {
  const t = useTranslations("admin.payouts");
  const tCommon = useTranslations("common");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Lock modal state
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockVendorId, setLockVendorId] = useState<string | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [locking, setLocking] = useState(false);

  // Retry state
  const [retrying, setRetrying] = useState<string | null>(null);

  const loadPayouts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const res = await api.get<{
        payouts: Payout[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
      }>(`/admin/payouts?${params}`, true);

      setPayouts(res.payouts);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error("Failed to load payouts:", err);
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, toast]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<PayoutStats>("/admin/payouts/stats", true);
      setStats(res);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  useEffect(() => {
    loadPayouts();
    loadStats();
  }, [loadPayouts, loadStats]);

  const handleRetry = async (payoutId: string) => {
    if (!confirm(t("retry.confirm"))) return;

    setRetrying(payoutId);
    try {
      await api.post(`/admin/payouts/${payoutId}/retry`, {}, true);
      toast.success(t("retry.success"));
      loadPayouts();
      loadStats();
    } catch (err) {
      console.error("Retry failed:", err);
      if (err instanceof ApiError) {
        toast.error(err.message || t("retry.error"));
      } else {
        toast.error(t("retry.error"));
      }
    } finally {
      setRetrying(null);
    }
  };

  const handleLock = async () => {
    if (!lockVendorId || lockReason.length < 10) return;

    setLocking(true);
    try {
      await api.post(
        `/admin/payouts/vendors/${lockVendorId}/lock`,
        { reason: lockReason },
        true
      );
      toast.success(t("lock.success"));
      setShowLockModal(false);
      setLockVendorId(null);
      setLockReason("");
      loadPayouts();
      loadStats();
    } catch (err) {
      console.error("Lock failed:", err);
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to lock withdrawals");
      }
    } finally {
      setLocking(false);
    }
  };

  const handleUnlock = async (vendorId: string) => {
    try {
      await api.post(`/admin/payouts/vendors/${vendorId}/unlock`, {}, true);
      toast.success(t("lock.unlockSuccess"));
      loadPayouts();
      loadStats();
    } catch (err) {
      console.error("Unlock failed:", err);
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to unlock withdrawals");
      }
    }
  };

  const getStatusIcon = (status: PayoutStatus) => {
    switch (status) {
      case "REQUESTED":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "PROCESSING":
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case "SUCCESS":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "FAILED":
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 text-gray-900 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-jemo-orange" />
          {t("title")}
        </h1>
        <p className="text-gray-600 mt-1">{t("subtitle")}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <TrendingUp className="w-4 h-4" />
              {t("stats.totalPaidOut")}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(stats.totalPaidOutAmount)}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm text-yellow-600 mb-1">
              <Clock className="w-4 h-4" />
              {t("stats.processing")}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.byStatus.requested + stats.byStatus.processing}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm text-red-600 mb-1">
              <XCircle className="w-4 h-4" />
              {t("stats.failed")}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.byStatus.failed}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 text-sm text-orange-600 mb-1">
              <Lock className="w-4 h-4" />
              {t("stats.lockedWallets")}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.lockedWallets}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "REQUESTED", "PROCESSING", "SUCCESS", "FAILED"] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
            className={statusFilter === status ? "bg-jemo-orange hover:bg-jemo-orange/90" : ""}
          >
            {status === "ALL" ? t("filters.all") : t(`filters.${status.toLowerCase()}`)}
          </Button>
        ))}
      </div>

      {/* Payouts Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{t("noPayouts")}</p>
            <p className="text-sm text-gray-500">{t("noPayoutsDesc")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">
                    {t("table.vendor")}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">
                    {t("table.amount")}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">
                    {t("table.method")}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">
                    {t("table.status")}
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-600">
                    {t("table.date")}
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-gray-600">
                    {t("table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {payout.vendor.businessName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payout.vendor.user?.email || "—"}
                        </p>
                        {payout.wallet.withdrawalsLocked && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded mt-1">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{formatPrice(payout.amount)}</p>
                      <p className="text-sm text-gray-500">{payout.destinationPhone}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-sm">
                        {payout.method === "CM_MOMO" ? "MTN MoMo" : "Orange Money"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payout.status)}
                        <StatusBadge status={payout.status as "SUCCESS" | "FAILED"} />
                      </div>
                      {payout.failureReason && (
                        <p className="text-xs text-red-600 mt-1">{payout.failureReason}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-900">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(payout.createdAt).toLocaleTimeString()}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/payouts/${payout.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {payout.status === "FAILED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(payout.id)}
                            disabled={retrying === payout.id}
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${retrying === payout.id ? "animate-spin" : ""}`}
                            />
                          </Button>
                        )}
                        {payout.wallet.withdrawalsLocked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlock(payout.vendor.id)}
                          >
                            <Unlock className="w-4 h-4 text-green-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLockVendorId(payout.vendor.id);
                              setShowLockModal(true);
                            }}
                          >
                            <Lock className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {tCommon("previous")}
            </Button>
            <span className="text-sm text-gray-600">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {tCommon("next")}
            </Button>
          </div>
        )}
      </div>

      {/* Lock Modal */}
      {showLockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-h3 text-gray-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-600" />
                {t("lock.title")}
              </h3>
              <button
                onClick={() => {
                  setShowLockModal(false);
                  setLockVendorId(null);
                  setLockReason("");
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  This will prevent the vendor from making any withdrawals until unlocked.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("lock.reason")}
                </label>
                <Input
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder={t("lock.reasonPlaceholder")}
                  className={lockReason.length > 0 && lockReason.length < 10 ? "border-red-500" : ""}
                />
                {lockReason.length > 0 && lockReason.length < 10 && (
                  <p className="text-xs text-red-500 mt-1">
                    Reason must be at least 10 characters
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowLockModal(false);
                  setLockVendorId(null);
                  setLockReason("");
                }}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleLock}
                disabled={locking || lockReason.length < 10}
              >
                {locking ? <RefreshCw className="w-4 h-4 animate-spin" /> : t("lock.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
