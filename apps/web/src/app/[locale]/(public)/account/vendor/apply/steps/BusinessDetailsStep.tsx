"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { normalizeCameroonPhone } from "@/lib/phone";
import type { VendorApplication } from "../page";

interface BusinessDetailsStepProps {
  application: VendorApplication | null;
  onSaved: (updated: VendorApplication) => void;
  onBack: () => void;
}

export function BusinessDetailsStep({ application, onSaved, onBack }: BusinessDetailsStepProps) {
  const t = useTranslations("vendorWizard");
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = useState(application?.businessName || "");
  const [businessAddress, setBusinessAddress] = useState(application?.businessAddress || "");
  const [businessPhone, setBusinessPhone] = useState(application?.businessPhone || "");
  const [businessEmail, setBusinessEmail] = useState(application?.businessEmail || "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [existingUpload, setExistingUpload] = useState(
    application?.uploads?.find(u => u.kind === "TAXPAYER_DOC") || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePhoneChange = (value: string) => {
    setBusinessPhone(value);
    if (value.length > 3) {
      const result = normalizeCameroonPhone(value);
      setPhoneError(result.valid ? null : t("errors.invalidPhone"));
    } else {
      setPhoneError(null);
    }
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("errors.invalidFileType"));
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("errors.fileTooLarge"));
      return;
    }

    setUploadedFile(file);
    setExistingUpload(null);
  }, [t, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(event);
    }
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = () => {
    setUploadedFile(null);
    setExistingUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!application) return;

    // Validate required fields
    if (!businessName.trim() || !businessAddress.trim() || !businessPhone.trim()) {
      toast.error(t("errors.missingFields"));
      return;
    }

    // Validate phone
    const phoneResult = normalizeCameroonPhone(businessPhone);
    if (!phoneResult.valid) {
      toast.error(t("errors.invalidPhone"));
      return;
    }

    // Validate file
    if (!uploadedFile && !existingUpload) {
      toast.error(t("errors.fileRequired"));
      return;
    }

    setIsSaving(true);

    try {
      // Save business details
      await api.put(
        `/vendor-applications/${application.id}/business-details`,
        {
          businessName: businessName.trim(),
          businessAddress: businessAddress.trim(),
          businessPhone: phoneResult.normalized,
          businessEmail: businessEmail.trim() || undefined,
        },
        true
      );

      // Upload file if new one selected
      if (uploadedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", uploadedFile);

        await fetch(`/api/vendor-applications/${application.id}/upload/TAXPAYER_DOC`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jemo_token")}`,
          },
          body: formData,
        });
      }

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
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {t("business.title")}
        </h2>
        <p className="text-gray-500 text-sm">
          {t("business.subtitle")}
        </p>
      </div>

      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName">{t("business.businessName")} *</Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder={t("business.businessNamePlaceholder")}
        />
      </div>

      {/* Business Address */}
      <div className="space-y-2">
        <Label htmlFor="businessAddress">{t("business.businessAddress")} *</Label>
        <Input
          id="businessAddress"
          value={businessAddress}
          onChange={(e) => setBusinessAddress(e.target.value)}
          placeholder={t("business.businessAddressPlaceholder")}
        />
      </div>

      {/* Business Phone */}
      <div className="space-y-2">
        <Label htmlFor="businessPhone">{t("business.businessPhone")} *</Label>
        <Input
          id="businessPhone"
          type="tel"
          value={businessPhone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder={t("business.businessPhonePlaceholder")}
          className={phoneError ? "border-red-500" : ""}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{t("phoneHint")}</span>
          {phoneError && (
            <span className="text-xs text-red-500">{phoneError}</span>
          )}
        </div>
      </div>

      {/* Business Email */}
      <div className="space-y-2">
        <Label htmlFor="businessEmail">{t("business.businessEmail")}</Label>
        <Input
          id="businessEmail"
          type="email"
          value={businessEmail}
          onChange={(e) => setBusinessEmail(e.target.value)}
          placeholder={t("business.businessEmailPlaceholder")}
        />
      </div>

      {/* Taxpayer Document Upload */}
      <div className="space-y-2">
        <Label>{t("business.taxpayerDoc")} *</Label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            uploadedFile || existingUpload
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-jemo-orange"
          }`}
        >
          {uploadedFile || existingUpload ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    {uploadedFile?.name || existingUpload?.originalName}
                  </p>
                  <p className="text-xs text-green-600">{t("upload.uploaded")}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeFile}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">{t("upload.dragDrop")}</p>
              <p className="text-xs text-gray-500 mb-3">
                {t("upload.formats")} • {t("upload.maxSize")}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("capture.upload")}
              </Button>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
        <p className="text-xs text-gray-500">{t("business.taxpayerDocHelp")}</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="bg-jemo-orange hover:bg-jemo-orange/90"
        >
          {isSaving || isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isUploading ? "Uploading..." : "Saving..."}
            </>
          ) : (
            t("next")
          )}
        </Button>
      </div>
    </div>
  );
}
