"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared";
import { useToast } from "@/components/ui/toaster";
import {
  MapPin,
  Phone,
  Loader2,
  CreditCard,
  ChevronLeft,
  Check,
  AlertCircle,
  Smartphone,
} from "lucide-react";

// Payment method types
type PaymentMethodType = "COD" | "MTN_MOBILE_MONEY" | "ORANGE_MONEY";

interface PaymentMethod {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "MTN_MOBILE_MONEY",
    name: "MTN Mobile Money",
    description: "Pay with MTN MoMo",
    icon: (
      <Image
        src="/MTN-MOMO-logo.png"
        alt="MTN MoMo"
        width={40}
        height={40}
        className="object-contain"
      />
    ),
    color: "bg-yellow-50",
  },
  {
    id: "ORANGE_MONEY",
    name: "Orange Money",
    description: "Pay with Orange Money",
    icon: (
      <Image
        src="/Orange-money-logo.webp"
        alt="Orange Money"
        width={40}
        height={40}
        className="object-contain"
      />
    ),
    color: "bg-orange-50",
  },
  {
    id: "COD",
    name: "Cash on Delivery",
    description: "Pay when you receive",
    icon: <CreditCard className="w-6 h-6 text-green-600" />,
    color: "bg-green-100",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const toast = useToast();
  const { items, totalAmount, clearCart } = useCart();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("MTN_MOBILE_MONEY");
  const [ordering, setOrdering] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    orderId?: string;
    transactionRef?: string;
    message?: string;
    ussdCode?: string;
  } | null>(null);

  // Pre-fill phone from user data
  useEffect(() => {
    if (user?.phone) {
      setDeliveryPhone(user.phone);
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push("/auth/login?redirect=/checkout");
    }
  }, [authLoading, isLoggedIn, router]);

  // Block admin users
  useEffect(() => {
    if (user?.role === "ADMIN") {
      toast.error("Admins cannot place orders. This is a customer feature.");
      router.push("/");
    }
  }, [user, router, toast]);

  const handlePlaceOrder = async () => {
    if (!isLoggedIn || items.length === 0) return;

    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }

    if (!deliveryPhone.trim()) {
      toast.error("Please enter a phone number.");
      return;
    }

    setOrdering(true);

    try {
      // Create order with the exact payment method enum value
      const orderPayload = {
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        paymentMethod: paymentMethod, // COD, MTN_MOBILE_MONEY, or ORANGE_MONEY
        deliveryAddress: deliveryAddress.trim(),
        deliveryPhone: deliveryPhone.trim(),
        // TODO: Add deliveryCity and deliveryFee when cart supports it
      };

      const order = await api.post<Order>("/orders", orderPayload, true);

      if (paymentMethod === "COD") {
        // COD order - redirect to success
        toast.success("Order placed successfully!");
        clearCart();
        router.push(`/orders/${order.id}`);
      } else {
        // Mobile money - initiate payment
        await initiateMobilePayment(order.id, Number(order.totalAmount));
      }
    } catch (err) {
      handleOrderError(err);
    } finally {
      setOrdering(false);
    }
  };

  const initiateMobilePayment = async (orderId: string, orderTotal: number) => {
    setPaymentProcessing(true);

    try {
      const payinResponse = await api.post<{
        success: boolean;
        message: string;
        paymentId?: string;
        transactionRef?: string;
        ussdCode?: string;
        paymentUrl?: string;
      }>(
        "/payments/mycoolpay/payin",
        {
          amount: orderTotal, // Use server-calculated order total
          currency: "XAF",
          paymentMethod: paymentMethod,
          customerName: user?.name || "Customer",
          customerPhone: deliveryPhone.trim(),
          customerEmail: user?.email || undefined,
          customerLang: "en",
          orderId: orderId,
          description: `Jemo Order - ${items.length} item(s)`,
        },
        true
      );

      if (payinResponse.success) {
        setPaymentStatus({
          orderId,
          transactionRef: payinResponse.transactionRef,
          message: payinResponse.message,
          ussdCode: payinResponse.ussdCode,
        });
        
        // Start polling for payment status
        pollPaymentStatus(orderId);
      } else {
        toast.error(payinResponse.message || "Payment initiation failed");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || "Payment failed. Please try again.");
      } else {
        toast.error("Payment service unavailable. Please try again.");
      }
      setPaymentProcessing(false);
    }
  };

  const pollPaymentStatus = async (orderId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for up to 5 minutes (every 5 seconds)

    const checkStatus = async () => {
      try {
        const status = await api.get<{
          status: string;
          providerStatus?: string;
          message?: string;
        }>(`/payments/order/${orderId}/status`, true);

        if (status.status === "SUCCESS") {
          toast.success("Payment successful!");
          clearCart();
          router.push(`/orders/${orderId}`);
          return;
        }

        if (status.status === "FAILED") {
          toast.error("Payment failed. Please try again.");
          setPaymentProcessing(false);
          setPaymentStatus(null);
          return;
        }

        // Still pending - continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          // Timeout - let user know to check order status
          toast.info("Payment is being processed. Check your order status.");
          router.push(`/orders/${orderId}`);
        }
      } catch (err) {
        console.error("Error checking payment status:", err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        }
      }
    };

    // Start polling after 5 seconds
    setTimeout(checkStatus, 5000);
  };

  const handleOrderError = (err: unknown) => {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        toast.error("Please login to place an order.");
        router.push("/auth/login?redirect=/checkout");
        return;
      }

      if (err.status === 403) {
        toast.error("You are not allowed to place orders.");
        return;
      }

      const data = err.data as { message?: string | string[] };
      const message = Array.isArray(data?.message) ? data.message[0] : data?.message;

      if (message?.toLowerCase().includes("stock")) {
        toast.error("Sorry, some items are out of stock.");
      } else {
        toast.error(message || "Could not place order. Please try again.");
      }
    } else {
      toast.error("Something went wrong. Please try again.");
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="py-12">
        <div className="container-main flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-jemo-orange" />
        </div>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0 && !paymentStatus) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="cart"
            title="Your cart is empty"
            description="Add items to your cart to checkout."
            actionLabel="Browse Products"
            actionHref="/products"
          />
        </div>
      </div>
    );
  }

  // Payment processing screen
  if (paymentProcessing && paymentStatus) {
    return (
      <div className="py-12">
        <div className="container-main max-w-lg mx-auto">
          <div className="card p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <Smartphone className="w-10 h-10 text-yellow-600 animate-pulse" />
            </div>

            <div>
              <h2 className="text-h2 text-gray-900 mb-2">Complete Payment</h2>
              <p className="text-body text-gray-600">{paymentStatus.message}</p>
            </div>

            {paymentStatus.ussdCode && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-small text-gray-500 mb-1">Dial this code:</p>
                <p className="text-h2 font-mono text-jemo-orange">
                  {paymentStatus.ussdCode}
                </p>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900">
                  Waiting for confirmation...
                </p>
                <p className="text-sm text-blue-700">
                  A payment prompt has been sent to your phone. Enter your PIN to complete the payment.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking payment status...</span>
            </div>

            <p className="text-small text-gray-400">
              Transaction Ref: {paymentStatus.transactionRef}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 pb-32 lg:pb-12">
      <div className="container-main">
        {/* Back button */}
        <Link
          href="/cart"
          className="inline-flex items-center text-gray-600 hover:text-jemo-orange mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Cart
        </Link>

        <h1 className="text-h1 text-gray-900 mb-6">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Delivery & Payment */}
          <div className="space-y-6">
            {/* Delivery Information */}
            <div className="card p-6">
              <h2 className="text-h3 text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-jemo-orange" />
                Delivery Information
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Delivery Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter your full delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+237 6XX XXX XXX"
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-small text-gray-500 mt-1">
                    Used for delivery coordination and payment
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card p-6">
              <h2 className="text-h3 text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-jemo-orange" />
                Payment Method
              </h2>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                      paymentMethod === method.id
                        ? "border-jemo-orange bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodType)}
                      className="hidden"
                    />
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${method.color}`}
                    >
                      {method.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{method.name}</p>
                      <p className="text-small text-gray-500">{method.description}</p>
                    </div>
                    {paymentMethod === method.id && (
                      <div className="w-6 h-6 bg-jemo-orange rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </label>
                ))}
              </div>

              {(paymentMethod === "MTN_MOBILE_MONEY" || paymentMethod === "ORANGE_MONEY") && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>How it works:</strong> After placing your order, you&apos;ll receive a payment prompt on your phone. Enter your PIN to complete the payment.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="text-h3 text-gray-900 mb-4">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="relative w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                      <Image
                        src={item.product.imageUrl || "/placeholder-product.svg"}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">
                        {item.product.name}
                      </p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      <p className="text-sm font-medium text-jemo-orange">
                        {formatPrice(parseFloat(item.product.price) * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-body">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-body">
                  <span className="text-gray-500">Delivery</span>
                  <span className="text-gray-900">Free</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between text-h3">
                  <span className="text-gray-900">Total</span>
                  <span className="text-jemo-orange font-bold">
                    {formatPrice(totalAmount)}
                  </span>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={handlePlaceOrder}
                disabled={ordering || !deliveryAddress.trim() || !deliveryPhone.trim()}
              >
                {ordering ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {paymentMethod === "COD" ? "Place Order" : "Pay Now"}
                  </>
                )}
              </Button>

              <p className="text-small text-gray-500 text-center mt-4">
                By placing your order, you agree to our{" "}
                <Link href="/terms" className="text-jemo-orange hover:underline">
                  Terms of Service
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-40">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-small text-gray-500">Total</p>
            <p className="text-h3 text-jemo-orange font-bold">
              {formatPrice(totalAmount)}
            </p>
          </div>
          <Button
            className="flex-1"
            onClick={handlePlaceOrder}
            disabled={ordering || !deliveryAddress.trim() || !deliveryPhone.trim()}
          >
            {ordering ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : paymentMethod === "COD" ? (
              "Place Order"
            ) : (
              "Pay Now"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
