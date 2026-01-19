"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { CreditCard, CheckCircle2, Loader2, Smartphone, Phone, AlertCircle } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/lib/auth-context";
import type { VendorApplication } from "../page";

interface FeeStepProps {
  application: VendorApplication | null;
  onPaid: (updated: VendorApplication) => void;
}

type MobileOperator = "MTN_MOMO" | "ORANGE_MONEY";

interface PaymentResponse {
  success: boolean;
  message: string;
  paymentId: string;
  appTransactionRef: string;
  providerRef?: string;
  status: string;
  ussdCode?: string;
}

interface PaymentStatusResponse {
  paymentId: string;
  status: string;
  providerStatus?: string;
  applicationFeePaid: boolean;
  message?: string;
}

export function FeeStep({ application, onPaid }: FeeStepProps) {
  const t = useTranslations("vendorWizard");
  const toast = useToast();
  const { user } = useAuth();

  const [selectedOperator, setSelectedOperator] = useState<MobileOperator>("MTN_MOMO");
  const [phone, setPhone] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [ussdCode, setUssdCode] = useState<string | null>(null);
  const [pollAttempts, setPollAttempts] = useState(0);

  const MAX_POLL_ATTEMPTS = 24; // 2 minutes (24 * 5 seconds)
  const POLL_INTERVAL = 5000; // 5 seconds

  // Pre-fill phone from user data
  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
    }
  }, [user]);

  const isPaid = application?.applicationFeePaid;

  // Poll for payment status
  const pollPaymentStatus = useCallback(async (ref: string, attempt: number) => {
    if (attempt >= MAX_POLL_ATTEMPTS) {
      setIsPolling(false);
      toast.info(t("fee.pollTimeout"));
      return;
    }

    try {
      const status = await api.get<PaymentStatusResponse>(
        `/payments/mycoolpay/vendor-fee/status?ref=${ref}`,
        true
      );

      if (status.status === "SUCCESS" && status.applicationFeePaid) {
        // Payment successful - refresh application
        const updated = await api.get<VendorApplication>("/vendor-applications/me", true);
        if (updated) {
          onPaid(updated);
          toast.success(t("fee.paymentSuccess"));
        }
        setIsPolling(false);
        return;
      }

      if (status.status === "FAILED") {
        setIsPolling(false);
        setPaymentRef(null);
        setUssdCode(null);
        toast.error(status.message || t("fee.paymentFailed"));
        return;
      }

      // Still pending - continue polling
      setPollAttempts(attempt + 1);
      setTimeout(() => pollPaymentStatus(ref, attempt + 1), POLL_INTERVAL);
    } catch (err) {
      console.error("Error checking payment status:", err);
      // Continue polling on error
      setPollAttempts(attempt + 1);
      setTimeout(() => pollPaymentStatus(ref, attempt + 1), POLL_INTERVAL);
    }
  }, [onPaid, t, toast]);

  const handlePay = async () => {
    if (!application || !phone.trim()) {
      toast.error(t("fee.phoneRequired"));
      return;
    }

    setIsPaying(true);

    try {
      const response = await api.post<PaymentResponse>(
        "/payments/mycoolpay/vendor-fee/payin",
        {
          applicationId: application.id,
          operator: selectedOperator,
          phone: phone.trim(),
          email: user?.email,
          name: user?.name,
          lang: "en",
        },
        true
      );

      if (response.success) {
        setPaymentRef(response.appTransactionRef);
        setUssdCode(response.ussdCode || null);
        setIsPolling(true);
        setPollAttempts(0);

        // Start polling for status
        setTimeout(() => pollPaymentStatus(response.appTransactionRef, 0), POLL_INTERVAL);
      } else {
        toast.error(response.message || t("fee.paymentFailed"));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string };
        toast.error(data?.message || t("fee.paymentFailed"));
      } else {
        toast.error(t("fee.paymentFailed"));
      }
    } finally {
      setIsPaying(false);
    }
  };

  const handleRetry = () => {
    setPaymentRef(null);
    setUssdCode(null);
    setIsPolling(false);
    setPollAttempts(0);
  };

  // Already paid state
  if (isPaid) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("fee.title")}
          </h2>
        </div>

        <div className="p-6 rounded-xl border-2 border-green-500 bg-green-50">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-gray-900">
                  {t("fee.amount")}
                </span>
                <span className="text-green-600 font-medium">
                  {t("fee.paid")}
                </span>
              </div>
              <p className="text-gray-500 mb-4">
                {t("fee.paidMessage")}
              </p>
              {application?.paymentRef && (
                <p className="text-xs text-gray-500 mb-4">
                  {t("fee.paymentRef")}: {application.paymentRef}
                </p>
              )}
              <Button
                onClick={() => onPaid(application!)}
                className="bg-jemo-orange hover:bg-jemo-orange/90"
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Waiting for confirmation state
  if (isPolling && paymentRef) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {t("fee.waitingTitle")}
          </h2>
        </div>

        <div className="p-6 rounded-xl border-2 border-yellow-400 bg-yellow-50">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-yellow-100 mx-auto">
              <Smartphone className="w-8 h-8 text-yellow-600 animate-pulse" />
            </div>

            <div>
              <p className="text-gray-700 font-medium mb-2">
                {t("fee.waitingMessage")}
              </p>
              <p className="text-sm text-gray-500">
                {t("fee.waitingInstructions")}
              </p>
            </div>

            {ussdCode && (
              <div className="bg-white p-4 rounded-lg border border-yellow-300">
                <p className="text-sm text-gray-500 mb-1">{t("fee.dialCode")}</p>
                <p className="text-2xl font-mono font-bold text-jemo-orange">
                  {ussdCode}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t("fee.checkingStatus")} ({pollAttempts}/{MAX_POLL_ATTEMPTS})</span>
            </div>

            <p className="text-xs text-gray-400">
              {t("fee.paymentRef")}: {paymentRef}
            </p>

            <Button
              variant="outline"
              onClick={handleRetry}
              className="mt-4"
            >
              {t("fee.retry")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Payment form state
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t("fee.title")}
        </h2>
      </div>

      <div className="p-6 rounded-xl border-2 border-gray-200">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-jemo-orange/10">
            <CreditCard className="w-6 h-6 text-jemo-orange" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-gray-900">
                {t("fee.amount")}
              </span>
            </div>
            <p className="text-gray-500">
              {t("fee.description")}
            </p>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">{t("fee.selectOperator")}</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedOperator("MTN_MOMO")}
              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-3 ${
                selectedOperator === "MTN_MOMO"
                  ? "border-yellow-500 bg-yellow-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="relative w-16 h-16 flex items-center justify-center">
                <Image
                  src="/MTN-MOMO-logo.png"
                  alt="MTN Mobile Money"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <span className="font-medium text-sm">{t("fee.mtnMomo")}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedOperator("ORANGE_MONEY")}
              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-3 ${
                selectedOperator === "ORANGE_MONEY"
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="relative w-16 h-16 flex items-center justify-center">
                <Image
                  src="/Orange-money-logo.webp"
                  alt="Orange Money"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <span className="font-medium text-sm">{t("fee.orangeMoney")}</span>
            </button>
          </div>
        </div>

        {/* Phone Number Input */}
        <div className="mt-4 space-y-2">
          <Label htmlFor="phone">{t("fee.phoneLabel")}</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder={t("fee.phonePlaceholder")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-10"
            />
          </div>
          <p className="text-xs text-gray-500">{t("fee.phoneHint")}</p>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            {t("fee.paymentInfo")}
          </p>
        </div>

        {/* Pay Button */}
        <Button
          onClick={handlePay}
          disabled={isPaying || !phone.trim()}
          className="w-full mt-6 bg-jemo-orange hover:bg-jemo-orange/90"
        >
          {isPaying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("fee.processing")}
            </>
          ) : (
            t("fee.payNow")
          )}
        </Button>

        {/* Demo Skip Button - Remove in production */}
        <div className="mt-6 pt-6 border-t border-dashed border-gray-300">
          <p className="text-xs text-gray-400 text-center mb-3">
            Demo Mode: MyCoolPay not yet approved
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              if (application) {
                try {
                  await api.post(`/vendor-applications/${application.id}/demo-skip-payment`, {}, true);
                  // Refresh the application data
                  const updated = await api.get<VendorApplication>("/vendor-applications/me", true);
                  if (updated) {
                    onPaid(updated);
                  }
                  toast.success("Demo: Payment skipped for testing");
                } catch (err) {
                  toast.error("Failed to skip payment");
                }
              }
            }}
            className="w-full border-dashed border-gray-400 text-gray-600 hover:bg-gray-50"
          >
            Skip Payment (Demo Only)
          </Button>
        </div>
      </div>
    </div>
  );
}
