"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { KycResponse, KycSubmission, KycStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  ChevronLeft,
  Loader2,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function KycPage() {
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [kycData, setKycData] = useState<KycResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    documentType: "NATIONAL_ID",
    documentUrl: "",
  });

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/login?redirect=/account/kyc");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (user && user.role === "CUSTOMER") {
      router.push("/account");
    }
  }, [user, router]);

  useEffect(() => {
    async function fetchKycStatus() {
      if (!user || (user.role !== "VENDOR" && user.role !== "DELIVERY_AGENCY")) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get<KycResponse>("/kyc/me", true);
        setKycData(res);
      } catch {
        setKycData(null);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchKycStatus();
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.documentType) {
      newErrors.documentType = "Document type is required";
    }

    if (!form.documentUrl.trim()) {
      newErrors.documentUrl = "Document URL is required";
    } else if (!form.documentUrl.startsWith("http")) {
      newErrors.documentUrl = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    try {
      await api.post<KycSubmission>(
        "/kyc/submit",
        {
          documentType: form.documentType,
          documentUrl: form.documentUrl.trim(),
        },
        true
      );

      toast.success("KYC submitted successfully! Your documents are now under review.");
      
      // Refresh KYC status
      const res = await api.get<KycResponse>("/kyc/me", true);
      setKycData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string | string[] };
        const message = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message;
        toast.error(message || "Failed to submit KYC");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-6">
        <div className="container-main max-w-lg">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="card p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || (user && user.role === "CUSTOMER")) {
    return null;
  }

  // Use latestSubmission to determine actual KYC state
  const hasSubmission = !!kycData?.latestSubmission;
  const kycStatus: KycStatus = hasSubmission 
    ? (kycData?.latestSubmission?.status || "PENDING")
    : "NOT_SUBMITTED";

  const getStatusIcon = () => {
    switch (kycStatus) {
      case "APPROVED":
        return <CheckCircle2 className="w-12 h-12 text-status-success" />;
      case "REJECTED":
        return <XCircle className="w-12 h-12 text-status-error" />;
      case "PENDING":
        return <Clock className="w-12 h-12 text-status-warning" />;
      default:
        return <AlertCircle className="w-12 h-12 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (kycStatus) {
      case "APPROVED":
        return "Your KYC has been approved. You can now access all features.";
      case "REJECTED":
        return "Your KYC was rejected. Please resubmit with valid documents.";
      case "PENDING":
        return "Your KYC is under review. This usually takes 24-48 hours. We'll notify you when it's complete.";
      default:
        return "Submit your identity documents to complete verification.";
    }
  };

  // Show form if: no submission exists OR status is REJECTED
  const showForm = !hasSubmission || kycStatus === "REJECTED";

  return (
    <div className="py-6">
      <div className="container-main max-w-lg">
        {/* Header */}
        <Link
          href="/account"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Account</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-jemo-orange/10 rounded-lg">
            <FileCheck className="w-6 h-6 text-jemo-orange" />
          </div>
          <div>
            <h1 className="text-h1 text-gray-900">KYC Verification</h1>
            <p className="text-sm text-gray-500">
              {user?.role === "VENDOR" ? "Vendor" : "Delivery Agency"} identity verification
            </p>
          </div>
        </div>

        {/* Status Card - show only if submission exists */}
        {hasSubmission && kycStatus !== "NOT_SUBMITTED" && (
          <div className="card p-6 mb-6 text-center">
            <div className="flex justify-center mb-4">{getStatusIcon()}</div>
            <div className="mb-2">
              <StatusBadge status={kycStatus} />
            </div>
            <p className="text-gray-600">{getStatusMessage()}</p>

            {kycStatus === "APPROVED" && (
              <Button
                asChild
                className="mt-4 bg-jemo-orange hover:bg-jemo-orange/90"
              >
                <Link href={user?.role === "VENDOR" ? "/vendor" : "/rider"}>
                  Go to {user?.role === "VENDOR" ? "Vendor" : "Delivery Agency"} Dashboard
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* KYC Form (show if no submission or rejected) */}
        {showForm && (
          <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            {kycStatus === "REJECTED" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  Your previous submission was rejected. Please submit again with valid documents.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type *</Label>
              <select
                id="documentType"
                name="documentType"
                value={form.documentType}
                onChange={handleChange}
                className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  errors.documentType ? "border-red-500" : ""
                }`}
              >
                <option value="NATIONAL_ID">National ID Card</option>
                <option value="PASSPORT">Passport</option>
                <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
              </select>
              {errors.documentType && (
                <p className="text-sm text-red-500">{errors.documentType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentUrl">Document Image URL *</Label>
              <Input
                id="documentUrl"
                name="documentUrl"
                value={form.documentUrl}
                onChange={handleChange}
                placeholder="https://example.com/my-id-photo.jpg"
                className={errors.documentUrl ? "border-red-500" : ""}
              />
              {errors.documentUrl && (
                <p className="text-sm text-red-500">{errors.documentUrl}</p>
              )}
              <p className="text-xs text-gray-500">
                Upload your document image to a cloud service (e.g. Google Drive, Dropbox)
                and paste the public link here.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-jemo-orange hover:bg-jemo-orange/90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : kycStatus === "REJECTED" ? (
                "Resubmit KYC"
              ) : (
                "Submit KYC"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
