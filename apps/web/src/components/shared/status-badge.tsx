"use client";

import { cn } from "@/lib/utils";
import type {
  KycStatus,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  DisputeStatus,
} from "@/lib/types";

type StatusType =
  | KycStatus
  | OrderStatus
  | PaymentStatus
  | DeliveryStatus
  | DisputeStatus;

const statusConfig: Record<
  StatusType,
  { label: string; color: string; bg: string }
> = {
  // KYC
  NOT_SUBMITTED: { label: "Not Submitted", color: "text-gray-700", bg: "bg-gray-100" },
  PENDING: { label: "Pending", color: "text-amber-700", bg: "bg-amber-100" },
  APPROVED: { label: "Approved", color: "text-green-700", bg: "bg-green-100" },
  REJECTED: { label: "Rejected", color: "text-red-700", bg: "bg-red-100" },
  // Order
  PENDING_PAYMENT: { label: "Pending Payment", color: "text-amber-700", bg: "bg-amber-100" },
  CONFIRMED: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-100" },
  PREPARING: { label: "Preparing", color: "text-indigo-700", bg: "bg-indigo-100" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "text-purple-700", bg: "bg-purple-100" },
  DELIVERED: { label: "Delivered", color: "text-green-700", bg: "bg-green-100" },
  CANCELLED: { label: "Cancelled", color: "text-red-700", bg: "bg-red-100" },
  // Payment
  INITIATED: { label: "Initiated", color: "text-amber-700", bg: "bg-amber-100" },
  SUCCESS: { label: "Success", color: "text-green-700", bg: "bg-green-100" },
  FAILED: { label: "Failed", color: "text-red-700", bg: "bg-red-100" },
  REFUNDED: { label: "Refunded", color: "text-gray-700", bg: "bg-gray-100" },
  // Delivery
  SEARCHING_RIDER: { label: "Searching Rider", color: "text-amber-700", bg: "bg-amber-100" },
  ASSIGNED: { label: "Assigned", color: "text-blue-700", bg: "bg-blue-100" },
  PICKED_UP: { label: "Picked Up", color: "text-indigo-700", bg: "bg-indigo-100" },
  ON_THE_WAY: { label: "On the Way", color: "text-purple-700", bg: "bg-purple-100" },
  // Dispute
  OPEN: { label: "Open", color: "text-amber-700", bg: "bg-amber-100" },
  RESOLVED: { label: "Resolved", color: "text-green-700", bg: "bg-green-100" },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    color: "text-gray-700",
    bg: "bg-gray-100",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.bg,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}

