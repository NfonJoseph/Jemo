"use client";

import { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import { useLocale, useTranslations } from "@/lib/translations";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Clock,
  Phone,
  User,
  RefreshCw,
  DollarSign,
  Loader2,
} from "lucide-react";

interface Shipment {
  id: string;
  status: "PENDING" | "AWAITING_PAYMENT" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
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
  createdAt: string;
  assignedAt?: string;
  user?: {
    id: string;
    name: string;
    phone: string;
  };
}

type TabType = "available" | "my";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: "bg-yellow-100", text: "text-yellow-800" },
  AWAITING_PAYMENT: { bg: "bg-orange-100", text: "text-orange-800" },
  ASSIGNED: { bg: "bg-blue-100", text: "text-blue-800" },
  IN_TRANSIT: { bg: "bg-purple-100", text: "text-purple-800" },
  DELIVERED: { bg: "bg-green-100", text: "text-green-800" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800" },
};

function ShipmentCard({
  shipment,
  tab,
  onSetFee,
  onAction,
  loading,
}: {
  shipment: Shipment;
  tab: TabType;
  onSetFee: (id: string, fee: number) => void;
  onAction: (id: string, action: string) => void;
  loading: boolean;
}) {
  const t = useTranslations();
  const [feeInput, setFeeInput] = useState<string>("");
  const statusColor = STATUS_COLORS[shipment.status] || STATUS_COLORS.PENDING;

  const handleSetFee = () => {
    const fee = parseInt(feeInput, 10);
    if (isNaN(fee) || fee < 100) {
      return;
    }
    onSetFee(shipment.id, fee);
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-jemo-orange" />
          <span className="font-medium text-gray-900">
            {t(`sendPackage.packageType.${shipment.packageType}`) || shipment.packageType}
          </span>
          {shipment.weightKg && (
            <span className="text-sm text-gray-500">({shipment.weightKg} kg)</span>
          )}
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}
        >
          {t(`shipment.status.${shipment.status}`)}
        </span>
      </div>

      {/* Route */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <div className="w-0.5 h-8 bg-gray-300" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">{shipment.pickupCity}</p>
              <p className="text-sm text-gray-600">{shipment.pickupAddress}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <User className="w-3 h-3" /> {shipment.pickupContactName}
                <Phone className="w-3 h-3 ml-2" /> {shipment.pickupPhone}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{shipment.dropoffCity}</p>
              <p className="text-sm text-gray-600">{shipment.dropoffAddress}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <User className="w-3 h-3" /> {shipment.dropoffContactName}
                <Phone className="w-3 h-3 ml-2" /> {shipment.dropoffPhone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {shipment.notes && (
        <div className="bg-amber-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-800">
            <span className="font-medium">{t("shipment.notes")}:</span> {shipment.notes}
          </p>
        </div>
      )}

      {/* Fee & Customer */}
      <div className="flex items-center justify-between text-sm mb-4">
        <div>
          <p className="text-gray-500">{t("shipment.fee")}</p>
          <p className="text-lg font-bold text-jemo-orange">
            {shipment.deliveryFee > 0 ? formatPrice(shipment.deliveryFee) : t("shipment.notSet")}
          </p>
        </div>
        {shipment.user && (
          <div className="text-right">
            <p className="text-gray-500">{t("shipment.customer")}</p>
            <p className="text-gray-900">{shipment.user.name}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t">
        {/* Available tab: Show Set Fee form for PENDING shipments */}
        {tab === "available" && shipment.status === "PENDING" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t("shipment.setDeliveryFee")}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  min="100"
                  step="100"
                  placeholder="e.g., 1500"
                  className="pl-9"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSetFee}
                disabled={loading || !feeInput || parseInt(feeInput) < 100}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Truck className="w-4 h-4 mr-2" />
                    {t("shipment.setFee")}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">{t("shipment.setFeeHint")}</p>
          </div>
        )}

        {/* My tab: AWAITING_PAYMENT - waiting for customer payment */}
        {tab === "my" && shipment.status === "AWAITING_PAYMENT" && (
          <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 rounded-lg p-3">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{t("shipment.awaitingPayment")}</span>
          </div>
        )}

        {/* My tab: ASSIGNED - ready for pickup */}
        {tab === "my" && shipment.status === "ASSIGNED" && (
          <Button
            className="w-full"
            onClick={() => onAction(shipment.id, "pickup")}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Package className="w-4 h-4 mr-2" />
            )}
            {t("shipment.markPickedUp")}
          </Button>
        )}

        {/* My tab: IN_TRANSIT - ready for delivery */}
        {tab === "my" && shipment.status === "IN_TRANSIT" && (
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => onAction(shipment.id, "deliver")}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {t("shipment.markDelivered")}
          </Button>
        )}

        {/* My tab: DELIVERED - completed */}
        {tab === "my" && shipment.status === "DELIVERED" && (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{t("shipment.completed")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RiderShipmentsPage() {
  const t = useTranslations();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabType>("available");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchShipments();
  }, [tab]);

  async function fetchShipments() {
    setLoading(true);
    try {
      const endpoint = tab === "available" ? "/rider/shipments/available" : "/rider/shipments/my";
      const result = await api.get<{ shipments: Shipment[] }>(endpoint, true);
      setShipments(result.shipments);
    } catch (err) {
      console.error("Failed to fetch shipments:", err);
      toast(t("shipment.fetchError"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetFee(id: string, fee: number) {
    setActionLoading(true);
    try {
      await api.post(`/rider/shipments/${id}/set-fee`, { deliveryFee: fee }, true);
      toast(t("shipment.feeSetSuccess"), "success");
      // Switch to my tab to see the shipment awaiting payment
      setTab("my");
    } catch (err) {
      console.error("Failed to set fee:", err);
      const message =
        err instanceof ApiError
          ? (err.data as { message?: string })?.message || err.statusText
          : "Failed to set delivery fee";
      toast(message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAction(id: string, action: string) {
    setActionLoading(true);
    try {
      await api.post(`/rider/shipments/${id}/${action}`, {}, true);

      const messages: Record<string, string> = {
        pickup: t("shipment.pickedUpDesc"),
        deliver: t("shipment.deliveredDesc"),
      };

      const msg = messages[action];
      if (msg) {
        toast(msg, "success");
      }

      fetchShipments();
    } catch (err) {
      console.error(`Failed to ${action} shipment:`, err);
      const message =
        err instanceof ApiError
          ? (err.data as { message?: string })?.message || err.statusText
          : `Failed to ${action} shipment`;
      toast(message, "error");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] py-6">
      <div className="container-main max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("shipment.packageDeliveries")}</h1>
            <p className="text-gray-600">{t("shipment.packageDeliveriesDesc")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchShipments} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === "available"
                ? "bg-jemo-orange text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setTab("available")}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            {t("shipment.available")}
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === "my"
                ? "bg-jemo-orange text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => setTab("my")}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            {t("shipment.myDeliveries")}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && shipments.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {tab === "available"
                ? t("shipment.noAvailableShipments")
                : t("shipment.noAssignedShipments")}
            </h2>
            <p className="text-gray-600">
              {tab === "available"
                ? t("shipment.noAvailableShipmentsDesc")
                : t("shipment.noAssignedShipmentsDesc")}
            </p>
          </div>
        )}

        {/* Shipments Grid */}
        {!loading && shipments.length > 0 && (
          <div className="grid gap-4">
            {shipments.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                tab={tab}
                onSetFee={handleSetFee}
                onAction={handleAction}
                loading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
