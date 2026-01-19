"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/translations";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { VendorWalletSummary, WalletTransaction, VendorPayoutProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  Wallet,
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Banknote,
  Settings,
} from "lucide-react";

// Minimum withdrawal amount in XAF
const MIN_WITHDRAWAL = 1000;

export default function VendorWalletPage() {
  const t = useTranslations("vendor.wallet");
  const tCommon = useTranslations("common");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<VendorWalletSummary | null>(null);
  const [payoutProfile, setPayoutProfile] = useState<VendorPayoutProfile | null>(null);
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
          api.get<VendorWalletSummary>("/vendor/wallet", true),
          api.get<{ 
            exists: boolean; 
            profile: {
              preferredMethod: 'CM_MOMO' | 'CM_OM';
              phone: string;
              fullName: string;
              updatedAt: string;
            } | null;
          }>("/vendor/payout-profile", true),
        ]);

        setWallet(walletRes);
        if (profileRes.exists && profileRes.profile) {
          setPayoutProfile({
            preferredMethod: profileRes.profile.preferredMethod,
            phone: profileRes.profile.phone,
            fullName: profileRes.profile.fullName,
            updatedAt: profileRes.profile.updatedAt,
          });
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
      setWithdrawError(t("withdrawModal.errors.amountTooLow", { min: MIN_WITHDRAWAL }));
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
        "/vendor/wallet/withdraw",
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
      const updatedWallet = await api.get<VendorWalletSummary>("/vendor/wallet", true);
      setWallet(updatedWallet);
    } catch (err) {
      console.error("Withdrawal failed:", err);
      if (err instanceof ApiError) {
        setWithdrawError(err.message || t("withdrawModal.error"));
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
        href="/vendor"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {tCommon("back")}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-gray-900 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-jemo-orange" />
            {t("title")}
          </h1>
          <p className="text-gray-600 mt-1">{t("subtitle")}</p>
        </div>

        {/* Withdraw Button */}
        {payoutProfile && wallet && wallet.availableBalance > 0 && (
          <Button
            onClick={() => setShowWithdrawModal(true)}
            className="bg-jemo-orange hover:bg-jemo-orange/90"
          >
            <Banknote className="w-4 h-4 mr-2" />
            {t("withdraw")}
          </Button>
        )}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Available Balance */}
        <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
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
        <div className="card p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
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

      {/* No Payout Profile Warning */}
      {!payoutProfile && (
        <div className="card p-6 bg-orange-50 border-orange-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-200 rounded-full">
              <Settings className="w-6 h-6 text-orange-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-800">{t("noPayoutProfile.title")}</h3>
              <p className="text-sm text-orange-700 mt-1">{t("noPayoutProfile.description")}</p>
              <Button asChild className="mt-4 bg-orange-600 hover:bg-orange-700">
                <Link href="/vendor/payout-settings">
                  {t("noPayoutProfile.action")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-h3 text-gray-900">{t("recentTransactions")}</h2>
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
                    {t(`transactionTypes.${tx.type}`)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t(`referenceTypes.${tx.referenceType}`)} • {tx.referenceId.slice(-8)}
                  </p>
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

      {/* Withdraw Modal */}
      {showWithdrawModal && payoutProfile && wallet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-h3 text-gray-900">{t("withdrawModal.title")}</h3>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount("");
                  setWithdrawError("");
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">{t("withdrawModal.amount")}</Label>
                <Input
                  id="amount"
                  type="number"
                  min={MIN_WITHDRAWAL}
                  max={wallet.availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => {
                    setWithdrawAmount(e.target.value);
                    setWithdrawError("");
                  }}
                  placeholder={t("withdrawModal.amountPlaceholder")}
                  className={withdrawError ? "border-red-500" : ""}
                />
                <p className="text-sm text-gray-500">
                  {t("withdrawModal.amountHelp", { max: formatPrice(wallet.availableBalance) })}
                </p>
              </div>

              {/* Method Display */}
              <div className="space-y-2">
                <Label>{t("withdrawModal.method")}</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 relative">
                    <Image
                      src={
                        payoutProfile.preferredMethod === "CM_MOMO"
                          ? "/MTN-MOMO-logo.png"
                          : "/Orange-money-logo.webp"
                      }
                      alt={payoutProfile.preferredMethod}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="font-medium">
                    {payoutProfile.preferredMethod === "CM_MOMO"
                      ? "MTN Mobile Money"
                      : "Orange Money"}
                  </span>
                </div>
              </div>

              {/* Destination Display */}
              <div className="space-y-2">
                <Label>{t("withdrawModal.destination")}</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{payoutProfile.fullName}</p>
                  <p className="text-sm text-gray-600">{payoutProfile.phone}</p>
                </div>
                <p className="text-sm text-gray-500">{t("withdrawModal.destinationHelp")}</p>
              </div>

              {/* Error Message */}
              {withdrawError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{withdrawError}</p>
                </div>
              )}

              {/* Summary */}
              {withdrawAmount && parseInt(withdrawAmount, 10) > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700">{t("withdrawModal.youReceive")}</span>
                    <span className="text-lg font-bold text-green-800">
                      {formatPrice(parseInt(withdrawAmount, 10))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex gap-3">
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
                {withdrawing ? t("withdrawModal.confirming") : t("withdrawModal.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
