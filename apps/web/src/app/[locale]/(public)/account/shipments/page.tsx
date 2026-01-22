"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "@/lib/translations";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  Package,
  MapPin,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ChevronRight,
  Plus,
  AlertCircle,
  Phone,
} from "lucide-react";

interface ShipmentEvent {
  id: string;
  type: string;
  note?: string;
  createdAt: string;
}

interface Shipment {
  id: string;
  status: "PENDING" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  pickupCity: string;
  pickupAddress: string;
  pickupContactName: string;
  pickupPhone: string;
  dropoffCity: string;
  dropoffAddress: string;
  dropoffContactName: string;
  dropoffPhone: string;
  packageType: string;
  weightKg?: number;
  notes?: string;
  deliveryFee: number;
  cancelReason?: string;
  createdAt: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  agency?: {
    id: string;
    name: string;
    phone: string;
  };
  events: ShipmentEvent[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800" },
  ASSIGNED: { bg: "bg-blue-100", text: "text-blue-800" },
  IN_TRANSIT: { bg: "bg-purple-100", text: "text-purple-800" },
  DELIVERED: { bg: "bg-green-100", text: "text-green-800" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800" },
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  PENDING: Clock,
  ASSIGNED: Truck,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: XCircle,
};

function ShipmentCard({
  shipment,
  onCancel,
}: {
  shipment: Shipment;
  onCancel: (id: string) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const statusColor = STATUS_COLORS[shipment.status] || STATUS_COLORS.PENDING;
  const StatusIcon = STATUS_ICONS[shipment.status] || Clock;

  return (
    <div className="bg-white rounded-xl shadow-card p-5 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-jemo-orange" />
          <span className="font-medium text-gray-900">
            {t(`sendPackage.packageType.${shipment.packageType}`) || shipment.packageType}
          </span>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusColor.bg} ${statusColor.text}`}
        >
          <StatusIcon className="w-3 h-3" />
          {t(`shipment.status.${shipment.status}`)}
        </span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-blue-500" />
            {shipment.pickupCity}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <div className="flex-1 text-right">
          <div className="flex items-center justify-end gap-1 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-green-500" />
            {shipment.dropoffCity}
          </div>
        </div>
      </div>

      {/* Agency info if assigned */}
      {shipment.agency && (
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <span className="font-medium">{t("shipment.assignedTo")}:</span>{" "}
            {shipment.agency.name}
          </p>
          <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
            <Phone className="w-3 h-3" />
            {shipment.agency.phone}
          </p>
        </div>
      )}

      {/* Fee & Date */}
      <div className="flex items-center justify-between text-sm border-t pt-4">
        <div>
          <p className="text-gray-500">{t("shipment.fee")}</p>
          <p className="font-semibold text-gray-900">
            {formatPrice(shipment.deliveryFee)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">{t("shipment.created")}</p>
          <p className="text-gray-700">
            {new Date(shipment.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Actions */}
      {shipment.status === "PENDING" && (
        <div className="mt-4 pt-4 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onCancel(shipment.id)}
          >
            {t("shipment.cancel")}
          </Button>
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/${locale}/account/shipments/${shipment.id}`}>
              {t("shipment.viewDetails")}
            </Link>
          </Button>
        </div>
      )}

      {shipment.status !== "PENDING" && (
        <div className="mt-4 pt-4 border-t">
          <Button asChild size="sm" variant="outline" className="w-full">
            <Link href={`/${locale}/account/shipments/${shipment.id}`}>
              {t("shipment.viewDetails")}
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function MyShipmentsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn) {
      fetchShipments();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [isLoggedIn, authLoading]);

  async function fetchShipments() {
    try {
      const result = await api.get<{ shipments: Shipment[] }>("/shipments/my", true);
      setShipments(result.shipments);
    } catch (err) {
      console.error("Failed to fetch shipments:", err);
      toast(t("shipment.fetchError"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm(t("shipment.confirmCancel"))) return;

    try {
      await api.post(`/shipments/${id}/cancel`, {}, true);
      toast(t("shipment.cancelledDesc"), "success");
      fetchShipments();
    } catch (err) {
      console.error("Failed to cancel shipment:", err);
      const message =
        err instanceof ApiError
          ? (err.data as { message?: string })?.message || err.statusText
          : "Failed to cancel shipment";
      toast(message, "error");
    }
  }

  if (!isLoggedIn && !authLoading) {
    return (
      <div className="min-h-[60vh] py-12 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t("shipment.loginRequired")}
          </h1>
          <p className="text-gray-600 mb-4">{t("shipment.loginRequiredDesc")}</p>
          <Button asChild>
            <Link href={`/${locale}/login?redirect=/${locale}/account/shipments`}>
              {t("auth.login")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] py-8">
      <div className="container-main max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("shipment.myShipments")}</h1>
            <p className="text-gray-600">{t("shipment.myShipmentsDesc")}</p>
          </div>
          <Button asChild>
            <Link href={`/${locale}/send-package`}>
              <Plus className="w-4 h-4 mr-2" />
              {t("shipment.newShipment")}
            </Link>
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && shipments.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {t("shipment.noShipments")}
            </h2>
            <p className="text-gray-600 mb-4">{t("shipment.noShipmentsDesc")}</p>
            <Button asChild>
              <Link href={`/${locale}/send-package`}>
                {t("shipment.sendFirst")}
              </Link>
            </Button>
          </div>
        )}

        {/* Shipments List */}
        {!loading && shipments.length > 0 && (
          <div className="grid gap-4">
            {shipments.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
