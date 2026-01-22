"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { AvailableJob, DeliveryJob } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared";
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  ArrowRight,
  AlertCircle,
  Wallet,
  Send,
} from "lucide-react";

interface DashboardStats {
  availableJobs: number;
  activeJobs: number;
  completedDeliveries: number;
  totalEarnings: number;
  citiesCovered: string[];
  isActive: boolean;
}

interface AvailableShipmentsResponse {
  shipments: Array<{
    id: string;
    pickupCity: string;
    dropoffCity: string;
  }>;
}

export default function DeliveryAgencyDashboardPage() {
  const locale = useLocale();
  const t = useTranslations("deliveryAgency.dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [activeJob, setActiveJob] = useState<DeliveryJob | null>(null);
  const [availableShipments, setAvailableShipments] = useState<number>(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch dashboard stats
      const dashStats = await api.get<DashboardStats>("/agency/deliveries/stats", true);
      setStats(dashStats);

      // Fetch available jobs (first 3 for preview)
      try {
        const jobs = await api.get<AvailableJob[]>("/agency/deliveries/available", true);
        setAvailableJobs(jobs.slice(0, 3));
      } catch {
        setAvailableJobs([]);
      }

      // Fetch active jobs
      try {
        const myJobs = await api.get<DeliveryJob[]>("/agency/deliveries/me", true);
        const active = myJobs.find(
          (j) => j.status !== "DELIVERED" && j.status !== "CANCELLED"
        );
        if (active) {
          setActiveJob(active);
        }
      } catch {
        setActiveJob(null);
      }

      // Fetch available shipments count
      try {
        const shipmentsData = await api.get<AvailableShipmentsResponse>("/rider/shipments/available", true);
        setAvailableShipments(shipmentsData.shipments?.length || 0);
      } catch {
        setAvailableShipments(0);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to load dashboard");
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">{t("errorLoading")}</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadDashboardData} variant="outline">
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  // Show inactive state if agency is not active
  if (stats && !stats.isActive) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-amber-800 mb-2">{t("agencyInactive")}</h2>
          <p className="text-amber-600">
            {t("agencyInactiveDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href={`/${locale}/rider/deliveries/available`}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.availableJobs || 0}</p>
              <p className="text-xs text-gray-500">{t("availableJobs")}</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/${locale}/rider/deliveries/me`}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 rounded-lg">
              <Clock className="w-5 h-5 text-jemo-orange" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.activeJobs || 0}</p>
              <p className="text-xs text-gray-500">{t("activeJobs")}</p>
            </div>
          </div>
        </Link>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.completedDeliveries || 0}</p>
              <p className="text-xs text-gray-500">{t("completed")}</p>
            </div>
          </div>
        </div>

        <Link
          href={`/${locale}/rider/shipments`}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-lg">
              <Send className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {availableShipments}
              </p>
              <p className="text-xs text-gray-500">{t("availableShipments")}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Cities Covered */}
      {stats?.citiesCovered && stats.citiesCovered.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t("coverageArea")}</h3>
          <div className="flex flex-wrap gap-2">
            {stats.citiesCovered.map((city) => (
              <span
                key={city}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active Job Card */}
      {activeJob ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-orange-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{t("activeDelivery")}</h2>
            <StatusBadge status={activeJob.status} />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">{t("pickup")} - {activeJob.pickupCity}</p>
                <p className="text-sm text-gray-900">{activeJob.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <MapPin className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">{t("dropoff")} - {activeJob.dropoffCity}</p>
                <p className="text-sm text-gray-900">{activeJob.dropoffAddress}</p>
              </div>
            </div>
            <Button asChild className="w-full bg-jemo-orange hover:bg-jemo-orange/90">
              <Link href={`/${locale}/rider/deliveries/${activeJob.id}`}>
                {t("viewDetails")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{t("noActiveDeliveries")}</h3>
          <p className="text-gray-500 text-sm mb-4">
            {t("checkAvailableJobs")}
          </p>
          <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
            <Link href={`/${locale}/rider/deliveries/available`}>
              {t("findJobs")}
            </Link>
          </Button>
        </div>
      )}

      {/* Available Jobs Preview */}
      {availableJobs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">{t("availableJobsTitle")}</h2>
            <Link
              href={`/${locale}/rider/deliveries/available`}
              className="text-sm text-jemo-orange hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {availableJobs.map((job) => (
              <div key={job.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {job.pickup.vendorName}
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatPrice(job.fee)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{job.pickup.city}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{job.dropoff.city}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href={`/${locale}/rider/deliveries/available`} className="flex flex-col items-center gap-2">
            <Package className="w-6 h-6" />
            <span className="text-xs sm:text-sm">{t("availableJobs")}</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4">
          <Link href={`/${locale}/rider/deliveries/me`} className="flex flex-col items-center gap-2">
            <Clock className="w-6 h-6" />
            <span className="text-xs sm:text-sm">{t("activeJobs")}</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 border-jemo-orange text-jemo-orange hover:bg-jemo-orange/5">
          <Link href={`/${locale}/rider/wallet`} className="flex flex-col items-center gap-2">
            <Wallet className="w-6 h-6" />
            <span className="text-xs sm:text-sm">{t("wallet")}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
