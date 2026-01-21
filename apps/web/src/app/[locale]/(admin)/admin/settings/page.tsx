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
  Settings,
  DollarSign,
  Percent,
  Save,
  ToggleLeft,
  ToggleRight,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VendorApplicationFeeSettings {
  enabled: boolean;
  amount: number;
}

interface ProcessingFeeSettings {
  vendorFeePercent: number;
  riderFeePercent: number;
}

interface DeliveryPricingSettings {
  sameTownFee: number;
  otherCityFee: number;
}

export default function AdminSettingsPage() {
  const t = useTranslations("admin.settings");
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Vendor Application Fee
  const [vendorFeeEnabled, setVendorFeeEnabled] = useState(true);
  const [vendorFeeAmount, setVendorFeeAmount] = useState(5000);

  // Processing Fees
  const [vendorProcessingFee, setVendorProcessingFee] = useState(0);
  const [riderProcessingFee, setRiderProcessingFee] = useState(0);

  // Delivery Pricing
  const [sameTownFee, setSameTownFee] = useState(1500);
  const [otherCityFee, setOtherCityFee] = useState(2000);

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const [vendorFee, processingFees, deliveryPricing] = await Promise.all([
          api.get<VendorApplicationFeeSettings>("/admin/settings/vendor-application-fee", true),
          api.get<ProcessingFeeSettings>("/admin/settings/processing-fees", true),
          api.get<DeliveryPricingSettings>("/admin/settings/delivery-pricing", true),
        ]);

        setVendorFeeEnabled(vendorFee.enabled);
        setVendorFeeAmount(vendorFee.amount);
        setVendorProcessingFee(processingFees.vendorFeePercent);
        setRiderProcessingFee(processingFees.riderFeePercent);
        setSameTownFee(deliveryPricing.sameTownFee);
        setOtherCityFee(deliveryPricing.otherCityFee);
      } catch (err) {
        console.error("Failed to load settings:", err);
        toast.error(t("loadError"));
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [t, toast]);

  // Save vendor application fee
  const saveVendorApplicationFee = async () => {
    setSaving("vendorFee");
    try {
      await api.put(
        "/admin/settings/vendor-application-fee",
        { enabled: vendorFeeEnabled, amount: vendorFeeAmount },
        true
      );
      toast.success(t("saveSuccess"));
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error(t("saveError"));
    } finally {
      setSaving(null);
    }
  };

  // Save processing fees
  const saveProcessingFees = async () => {
    setSaving("processingFees");
    try {
      await api.put(
        "/admin/settings/processing-fees",
        { vendorFeePercent: vendorProcessingFee, riderFeePercent: riderProcessingFee },
        true
      );
      toast.success(t("saveSuccess"));
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error(t("saveError"));
    } finally {
      setSaving(null);
    }
  };

  // Save delivery pricing
  const saveDeliveryPricing = async () => {
    setSaving("deliveryPricing");
    try {
      await api.put(
        "/admin/settings/delivery-pricing",
        { sameTownFee, otherCityFee },
        true
      );
      toast.success(t("saveSuccess"));
    } catch (err) {
      console.error("Failed to save:", err);
      toast.error(t("saveError"));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-jemo-orange" />
          {t("title")}
        </h1>
        <p className="text-gray-600 mt-1">{t("subtitle")}</p>
      </div>

      {/* Vendor Application Fee */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{t("vendorApplicationFee.title")}</h2>
              <p className="text-sm text-gray-500">{t("vendorApplicationFee.description")}</p>
            </div>
          </div>
          <button
            onClick={() => setVendorFeeEnabled(!vendorFeeEnabled)}
            className="focus:outline-none"
          >
            {vendorFeeEnabled ? (
              <ToggleRight className="w-10 h-10 text-green-500" />
            ) : (
              <ToggleLeft className="w-10 h-10 text-gray-400" />
            )}
          </button>
        </div>

        <div className={cn("space-y-4", !vendorFeeEnabled && "opacity-50 pointer-events-none")}>
          <div>
            <Label htmlFor="vendorFeeAmount">{t("vendorApplicationFee.amountLabel")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="vendorFeeAmount"
                type="number"
                value={vendorFeeAmount}
                onChange={(e) => setVendorFeeAmount(parseInt(e.target.value) || 0)}
                disabled={!vendorFeeEnabled}
                className="max-w-[200px]"
              />
              <span className="text-gray-500">XAF</span>
            </div>
          </div>
        </div>

        <Button
          onClick={saveVendorApplicationFee}
          disabled={saving === "vendorFee"}
          className="bg-jemo-orange hover:bg-jemo-orange/90 mt-4"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving === "vendorFee" ? t("saving") : t("save")}
        </Button>
      </div>

      {/* Processing Fees */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Percent className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{t("processingFees.title")}</h2>
            <p className="text-sm text-gray-500">{t("processingFees.description")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="vendorProcessingFee">{t("processingFees.vendorFeeLabel")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="vendorProcessingFee"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={vendorProcessingFee}
                onChange={(e) => setVendorProcessingFee(parseFloat(e.target.value) || 0)}
              />
              <span className="text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t("processingFees.vendorFeeHelp")}</p>
          </div>

          <div>
            <Label htmlFor="riderProcessingFee">{t("processingFees.riderFeeLabel")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="riderProcessingFee"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={riderProcessingFee}
                onChange={(e) => setRiderProcessingFee(parseFloat(e.target.value) || 0)}
              />
              <span className="text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t("processingFees.riderFeeHelp")}</p>
          </div>
        </div>

        <Button
          onClick={saveProcessingFees}
          disabled={saving === "processingFees"}
          className="bg-jemo-orange hover:bg-jemo-orange/90"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving === "processingFees" ? t("saving") : t("save")}
        </Button>
      </div>

      {/* Delivery Pricing */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Truck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{t("deliveryPricing.title")}</h2>
            <p className="text-sm text-gray-500">{t("deliveryPricing.description")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sameTownFee">{t("deliveryPricing.sameTownLabel")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="sameTownFee"
                type="number"
                min="0"
                value={sameTownFee}
                onChange={(e) => setSameTownFee(parseInt(e.target.value) || 0)}
              />
              <span className="text-gray-500">XAF</span>
            </div>
          </div>

          <div>
            <Label htmlFor="otherCityFee">{t("deliveryPricing.otherCityLabel")}</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="otherCityFee"
                type="number"
                min="0"
                value={otherCityFee}
                onChange={(e) => setOtherCityFee(parseInt(e.target.value) || 0)}
              />
              <span className="text-gray-500">XAF</span>
            </div>
          </div>
        </div>

        <Button
          onClick={saveDeliveryPricing}
          disabled={saving === "deliveryPricing"}
          className="bg-jemo-orange hover:bg-jemo-orange/90"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving === "deliveryPricing" ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
