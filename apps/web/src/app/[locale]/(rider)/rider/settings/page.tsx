"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "@/lib/translations";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import {
  Settings,
  MapPin,
  Phone,
  Mail,
  Building2,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface AgencyProfile {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string;
  citiesCovered: string[];
  isActive: boolean;
  createdAt: string;
}

export default function AgencySettingsPage() {
  const locale = useLocale();
  const t = useTranslations("deliveryAgency.settings");
  const toast = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  
  // Form state
  const [address, setAddress] = useState("");
  const [citiesCovered, setCitiesCovered] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<AgencyProfile>("/agency/deliveries/profile", true);
      setProfile(data);
      setAddress(data.address);
      setCitiesCovered(data.citiesCovered.join(", "));
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
      const citiesArray = citiesCovered
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (citiesArray.length === 0) {
        toast.error(t("citiesCoveredHelp"));
        setSaving(false);
        return;
      }

      await api.patch(
        "/agency/deliveries/profile",
        {
          address,
          citiesCovered: citiesArray,
        },
        true
      );

      toast.success(t("saveSuccess"));
      loadProfile(); // Refresh profile
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="bg-white rounded-xl p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-full" />
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
        <Button onClick={loadProfile} variant="outline">
          {t("tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-jemo-orange" />
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      </div>
      <p className="text-gray-600">{t("subtitle")}</p>

      {/* Agency Info (Read-only) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("agencyInfo")}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 uppercase">{t("name")}</p>
              <p className="font-medium text-gray-900">{profile?.name}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 uppercase">{t("phone")}</p>
              <p className="font-mono text-gray-900">{profile?.phone}</p>
            </div>
          </div>
          
          {profile?.email && (
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase">{t("email")}</p>
                <p className="text-gray-900">{profile.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editable Settings */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("coverageArea")}</h2>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">{t("address")}</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street, Douala"
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="citiesCovered">{t("citiesCovered")}</Label>
              <Input
                id="citiesCovered"
                value={citiesCovered}
                onChange={(e) => setCitiesCovered(e.target.value)}
                placeholder="Douala, Yaoundé, Bamenda"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">{t("citiesCoveredHelp")}</p>
            </div>
          </div>
        </div>

        {/* Current Coverage Display */}
        {profile?.citiesCovered && profile.citiesCovered.length > 0 && (
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">{t("coverageArea")}</h3>
            <div className="flex flex-wrap gap-2">
              {profile.citiesCovered.map((city) => (
                <span
                  key={city}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {city}
                </span>
              ))}
            </div>
          </div>
        )}

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
