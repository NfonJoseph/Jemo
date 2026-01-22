"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useTranslations, useLocale } from "@/lib/translations";
import { StatusBadge, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import {
  Package,
  ChevronRight,
  Calendar,
  Truck,
  Store,
  MapPin,
  Send,
  X,
  CreditCard,
  Loader2,
  Phone,
  Smartphone,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface Shipment {
  id: string;
  status: "PENDING" | "AWAITING_PAYMENT" | "ASSIGNED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  pickupCity: string;
  pickupAddress: string;
  pickupContactName: string;
  dropoffCity: string;
  dropoffAddress: string;
  dropoffContactName: string;
  packageType: string;
  deliveryFee: number;
  createdAt: string;
  agency?: {
    id: string;
    name: string;
    phone: string;
  };
}

type TabType = "orders" | "shipments";

export default function OrdersPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("orders");
  const tShipment = useTranslations("shipment");
  const { toast } = useToast();
  const { isLoggedIn, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [paymentOperator, setPaymentOperator] = useState<"MTN_MOMO" | "ORANGE_MONEY">("MTN_MOMO");
  const [paymentPhone, setPaymentPhone] = useState("");
  
  // Payment processing state
  type PaymentStep = "form" | "processing" | "success" | "failed";
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("form");
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [providerRef, setProviderRef] = useState<string | null>(null); // MyCoolPay's transaction ref
  const [pollAttempts, setPollAttempts] = useState(0);
  const MAX_POLL_ATTEMPTS = 24; // 2 minutes (24 * 5 seconds)
  const POLL_INTERVAL = 5000; // 5 seconds

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      router.push(`/${locale}/login?redirect=/orders`);
      return;
    }

    async function fetchData() {
      try {
        const [ordersData, shipmentsData] = await Promise.all([
          api.get<Order[]>("/orders/me", true),
          api.get<{ shipments: Shipment[] }>("/shipments/my", true),
        ]);
        setOrders(ordersData);
        setShipments(shipmentsData.shipments || []);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.push(`/${locale}/login?redirect=/orders`);
          return;
        }
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isLoggedIn, authLoading, router, locale]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === "fr" ? "fr-FR" : "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const getShipmentStatusColor = (status: Shipment["status"]) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "AWAITING_PAYMENT":
        return "bg-orange-100 text-orange-800";
      case "ASSIGNED":
        return "bg-blue-100 text-blue-800";
      case "IN_TRANSIT":
        return "bg-purple-100 text-purple-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const [payingId, setPayingId] = useState<string | null>(null);

  const openPaymentModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setPaymentPhone("");
    setPaymentOperator("MTN_MOMO");
    setPaymentStep("form");
    setPaymentRef(null);
    setPollAttempts(0);
    setShowPaymentModal(true);
  };

  // Poll for payment confirmation - actively check MyCoolPay status
  const pollPaymentStatus = useCallback(async () => {
    if (!selectedShipment || !providerRef) return;

    try {
      // Call the status check endpoint using MyCoolPay's providerRef
      const statusResponse = await api.get<{
        status: 'PENDING' | 'SUCCESS' | 'FAILED';
        shipmentStatus: string;
        message?: string;
      }>(`/payments/mycoolpay/shipment/status?providerRef=${providerRef}&shipmentId=${selectedShipment.id}`, true);

      if (statusResponse.status === "SUCCESS") {
        // Payment confirmed!
        setPaymentStep("success");
        // Update local shipment state
        setShipments((prev) =>
          prev.map((s) =>
            s.id === selectedShipment.id ? { ...s, status: "ASSIGNED" as const } : s
          )
        );
        toast(tShipment("paymentSuccess"), "success");
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowPaymentModal(false);
          setPaymentStep("form");
        }, 2000);
        return;
      }

      if (statusResponse.status === "FAILED") {
        setPaymentStep("form");
        toast(statusResponse.message || tShipment("paymentFailed"), "error");
        setPaymentRef(null);
        return;
      }

      // Continue polling for PENDING
      setPollAttempts(prev => prev + 1);
    } catch (err) {
      console.error("Error polling payment status:", err);
      // Continue polling on error
      setPollAttempts(prev => prev + 1);
    }
  }, [selectedShipment, providerRef, pollAttempts, toast, tShipment]);

  // Poll effect
  useEffect(() => {
    if (paymentStep !== "processing" || !providerRef) return;
    if (pollAttempts >= MAX_POLL_ATTEMPTS) {
      // Timeout - show retry option
      return;
    }

    const timer = setTimeout(pollPaymentStatus, POLL_INTERVAL);
    return () => clearTimeout(timer);
  }, [paymentStep, providerRef, pollAttempts, pollPaymentStatus]);

  const handleRetryPayment = () => {
    setPaymentStep("form");
    setPollAttempts(0);
    setPaymentRef(null);
    setProviderRef(null);
  };

  const handlePayShipment = async () => {
    if (!selectedShipment || !paymentPhone) {
      toast("Please enter your phone number", "error");
      return;
    }

    setPayingId(selectedShipment.id);
    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        appTransactionRef: string;
        providerRef?: string; // MyCoolPay's transaction ref - needed for status check
        status: string;
        ussdCode?: string;
        amount: number;
      }>(
        "/payments/mycoolpay/shipment/payin",
        {
          shipmentId: selectedShipment.id,
          operator: paymentOperator,
          phone: paymentPhone,
          customerName: "Customer", // Default name - not required for MyCoolPay
        },
        true
      );

      // Transition to processing state - don't close the modal!
      setPaymentRef(response.appTransactionRef);
      setProviderRef(response.providerRef || null); // MyCoolPay's ref for status checks
      setPaymentStep("processing");
      setPollAttempts(0);
    } catch (err) {
      console.error("Failed to initiate payment:", err);
      const message =
        err instanceof ApiError
          ? (err.data as { message?: string })?.message || err.statusText
          : "Failed to initiate payment";
      toast(message, "error");
      setPaymentStep("failed");
    } finally {
      setPayingId(null);
    }
  };

  // Confirm payment after MyCoolPay callback (for test mode)
  const handleConfirmPayment = async (shipmentId: string) => {
    setPayingId(shipmentId);
    try {
      await api.post("/payments/mycoolpay/shipment/confirm", { shipmentId }, true);
      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipmentId ? { ...s, status: "ASSIGNED" as const } : s
        )
      );
      toast(tShipment("paymentSuccess"), "success");
    } catch (err) {
      console.error("Failed to confirm payment:", err);
      toast("Failed to confirm payment", "error");
    } finally {
      setPayingId(null);
    }
  };

  const handleCancelShipment = async (shipmentId: string) => {
    if (!confirm(tShipment("confirmCancel"))) return;

    setCancellingId(shipmentId);
    try {
      await api.post(`/shipments/${shipmentId}/cancel`, {}, true);
      setShipments((prev) =>
        prev.map((s) =>
          s.id === shipmentId ? { ...s, status: "CANCELLED" as const } : s
        )
      );
      toast(tShipment("cancelledDesc"), "success");
    } catch (err) {
      console.error("Failed to cancel shipment:", err);
      toast("Failed to cancel shipment", "error");
    } finally {
      setCancellingId(null);
    }
  };

  if (authLoading || (!isLoggedIn && loading)) {
    return (
      <div className="py-6">
        <div className="container-main">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6">
        <div className="container-main">
          <h1 className="text-h2 text-gray-900 mb-6">{t("title")}</h1>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="error"
            title="Failed to load data"
            description={error}
            actionLabel="Try Again"
            onAction={() => window.location.reload()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="container-main">
        <h1 className="text-h2 text-gray-900 mb-6">{t("title")}</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "orders"
                ? "border-jemo-orange text-jemo-orange"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            {t("productOrders")} ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("shipments")}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "shipments"
                ? "border-jemo-orange text-jemo-orange"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            {tShipment("myShipments")} ({shipments.length})
          </button>
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <>
            {orders.length === 0 ? (
              <EmptyState
                type="products"
                title={t("noOrders")}
                description={t("noOrdersText")}
                actionLabel={t("startShopping")}
                actionHref={`/${locale}/products`}
              />
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const isJemoDelivery = order.deliveryMethod === "JEMO_RIDER";

                  return (
                    <Link
                      key={order.id}
                      href={`/${locale}/orders/${order.id}`}
                      className="card block p-4 hover:shadow-card-hover transition-shadow tap-highlight-none"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-small text-gray-500 font-mono">
                              #{order.id.slice(-8).toUpperCase()}
                            </span>
                            <StatusBadge status={order.status} />
                            {order.deliveryMethod && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  isJemoDelivery
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {isJemoDelivery ? (
                                  <Truck className="w-3 h-3" />
                                ) : (
                                  <Store className="w-3 h-3" />
                                )}
                                {isJemoDelivery ? "Jemo" : "Vendor"}
                              </span>
                            )}
                          </div>

                          <p className="text-h3 text-jemo-orange font-bold mb-1">
                            {formatPrice(order.totalAmount)}
                          </p>

                          <div className="flex items-center gap-1 text-small text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Shipments Tab */}
        {activeTab === "shipments" && (
          <>
            <div className="flex justify-end mb-4">
              <Button asChild size="sm">
                <Link href={`/${locale}/send-package`}>
                  <Send className="w-4 h-4 mr-2" />
                  {tShipment("newShipment")}
                </Link>
              </Button>
            </div>

            {shipments.length === 0 ? (
              <EmptyState
                type="products"
                title={tShipment("noShipments")}
                description={tShipment("noShipmentsDesc")}
                actionLabel={tShipment("sendFirst")}
                actionHref={`/${locale}/send-package`}
              />
            ) : (
              <div className="space-y-4">
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className="card p-4 hover:shadow-card-hover transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Send className="w-4 h-4 text-gray-400" />
                          <span className="text-small text-gray-500 font-mono">
                            #{shipment.id.slice(-8).toUpperCase()}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getShipmentStatusColor(
                              shipment.status
                            )}`}
                          >
                            {tShipment(`status.${shipment.status}`)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                          <MapPin className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">
                            {shipment.pickupCity}
                          </span>
                          <span className="text-gray-400">→</span>
                          <MapPin className="w-4 h-4 text-green-500" />
                          <span className="font-medium">
                            {shipment.dropoffCity}
                          </span>
                        </div>

                        <p className="text-sm text-gray-500 mb-2">
                          {shipment.packageType} • {shipment.dropoffContactName}
                        </p>

                        {shipment.agency && (
                          <p className="text-sm text-purple-600">
                            <Truck className="w-3 h-3 inline mr-1" />
                            {tShipment("assignedTo")}: {shipment.agency.name}
                          </p>
                        )}

                        {/* Show delivery fee for AWAITING_PAYMENT */}
                        {shipment.status === "AWAITING_PAYMENT" && shipment.deliveryFee > 0 && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <p className="text-sm text-orange-800 font-medium">
                              {tShipment("paymentRequired")}
                            </p>
                            <p className="text-lg font-bold text-orange-600">
                              {shipment.deliveryFee.toLocaleString()} XAF
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-small text-gray-500 mt-2">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(shipment.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {/* Pay button for AWAITING_PAYMENT */}
                        {shipment.status === "AWAITING_PAYMENT" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openPaymentModal(shipment)}
                            disabled={payingId === shipment.id}
                          >
                            {payingId === shipment.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 mr-1" />
                                {tShipment("payNow")}
                              </>
                            )}
                          </Button>
                        )}

                        {/* Cancel button for PENDING or AWAITING_PAYMENT */}
                        {(shipment.status === "PENDING" || shipment.status === "AWAITING_PAYMENT") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleCancelShipment(shipment.id)}
                            disabled={cancellingId === shipment.id}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedShipment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              
              {/* Form Step */}
              {paymentStep === "form" && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      {tShipment("payDeliveryFee")}
                    </h2>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">
                      {tShipment("shipmentId")}: #{selectedShipment.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-lg font-bold text-jemo-orange">
                      {selectedShipment.deliveryFee.toLocaleString()} XAF
                    </p>
                  </div>

                  {/* Operator Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {tShipment("selectOperator")}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentOperator("MTN_MOMO")}
                        className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                          paymentOperator === "MTN_MOMO"
                            ? "border-yellow-500 bg-yellow-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Image
                          src="/MTN-MOMO-logo.png"
                          alt="MTN Mobile Money"
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                        <span className="text-sm font-medium">MTN MoMo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentOperator("ORANGE_MONEY")}
                        className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-all ${
                          paymentOperator === "ORANGE_MONEY"
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Image
                          src="/Orange-money-logo.webp"
                          alt="Orange Money"
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                        <span className="text-sm font-medium">Orange Money</span>
                      </button>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      {tShipment("phoneNumber")}
                    </label>
                    <input
                      type="tel"
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      placeholder="6XXXXXXXX"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handlePayShipment}
                    disabled={payingId === selectedShipment.id || !paymentPhone}
                  >
                    {payingId === selectedShipment.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {tShipment("processing")}
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        {tShipment("payAmount", { amount: selectedShipment.deliveryFee.toLocaleString() })}
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* Processing Step - Waiting for payment confirmation */}
              {paymentStep === "processing" && (
                <div className="text-center py-4">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-jemo-orange to-orange-400 flex items-center justify-center animate-pulse">
                      <Smartphone className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1">
                      <Loader2 className="w-6 h-6 text-jemo-orange animate-spin" />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tShipment("waitingForPayment")}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {tShipment("checkYourPhone")}
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600 mb-4">
                    <p>{tShipment("dialUssd")}</p>
                    <p className="font-mono font-bold text-2xl text-jemo-orange mt-1">
                      {paymentOperator === "MTN_MOMO" ? "*126#" : "#150#"}
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-900">
                        {tShipment("waitingConfirmation")}
                      </p>
                      <p className="text-sm text-blue-700">
                        {tShipment("enterPinToComplete")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{tShipment("checkingStatus")} ({pollAttempts}/{MAX_POLL_ATTEMPTS})</span>
                  </div>

                  {paymentRef && (
                    <p className="text-xs text-gray-400 mb-4">
                      {tShipment("transactionRef")}: {paymentRef}
                    </p>
                  )}

                  <p className="text-xs text-gray-400">
                    {tShipment("doNotClose")}
                  </p>

                  {pollAttempts >= MAX_POLL_ATTEMPTS && (
                    <Button
                      variant="outline"
                      onClick={handleRetryPayment}
                      className="mt-4"
                    >
                      {tShipment("retry")}
                    </Button>
                  )}
                </div>
              )}

              {/* Success Step */}
              {paymentStep === "success" && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tShipment("paymentConfirmed")}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {tShipment("shipmentAssigned")}
                  </p>
                </div>
              )}

              {/* Failed Step */}
              {paymentStep === "failed" && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                    <X className="w-12 h-12 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tShipment("paymentFailed")}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {tShipment("pleaseTryAgain")}
                  </p>
                  <Button onClick={handleRetryPayment}>
                    {tShipment("retry")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
