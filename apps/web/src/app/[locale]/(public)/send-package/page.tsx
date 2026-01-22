"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import Link from "next/link";
import {
  Package,
  Truck,
  MapPin,
  Clock,
  ChevronDown,
  Search,
  Loader2,
  CheckCircle,
  LogIn,
  Phone,
  User,
  Weight,
  FileText,
} from "lucide-react";

// Cameroon cities list
const CAMEROON_CITIES = [
  "Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua", "Bafoussam",
  "Ngaoundéré", "Bertoua", "Ebolowa", "Buea", "Kribi", "Limbe",
  "Kumba", "Nkongsamba", "Edéa", "Loum", "Mbalmayo", "Sangmélima",
  "Dschang", "Foumban", "Mbouda", "Bafang", "Bandjoun", "Tiko",
  "Mutengene", "Wum", "Fundong", "Kumbo", "Nkambe", "Mamfe",
  "Kousseri", "Mora", "Mokolo", "Guider", "Pitoa", "Meiganga",
  "Tibati", "Batouri", "Yokadouma", "Abong-Mbang"
];

// Package types
const PACKAGE_TYPES = [
  { value: "document", labelKey: "sendPackage.packageType.document" },
  { value: "small_box", labelKey: "sendPackage.packageType.small_box" },
  { value: "medium_box", labelKey: "sendPackage.packageType.medium_box" },
  { value: "large_box", labelKey: "sendPackage.packageType.large_box" },
  { value: "envelope", labelKey: "sendPackage.packageType.envelope" },
  { value: "fragile", labelKey: "sendPackage.packageType.fragile" },
  { value: "other", labelKey: "sendPackage.packageType.other" },
];

// City Selector Component
function CitySelector({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCities = CAMEROON_CITIES.filter((city) =>
    city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <button
        type="button"
        className={`w-full flex items-center justify-between border rounded-lg px-4 py-3 text-left ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white hover:border-gray-400"
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-5 h-5 text-gray-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 border rounded-md text-sm"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                    value === city ? "bg-orange-50 text-jemo-orange" : ""
                  }`}
                  onClick={() => {
                    onChange(city);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SendPackagePage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { toast } = useToast();

  // Form state
  const [pickupCity, setPickupCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffContactName, setDropoffContactName] = useState("");
  const [dropoffPhone, setDropoffPhone] = useState("");
  const [packageType, setPackageType] = useState("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isFormValid =
    pickupCity &&
    pickupAddress &&
    pickupContactName &&
    pickupPhone &&
    dropoffCity &&
    dropoffAddress &&
    dropoffContactName &&
    dropoffPhone &&
    packageType;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isLoggedIn) {
      toast(t("sendPackage.loginRequiredDesc"), "error");
      return;
    }

    if (!isFormValid) {
      toast(t("sendPackage.fillAllFields"), "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        pickupCity,
        pickupAddress,
        pickupContactName,
        pickupPhone,
        dropoffCity,
        dropoffAddress,
        dropoffContactName,
        dropoffPhone,
        packageType,
        ...(weightKg ? { weightKg: parseFloat(weightKg) } : {}),
        ...(notes ? { notes } : {}),
      };

      await api.post("/shipments", payload, true);

      setSuccess(true);
      toast(t("sendPackage.successDesc"), "success");

      // Redirect to shipments page after 2 seconds
      setTimeout(() => {
        router.push(`/${locale}/orders`);
      }, 2000);
    } catch (err) {
      console.error("Failed to create shipment:", err);
      const message =
        err instanceof ApiError
          ? (err.data as { message?: string })?.message || err.statusText
          : "Failed to create shipment";
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] py-12 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t("sendPackage.successTitle")}
          </h1>
          <p className="text-gray-600 mb-6">
            {t("sendPackage.successMessage")}
          </p>
          <Button asChild>
            <Link href={`/${locale}/account/shipments`}>
              {t("sendPackage.viewShipments")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] py-8 md:py-12">
      <div className="container-main max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {t("sendPackage.title")}
          </h1>
          <p className="text-gray-600">
            {t("sendPackage.subtitle")}
          </p>
        </div>

        {/* Login prompt if not authenticated */}
        {!isLoggedIn && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <LogIn className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 font-medium">{t("sendPackage.loginRequired")}</p>
              <p className="text-amber-700 text-sm">{t("sendPackage.loginRequiredDesc")}</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/${locale}/login?redirect=/${locale}/send-package`}>
                {t("auth.login")}
              </Link>
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Pickup & Dropoff Cities */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-jemo-orange" />
              {t("sendPackage.routeSection")}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="mb-2 block">{t("sendPackage.pickupCity")} *</Label>
                <CitySelector
                  value={pickupCity}
                  onChange={setPickupCity}
                  placeholder={t("sendPackage.selectCity")}
                />
              </div>
              <div>
                <Label className="mb-2 block">{t("sendPackage.dropoffCity")} *</Label>
                <CitySelector
                  value={dropoffCity}
                  onChange={setDropoffCity}
                  placeholder={t("sendPackage.selectCity")}
                />
              </div>
            </div>
          </div>

          {/* Pickup Details */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              {t("sendPackage.pickupDetails")}
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">{t("sendPackage.address")} *</Label>
                <Input
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder={t("sendPackage.addressPlaceholder")}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {t("sendPackage.contactName")} *
                  </Label>
                  <Input
                    value={pickupContactName}
                    onChange={(e) => setPickupContactName(e.target.value)}
                    placeholder={t("sendPackage.contactNamePlaceholder")}
                  />
                </div>
                <div>
                  <Label className="mb-2 block flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {t("sendPackage.phone")} *
                  </Label>
                  <Input
                    value={pickupPhone}
                    onChange={(e) => setPickupPhone(e.target.value)}
                    placeholder="6XXXXXXXX"
                    type="tel"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dropoff Details */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-500" />
              {t("sendPackage.dropoffDetails")}
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">{t("sendPackage.address")} *</Label>
                <Input
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder={t("sendPackage.addressPlaceholder")}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {t("sendPackage.contactName")} *
                  </Label>
                  <Input
                    value={dropoffContactName}
                    onChange={(e) => setDropoffContactName(e.target.value)}
                    placeholder={t("sendPackage.recipientPlaceholder")}
                  />
                </div>
                <div>
                  <Label className="mb-2 block flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {t("sendPackage.phone")} *
                  </Label>
                  <Input
                    value={dropoffPhone}
                    onChange={(e) => setDropoffPhone(e.target.value)}
                    placeholder="6XXXXXXXX"
                    type="tel"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="bg-white rounded-xl p-6 shadow-card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              {t("sendPackage.packageDetails")}
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">{t("sendPackage.packageTypeLabel")} *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {PACKAGE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      className={`border rounded-lg p-3 text-sm text-center transition-colors ${
                        packageType === type.value
                          ? "border-jemo-orange bg-orange-50 text-jemo-orange font-medium"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setPackageType(type.value)}
                    >
                      {t(type.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block flex items-center gap-1">
                    <Weight className="w-4 h-4" />
                    {t("sendPackage.weight")} ({t("sendPackage.optional")})
                  </Label>
                  <Input
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g., 2.5"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="mb-2 block flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {t("sendPackage.notes")} ({t("sendPackage.optional")})
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("sendPackage.notesPlaceholder")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-100">
            <p className="text-sm text-gray-600 mb-4">
              {t("sendPackage.paymentNote")}
            </p>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!isFormValid || submitting || !isLoggedIn}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("sendPackage.creating")}
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-2" />
                  {t("sendPackage.createShipment")}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Features Section */}
        <div className="mt-12 pt-8 border-t">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
            {t("sendPackage.whyChooseUs")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">
                {t("sendPackage.feature1Title")}
              </h3>
              <p className="text-sm text-gray-500">{t("sendPackage.feature1Desc")}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">
                {t("sendPackage.feature2Title")}
              </h3>
              <p className="text-sm text-gray-500">{t("sendPackage.feature2Desc")}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">
                {t("sendPackage.feature3Title")}
              </h3>
              <p className="text-sm text-gray-500">{t("sendPackage.feature3Desc")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
