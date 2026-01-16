"use client";

import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { AdminKycSubmission, KycStatus } from "@/lib/types";
import { StatusBadge, EmptyState, SignedFileLink } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  FileCheck,
  Store,
  Bike,
  ExternalLink,
  Check,
  X,
  Loader2,
} from "lucide-react";

type TabType = "PENDING" | "APPROVED" | "REJECTED";

const isDev = process.env.NODE_ENV === "development";

function normalizeKycStatus(status: string | undefined | null): KycStatus {
  if (!status) return "PENDING";
  const upper = status.toUpperCase();
  if (upper === "APPROVED") return "APPROVED";
  if (upper === "REJECTED") return "REJECTED";
  // Treat PENDING, SUBMITTED, OPEN, etc. as PENDING
  return "PENDING";
}

export default function AdminKycPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("PENDING");
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<AdminKycSubmission[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    loadSubmissions(activeTab);
  }, [activeTab]);

  const loadSubmissions = async (status: TabType) => {
    setLoading(true);
    try {
      const data = await api.get<AdminKycSubmission[]>(
        `/admin/kyc/submissions?status=${status}`,
        true
      );

      if (isDev) {
        console.log("[Admin KYC] Raw response count:", data?.length || 0);
        if (data && data.length > 0) {
          const statuses = new Set(data.map((s) => s.status));
          console.log("[Admin KYC] Unique statuses:", Array.from(statuses));
          const sample = data[0];
          console.log("[Admin KYC] Sample item:", {
            id: sample.id,
            status: sample.status,
            vendorProfileId: sample.vendorProfileId,
            riderProfileId: sample.riderProfileId,
            createdAt: sample.createdAt,
            documentType: sample.documentType,
          });
        }
      }

      // Sort by createdAt desc (newest first)
      const sorted = (data || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setSubmissions(sorted);
    } catch (err) {
      console.error("Failed to load KYC submissions:", err);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/kyc/submissions/${id}/approve`, {}, true);
      toast.success("KYC approved successfully");
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to approve");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setProcessingId(rejectModal.id);
    try {
      await api.patch(
        `/admin/kyc/submissions/${rejectModal.id}/reject`,
        { reason: rejectReason.trim() },
        true
      );
      toast.success("KYC rejected");
      setSubmissions((prev) => prev.filter((s) => s.id !== rejectModal.id));
      setRejectModal(null);
      setRejectReason("");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Failed to reject");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { key: "PENDING" as TabType, label: "Pending" },
    { key: "APPROVED" as TabType, label: "Approved" },
    { key: "REJECTED" as TabType, label: "Rejected" },
  ];

  const getSubmissionInfo = (submission: AdminKycSubmission) => {
    // Check if this is a vendor application (from new wizard flow)
    if (submission.vendorApplication) {
      const app = submission.vendorApplication;
      const name = app.businessName || app.fullNameOnId || app.user?.name || "Unknown Applicant";
      const type = app.type === "BUSINESS" ? "Business Vendor" : "Individual Vendor";
      const contact = app.businessPhone || app.phoneNormalized || app.user?.phone || app.user?.email || "N/A";
      const location = app.businessAddress || app.location || "";
      
      return { 
        isVendor: true, 
        isVendorApplication: true,
        name, 
        type, 
        TypeIcon: Store, 
        contact, 
        user: app.user,
        location,
        uploads: app.uploads,
      };
    }

    // Original logic for KycSubmission
    const isVendor = !!submission.vendorProfileId;
    const user = isVendor
      ? submission.vendorProfile?.user
      : submission.riderProfile?.user;
    const name = isVendor
      ? submission.vendorProfile?.businessName || user?.name || "Unknown Vendor"
      : user?.name || "Unknown Rider";
    const type = isVendor ? "Vendor" : "Rider";
    const TypeIcon = isVendor ? Store : Bike;
    const contact = user?.phone || user?.email || "N/A";

    return { isVendor, isVendorApplication: false, name, type, TypeIcon, contact, user };
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileCheck className="w-6 h-6 text-jemo-orange" />
        <h1 className="text-2xl font-bold text-gray-900">KYC Review</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-jemo-orange text-jemo-orange"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          title={`No ${activeTab.toLowerCase()} submissions`}
          description={
            activeTab === "PENDING"
              ? "All KYC submissions have been reviewed."
              : `No ${activeTab.toLowerCase()} submissions found.`
          }
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const info = getSubmissionInfo(submission);
            const { isVendor, isVendorApplication, name, type, TypeIcon, contact } = info;
            const normalizedStatus = normalizeKycStatus(submission.status);

            // Get uploads for vendor applications
            const uploads = submission.vendorApplication?.uploads || [];

            return (
              <div
                key={submission.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${isVendor ? "bg-purple-50" : "bg-blue-50"}`}>
                      <TypeIcon className={`w-6 h-6 ${isVendor ? "text-purple-600" : "text-blue-600"}`} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{name}</p>
                        <StatusBadge status={normalizedStatus} />
                        {isVendorApplication && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            New Application
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {type} • {contact}
                      </p>
                      {submission.vendorApplication?.location && (
                        <p className="text-sm text-gray-500">
                          Location: {submission.vendorApplication.location}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">
                        Document: {submission.documentType}
                        {uploads.length > 0 && ` (${uploads.length} files)`}
                      </p>
                      <p className="text-xs text-gray-400">
                        Submitted: {formatDate(submission.createdAt)}
                      </p>
                      {submission.reviewNotes && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {submission.reviewNotes}
                        </p>
                      )}
                      
                      {/* Show uploaded documents for vendor applications */}
                      {uploads.length > 0 && submission.vendorApplication && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {uploads.map((upload) => (
                            <SignedFileLink
                              key={upload.id}
                              applicationId={submission.vendorApplication!.id}
                              kind={upload.kind}
                              label={`${upload.kind}: ${upload.originalFileName}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {submission.documentUrl && !isVendorApplication && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={submission.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          View Doc
                        </a>
                      </Button>
                    )}

                    {activeTab === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(submission.id)}
                          disabled={processingId === submission.id}
                        >
                          {processingId === submission.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => setRejectModal({ id: submission.id, name: name || "" })}
                          disabled={processingId === submission.id}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reject KYC
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Rejecting KYC for <strong>{rejectModal.name}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-jemo-orange focus:border-transparent resize-none"
            />
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason("");
                }}
                disabled={processingId === rejectModal.id}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={!rejectReason.trim() || processingId === rejectModal.id}
              >
                {processingId === rejectModal.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reject"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
