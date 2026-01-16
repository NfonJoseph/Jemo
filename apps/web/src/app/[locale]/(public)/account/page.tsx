"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { KycResponse, KycStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useTranslations, useLocale } from "@/lib/translations";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Mail,
  Phone,
  Store,
  Bike,
  Shield,
  Package,
  ChevronRight,
  AlertCircle,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface KycState {
  status: KycStatus;
  hasSubmission: boolean;
  rejectionReason?: string;
}

interface VendorApplication {
  id: string;
  type: "BUSINESS" | "INDIVIDUAL";
  status: string;
  businessName?: string;
  rejectionReason?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("account");
  const tVendor = useTranslations("vendorWizard");
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const [kycState, setKycState] = useState<KycState | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [vendorApplication, setVendorApplication] = useState<VendorApplication | null>(null);
  const [vendorAppLoading, setVendorAppLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push(`/${locale}/login?redirect=/${locale}/account`);
    }
  }, [authLoading, isLoggedIn, router, locale]);

  // Fetch vendor application status (only when fully authenticated)
  useEffect(() => {
    async function fetchVendorApplication() {
      if (!user || !isLoggedIn || authLoading) return;
      
      setVendorAppLoading(true);
      try {
        const app = await api.get<VendorApplication | null>("/vendor-applications/me", true);
        setVendorApplication(app);
      } catch {
        // No application exists or error - silently ignore
        setVendorApplication(null);
      } finally {
        setVendorAppLoading(false);
      }
    }

    if (user && isLoggedIn && !authLoading) {
      fetchVendorApplication();
    }
  }, [user, isLoggedIn, authLoading]);

  useEffect(() => {
    async function fetchKycStatus() {
      if (!user || (user.role !== "VENDOR" && user.role !== "RIDER")) return;

      setKycLoading(true);
      try {
        const res = await api.get<KycResponse>("/kyc/me", true);
        
        // First check the profile's kycStatus directly (set when admin approves)
        // This handles both old KYC flow and new vendor application flow
        if (res?.kycStatus === "APPROVED") {
          setKycState({ status: "APPROVED", hasSubmission: true });
        } else if (res?.kycStatus === "REJECTED") {
          setKycState({ 
            status: "REJECTED", 
            hasSubmission: true,
            rejectionReason: res.latestSubmission?.reviewNotes || undefined,
          });
        } else if (res?.kycStatus === "PENDING" || res?.latestSubmission) {
          // Either profile shows pending or there's a submission in review
          const submissionStatus = res.latestSubmission?.status || "PENDING";
          setKycState({
            status: submissionStatus,
            hasSubmission: true,
          });
        } else {
          // No KYC status set and no submission - not yet submitted
          setKycState({ status: "NOT_SUBMITTED", hasSubmission: false });
        }
      } catch {
        // Error fetching - likely no profile or no submission
        setKycState({ status: "NOT_SUBMITTED", hasSubmission: false });
      } finally {
        setKycLoading(false);
      }
    }

    if (user) {
      fetchKycStatus();
    }
  }, [user]);

  if (authLoading || !isLoggedIn) {
    return (
      <div className="py-6">
        <div className="container-main max-w-2xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="card p-6 space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case "VENDOR":
        return "bg-purple-100 text-purple-700";
      case "RIDER":
        return "bg-blue-100 text-blue-700";
      case "ADMIN":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case "VENDOR":
        return t("roles.vendor");
      case "RIDER":
        return t("roles.rider");
      case "ADMIN":
        return t("roles.admin");
      default:
        return t("roles.customer");
    }
  };

  const getDashboardLink = () => {
    // Only show dashboard link if KYC is approved
    if (kycState?.status !== "APPROVED" && user?.role !== "ADMIN") {
      return null;
    }
    
    switch (user?.role) {
      case "VENDOR":
        return { href: `/${locale}/vendor`, label: t("dashboard.vendor"), icon: Store };
      case "RIDER":
        return { href: `/${locale}/rider`, label: t("dashboard.rider"), icon: Bike };
      case "ADMIN":
        return { href: `/${locale}/admin`, label: t("dashboard.admin"), icon: Shield };
      default:
        return null;
    }
  };

  const dashboardLink = getDashboardLink();

  const renderKycSection = () => {
    if (user?.role !== "VENDOR" && user?.role !== "RIDER") return null;

    if (kycLoading) {
      return (
        <div className="card p-4 mb-6">
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    const kycLink = `/${locale}/account/kyc`;
    const isVendor = user?.role === "VENDOR";

    // NOT_SUBMITTED - No KYC submitted yet
    if (!kycState || kycState.status === "NOT_SUBMITTED") {
      return (
        <div className="card p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">{t("kyc.title")}</p>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <span className="font-medium">{t("kyc.notSubmitted")}</span>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                {isVendor ? t("kyc.notSubmittedVendor") : t("kyc.notSubmittedRider")}
              </p>
              <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                <Link href={kycLink}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  {t("kyc.startVerification")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // PENDING - KYC submitted, awaiting review
    if (kycState.status === "PENDING") {
      return (
        <div className="card p-4 mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">{t("kyc.title")}</p>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status="PENDING" />
              </div>
              <p className="text-sm text-amber-700">
                {t("kyc.pendingReview")}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // APPROVED - KYC approved
    if (kycState.status === "APPROVED") {
      return (
        <div className="card p-4 mb-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">{t("kyc.title")}</p>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status="APPROVED" />
              </div>
              <p className="text-sm text-green-700">
                {isVendor ? t("kyc.approvedVendor") : t("kyc.approvedRider")}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // REJECTED - KYC rejected
    if (kycState.status === "REJECTED") {
      return (
        <div className="card p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">{t("kyc.title")}</p>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status="REJECTED" />
              </div>
              <p className="text-sm text-red-700 mb-3">
                {t("kyc.rejected")}
              </p>
              <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                <Link href={kycLink}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  {t("kyc.resubmit")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="py-6">
      <div className="container-main max-w-2xl">
        <h1 className="text-h1 text-gray-900 mb-6">{t("title")}</h1>

        {/* User Info Card */}
        <div className="card p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-jemo-orange/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-jemo-orange" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-h2 text-gray-900">{user?.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor()}`}
                >
                  {getRoleLabel()}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-500">
                {user?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user?.email && !user.email.includes("@placeholder") && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KYC Status Section */}
        {renderKycSection()}

        {/* Dashboard Link (for Vendor/Rider with approved KYC, or Admin) */}
        {dashboardLink && (
          <Link
            href={dashboardLink.href}
            className="card p-4 mb-6 flex items-center justify-between hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-jemo-orange/10 rounded-lg">
                <dashboardLink.icon className="w-5 h-5 text-jemo-orange" />
              </div>
              <span className="font-medium text-gray-900">{dashboardLink.label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        )}

        {/* My Orders Link */}
        <Link
          href={`/${locale}/orders`}
          className="card p-4 mb-6 flex items-center justify-between hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <span className="font-medium text-gray-900">{t("myOrders")}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Vendor Application Status */}
        {user?.role === "CUSTOMER" && vendorApplication && (
          <div className="card p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                vendorApplication.status === "APPROVED" ? "bg-green-100" :
                vendorApplication.status === "REJECTED" ? "bg-red-100" :
                "bg-amber-100"
              }`}>
                {vendorApplication.status === "APPROVED" ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : vendorApplication.status === "REJECTED" ? (
                  <XCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {tVendor("accountStatus.title")}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    vendorApplication.status === "APPROVED" ? "bg-green-100 text-green-700" :
                    vendorApplication.status === "REJECTED" ? "bg-red-100 text-red-700" :
                    vendorApplication.status === "DRAFT" || vendorApplication.status === "PENDING_PAYMENT" 
                      ? "bg-gray-100 text-gray-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {vendorApplication.status === "DRAFT" && tVendor("status.draft")}
                    {vendorApplication.status === "PENDING_PAYMENT" && tVendor("status.pendingPayment")}
                    {vendorApplication.status === "PENDING_MANUAL_VERIFICATION" && tVendor("status.pendingVerification")}
                    {vendorApplication.status === "PENDING_KYC_REVIEW" && tVendor("status.pendingKyc")}
                    {vendorApplication.status === "APPROVED" && tVendor("status.approved")}
                    {vendorApplication.status === "REJECTED" && tVendor("status.rejected")}
                  </span>
                </div>
                
                {vendorApplication.businessName && (
                  <p className="text-sm text-gray-600 mb-2">
                    {vendorApplication.businessName}
                  </p>
                )}

                <p className="text-sm text-gray-500 mb-3">
                  {vendorApplication.status === "PENDING_MANUAL_VERIFICATION" && tVendor("accountStatus.pendingVerification")}
                  {vendorApplication.status === "PENDING_KYC_REVIEW" && tVendor("accountStatus.pendingKyc")}
                  {vendorApplication.status === "REJECTED" && (
                    <>
                      {tVendor("accountStatus.rejected")}
                      {vendorApplication.rejectionReason && (
                        <span className="block mt-1 text-red-600">
                          {vendorApplication.rejectionReason}
                        </span>
                      )}
                    </>
                  )}
                  {vendorApplication.status === "APPROVED" && tVendor("accountStatus.approved")}
                </p>

                {/* Action Buttons */}
                {(vendorApplication.status === "DRAFT" || vendorApplication.status === "PENDING_PAYMENT") && (
                  <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                    <Link href={`/${locale}/account/vendor/apply`}>
                      {tVendor("accountStatus.continue")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                )}
                {vendorApplication.status === "REJECTED" && (
                  <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                    <Link href={`/${locale}/account/vendor/apply`}>
                      {tVendor("accountStatus.resubmit")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                )}
                {vendorApplication.status === "APPROVED" && (
                  <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                    <Link href={`/${locale}/vendor`}>
                      {tVendor("accountStatus.goToDashboard")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Options (for Customers without an application) */}
        {user?.role === "CUSTOMER" && !vendorApplication && !vendorAppLoading && (
          <div className="card p-6">
            <h3 className="text-h3 text-gray-900 mb-4">{t("partner.title")}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {t("partner.subtitle")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                asChild
                variant="outline"
                className="h-auto py-4 flex-col items-center gap-2"
              >
                <Link href={`/${locale}/account/vendor/apply`}>
                  <Store className="w-6 h-6 text-jemo-orange" />
                  <span className="font-medium">{t("partner.vendor.title")}</span>
                  <span className="text-xs text-gray-500">{t("partner.vendor.subtitle")}</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto py-4 flex-col items-center gap-2"
              >
                <Link href={`/${locale}/account/rider/apply`}>
                  <Bike className="w-6 h-6 text-jemo-orange" />
                  <span className="font-medium">{t("partner.rider.title")}</span>
                  <span className="text-xs text-gray-500">{t("partner.rider.subtitle")}</span>
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
