"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { formatPrice } from "@/lib/utils";
import {
  DollarSign,
  Save,
  Loader2,
  AlertCircle,
  MapPin,
  ArrowRight,
  Info,
} from "lucide-react";

interface PricingData {
  feeSameCity: number;
  feeOtherCity: number;
  currency: string;
  updatedAt: string;
}

export default function AgencyPricingPage() {
  const t = useTranslations("deliveryAgency.pricing");
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  
  // Form state
  const [feeSameCity, setFeeSameCity] = useState("");
  const [feeOtherCity, setFeeOtherCity] = useState("");

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PricingData>("/agency/deliveries/pricing", true);
      setPricing(data);
      setFeeSameCity(String(data.feeSameCity));
      setFeeOtherCity(String(data.feeOtherCity));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || t("loadError"));
      } else {
        setError(t("loadError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const sameCityFee = parseInt(feeSameCity, 10);
      const otherCityFee = parseInt(feeOtherCity, 10);

      if (isNaN(sameCityFee) || sameCityFee < 0) {
        toast.error(t("minimumFee"));
        setSaving(false);
        return;
      }

      if (isNaN(otherCityFee) || otherCityFee < 0) {
        toast.error(t("minimumFee"));
        setSaving(false);
        return;
      }

      await api.put(
        "/agency/deliveries/pricing",
        {
          feeSameCity: sameCityFee,
          feeOtherCity: otherCityFee,
        },
        true
      );

      toast.success(t("saveSuccess"));
      loadPricing(); // Refresh data
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error((err.data as { message?: string })?.message || t("saveError"));
      } else {
        toast.error(t("saveError"));
      }
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="bg-white rounded-xl p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">{t("loadError")}</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadPricing} variant="outline">
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <DollarSign className="w-6 h-6 text-jemo-orange" />
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      </div>
      <p className="text-gray-600">{t("subtitle")}</p>

      {/* Current Pricing Display */}
      {pricing && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("currentPricing")}</h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{t("sameCityLabel")}</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatPrice(pricing.feeSameCity)}
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <MapPin className="w-4 h-4" />
                <ArrowRight className="w-3 h-3" />
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{t("otherCityLabel")}</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {formatPrice(pricing.feeOtherCity)}
              </p>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            {t("lastUpdated")}: {formatDate(pricing.updatedAt)}
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">{t("pricingInfo")}</p>
      </div>

      {/* Edit Pricing Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Update Pricing
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="feeSameCity">{t("feeSameCity")}</Label>
              <div className="relative mt-1">
                <Input
                  id="feeSameCity"
                  type="number"
                  min="0"
                  step="100"
                  value={feeSameCity}
                  onChange={(e) => setFeeSameCity(e.target.value)}
                  placeholder="1500"
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {t("currency")}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t("feeSameCityHelp")}</p>
            </div>
            
            <div>
              <Label htmlFor="feeOtherCity">{t("feeOtherCity")}</Label>
              <div className="relative mt-1">
                <Input
                  id="feeOtherCity"
                  type="number"
                  min="0"
                  step="100"
                  value={feeOtherCity}
                  onChange={(e) => setFeeOtherCity(e.target.value)}
                  placeholder="2500"
                  className="pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  {t("currency")}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{t("feeOtherCityHelp")}</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={saving}
          className="w-full md:w-auto bg-jemo-orange hover:bg-jemo-orange/90"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("saving")}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t("saveChanges")}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
