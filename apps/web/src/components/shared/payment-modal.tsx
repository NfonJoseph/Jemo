"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";

type PaymentOperator = "MTN_MOBILE_MONEY" | "ORANGE_MONEY";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentRef: string) => void;
  productId: string;
  productName: string;
  quantity: number;
  deliveryCity: string;
  // Display amounts (from frontend calculation - for display only)
  productSubtotal: number;
  deliveryFee: number;
  totalAmount: number;
  customerName: string;
  customerEmail?: string;
  availableOperators: {
    mtnMomo: boolean;
    orangeMoney: boolean;
  };
}

type PaymentStep = "operator" | "phone" | "processing" | "success" | "failed";

interface PaymentIntentResponse {
  success: boolean;
  message: string;
  paymentIntentId?: string;
  transactionRef?: string;
  providerTransactionId?: string;
  ussdCode?: string;
}

interface VerifyResponse {
  paymentIntentId: string;
  status: "INITIATED" | "SUCCESS" | "FAILED";
  providerStatus?: string;
  message?: string;
  productId: string;
  amount: number;
  canCreateOrder: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  productId,
  productName,
  quantity,
  deliveryCity,
  productSubtotal,
  deliveryFee,
  totalAmount,
  customerName,
  customerEmail,
  availableOperators,
}: PaymentModalProps) {
  const locale = useLocale();
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");

  const [step, setStep] = useState<PaymentStep>("operator");
  const [selectedOperator, setSelectedOperator] = useState<PaymentOperator | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCountRef = useRef(0);
  const MAX_POLLS = 60; // 60 polls * 5 seconds = 5 minutes timeout

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("operator");
      setSelectedOperator(null);
      setPhoneNumber("");
      setError(null);
      setTransactionRef(null);
      setIsLoading(false);
      pollingCountRef.current = 0;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }
  }, [isOpen]);

  const handleOperatorSelect = (operator: PaymentOperator) => {
    setSelectedOperator(operator);
    setStep("phone");
    setError(null);
  };

  const handleInitiatePayment = async () => {
    if (!selectedOperator || !phoneNumber.trim()) {
      setError(t("enterPhoneNumber"));
      return;
    }

    // Basic phone validation
    const cleanPhone = phoneNumber.replace(/\s+/g, "");
    if (!/^(\+?237)?[6][0-9]{8}$/.test(cleanPhone)) {
      setError(t("invalidPhoneNumber"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Backend computes totalAmount from quantity + deliveryCity
      const response = await api.post<PaymentIntentResponse>(
        "/payments/mycoolpay/initiate",
        {
          productId,
          quantity,
          deliveryCity,
          operator: selectedOperator,
          customerPhone: cleanPhone,
          customerName,
          customerEmail,
          locale,
        },
        true
      );

      if (response.success && response.transactionRef) {
        setTransactionRef(response.transactionRef);
        setStep("processing");
        startPolling(response.transactionRef);
      } else {
        setError(response.message || t("paymentInitFailed"));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        setError(data?.message || t("paymentInitFailed"));
      } else {
        setError(t("paymentInitFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startPolling = useCallback((ref: string) => {
    pollingCountRef.current = 0;

    const poll = async () => {
      pollingCountRef.current++;

      if (pollingCountRef.current > MAX_POLLS) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        setStep("failed");
        setError(t("paymentTimeout"));
        return;
      }

      try {
        const response = await api.get<VerifyResponse>(
          `/payments/mycoolpay/verify?ref=${encodeURIComponent(ref)}`,
          true
        );

        if (response.status === "SUCCESS" && response.canCreateOrder) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          setStep("success");
          // Short delay before calling success callback
          setTimeout(() => {
            onSuccess(ref);
          }, 1500);
        } else if (response.status === "FAILED") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          setStep("failed");
          setError(response.message || t("paymentFailed"));
        }
        // If still INITIATED, continue polling
      } catch (err) {
        // Ignore polling errors, continue trying
        console.error("Payment verification error:", err);
      }
    };

    // Start polling every 4 seconds
    pollingRef.current = setInterval(poll, 4000);
    // Also poll immediately
    poll();
  }, [onSuccess, t]);

  const handleRetry = () => {
    setStep("operator");
    setSelectedOperator(null);
    setPhoneNumber("");
    setError(null);
    setTransactionRef(null);
    pollingCountRef.current = 0;
  };

  const handleClose = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === "processing" ? undefined : handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-jemo-orange to-orange-500 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{t("title")}</h2>
          <p className="text-white/80 text-sm">{productName}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Amount breakdown display */}
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{t("productAmount")}</span>
              <span>{productSubtotal.toLocaleString()} XAF</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{t("deliveryFee")}</span>
                <span>{deliveryFee.toLocaleString()} XAF</span>
              </div>
            )}
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
              <span className="font-medium text-gray-900">{t("amountToPay")}</span>
              <span className="text-xl font-bold text-jemo-orange">
                {totalAmount.toLocaleString()} XAF
              </span>
            </div>
          </div>

          {/* Step: Select Operator */}
          {step === "operator" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center mb-4">
                {t("selectOperator")}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {availableOperators.mtnMomo && (
                  <button
                    onClick={() => handleOperatorSelect("MTN_MOBILE_MONEY")}
                    className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-yellow-400 hover:bg-yellow-50 transition-all"
                  >
                    <Image
                      src="/MTN-MOMO-logo.png"
                      alt="MTN MoMo"
                      width={80}
                      height={40}
                      className="object-contain mb-2"
                    />
                    <span className="text-sm font-medium text-gray-700">MTN MoMo</span>
                  </button>
                )}
                {availableOperators.orangeMoney && (
                  <button
                    onClick={() => handleOperatorSelect("ORANGE_MONEY")}
                    className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all"
                  >
                    <Image
                      src="/Orange-money-logo.webp"
                      alt="Orange Money"
                      width={80}
                      height={40}
                      className="object-contain mb-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Orange Money</span>
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={handleClose}
              >
                {tCommon("cancel")}
              </Button>
            </div>
          )}

          {/* Step: Enter Phone */}
          {step === "phone" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                {selectedOperator === "MTN_MOBILE_MONEY" ? (
                  <Image
                    src="/MTN-MOMO-logo.png"
                    alt="MTN MoMo"
                    width={60}
                    height={30}
                    className="object-contain"
                  />
                ) : (
                  <Image
                    src="/Orange-money-logo.webp"
                    alt="Orange Money"
                    width={60}
                    height={30}
                    className="object-contain"
                  />
                )}
                <span className="text-sm text-gray-500">
                  {selectedOperator === "MTN_MOBILE_MONEY" ? "MTN Mobile Money" : "Orange Money"}
                </span>
              </div>

              <div>
                <Label htmlFor="paymentPhone" className="text-sm font-medium">
                  {t("phoneNumber")}
                </Label>
                <div className="relative mt-1">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="paymentPhone"
                    type="tel"
                    placeholder="6XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{t("phoneHint")}</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("operator")}
                  disabled={isLoading}
                >
                  {tCommon("back")}
                </Button>
                <Button
                  className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                  onClick={handleInitiatePayment}
                  disabled={isLoading || !phoneNumber.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("initiating")}
                    </>
                  ) : (
                    t("pay")
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === "processing" && (
            <div className="text-center py-8">
              <div className="relative inline-block mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-jemo-orange to-orange-400 flex items-center justify-center animate-pulse">
                  <Smartphone className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -right-1 -bottom-1 bg-white rounded-full p-1">
                  <Loader2 className="w-6 h-6 text-jemo-orange animate-spin" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("waitingForApproval")}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {t("checkYourPhone")}
              </p>
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
                <p>{t("dialUssd")}</p>
                <p className="font-mono font-bold text-lg text-gray-900 mt-1">
                  {selectedOperator === "MTN_MOBILE_MONEY" ? "*126#" : "#150#"}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-4">
                {t("doNotClose")}
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("paymentSuccess")}
              </h3>
              <p className="text-gray-600 text-sm">
                {t("creatingOrder")}
              </p>
              <Loader2 className="w-6 h-6 text-jemo-orange animate-spin mx-auto mt-4" />
            </div>
          )}

          {/* Step: Failed */}
          {step === "failed" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("paymentFailed")}
              </h3>
              {error && (
                <p className="text-red-600 text-sm mb-4">{error}</p>
              )}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  {tCommon("cancel")}
                </Button>
                <Button
                  className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                  onClick={handleRetry}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t("tryAgain")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
