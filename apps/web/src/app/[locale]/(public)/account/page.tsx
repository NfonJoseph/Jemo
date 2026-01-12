"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { KycResponse, KycStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
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
} from "lucide-react";

interface KycState {
  status: KycStatus;
  hasSubmission: boolean;
  rejectionReason?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const [kycState, setKycState] = useState<KycState | null>(null);
  const [kycLoading, setKycLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login?redirect=/account");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    async function fetchKycStatus() {
      if (!user || (user.role !== "VENDOR" && user.role !== "RIDER")) return;

      setKycLoading(true);
      try {
        const res = await api.get<KycResponse>("/kyc/me", true);
        
        // Determine actual KYC state from response
        if (!res?.latestSubmission) {
          // No submission exists - user hasn't submitted KYC yet
          setKycState({ status: "NOT_SUBMITTED", hasSubmission: false });
        } else {
          // Submission exists - use its status
          const submissionStatus = res.latestSubmission.status || "PENDING";
          setKycState({
            status: submissionStatus,
            hasSubmission: true,
          });
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

  const getDashboardLink = () => {
    // Only show dashboard link if KYC is approved
    if (kycState?.status !== "APPROVED" && user?.role !== "ADMIN") {
      return null;
    }
    
    switch (user?.role) {
      case "VENDOR":
        return { href: "/vendor", label: "Go to Vendor Dashboard", icon: Store };
      case "RIDER":
        return { href: "/rider", label: "Go to Rider Dashboard", icon: Bike };
      case "ADMIN":
        return { href: "/admin", label: "Go to Admin Dashboard", icon: Shield };
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

    const kycLink = "/account/kyc";

    // NOT_SUBMITTED - No KYC submitted yet
    if (!kycState || kycState.status === "NOT_SUBMITTED") {
      return (
        <div className="card p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-gray-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 mb-1">KYC Status</p>
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <span className="font-medium">Not submitted</span>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                Complete KYC verification to access {user?.role === "VENDOR" ? "vendor" : "rider"} features.
              </p>
              <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                <Link href={kycLink}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Start KYC Verification
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
              <p className="text-sm text-gray-500 mb-1">KYC Status</p>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status="PENDING" />
              </div>
              <p className="text-sm text-amber-700">
                Your KYC is under review. This usually takes 24-48 hours. We&apos;ll notify you once it&apos;s complete.
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
              <p className="text-sm text-gray-500 mb-1">KYC Status</p>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status="APPROVED" />
              </div>
              <p className="text-sm text-green-700">
                Your account is verified. You can now access all {user?.role === "VENDOR" ? "vendor" : "rider"} features.
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
              <p className="text-sm text-gray-500 mb-1">KYC Status</p>
              <div className="flex items-center gap-2 mb-2">
                <StatusBadge status="REJECTED" />
              </div>
              <p className="text-sm text-red-700 mb-3">
                Your KYC was rejected. Please resubmit with valid documents.
              </p>
              <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                <Link href={kycLink}>
                  <FileCheck className="w-4 h-4 mr-2" />
                  Resubmit KYC
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
        <h1 className="text-h1 text-gray-900 mb-6">My Account</h1>

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
                  {user?.role}
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
          href="/orders"
          className="card p-4 mb-6 flex items-center justify-between hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <span className="font-medium text-gray-900">My Orders</span>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Link>

        {/* Upgrade Options (for Customers only) */}
        {user?.role === "CUSTOMER" && (
          <div className="card p-6">
            <h3 className="text-h3 text-gray-900 mb-4">Become a Partner</h3>
            <p className="text-sm text-gray-500 mb-4">
              Expand your opportunities by becoming a vendor or rider on Jemo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                asChild
                variant="outline"
                className="h-auto py-4 flex-col items-center gap-2"
              >
                <Link href="/account/vendor/apply">
                  <Store className="w-6 h-6 text-jemo-orange" />
                  <span className="font-medium">Become a Vendor</span>
                  <span className="text-xs text-gray-500">Sell your products</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-auto py-4 flex-col items-center gap-2"
              >
                <Link href="/account/rider/apply">
                  <Bike className="w-6 h-6 text-jemo-orange" />
                  <span className="font-medium">Become a Rider</span>
                  <span className="text-xs text-gray-500">Deliver orders</span>
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
