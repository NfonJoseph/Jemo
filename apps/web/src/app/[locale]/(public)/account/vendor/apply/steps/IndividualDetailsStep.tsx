"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { normalizeCameroonPhone } from "@/lib/phone";
import type { VendorApplication } from "../page";

interface IndividualDetailsStepProps {
  application: VendorApplication | null;
  onSaved: (updated: VendorApplication) => void;
  onBack: () => void;
}

export function IndividualDetailsStep({ application, onSaved, onBack }: IndividualDetailsStepProps) {
  const t = useTranslations("vendorWizard");
  const toast = useToast();

  const [fullName, setFullName] = useState(application?.fullNameOnId || "");
  const [location, setLocation] = useState(application?.location || "");
  const [phone, setPhone] = useState(application?.phoneNormalized || "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (value.length > 3) {
      const result = normalizeCameroonPhone(value);
      setPhoneError(result.valid ? null : t("errors.invalidPhone"));
    } else {
      setPhoneError(null);
    }
  };

  const handleSave = async () => {
    if (!application) return;

    // Validate required fields
    if (!fullName.trim() || !location.trim() || !phone.trim()) {
      toast.error(t("errors.missingFields"));
      return;
    }

    // Validate phone
    const phoneResult = normalizeCameroonPhone(phone);
    if (!phoneResult.valid) {
      toast.error(t("errors.invalidPhone"));
      return;
    }

    setIsSaving(true);

    try {
      await api.put(
        `/vendor-applications/${application.id}/individual-details`,
        {
          fullNameOnId: fullName.trim(),
          location: location.trim(),
          phone: phoneResult.normalized,
        },
        true
      );

      // Refetch application
      const updated = await api.get<VendorApplication>("/vendor-applications/me", true);
      if (updated) {
        onSaved(updated);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {t("individual.title")}
        </h2>
        <p className="text-gray-500 text-sm">
          {t("individual.subtitle")}
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">{t("individual.fullName")} *</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder={t("individual.fullNamePlaceholder")}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <Label htmlFor="location">{t("individual.location")} *</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder={t("individual.locationPlaceholder")}
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">{t("individual.phone")} *</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder={t("individual.phonePlaceholder")}
          className={phoneError ? "border-red-500" : ""}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{t("phoneHint")}</span>
          {phoneError && (
            <span className="text-xs text-red-500">{phoneError}</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-jemo-orange hover:bg-jemo-orange/90"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            t("next")
          )}
        </Button>
      </div>
    </div>
  );
}
