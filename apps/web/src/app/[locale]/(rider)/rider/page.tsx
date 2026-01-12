"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { RiderDelivery, KycStatus, KycResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeliveryStatusBadge } from "@/components/shared/delivery-status-badge";
import {
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Bike,
  MapPin,
  ArrowRight,
  FileCheck,
  XCircle,
} from "lucide-react";

export default function RiderDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KycStatus>("NOT_SUBMITTED");
  const [activeDelivery, setActiveDelivery] = useState<RiderDelivery | null>(null);
  const [stats, setStats] = useState({ active: 0, completed: 0, available: 0 });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // STEP 1: Fetch KYC status FIRST
      let fetchedKycStatus: KycStatus = "NOT_SUBMITTED";
      try {
        const kyc = await api.get<KycResponse>("/kyc/me", true);
        fetchedKycStatus = kyc?.kycStatus || "NOT_SUBMITTED";
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          fetchedKycStatus = "NOT_SUBMITTED";
        }
      }
      setKycStatus(fetchedKycStatus);

      // STEP 2: Only fetch protected data if KYC is APPROVED
      if (fetchedKycStatus === "APPROVED") {
        try {
          const myDeliveries = await api.get<RiderDelivery[]>("/rider/deliveries/me", true);

          const active = myDeliveries.filter(
            (d) => d.status !== "DELIVERED" && d.status !== "CANCELLED"
          );
          const completed = myDeliveries.filter((d) => d.status === "DELIVERED");

          if (active.length > 0) {
            setActiveDelivery(active[0]);
          }

          // Fetch available deliveries count
          let availableCount = 0;
          try {
            const available = await api.get<RiderDelivery[]>("/rider/deliveries/available", true);
            availableCount = available.length;
          } catch {
            availableCount = 0;
          }

          setStats({
            active: active.length,
            completed: completed.length,
            available: availableCount,
          });
        } catch (err) {
          // Handle 403 gracefully - shouldn't happen if KYC is approved
          if (err instanceof ApiError && err.status === 403) {
            setKycStatus("PENDING");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Show blocked state for non-approved KYC
  if (kycStatus !== "APPROVED") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Rider Dashboard</h1>

        {/* KYC Blocked Banner */}
        <div
          className={`rounded-lg p-6 border ${
            kycStatus === "REJECTED"
              ? "bg-red-50 border-red-200"
              : kycStatus === "PENDING"
              ? "bg-amber-50 border-amber-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex flex-col items-center text-center">
            {kycStatus === "PENDING" ? (
              <Clock className="w-12 h-12 text-status-warning" />
            ) : kycStatus === "REJECTED" ? (
              <XCircle className="w-12 h-12 text-status-error" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-gray-400" />
            )}
            <h2 className="font-semibold text-gray-900 mt-4 mb-2">
              {kycStatus === "PENDING"
                ? "KYC Verification Pending"
                : kycStatus === "REJECTED"
                ? "KYC Verification Rejected"
                : "KYC Verification Required"}
            </h2>
            <p className="text-sm text-gray-600 mb-4 max-w-md">
              {kycStatus === "PENDING"
                ? "Your documents are being reviewed. You can start accepting deliveries once approved. This usually takes 24-48 hours."
                : kycStatus === "REJECTED"
                ? "Your KYC was rejected. Please resubmit with valid documents."
                : "Complete your KYC verification to start accepting deliveries."}
            </p>

            {kycStatus === "NOT_SUBMITTED" && (
              <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                <Link href="/account/kyc">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Submit KYC Documents
                </Link>
              </Button>
            )}

            {kycStatus === "REJECTED" && (
              <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                <Link href="/account/kyc">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Resubmit KYC Documents
                </Link>
              </Button>
            )}

            {kycStatus === "PENDING" && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-100 px-4 py-2 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Awaiting admin review</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full dashboard for APPROVED riders
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rider Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/rider/deliveries/available"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
              <p className="text-sm text-gray-500">Available Deliveries</p>
            </div>
          </div>
        </Link>

        <Link
          href="/rider/deliveries/me"
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-jemo-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Active Deliveries</p>
            </div>
          </div>
        </Link>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Delivery Card */}
      {activeDelivery ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Active Delivery</h2>
            <DeliveryStatusBadge status={activeDelivery.status} />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Pickup</p>
                <p className="text-sm text-gray-900">
                  {activeDelivery.pickupAddress || activeDelivery.vendorProfile?.businessAddress || "Vendor location"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Dropoff</p>
                <p className="text-sm text-gray-900">
                  {activeDelivery.dropoffAddress || activeDelivery.order?.deliveryAddress || "Customer location"}
                </p>
              </div>
            </div>
            <Button asChild className="w-full bg-jemo-orange hover:bg-jemo-orange/90">
              <Link href={`/rider/deliveries/${activeDelivery.id}`}>
                View Details
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bike className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No Active Deliveries</h3>
          <p className="text-gray-500 text-sm mb-4">
            Check available deliveries to start earning
          </p>
          <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
            <Link href="/rider/deliveries/available">
              Find Deliveries
            </Link>
          </Button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href="/rider/deliveries/available" className="flex flex-col items-center gap-2">
            <Package className="w-6 h-6" />
            <span>Available Deliveries</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href="/rider/deliveries/me" className="flex flex-col items-center gap-2">
            <Clock className="w-6 h-6" />
            <span>My Deliveries</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
