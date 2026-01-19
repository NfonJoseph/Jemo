"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import type { AvailableJob } from "@/lib/types";
import { EmptyState } from "@/components/shared";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import {
  ChevronLeft,
  RefreshCw,
  MapPin,
  ArrowRight,
  Package,
  Loader2,
  CheckCircle,
  Phone,
} from "lucide-react";

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

interface JobCardProps {
  job: AvailableJob;
  onAccept: (id: string) => void;
  isAccepting: boolean;
  t: (key: string) => string;
}

function JobCard({ job, onAccept, isAccepting, t }: JobCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-jemo-orange" />
          <span className="font-medium text-gray-900">{job.pickup.vendorName}</span>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
          {formatPrice(job.fee)}
        </span>
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

        {/* Customer Phone (hidden until accepted) */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Phone className="w-3 h-3" />
          <span>{t("phoneVisibleAfterAccept")}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <Button
          onClick={() => onAccept(job.id)}
          disabled={isAccepting}
          className="w-full bg-jemo-orange hover:bg-jemo-orange/90"
        >
          {isAccepting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("accepting")}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              {t("acceptJob")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function AvailableJobsPage() {
  const router = useRouter();
  const locale = useLocale();
  const toast = useToast();
  const t = useTranslations("riderJobs");
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<AvailableJob[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AvailableJob[]>("/agency/deliveries/available", true);
      setJobs(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError(t("agencyNotActive"));
        } else {
          setError(err.message || t("loadError"));
        }
      } else {
        setError(t("somethingWentWrong"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (jobId: string) => {
    setAcceptingId(jobId);
    try {
      await api.post(`/agency/deliveries/${jobId}/accept`, {}, true);
      toast.success(t("jobAcceptedSuccess"));
      router.push(`/${locale}/rider/deliveries/me`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          toast.error(t("jobAlreadyTaken"));
          // Remove from list
          setJobs((prev) => prev.filter((j) => j.id !== jobId));
        } else {
          const data = err.data as { message?: string };
          toast.error(data?.message || t("acceptError"));
        }
      } else {
        toast.error(t("somethingWentWrong"));
      }
    } finally {
      setAcceptingId(null);
    }
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
            <h1 className="text-xl font-bold text-gray-900">{t("availableJobs")}</h1>
            <p className="text-sm text-gray-500">{t("jobsInCoverageArea")}</p>
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

      {/* Content */}
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
          <JobCardSkeleton />
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title={t("noJobsAvailable")}
          description={t("noJobsDescription")}
          actionLabel={t("refresh")}
          onAction={loadJobs}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {jobs.length === 1 
              ? t("jobsAvailableCountSingular") 
              : t("jobsAvailableCountPlural", { count: jobs.length })}
          </p>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onAccept={handleAccept}
              isAccepting={acceptingId === job.id}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
