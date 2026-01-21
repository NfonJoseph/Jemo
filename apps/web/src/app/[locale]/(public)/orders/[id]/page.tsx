"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Order, OrderItem } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "@/lib/translations";
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
  Truck,
  Store,
  Star,
  X,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

// Review Modal Component
interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderItem: OrderItem;
  onSubmit: (orderItemId: string, rating: number, comment: string) => Promise<void>;
  isSubmitting: boolean;
}

function ReviewModal({ isOpen, onClose, orderItem, onSubmit, isSubmitting }: ReviewModalProps) {
  const t = useTranslations("orders");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    await onSubmit(orderItem.id, rating, comment);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-h3 text-gray-900 mb-4">{t("leaveReview")}</h3>

        {/* Product Info */}
        <div className="flex gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
          <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
            <Image
              src={orderItem.product?.images?.[0]?.url || "/placeholder-product.svg"}
              alt={orderItem.product?.name || "Product"}
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 line-clamp-2">
              {orderItem.product?.name || "Product"}
            </p>
            <p className="text-sm text-gray-500">Qty: {orderItem.quantity}</p>
          </div>
        </div>

        {/* Star Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("yourRating")} <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-gray-200 text-gray-200"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("writeComment")}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange/20 focus:border-jemo-orange resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("submitReview")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("statusBadge");
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const toast = useToast();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<OrderItem | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set());
  
  // Mark as received state
  const [markingReceived, setMarkingReceived] = useState(false);

  const findOrderFromList = useCallback(async (orderId: string): Promise<Order | null> => {
    try {
      const orders = await api.get<Order[]>("/orders/me", true);
      const found = orders.find((o) => o.id === orderId);
      return found || null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw err;
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      router.push(`/${locale}/login?redirect=/orders/${params.id}`);
      return;
    }

    async function fetchOrder() {
      const orderId = params.id as string;
      if (!orderId) return;

      setLoading(true);
      setError(null);

      try {
        let foundOrder = await findOrderFromList(orderId);

        if (!foundOrder) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          foundOrder = await findOrderFromList(orderId);
        }

        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          setError("Order not found");
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            router.push(`/${locale}/login?redirect=/orders/${params.id}`);
            return;
          }
          setError("Failed to load order details");
        } else {
          setError("Something went wrong");
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [params.id, isLoggedIn, authLoading, router, locale, findOrderFromList]);

  // Check which items have already been reviewed (for DELIVERED or COMPLETED orders)
  useEffect(() => {
    if (!order || (order.status !== "DELIVERED" && order.status !== "COMPLETED")) return;

    async function checkReviewedItems() {
      const reviewed = new Set<string>();
      for (const item of order!.items || []) {
        try {
          const result = await api.get<{ canReview: boolean }>(
            `/reviews/can-review/${item.id}`,
            true
          );
          if (!result.canReview) {
            reviewed.add(item.id);
          }
        } catch {
          // Ignore errors, assume not reviewed
        }
      }
      setReviewedItems(reviewed);
    }

    checkReviewedItems();
  }, [order]);

  const handleOpenReviewModal = (item: OrderItem) => {
    setSelectedOrderItem(item);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (orderItemId: string, rating: number, comment: string) => {
    setSubmittingReview(true);
    try {
      await api.post(
        "/reviews",
        { orderItemId, rating, comment: comment.trim() || undefined },
        true
      );
      toast.success(t("reviewSubmitted"));
      setReviewedItems((prev) => new Set([...prev, orderItemId]));
      setReviewModalOpen(false);
      setSelectedOrderItem(null);
    } catch (err) {
      console.error("Failed to submit review:", err);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if "Mark as received" button should be shown
  // Both VENDOR_DELIVERY and JEMO_RIDER: allow when status is DELIVERED
  const canMarkReceived = (): boolean => {
    if (!order) return false;
    return order.status === "DELIVERED";
  };

  // Handle marking order as received
  const handleMarkReceived = async () => {
    if (!order) return;
    
    setMarkingReceived(true);
    try {
      const result = await api.post<{ success: boolean; order: { status: string; completedAt: string } }>(
        `/orders/${order.id}/received`,
        {},
        true
      );
      
      if (result.success) {
        // Update local order state
        setOrder((prev) => prev ? {
          ...prev,
          status: "COMPLETED" as const,
          completedAt: result.order.completedAt,
        } : null);
        toast.success(t("markedAsReceivedSuccess"));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || t("markAsReceivedError"));
      } else {
        toast.error(t("somethingWentWrong"));
      }
    } finally {
      setMarkingReceived(false);
    }
  };

  const isDelivered = order?.status === "DELIVERED";
  const isCompleted = order?.status === "COMPLETED";
  const isCancelled = order?.status === "CANCELLED";
  const isJemoDelivery = order?.deliveryMethod === "JEMO_RIDER";

  // Get status description
  const getStatusDescription = (): string => {
    if (!order) return "";
    switch (order.status) {
      case "PENDING":
        return t("statusDescriptions.pending");
      case "CONFIRMED":
        return isJemoDelivery 
          ? t("statusDescriptions.confirmedJemo")
          : t("statusDescriptions.confirmedVendor");
      case "IN_TRANSIT":
        return t("statusDescriptions.inTransit");
      case "DELIVERED":
        return t("statusDescriptions.delivered");
      case "COMPLETED":
        return t("statusDescriptions.completed");
      case "CANCELLED":
        return t("statusDescriptions.cancelled");
      default:
        return "";
    }
  };

  if (authLoading || (!isLoggedIn && loading)) {
    return (
      <div className="py-6">
        <div className="container-main">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6">
        <div className="container-main">
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="error"
            title="Order not found"
            description={error || "The order you're looking for doesn't exist or may still be processing."}
            actionLabel="View All Orders"
            actionHref={`/${locale}/orders`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="container-main">
        {/* Back button */}
        <Link
          href={`/${locale}/orders`}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 tap-highlight-none"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-body">{tCommon("back")}</span>
        </Link>

        {/* Order Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-gray-400" />
              <h1 className="text-h2 text-gray-900">
                {t("orderNumber", { id: order.id.slice(-8).toUpperCase() })}
              </h1>
            </div>
            <div className="flex items-center gap-1 text-small text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{t("placed")} {formatDate(order.createdAt)}</span>
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
                {isJemoDelivery ? t("jemoDelivery") : t("vendorDelivery")}
              </span>
            )}
          </div>
        </div>

        {/* Status Description */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Clock className="w-4 h-4" />
          <span>{getStatusDescription()}</span>
        </div>

        {/* Mark as Received Action */}
        {canMarkReceived() && (
          <div className="card p-4 bg-green-50 border-green-200 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">{t("receivedYourOrder")}</p>
                <p className="text-sm text-gray-600">
                  {isJemoDelivery 
                    ? t("receivedDescriptionJemo")
                    : t("receivedDescriptionVendor")
                  }
                </p>
              </div>
              <Button
                onClick={handleMarkReceived}
                disabled={markingReceived}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {markingReceived ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("processing")}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t("markAsReceived")}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Completed Order Message */}
        {isCompleted && (
          <div className="card p-4 bg-emerald-50 border-emerald-200 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800">{t("orderCompleted")}</p>
                {order.completedAt && (
                  <p className="text-sm text-emerald-700">
                    {t("completedOn")} {formatDate(order.completedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancelled Order Message */}
        {isCancelled && (
          <div className="card p-4 bg-red-50 border-red-200 mb-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-medium text-red-800">{t("statuses.cancelled")}</p>
                {order.cancelReason && (
                  <p className="text-sm text-red-700 mt-1">
                    <span className="font-medium">{t("reason")}:</span> {order.cancelReason}
                  </p>
                )}
                {order.cancelledAt && (
                  <p className="text-xs text-red-600 mt-1">
                    {t("cancelledOn")} {formatDate(order.cancelledAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-4">
              <h2 className="text-h3 text-gray-900 mb-4">{t("items")}</h2>
              <div className="space-y-4">
                {order.items?.map((item) => {
                  const isReviewed = reviewedItems.has(item.id);
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                        <Image
                          src={
                            item.product?.images?.[0]?.url ||
                            "/placeholder-product.svg"
                          }
                          alt={item.product?.name || "Product"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/${locale}/products/${item.productId}`}
                          className="text-body font-medium text-gray-900 hover:text-jemo-orange line-clamp-2"
                        >
                          {item.product?.name || "Product"}
                        </Link>
                        <p className="text-small text-gray-500 mt-1">
                          {t("quantity")}: {item.quantity} × {formatPrice(item.unitPrice)}
                        </p>
                        <p className="text-body font-semibold text-jemo-orange mt-1">
                          {formatPrice(
                            parseFloat(item.unitPrice) * item.quantity
                          )}
                        </p>

                        {/* Review Button for delivered/completed orders */}
                        {(isDelivered || isCompleted) && (
                          <div className="mt-2">
                            {isReviewed ? (
                              <div className="flex items-center gap-1 text-sm text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span>{t("alreadyReviewed")}</span>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenReviewModal(item)}
                                className="gap-1"
                              >
                                <Star className="w-4 h-4" />
                                {t("leaveReview")}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="card p-4">
              <h2 className="text-h3 text-gray-900 mb-4">{t("deliveryAddress")}</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-small text-gray-500">{t("deliveryAddress")}</p>
                    <p className="text-body text-gray-900">
                      {order.deliveryAddress || "Not specified"}
                    </p>
                    {order.deliveryCity && (
                      <p className="text-sm text-gray-600">{order.deliveryCity}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-small text-gray-500">{t("contactPhone")}</p>
                    <p className="text-body text-gray-900">{order.deliveryPhone || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Progress Tracker */}
            {order.deliveryJob && (
              <div className="card p-4">
                <h2 className="text-h3 text-gray-900 mb-4">{t("deliveryProgress")}</h2>
                
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className={order.deliveryJob.status === "OPEN" ? "text-jemo-orange font-medium" : ""}>
                      {order.deliveryJob.status === "OPEN" ? t("waiting") : tStatus("OPEN")}
                    </span>
                    <span className={order.deliveryJob.status === "ACCEPTED" ? "text-jemo-orange font-medium" : ""}>
                      {tStatus("IN_TRANSIT")}
                    </span>
                    <span className={order.deliveryJob.status === "DELIVERED" ? "text-green-600 font-medium" : ""}>
                      {tStatus("DELIVERED")}
                    </span>
                  </div>
                  <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-jemo-orange rounded-full transition-all duration-500"
                      style={{
                        width:
                          order.deliveryJob.status === "OPEN" ? "10%" :
                          order.deliveryJob.status === "ACCEPTED" ? "50%" :
                          order.deliveryJob.status === "DELIVERED" ? "100%" : "0%",
                      }}
                    />
                  </div>
                </div>

                {/* Delivery Agency Info */}
                {order.deliveryJob.agency && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">{t("deliveryAgency")}</span>
                    </div>
                    <p className="text-sm text-blue-800">{order.deliveryJob.agency.name}</p>
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
                )}

                {/* Status Message */}
                <div className={`rounded-lg p-3 ${
                  order.deliveryJob.status === "DELIVERED" 
                    ? "bg-green-50 border border-green-100" 
                    : order.deliveryJob.status === "OPEN"
                    ? "bg-amber-50 border border-amber-100"
                    : "bg-gray-50 border border-gray-100"
                }`}>
                  <p className={`text-sm ${
                    order.deliveryJob.status === "DELIVERED" 
                      ? "text-green-700" 
                      : order.deliveryJob.status === "OPEN"
                      ? "text-amber-700"
                      : "text-gray-700"
                  }`}>
                    {order.deliveryJob.status === "OPEN" && t("lookingForAgency")}
                    {order.deliveryJob.status === "ACCEPTED" && t("orderOnTheWay")}
                    {order.deliveryJob.status === "DELIVERED" && (
                      <>
                        {t("orderDelivered")}
                        {order.deliveryJob.deliveredAt && (
                          <span className="block mt-1 text-xs">
                            {t("deliveredOn")} {formatDate(order.deliveryJob.deliveredAt)}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>

                {/* Timeline */}
                <div className="mt-4 space-y-2 text-sm">
                  {order.deliveryJob.acceptedAt && (
                    <div className="flex justify-between text-gray-600">
                      <span>{t("acceptedByAgency")}</span>
                      <span>{formatDate(order.deliveryJob.acceptedAt)}</span>
                    </div>
                  )}
                  {order.deliveryJob.deliveredAt && (
                    <div className="flex justify-between text-green-600">
                      <span>{tStatus("DELIVERED")}</span>
                      <span>{formatDate(order.deliveryJob.deliveredAt)}</span>
                    </div>
                  )}
                </div>
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
                    {t("subtotalItems", { count: order.items?.length || 0 })}
                  </span>
                  <span className="text-gray-900">
                    {formatPrice(Number(order.totalAmount) - (order.deliveryFee || 0))}
                  </span>
                </div>
                <div className="flex justify-between text-body">
                  <span className="text-gray-500">{t("delivery")}</span>
                  <span className="text-gray-900">
                    {order.deliveryFee && order.deliveryFee > 0 
                      ? formatPrice(order.deliveryFee) 
                      : t("deliveryIncluded")}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-h3 mb-6">
                <span className="text-gray-900">{t("total")}</span>
                <span className="text-jemo-orange font-bold">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>

              {/* Payment Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-small text-gray-500">{t("paymentMethod")}</span>
                </div>
                <p className="text-body text-gray-900 font-medium">
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

              {/* Delivery Method */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-gray-400" />
                  <span className="text-small text-gray-500">{t("deliveryMethod")}</span>
                </div>
                <p className="text-body text-gray-900 font-medium flex items-center gap-1">
                  {isJemoDelivery ? (
                    <>
                      <Truck className="w-4 h-4 text-purple-600" />
                      {t("jemoDelivery")}
                    </>
                  ) : (
                    <>
                      <Store className="w-4 h-4 text-gray-600" />
                      {t("vendorDelivery")}
                    </>
                  )}
                </p>
              </div>

              {/* Vendor Info */}
              {order.items?.[0]?.product?.vendorProfile && (
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-4 h-4 text-gray-400" />
                    <span className="text-small text-gray-500">{t("vendor")}</span>
                  </div>
                  <p className="text-body text-gray-900 font-medium">
                    {order.items[0].product.vendorProfile.businessName}
                  </p>
                  <p className="text-small text-gray-500">
                    {order.items[0].product.vendorProfile.businessAddress}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedOrderItem && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedOrderItem(null);
          }}
          orderItem={selectedOrderItem}
          onSubmit={handleSubmitReview}
          isSubmitting={submittingReview}
        />
      )}
    </div>
  );
}
