"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useTranslations, useLocale } from "@/lib/translations";
import { normalizeCameroonPhone } from "@/lib/phone";
import type { AuthResponse } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();
  const t = useTranslations("auth");
  const locale = useLocale();
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") || `/${locale}`;

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    // Only show error after user has typed something substantial
    if (value.length > 3) {
      const result = normalizeCameroonPhone(value);
      setPhoneError(result.valid ? null : t("errors.invalidPhone"));
    } else {
      setPhoneError(null);
    }
  };

  // Check if phone is valid using the normalization utility
  const isPhoneValid = () => {
    return normalizeCameroonPhone(phone).valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate name
    if (!name.trim()) {
      setError(t("errors.nameRequired"));
      return;
    }

    // Validate phone
    if (!phone.trim()) {
      setError(t("errors.phoneRequired"));
      return;
    }

    // Normalize and validate phone using shared utility
    const phoneResult = normalizeCameroonPhone(phone);
    if (!phoneResult.valid) {
      setError(t("errors.invalidPhone"));
      return;
    }

    // Validate password
    if (!password) {
      setError(t("errors.passwordRequired"));
      return;
    }

    if (password.length < 6) {
      setError(t("errors.weakPassword"));
      return;
    }

    // Validate confirm password if provided
    if (confirmPassword && password !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    setIsLoading(true);

    try {
      // Send normalized phone to API
      const response = await api.post<AuthResponse>("/auth/register", {
        name: name.trim(),
        phone: phoneResult.normalized, // Use canonical format
        password,
        role: "CUSTOMER",
      });

      login(response.accessToken, response.user);
      toast.success(t("accountCreated"));
      router.push(redirectTo);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string | string[] };
        const message = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message;
        
        // Map backend errors to translated messages
        if (message?.toLowerCase().includes("phone") && message?.toLowerCase().includes("registered")) {
          setError(t("errors.phoneExists"));
        } else {
          setError(message || t("errors.registrationFailed"));
        }
      } else {
        setError(t("errors.somethingWrong"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href={`/${locale}`} className="flex justify-center mb-8">
          <Image
            src="/logo-orange.jpg"
            alt="Jemo"
            width={120}
            height={40}
            className="h-10 w-auto"
          />
        </Link>
        <h1 className="text-h2 text-center text-gray-900 mb-2">
          {t("createAccount")}
        </h1>
        <p className="text-center text-gray-500 mb-8">
          {t("createAccountSubtitle")}
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card bg-white py-8 px-6 shadow-card rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="focus:ring-jemo-orange focus:border-jemo-orange"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-500">
                  <Phone className="w-4 h-4" />
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t("phonePlaceholder")}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  required
                  autoComplete="tel"
                  className={`pl-10 focus:ring-jemo-orange focus:border-jemo-orange ${
                    phoneError ? "border-red-500 focus:ring-red-500" : ""
                  }`}
                />
                {phone && !phoneError && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-small text-gray-500">
                  {t("phoneHint")}
                </p>
                {phoneError && (
                  <p className="text-small text-red-500">{phoneError}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("createPasswordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pr-10 focus:ring-jemo-orange focus:border-jemo-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-small text-gray-500">
                {t("passwordHelper")}
              </p>
            </div>

            {/* Confirm Password (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {t("confirmPassword")} <span className="text-gray-400 text-xs">({locale === 'fr' ? 'optionnel' : 'optional'})</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10 focus:ring-jemo-orange focus:border-jemo-orange"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* TODO: Add Turnstile Captcha widget here */}
            {/* <TurnstileWidget onVerify={setCaptchaToken} /> */}

            <Button
              type="submit"
              className="w-full bg-jemo-orange hover:bg-jemo-orange/90"
              disabled={isLoading || !!phoneError}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("creatingAccount")}
                </>
              ) : (
                t("createAccountButton")
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-body text-gray-500">
              {t("hasAccount")}{" "}
              <Link
                href={`/${locale}/login`}
                className="text-jemo-orange hover:underline font-medium"
              >
                {t("signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
