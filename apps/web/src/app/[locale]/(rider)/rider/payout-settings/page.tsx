"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "@/lib/translations";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  ArrowLeft,
  Wallet,
  Smartphone,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PayoutMethod = "CM_MOMO" | "CM_OM";

interface PayoutProfile {
  preferredMethod: PayoutMethod;
  phone: string;
  fullName: string;
  updatedAt: string;
}

interface PayoutProfileResponse {
  exists: boolean;
  profile: PayoutProfile | null;
}

export default function RiderPayoutSettingsPage() {
  const t = useTranslations("rider.payoutSettings");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const toastContext = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // Form state
  const [preferredMethod, setPreferredMethod] = useState<PayoutMethod>("CM_MOMO");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<{
    method?: string;
    phone?: string;
    fullName?: string;
  }>({});

  // Load existing profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get<PayoutProfileResponse>(
          "/agency/wallet/payout-profile",
          true
        );

        if (response.exists && response.profile) {
          setProfileExists(true);
          setPreferredMethod(response.profile.preferredMethod);
          setPhone(formatPhoneForDisplay(response.profile.phone));
          setFullName(response.profile.fullName);
        }
      } catch (err) {
        console.error("Failed to load payout profile:", err);
        if (!(err instanceof ApiError && err.status === 404)) {
          toastContext.error(t("loadError"));
        }
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [t, toastContext]);

  // Format phone for display (remove +237 prefix)
  function formatPhoneForDisplay(phone: string): string {
    if (phone.startsWith("+237")) {
      return phone.substring(4);
    }
    return phone;
  }

  // Validate form
  function validateForm(): boolean {
    const newErrors: typeof errors = {};

    if (!preferredMethod) {
      newErrors.method = t("errors.methodRequired");
    }

    if (!phone.trim()) {
      newErrors.phone = t("errors.phoneRequired");
    } else {
      // Basic Cameroon mobile validation
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length !== 9 || !cleaned.startsWith("6")) {
        newErrors.phone = t("errors.phoneInvalid");
      }
    }

    if (!fullName.trim()) {
      newErrors.fullName = t("errors.nameRequired");
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = t("errors.nameTooShort");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      await api.put(
        "/agency/wallet/payout-profile",
        {
          preferredMethod,
          phone: phone.replace(/\D/g, ""), // Send digits only, backend normalizes
          fullName: fullName.trim(),
        },
        true
      );

      setProfileExists(true);
      toastContext.success(t("saveSuccess"));
    } catch (err) {
      console.error("Failed to save payout profile:", err);
      const errorMessage = err instanceof ApiError ? `${t("saveError")}: ${err.message}` : t("saveError");
      toastContext.error(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="card p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/rider/wallet`}
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {t("backToWallet")}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-jemo-orange" />
          {t("title")}
        </h1>
        <p className="text-gray-600 mt-1">{t("subtitle")}</p>
      </div>

      {/* Status Badge */}
      {profileExists && (
        <div className="inline-flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-full text-sm">
          <CheckCircle className="w-4 h-4" />
          {t("profileConfigured")}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-3">
          <Label className="text-base font-medium">{t("preferredMethod")}</Label>
          <p className="text-sm text-gray-500">{t("methodDescription")}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {/* MTN Mobile Money */}
            <button
              type="button"
              onClick={() => setPreferredMethod("CM_MOMO")}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                preferredMethod === "CM_MOMO"
                  ? "border-jemo-orange bg-orange-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">MTN Mobile Money</p>
                <p className="text-sm text-gray-500">{t("mtnDescription")}</p>
              </div>
              {preferredMethod === "CM_MOMO" && (
                <CheckCircle className="w-5 h-5 text-jemo-orange ml-auto" />
              )}
            </button>

            {/* Orange Money */}
            <button
              type="button"
              onClick={() => setPreferredMethod("CM_OM")}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                preferredMethod === "CM_OM"
                  ? "border-jemo-orange bg-orange-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Orange Money</p>
                <p className="text-sm text-gray-500">{t("orangeDescription")}</p>
              </div>
              {preferredMethod === "CM_OM" && (
                <CheckCircle className="w-5 h-5 text-jemo-orange ml-auto" />
              )}
            </button>
          </div>
          {errors.method && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.method}
            </p>
          )}
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone">{t("phoneNumber")}</Label>
          <div className="flex">
            <div className="flex items-center px-3 border border-r-0 border-gray-300 rounded-l-md bg-gray-50">
              <span className="text-gray-500 text-sm">+237</span>
            </div>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder="6XX XXX XXX"
              className="rounded-l-none"
              maxLength={12}
            />
          </div>
          <p className="text-sm text-gray-500">{t("phoneHelp")}</p>
          {errors.phone && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.phone}
            </p>
          )}
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
            }}
            placeholder={t("fullNamePlaceholder")}
          />
          <p className="text-sm text-gray-500">{t("fullNameHelp")}</p>
          {errors.fullName && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            type="submit"
            disabled={saving}
            className="bg-jemo-orange hover:bg-jemo-orange/90"
          >
            {saving ? t("saving") : profileExists ? t("updateProfile") : t("saveProfile")}
          </Button>
        </div>
      </form>

      {/* Info Card */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">{t("importantInfo.title")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li>• {t("importantInfo.item1")}</li>
              <li>• {t("importantInfo.item2")}</li>
              <li>• {t("importantInfo.item3")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
