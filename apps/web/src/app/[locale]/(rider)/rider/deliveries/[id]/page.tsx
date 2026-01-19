"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import type { DeliveryJobStatus } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  ChevronLeft,
  MapPin,
  Phone,
  Store,
  Package,
  Loader2,
  CheckCircle,
  Truck,
  Box,
} from "lucide-react";

interface JobDetail {
  id: string;
  orderId: string;
  status: DeliveryJobStatus;
  pickupAddress: string;
  pickupCity: string;
  dropoffAddress: string;
  dropoffCity: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  order?: {
    id: string;
    status: string;
    deliveryAddress: string;
    deliveryPhone: string;
  };
}

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

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const toast = useToast();
  const t = useTranslations("riderJobs");
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<MyJob | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    setLoading(true);
    try {
      // Fetch from /me list and find by id
      const jobs = await api.get<MyJob[]>("/agency/deliveries/me", true);
      const found = jobs.find((j) => j.id === jobId);
      setJob(found || null);
    } catch (err) {
      console.error("Failed to load job:", err);
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  // Mark job as delivered using the dedicated endpoint
  const handleMarkDelivered = async () => {
    if (!job) return;

    setUpdating(true);
    try {
      await api.post(`/agency/deliveries/${jobId}/delivered`, {}, true);
      toast.success(t("deliveredSuccess"));
      
      // Reload job to get updated state
      await loadJob();
      
      // Redirect to my deliveries after a short delay
      setTimeout(() => {
        router.push(`/${locale}/rider/deliveries/me`);
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || t("updateError"));
      } else {
        toast.error(t("somethingWentWrong"));
      }
    } finally {
      setUpdating(false);
    }
  };

  // Check if job can be marked as delivered
  const canMarkDelivered = job?.status === "ACCEPTED";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-6">
        <Link
          href={`/${locale}/rider/deliveries/me`}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to My Deliveries
        </Link>
        <EmptyState
          title="Delivery Not Found"
          description="This delivery may have been removed or you don't have access to it."
          actionLabel="View My Deliveries"
          actionHref={`/${locale}/rider/deliveries/me`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/rider/deliveries/me`}
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-sm text-gray-500">Delivery Job</p>
            <h1 className="text-lg font-bold text-gray-900">
              #{job.id.slice(-8)}
            </h1>
          </div>
        </div>
        <StatusBadge status={job.status as any} />
      </div>

      {/* Status Progress - Simplified: ACCEPTED → DELIVERED */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className={job.status === "ACCEPTED" ? "text-jemo-orange font-medium" : ""}>
            {t("statusInTransit")}
          </span>
          <span className={job.status === "DELIVERED" ? "text-green-600 font-medium" : ""}>
            {t("statusDelivered")}
          </span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-jemo-orange rounded-full transition-all duration-300"
            style={{
              width:
                job.status === "ACCEPTED" ? "50%" :
                job.status === "DELIVERED" ? "100%" : "0%",
            }}
          />
        </div>
      </div>

      {/* Locations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
        {/* Vendor/Pickup */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Store className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">{t("pickupFrom")}</p>
              <p className="font-medium text-gray-900">{job.pickup.vendorName}</p>
              <p className="text-sm text-gray-600 mt-1">{job.pickup.address}</p>
              <p className="text-xs text-gray-500">{job.pickup.city}</p>
              {job.pickup.vendorPhone && (
                <a
                  href={`tel:${job.pickup.vendorPhone}`}
                  className="inline-flex items-center gap-1 text-sm text-jemo-orange mt-2 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {job.pickup.vendorPhone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Customer/Dropoff */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <MapPin className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase">{t("deliverTo")}</p>
              <p className="text-sm text-gray-600 mt-1">{job.dropoff.address}</p>
              <p className="text-xs text-gray-500">{job.dropoff.city}</p>
              {job.dropoff.customerPhone && (
                <a
                  href={`tel:${job.dropoff.customerPhone}`}
                  className="inline-flex items-center gap-1 text-sm text-jemo-orange mt-2 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  {job.dropoff.customerPhone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Fee */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivery Fee</p>
              <p className="font-bold text-lg text-green-600">{formatPrice(job.fee)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2">
        <h3 className="font-medium text-gray-900 mb-3">Timeline</h3>
        {job.acceptedAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Accepted</span>
            <span className="text-gray-900">{new Date(job.acceptedAt).toLocaleString()}</span>
          </div>
        )}
        {job.deliveredAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Delivered</span>
            <span className="text-gray-900">{new Date(job.deliveredAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Action Button - Mark as Delivered */}
      {canMarkDelivered && (
        <Button
          className="w-full h-14 text-lg bg-jemo-orange hover:bg-jemo-orange/90"
          onClick={handleMarkDelivered}
          disabled={updating}
        >
          {updating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t("updating")}
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              {t("markDelivered")}
            </>
          )}
        </Button>
      )}

      {job.status === "DELIVERED" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="font-semibold text-green-800">{t("deliveryCompleted")}</p>
          {job.deliveredAt && (
            <p className="text-sm text-green-700 mt-1">
              {t("deliveredAt")} {new Date(job.deliveredAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
