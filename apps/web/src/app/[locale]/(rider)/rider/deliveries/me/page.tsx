"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import { EmptyState, StatusBadge } from "@/components/shared";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import {
  ChevronLeft,
  RefreshCw,
  MapPin,
  Phone,
  ArrowRight,
  Package,
  CheckCircle,
  Truck,
} from "lucide-react";

interface MyJob {
  id: string;
  orderId: string;
  status: string;
  fee: number;
  pickup: {
    address: string;
    city: string;
    vendorName: string;
    vendorPhone: string | null;
  };
  dropoff: {
    address: string;
    city: string;
    customerPhone: string;
  };
  orderStatus: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

function JobCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  );
}

interface MyJobCardProps {
  job: MyJob;
  onViewDetails: (id: string) => void;
  t: (key: string) => string;
}

function MyJobCard({ job, onViewDetails, t }: MyJobCardProps) {
  const isActive = !["DELIVERED", "CANCELLED"].includes(job.status);

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden ${
      isActive ? "border-orange-200" : "border-gray-200"
    }`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isActive ? "bg-orange-50 border-orange-100" : "bg-gray-50 border-gray-100"
      }`}>
        <div className="flex items-center gap-2">
          {isActive ? (
            <Truck className="w-4 h-4 text-jemo-orange" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
          <span className="font-medium text-gray-900">{job.pickup.vendorName}</span>
        </div>
        <StatusBadge status={job.status as any} />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Pickup */}
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-green-50 rounded">
            <MapPin className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase font-medium">{t("pickup")}</p>
            <p className="text-sm text-gray-900 truncate">{job.pickup.address}</p>
            <p className="text-xs text-gray-600">{job.pickup.city}</p>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <ArrowRight className="w-4 h-4 text-gray-300 rotate-90" />
        </div>

        {/* Dropoff */}
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-red-50 rounded">
            <MapPin className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase font-medium">{t("dropoff")}</p>
            <p className="text-sm text-gray-900 truncate">{job.dropoff.address}</p>
            <p className="text-xs text-gray-600">{job.dropoff.city}</p>
          </div>
        </div>

        {/* Contact Numbers */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {/* Vendor Phone */}
          {job.pickup.vendorPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-green-500" />
              <span className="text-gray-500">{t("vendorPhone")}:</span>
              <a 
                href={`tel:${job.pickup.vendorPhone}`}
                className="text-jemo-orange hover:underline"
              >
                {job.pickup.vendorPhone}
              </a>
            </div>
          )}
          {/* Customer Phone */}
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-blue-500" />
            <span className="text-gray-500">{t("customerPhone")}:</span>
            <a 
              href={`tel:${job.dropoff.customerPhone}`}
              className="text-jemo-orange hover:underline"
            >
              {job.dropoff.customerPhone}
            </a>
          </div>
        </div>

        {/* Fee */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">{t("deliveryFee")}</span>
          <span className="font-semibold text-green-600">{formatPrice(job.fee)}</span>
        </div>
      </div>

      {/* Footer - only show for active jobs */}
      {isActive && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <Button
            onClick={() => onViewDetails(job.id)}
            className="w-full bg-jemo-orange hover:bg-jemo-orange/90"
          >
            <Package className="w-4 h-4 mr-2" />
            {t("updateStatus")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyDeliveriesPage() {
  const locale = useLocale();
  const toast = useToast();
  const t = useTranslations("riderJobs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<MyJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<MyJob[]>([]);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<MyJob[]>("/agency/deliveries/me", true);
      
      const active = data.filter(
        (j) => !["DELIVERED", "CANCELLED"].includes(j.status)
      );
      const completed = data.filter(
        (j) => ["DELIVERED", "CANCELLED"].includes(j.status)
      );
      
      setActiveJobs(active);
      setCompletedJobs(completed);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t("loadError"));
      } else {
        toast.error(t("loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (jobId: string) => {
    window.location.href = `/${locale}/rider/deliveries/${jobId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/rider`}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("myDeliveries")}</h1>
            <p className="text-sm text-gray-500">{t("yourAcceptedJobs")}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadJobs}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </Button>
      </div>

      {error ? (
        <EmptyState
          type="error"
          title={t("cannotAccessJobs")}
          description={error}
          actionLabel={t("goToDashboard")}
          actionHref={`/${locale}/rider`}
        />
      ) : loading ? (
        <div className="space-y-4">
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : activeJobs.length === 0 && completedJobs.length === 0 ? (
        <EmptyState
          title={t("noDeliveriesYet")}
          description={t("acceptJobsToStart")}
          actionLabel={t("findJobs")}
          actionHref={`/${locale}/rider/deliveries/available`}
        />
      ) : (
        <div className="space-y-8">
          {/* Active Jobs - In Transit */}
          {activeJobs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("activeInTransit")} ({activeJobs.length})
              </h2>
              <div className="space-y-4">
                {activeJobs.map((job) => (
                  <MyJobCard 
                    key={job.id} 
                    job={job} 
                    onViewDetails={handleViewDetails}
                    t={t}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {t("history")} ({completedJobs.length})
              </h2>
              <div className="space-y-4">
                {completedJobs.map((job) => (
                  <MyJobCard 
                    key={job.id} 
                    job={job}
                    onViewDetails={handleViewDetails}
                    t={t}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
