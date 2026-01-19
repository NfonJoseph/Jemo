"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/translations";
import type {
  KycStatus,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  DeliveryJobStatus,
  DisputeStatus,
  PayoutStatus,
} from "@/lib/types";

type StatusType =
  | KycStatus
  | OrderStatus
  | PaymentStatus
  | DeliveryStatus
  | DeliveryJobStatus
  | DisputeStatus
  | PayoutStatus;

// Status colors configuration
const statusColors: Record<
  StatusType,
  { color: string; bg: string }
> = {
  // KYC
  NOT_SUBMITTED: { color: "text-gray-700", bg: "bg-gray-100" },
  PENDING: { color: "text-amber-700", bg: "bg-amber-100" },
  APPROVED: { color: "text-green-700", bg: "bg-green-100" },
  REJECTED: { color: "text-red-700", bg: "bg-red-100" },
  // Order (new simplified statuses)
  CONFIRMED: { color: "text-blue-700", bg: "bg-blue-100" },
  IN_TRANSIT: { color: "text-purple-700", bg: "bg-purple-100" },
  DELIVERED: { color: "text-green-700", bg: "bg-green-100" },
  COMPLETED: { color: "text-emerald-700", bg: "bg-emerald-100" },
  CANCELLED: { color: "text-red-700", bg: "bg-red-100" },
  // Payment
  INITIATED: { color: "text-amber-700", bg: "bg-amber-100" },
  SUCCESS: { color: "text-green-700", bg: "bg-green-100" },
  FAILED: { color: "text-red-700", bg: "bg-red-100" },
  REFUNDED: { color: "text-gray-700", bg: "bg-gray-100" },
  // Payout
  REQUESTED: { color: "text-yellow-700", bg: "bg-yellow-100" },
  PROCESSING: { color: "text-blue-700", bg: "bg-blue-100" },
  // Delivery (legacy)
  SEARCHING_RIDER: { color: "text-amber-700", bg: "bg-amber-100" },
  ASSIGNED: { color: "text-blue-700", bg: "bg-blue-100" },
  PICKED_UP: { color: "text-indigo-700", bg: "bg-indigo-100" },
  ON_THE_WAY: { color: "text-purple-700", bg: "bg-purple-100" },
  // DeliveryJob (new simplified statuses)
  OPEN: { color: "text-amber-700", bg: "bg-amber-100" },
  ACCEPTED: { color: "text-blue-700", bg: "bg-blue-100" },
  // Dispute
  RESOLVED: { color: "text-green-700", bg: "bg-green-100" },
};

// Fallback labels for when translations are not available
const fallbackLabels: Record<StatusType, string> = {
  NOT_SUBMITTED: "Not Submitted",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CONFIRMED: "Confirmed",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  INITIATED: "Initiated",
  SUCCESS: "Success",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  REQUESTED: "Requested",
  PROCESSING: "Processing",
  SEARCHING_RIDER: "Searching Rider",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked Up",
  ON_THE_WAY: "On the Way",
  OPEN: "Open",
  ACCEPTED: "Accepted",
  RESOLVED: "Resolved",
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations("statusBadge");
  
  const colors = statusColors[status] || {
    color: "text-gray-700",
    bg: "bg-gray-100",
  };

  // Get translated label, fall back to default if translation returns the key
  const translated = t(status);
  const label = translated === status ? (fallbackLabels[status] || status) : translated;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        colors.bg,
        colors.color,
        className
      )}
    >
      {label}
    </span>
  );
}
