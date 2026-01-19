"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useTranslations, useLocale } from "@/lib/translations";
import type { VendorProduct, VendorOrder, KycResponse, KycStatus } from "@/lib/types";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package,
  ShoppingBag,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  Wallet,
  Settings,
} from "lucide-react";

interface DashboardData {
  kycStatus: KycStatus;
  productCount: number;
  orderCount: number;
}

export default function VendorDashboardPage() {
  const t = useTranslations("vendorDashboard");
  const locale = useLocale();
  const [data, setData] = useState<DashboardData>({
    kycStatus: "NOT_SUBMITTED",
    productCount: 0,
    orderCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // STEP 1: Fetch KYC status FIRST
        let kycStatus: KycStatus = "NOT_SUBMITTED";
        try {
          const kycRes = await api.get<KycResponse>("/kyc/me", true);
          kycStatus = kycRes?.kycStatus || "NOT_SUBMITTED";
        } catch (err) {
          // 404 means no profile/submission yet
          if (err instanceof ApiError && err.status === 404) {
            kycStatus = "NOT_SUBMITTED";
          }
        }

        // STEP 2: Only fetch protected data if KYC is APPROVED
        let productCount = 0;
        let orderCount = 0;

        if (kycStatus === "APPROVED") {
          try {
            const [productsRes, ordersRes] = await Promise.allSettled([
              api.get<VendorProduct[]>("/vendor/products", true),
              api.get<VendorOrder[]>("/vendor/orders", true),
            ]);

            productCount =
              productsRes.status === "fulfilled" ? productsRes.value.length : 0;
            orderCount =
              ordersRes.status === "fulfilled" ? ordersRes.value.length : 0;
          } catch {
            // Silently handle - counts stay at 0
          }
        }

        setData({ kycStatus, productCount, orderCount });
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const getKycIcon = () => {
    switch (data.kycStatus) {
      case "APPROVED":
        return <CheckCircle2 className="w-8 h-8 text-status-success" />;
      case "REJECTED":
        return <XCircle className="w-8 h-8 text-status-error" />;
      case "PENDING":
        return <Clock className="w-8 h-8 text-status-warning" />;
      default:
        return <AlertTriangle className="w-8 h-8 text-gray-400" />;
    }
  };

  const getKycMessage = () => {
    switch (data.kycStatus) {
      case "APPROVED":
        return t("kyc.approvedMessage");
      case "REJECTED":
        return t("kyc.rejectedMessage");
      case "PENDING":
        return t("kyc.pendingMessage");
      default:
        return t("kyc.notSubmittedMessage");
    }
  };

  const getKycTitle = () => {
    switch (data.kycStatus) {
      case "APPROVED":
        return t("kyc.approvedTitle");
      case "REJECTED":
        return t("kyc.rejectedTitle");
      case "PENDING":
        return t("kyc.pendingTitle");
      default:
        return t("kyc.notSubmittedTitle");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  // Show blocked state for non-approved KYC
  if (data.kycStatus !== "APPROVED") {
    return (
      <div className="space-y-6">
        <h1 className="text-h1 text-gray-900">{t("title")}</h1>

        {/* KYC Blocked Banner */}
        <div
          className={`rounded-lg p-6 border ${
            data.kycStatus === "REJECTED"
              ? "bg-red-50 border-red-200"
              : data.kycStatus === "PENDING"
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex flex-col items-center text-center">
            {getKycIcon()}
            <h2 className="font-semibold text-gray-900 mt-4 mb-2">
              {getKycTitle()}
            </h2>
            <p className="text-sm text-gray-600 mb-4 max-w-md">
              {getKycMessage()}
            </p>

            {data.kycStatus === "NOT_SUBMITTED" && (
              <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                <Link href={`/${locale}/account/kyc`}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  {t("kyc.submitButton")}
                </Link>
              </Button>
            )}

            {data.kycStatus === "REJECTED" && (
              <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                <Link href={`/${locale}/account/kyc`}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  {t("kyc.resubmitButton")}
                </Link>
              </Button>
            )}

            {data.kycStatus === "PENDING" && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-100 px-4 py-2 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">{t("kyc.awaitingReview")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full dashboard for APPROVED vendors
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-h1 text-gray-900">{t("title")}</h1>
        <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
          <Link href={`/${locale}/vendor/products/new`}>
            <Plus className="w-4 h-4 mr-2" />
            {t("addProduct")}
          </Link>
        </Button>
      </div>

      {/* KYC Status Alert - Approved */}
      <div className="rounded-lg p-4 border bg-green-50 border-green-200">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-8 h-8 text-status-success" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-semibold text-gray-900">{t("kyc.title")}</h2>
              <StatusBadge status="APPROVED" />
            </div>
            <p className="text-sm text-gray-700">
              {t("kyc.approvedMessage")}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Products Card */}
        <Link
          href={`/${locale}/vendor/products`}
          className="card p-4 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">{t("products")}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.productCount}</p>
          <p className="text-sm text-gray-500 mt-1">{t("totalProducts")}</p>
        </Link>

        {/* Orders Card */}
        <Link
          href={`/${locale}/vendor/orders`}
          className="card p-4 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">{t("orders")}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.orderCount}</p>
          <p className="text-sm text-gray-500 mt-1">{t("totalOrders")}</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="card p-4">
        <h2 className="text-h3 text-gray-900 mb-4">{t("quickActions")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button asChild variant="outline" className="justify-start h-auto py-3">
            <Link href={`/${locale}/vendor/products/new`}>
              <Plus className="w-4 h-4 mr-2" />
              {t("addNewProduct")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-auto py-3">
            <Link href={`/${locale}/vendor/orders`}>
              <ShoppingBag className="w-4 h-4 mr-2" />
              {t("viewOrders")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-auto py-3">
            <Link href={`/${locale}/vendor/wallet`}>
              <Wallet className="w-4 h-4 mr-2" />
              {t("walletAndEarnings")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-start h-auto py-3">
            <Link href={`/${locale}/vendor/payout-settings`}>
              <Settings className="w-4 h-4 mr-2" />
              {t("payoutSettings")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
