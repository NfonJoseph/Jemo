import { cn } from "@/lib/utils";
import type { DeliveryStatus } from "@/lib/types";

const statusConfig: Record<DeliveryStatus, { label: string; color: string; bg: string }> = {
  SEARCHING_RIDER: {
    label: "Searching Rider",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  },
  ASSIGNED: {
    label: "Assigned",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  PICKED_UP: {
    label: "Picked Up",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
  ON_THE_WAY: {
    label: "On The Way",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
  },
  DELIVERED: {
    label: "Delivered",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
};

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  className?: string;
}

export function DeliveryStatusBadge({ status, className }: DeliveryStatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.bg,
        config.color,
        className
      )}
    >
      {config.label}
    </span>
  );
}

