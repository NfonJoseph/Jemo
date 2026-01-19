"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  Wallet,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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

export default function PayoutSettingsPage() {
  const t = useTranslations("vendor.payoutSettings");
  const tCommon = useTranslations("common");
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
          "/vendor/payout-profile",
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
        "/vendor/payout-profile",
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
        href="/vendor"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {tCommon("back")}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-h1 text-gray-900 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-jemo-orange" />
          {t("title")}
        </h1>
        <p className="text-gray-600 mt-2">{t("description")}</p>
      </div>

      {/* Form Card */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t("preferredMethod")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* MTN MoMo Option */}
              <button
                type="button"
                onClick={() => setPreferredMethod("CM_MOMO")}
                className={`relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                  preferredMethod === "CM_MOMO"
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-14 h-14 relative flex-shrink-0">
                  <Image
                    src="/MTN-MOMO-logo.png"
                    alt="MTN MoMo"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-left">
                  <span className="font-medium text-gray-900">{t("mtnMomo")}</span>
                </div>
                {preferredMethod === "CM_MOMO" && (
                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-yellow-600" />
                )}
              </button>

              {/* Orange Money Option */}
              <button
                type="button"
                onClick={() => setPreferredMethod("CM_OM")}
                className={`relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                  preferredMethod === "CM_OM"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="w-14 h-14 relative flex-shrink-0">
                  <Image
                    src="/Orange-money-logo.webp"
                    alt="Orange Money"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="text-left">
                  <span className="font-medium text-gray-900">{t("orangeMoney")}</span>
                </div>
                {preferredMethod === "CM_OM" && (
                  <CheckCircle2 className="absolute top-2 right-2 w-5 h-5 text-orange-600" />
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
            <Label htmlFor="phone" className="text-base font-medium">
              {t("phone")}
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="w-5 h-5 text-gray-400" />
              </div>
              <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none">
                <span className="text-gray-500 font-medium">+237</span>
              </div>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder={t("phonePlaceholder")}
                className={`pl-24 ${errors.phone ? "border-red-500" : ""}`}
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
            <Label htmlFor="fullName" className="text-base font-medium">
              {t("fullName")}
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((prev) => ({ ...prev, fullName: undefined }));
                }}
                placeholder={t("fullNamePlaceholder")}
                className={`pl-10 ${errors.fullName ? "border-red-500" : ""}`}
              />
            </div>
            <p className="text-sm text-gray-500">{t("fullNameHelp")}</p>
            {errors.fullName && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t">
            <Button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto bg-jemo-orange hover:bg-jemo-orange/90"
            >
              {saving ? t("saving") : t("saveSettings")}
            </Button>
          </div>
        </form>
      </div>

      {/* Current Settings Info (if profile exists) */}
      {profileExists && (
        <div className="card p-4 bg-green-50 border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-800">{t("currentSettings")}</h3>
              <p className="text-sm text-green-700 mt-1">
                {preferredMethod === "CM_MOMO" ? "MTN Mobile Money" : "Orange Money"} •{" "}
                +237{phone}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
