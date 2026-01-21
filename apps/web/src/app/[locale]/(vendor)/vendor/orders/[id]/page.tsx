"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { useTranslations, useLocale } from "@/lib/translations";
import type { VendorOrder, OrderStatus } from "@/lib/types";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  ChevronLeft,
  Package,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  Loader2,
  CheckCircle,
  Truck,
  XCircle,
  X,
  Store,
  Clock,
} from "lucide-react";

export default function VendorOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const locale = useLocale();
  const t = useTranslations("vendorOrders");

  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [markingDelivered, setMarkingDelivered] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      try {
        const orders = await api.get<VendorOrder[]>("/vendor/orders", true);
        const found = orders.find((o) => o.id === params.id);
        if (found) {
          setOrder(found);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [params.id]);

  // Confirm order (PENDING → CONFIRMED)
  const handleConfirmOrder = async () => {
    if (!order) return;

    setConfirming(true);
    try {
      const updatedOrder = await api.post<VendorOrder>(`/vendor/orders/${order.id}/confirm`, {}, true);
      setOrder(updatedOrder);
      toast.success(t("orderConfirmed"));
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || t("confirmError"));
      } else {
        toast.error(t("somethingWentWrong"));
      }
    } finally {
      setConfirming(false);
    }
  };

  // Cancel order with reason
  const handleCancelOrder = async () => {
    if (!order || !cancelReason.trim()) return;

    setCancelling(true);
    try {
      const updatedOrder = await api.post<VendorOrder>(
        `/vendor/orders/${order.id}/cancel`,
        { reason: cancelReason.trim() },
        true
      );
      setOrder(updatedOrder);
      setShowCancelModal(false);
      setCancelReason("");
      toast.success(t("orderCancelled"));
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || t("cancelError"));
      } else {
        toast.error(t("somethingWentWrong"));
      }
    } finally {
      setCancelling(false);
    }
  };

  // Mark as in transit (for vendor self-delivery)
  const handleMarkInTransit = async () => {
    if (!order) return;

    setUpdating(true);
    try {
      await api.patch(`/vendor/orders/${order.id}/status`, { status: "IN_TRANSIT" }, true);
      setOrder((prev) => (prev ? { ...prev, status: "IN_TRANSIT" } : null));
      toast.success(t("markedInTransit"));
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

  // Mark as delivered (for vendor self-delivery)
  const handleMarkDelivered = async () => {
    if (!order) return;

    setMarkingDelivered(true);
    try {
      await api.patch(`/vendor/orders/${order.id}/status`, { status: "DELIVERED" }, true);
      setOrder((prev) => (prev ? { ...prev, status: "DELIVERED" } : null));
      toast.success(t("markedDelivered"));
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || t("updateError"));
      } else {
        toast.error(t("somethingWentWrong"));
      }
    } finally {
      setMarkingDelivered(false);
    }
  };

  // Check if order can be cancelled
  const canCancel = order && (order.status === "PENDING" || order.status === "CONFIRMED");
  // Check if order is Jemo Delivery
  const isJemoDelivery = order?.deliveryMethod === "JEMO_RIDER";

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status-based action hint
  const getNextAction = (): string => {
    if (!order) return "";
    switch (order.status) {
      case "PENDING":
        return t("nextActions.PENDING");
      case "CONFIRMED":
        return isJemoDelivery ? t("nextActions.CONFIRMED_JEMO") : t("nextActions.CONFIRMED_VENDOR");
      case "IN_TRANSIT":
        return t("nextActions.IN_TRANSIT");
      case "DELIVERED":
        return t("nextActions.DELIVERED");
      case "COMPLETED":
        return t("nextActions.COMPLETED");
      case "CANCELLED":
        return t("nextActions.CANCELLED");
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <EmptyState
        type="error"
        title="Order not found"
        description="The order you're looking for doesn't exist or you don't have access."
        actionLabel={t("backToOrders")}
        actionHref={`/${locale}/vendor/orders`}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/${locale}/vendor/orders`}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{t("backToOrders")}</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-gray-400" />
              <h1 className="text-h2 text-gray-900">
                {t("orderNumber", { id: order.id.slice(-8).toUpperCase() })}
              </h1>
            </div>
            <div className="flex items-center gap-1 text-small text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{t("placedOn")} {formatDate(order.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={order.status} className="self-start sm:self-auto" />
            {order.deliveryMethod && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isJemoDelivery 
                  ? "bg-purple-100 text-purple-700" 
                  : "bg-gray-100 text-gray-700"
              }`}>
                {isJemoDelivery ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                {t(`deliveryMethods.${order.deliveryMethod}`)}
              </span>
            )}
          </div>
        </div>
        {/* Next action hint */}
        <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {getNextAction()}
        </p>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {t("cancelOrder")}
              </h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {t("cancelOrderDescription")}
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("cancelReasonPlaceholder")}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-jemo-orange focus:border-transparent resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {cancelReason.length}/500
            </p>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(false)}
                className="flex-1"
                disabled={cancelling}
              >
                {t("keepOrder")}
              </Button>
              <Button
                onClick={handleCancelOrder}
                disabled={!cancelReason.trim() || cancelling}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("cancelling")}
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    {t("confirmCancel")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Actions Section */}
      {order.status === "PENDING" && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">{t("newOrder")}</p>
              <p className="text-sm text-gray-600">
                {t("confirmOrderDescription")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(true)}
                disabled={confirming}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t("cancel")}
              </Button>
              <Button
                onClick={handleConfirmOrder}
                disabled={confirming}
                className="bg-jemo-orange hover:bg-jemo-orange/90"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("confirming")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t("confirmOrder")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {order.status === "CONFIRMED" && (
        <div className="card p-4 bg-blue-50 border-blue-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">{t("orderConfirmedTitle")}</p>
              <p className="text-sm text-gray-600">
                {isJemoDelivery ? t("waitingForAgency") : t("markInTransitDescription")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelModal(true)}
                disabled={updating}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t("cancel")}
              </Button>
              {!isJemoDelivery && (
                <Button
                  onClick={handleMarkInTransit}
                  disabled={updating}
                  className="bg-jemo-orange hover:bg-jemo-orange/90"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("updating")}
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 mr-2" />
                      {t("markInTransit")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {order.status === "IN_TRANSIT" && (
        <div className="card p-4 bg-purple-50 border-purple-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-purple-900">{t("statusHints.IN_TRANSIT")}</p>
                <p className="text-sm text-purple-700">
                  {isJemoDelivery ? t("nextActions.IN_TRANSIT") : t("nextActions.IN_TRANSIT_VENDOR")}
                </p>
              </div>
            </div>
            {/* Show Mark as Delivered button for vendor self-delivery */}
            {!isJemoDelivery && (
              <Button
                onClick={handleMarkDelivered}
                disabled={markingDelivered}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {markingDelivered ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("updating")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t("markAsDelivered")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {order.status === "DELIVERED" && (
        <div className="card p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">{t("statusHints.DELIVERED")}</p>
              <p className="text-sm text-green-700">{t("nextActions.DELIVERED")}</p>
            </div>
          </div>
        </div>
      )}

      {order.status === "COMPLETED" && (
        <div className="card p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900">{t("statusHints.COMPLETED")}</p>
              <p className="text-sm text-emerald-700">{t("nextActions.COMPLETED")}</p>
            </div>
          </div>
        </div>
      )}

      {order.status === "CANCELLED" && order.cancelReason && (
        <div className="card p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">{t("orderCancelledTitle")}</p>
              <p className="text-sm text-red-700 mt-1">
                <span className="font-medium">{t("reason")}:</span> {order.cancelReason}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <h2 className="text-h3 text-gray-900 mb-4">{t("orderItems")}</h2>
            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                    <Image
                      src={item.product?.images?.[0]?.url || "/placeholder-product.svg"}
                      alt={item.product?.name || "Product"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-1">
                      {item.product?.name || "Product"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                    </p>
                    <p className="font-semibold text-jemo-orange">
                      {formatPrice(parseFloat(item.unitPrice) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer & Delivery Info */}
          <div className="card p-4">
            <h2 className="text-h3 text-gray-900 mb-4">{t("customerDelivery")}</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t("customerPhone")}</p>
                  <p className="text-gray-900">
                    {order.customer?.phone || order.deliveryPhone || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">{t("deliveryAddress") || "Delivery Address"}</p>
                  <p className="text-gray-900">{order.deliveryAddress}</p>
                  {order.deliveryCity && (
                    <p className="text-sm text-gray-600">{order.deliveryCity}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Agency Info */}
          {order.deliveryJob && (
            <div className="card p-4">
              <h2 className="text-h3 text-gray-900 mb-4">{t("deliveryStatus")}</h2>
              
              {/* Status Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">{t("currentStatus")}</span>
                <StatusBadge status={order.deliveryJob.status} />
              </div>

              {/* Assigned Agency */}
              {order.deliveryJob.agency ? (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{t("assignedAgency")}</span>
                  </div>
                  <p className="text-sm text-blue-800 font-medium">
                    {order.deliveryJob.agency.name}
                  </p>
                  {order.deliveryJob.agency.phone && (
                    <a 
                      href={`tel:${order.deliveryJob.agency.phone}`}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      <Phone className="w-3 h-3" />
                      {order.deliveryJob.agency.phone}
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                  <p className="text-sm text-amber-700">
                    {t("waitingForAgencyPickup")}
                  </p>
                </div>
              )}

              {/* Timeline */}
              {(order.deliveryJob.acceptedAt || order.deliveryJob.deliveredAt) && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                  {order.deliveryJob.acceptedAt && (
                    <div className="flex justify-between text-gray-600">
                      <span>{t("acceptedByAgency")}</span>
                      <span>{formatDate(order.deliveryJob.acceptedAt)}</span>
                    </div>
                  )}
                  {order.deliveryJob.deliveredAt && (
                    <div className="flex justify-between text-green-600">
                      <span>{t("delivered")}</span>
                      <span>{formatDate(order.deliveryJob.deliveredAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-4 sticky top-24">
            <h2 className="text-h3 text-gray-900 mb-4">{t("orderSummary")}</h2>

            <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between text-body">
                <span className="text-gray-500">
                  {t("items")} ({order.items?.length || 0})
                </span>
                <span className="text-gray-900">
                  {formatPrice(Number(order.totalAmount) - (order.deliveryFee || 0))}
                </span>
              </div>
              {order.deliveryFee !== undefined && order.deliveryFee !== null && (
                <div className="flex justify-between text-body">
                  <span className="text-gray-500">{t("deliveryFee")}</span>
                  <span className="text-gray-900">
                    {order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : t("included")}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between text-h3 mb-6">
              <span className="text-gray-900">Total</span>
              <span className="text-jemo-orange font-bold">
                {formatPrice(order.totalAmount)}
              </span>
            </div>

            {/* Payment Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{t("payment")}</span>
              </div>
              <p className="text-gray-900 font-medium">
                {order.payment?.paymentMethod === "COD"
                  ? t("payOnDelivery")
                  : order.payment?.paymentMethod || t("payOnDelivery")}
              </p>
              {order.payment && (
                <div className="mt-2">
                  <StatusBadge status={order.payment.status} />
                </div>
              )}
            </div>

            {/* Delivery Method Info */}
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{t("deliveryMethod")}</span>
              </div>
              <p className="text-gray-900 font-medium flex items-center gap-1">
                {isJemoDelivery ? (
                  <>
                    <Truck className="w-4 h-4 text-purple-600" />
                    {t("deliveryMethods.JEMO_RIDER")}
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4 text-gray-600" />
                    {t("deliveryMethods.VENDOR_SELF")}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

