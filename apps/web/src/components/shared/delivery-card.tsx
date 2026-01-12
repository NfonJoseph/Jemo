import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { RiderDelivery } from "@/lib/types";
import { DeliveryStatusBadge } from "./delivery-status-badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  Store,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface DeliveryCardProps {
  delivery: RiderDelivery;
  showAcceptButton?: boolean;
  onAccept?: (id: string) => Promise<void>;
  isAccepting?: boolean;
}

export function DeliveryCard({
  delivery,
  showAcceptButton,
  onAccept,
  isAccepting,
}: DeliveryCardProps) {
  const pickupAddress = delivery.pickupAddress || delivery.vendorProfile?.businessAddress || "Vendor location";
  const dropoffAddress = delivery.dropoffAddress || delivery.order?.deliveryAddress || "Customer location";
  const vendorName = delivery.vendorProfile?.businessName || "Vendor";
  const orderTotal = delivery.order?.totalAmount || "0";
  const customerPhone = delivery.order?.deliveryPhone || delivery.order?.customer?.phone;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Delivery #{delivery.id.slice(-8)}</p>
          <p className="font-semibold text-gray-900">{formatPrice(orderTotal)}</p>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Vendor */}
        <div className="flex items-center gap-2 text-sm">
          <Store className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700">{vendorName}</span>
        </div>

        {/* Pickup */}
        <div className="flex items-start gap-2 text-sm">
          <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pickup</p>
            <p className="text-gray-700">{pickupAddress}</p>
          </div>
        </div>

        {/* Dropoff */}
        <div className="flex items-start gap-2 text-sm">
          <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Dropoff</p>
            <p className="text-gray-700">{dropoffAddress}</p>
          </div>
        </div>

        {/* Customer Phone */}
        {customerPhone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700">{customerPhone}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
        {showAcceptButton && onAccept ? (
          <Button
            className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
            onClick={() => onAccept(delivery.id)}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              "Accept Delivery"
            )}
          </Button>
        ) : (
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/rider/deliveries/${delivery.id}`}>
              View Details
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function DeliveryCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-5 w-16 bg-gray-200 rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-40 bg-gray-200 rounded" />
      </div>
      <div className="p-4 pt-0">
        <div className="h-10 w-full bg-gray-200 rounded" />
      </div>
    </div>
  );
}

