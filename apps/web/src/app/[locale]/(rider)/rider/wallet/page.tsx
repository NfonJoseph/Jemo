"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "@/lib/translations";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  Wallet,
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  RefreshCw,
  CheckCircle2,
  Truck,
  Settings,
  X,
  AlertCircle,
  Banknote,
} from "lucide-react";

interface AgencyWalletSummary {
  walletId: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  withdrawalsLocked: boolean;
  lockReason?: string;
  recentTransactions: WalletTransaction[];
  pendingPayouts: any[];
}

interface WalletTransaction {
  id: string;
  type: "CREDIT_PENDING" | "CREDIT_AVAILABLE" | "DEBIT_WITHDRAWAL" | "REVERSAL";
  amount: number;
  currency: string;
  referenceType: "ORDER" | "PAYOUT" | "ADJUSTMENT";
  referenceId: string;
  status: string;
  note?: string;
  createdAt: string;
}

interface PayoutProfile {
  preferredMethod: "CM_MOMO" | "CM_OM";
  phone: string;
  fullName: string;
  updatedAt: string;
}

// Minimum withdrawal amount in XAF
const MIN_WITHDRAWAL = 500;

export default function RiderWalletPage() {
  const t = useTranslations("rider.wallet");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<AgencyWalletSummary | null>(null);
  const [payoutProfile, setPayoutProfile] = useState<PayoutProfile | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Withdrawal form state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  // Load wallet and payout profile
  useEffect(() => {
    async function loadData() {
      try {
        const [walletRes, profileRes] = await Promise.all([
          api.get<AgencyWalletSummary>("/agency/wallet/summary", true),
          api.get<{ exists: boolean; profile: PayoutProfile | null }>("/agency/wallet/payout-profile", true),
        ]);
        setWallet(walletRes);
        if (profileRes.exists && profileRes.profile) {
          setPayoutProfile(profileRes.profile);
        }
      } catch (err) {
        console.error("Failed to load wallet:", err);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            toast.error("Session expired. Please log in again.");
            return;
          }
          if (err.status === 403) {
            toast.error("You don't have access to this page.");
            return;
          }
          const errorData = err.data as { message?: string } | null;
          toast.error(errorData?.message || "Failed to load wallet data");
        } else {
          toast.error("Failed to load wallet data");
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [toast]);

  // Get transaction type icon
  const getTransactionIcon = (type: WalletTransaction["type"]) => {
    switch (type) {
      case "CREDIT_AVAILABLE":
        return <ArrowDownCircle className="w-5 h-5 text-green-600" />;
      case "CREDIT_PENDING":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "DEBIT_WITHDRAWAL":
        return <ArrowUpCircle className="w-5 h-5 text-red-600" />;
      case "REVERSAL":
        return <RefreshCw className="w-5 h-5 text-gray-600" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-400" />;
    }
  };

  // Format transaction amount with sign
  const formatTransactionAmount = (tx: WalletTransaction) => {
    const isCredit = tx.type === "CREDIT_AVAILABLE" || tx.type === "CREDIT_PENDING";
    const sign = isCredit ? "+" : "-";
    const color = isCredit ? "text-green-600" : "text-red-600";
    return (
      <span className={`font-medium ${color}`}>
        {sign}{formatPrice(tx.amount)}
      </span>
    );
  };

  // Get transaction type label
  const getTransactionTypeLabel = (type: WalletTransaction["type"]) => {
    switch (type) {
      case "CREDIT_AVAILABLE":
        return t("transactionTypes.creditAvailable");
      case "CREDIT_PENDING":
        return t("transactionTypes.creditPending");
      case "DEBIT_WITHDRAWAL":
        return t("transactionTypes.debitWithdrawal");
      case "REVERSAL":
        return t("transactionTypes.reversal");
      default:
        return type;
    }
  };

  // Get reference type label
  const getReferenceTypeLabel = (type: WalletTransaction["referenceType"]) => {
    switch (type) {
      case "ORDER":
        return t("referenceTypes.order");
      case "PAYOUT":
        return t("referenceTypes.payout");
      case "ADJUSTMENT":
        return t("referenceTypes.adjustment");
      default:
        return type;
    }
  };

  // Handle withdrawal submission
  const handleWithdraw = async () => {
    if (!payoutProfile || !wallet) return;

    const amount = parseInt(withdrawAmount, 10);

    // Validation
    if (!amount || isNaN(amount)) {
      setWithdrawError(t("withdrawModal.errors.amountRequired"));
      return;
    }
    if (amount < MIN_WITHDRAWAL) {
      setWithdrawError(t("withdrawModal.errors.amountTooLow", { min: MIN_WITHDRAWAL.toLocaleString() }));
      return;
    }
    if (amount > wallet.availableBalance) {
      setWithdrawError(t("withdrawModal.errors.insufficientBalance"));
      return;
    }

    setWithdrawing(true);
    setWithdrawError("");

    try {
      await api.post(
        "/agency/wallet/withdraw",
        {
          amount,
          note: "Withdrawal request",
        },
        true
      );

      toast.success(t("withdrawModal.success"));
      setShowWithdrawModal(false);
      setWithdrawAmount("");

      // Refresh wallet data
      const updatedWallet = await api.get<AgencyWalletSummary>("/agency/wallet/summary", true);
      setWallet(updatedWallet);
    } catch (err) {
      console.error("Withdrawal failed:", err);
      if (err instanceof ApiError) {
        const errorData = err.data as { message?: string } | null;
        setWithdrawError(errorData?.message || t("withdrawModal.error"));
      } else {
        setWithdrawError(t("withdrawModal.error"));
      }
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/rider`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {tCommon("back")}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-jemo-orange" />
            {t("title")}
          </h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Link href={`/${locale}/rider/payout-settings`}>
              <Button variant="outline" className="gap-2">
                <Settings className="w-4 h-4" />
                {t("payoutSettings")}
              </Button>
            </Link>
            <Button
              onClick={() => setShowWithdrawModal(true)}
              className="bg-jemo-orange hover:bg-jemo-orange/90 gap-2"
              disabled={!wallet || wallet.availableBalance < MIN_WITHDRAWAL || !payoutProfile}
            >
              <Banknote className="w-4 h-4" />
              {t("withdraw")}
            </Button>
          </div>
          {/* Show helpful message when button is disabled */}
          {wallet && wallet.availableBalance < MIN_WITHDRAWAL && (
            <p className="text-xs text-gray-500">
              {t("minBalanceRequired", { min: MIN_WITHDRAWAL.toLocaleString() })}
            </p>
          )}
        </div>
      </div>

      {/* Payout profile warning */}
      {!payoutProfile && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">{t("noPayoutProfile.title")}</h3>
            <p className="text-sm text-yellow-700 mt-1">{t("noPayoutProfile.description")}</p>
            <Link href={`/${locale}/rider/payout-settings`}>
              <Button size="sm" variant="outline" className="mt-2">
                {t("noPayoutProfile.action")}
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Available Balance */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">{t("availableBalance")}</p>
              <p className="text-3xl font-bold text-green-800 mt-2">
                {formatPrice(wallet?.availableBalance || 0)}
              </p>
              <p className="text-sm text-green-600 mt-1">{t("availableBalanceHelp")}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-700" />
            </div>
          </div>
        </div>

        {/* Pending Balance */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">{t("pendingBalance")}</p>
              <p className="text-3xl font-bold text-yellow-800 mt-2">
                {formatPrice(wallet?.pendingBalance || 0)}
              </p>
              <p className="text-sm text-yellow-600 mt-1">{t("pendingBalanceHelp")}</p>
            </div>
            <div className="p-3 bg-yellow-200 rounded-full">
              <Clock className="w-6 h-6 text-yellow-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Total Earnings Card */}
      <div className="bg-white rounded-lg p-6 border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-blue-700 font-medium">{t("totalEarnings")}</p>
            <p className="text-3xl font-bold text-blue-800 mt-2">
              {formatPrice(wallet?.totalEarnings || 0)}
            </p>
            <p className="text-sm text-blue-600 mt-1">{t("totalEarningsHelp")}</p>
          </div>
          <div className="p-3 bg-blue-200 rounded-full">
            <Truck className="w-6 h-6 text-blue-700" />
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t("recentTransactions")}</h2>
        </div>

        {wallet?.recentTransactions && wallet.recentTransactions.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {wallet.recentTransactions.map((tx) => (
              <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                <div className="p-2 bg-gray-100 rounded-full">
                  {getTransactionIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">
                    {getTransactionTypeLabel(tx.type)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getReferenceTypeLabel(tx.referenceType)} • {tx.referenceId.slice(-8)}
                  </p>
                  {tx.note && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{tx.note}</p>
                  )}
                </div>
                <div className="text-right">
                  {formatTransactionAmount(tx)}
                  <p className="text-sm text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">{t("noTransactions")}</p>
            <p className="text-sm text-gray-500 mt-1">{t("noTransactionsHelp")}</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex gap-3">
          <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">{t("howItWorks.title")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li>• {t("howItWorks.step1")}</li>
              <li>• {t("howItWorks.step2")}</li>
              <li>• {t("howItWorks.step3")}</li>
              <li>• {t("howItWorks.step4")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t("withdrawModal.title")}</h3>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount("");
                  setWithdrawError("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Payout profile summary */}
              {payoutProfile && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">{t("withdrawModal.destination")}</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {payoutProfile.preferredMethod === "CM_MOMO" ? "MTN Mobile Money" : "Orange Money"}
                  </p>
                  <p className="text-sm text-gray-600">{payoutProfile.phone}</p>
                  <p className="text-sm text-gray-600">{payoutProfile.fullName}</p>
                </div>
              )}

              {/* Available balance */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{t("withdrawModal.availableBalance")}</span>
                <span className="font-semibold text-green-600">
                  {formatPrice(wallet?.availableBalance || 0)}
                </span>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("withdrawModal.amountLabel")}
                </label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => {
                    setWithdrawAmount(e.target.value);
                    setWithdrawError("");
                  }}
                  placeholder={t("withdrawModal.amountPlaceholder")}
                  min={MIN_WITHDRAWAL}
                  max={wallet?.availableBalance || 0}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("withdrawModal.minAmount", { min: MIN_WITHDRAWAL.toLocaleString() })}
                </p>
              </div>

              {/* Error message */}
              {withdrawError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {withdrawError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-200">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount("");
                  setWithdrawError("");
                }}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                onClick={handleWithdraw}
                disabled={withdrawing || !withdrawAmount}
              >
                {withdrawing ? t("withdrawModal.processing") : t("withdrawModal.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
