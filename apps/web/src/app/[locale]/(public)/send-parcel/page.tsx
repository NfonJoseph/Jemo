"use client";

import { Package, Truck, MapPin, Clock } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SendParcelPage() {
  const t = useTranslations();
  const locale = useLocale();

  const features = [
    { icon: Truck, titleKey: "sendParcel.feature1Title", descKey: "sendParcel.feature1Desc" },
    { icon: MapPin, titleKey: "sendParcel.feature2Title", descKey: "sendParcel.feature2Desc" },
    { icon: Clock, titleKey: "sendParcel.feature3Title", descKey: "sendParcel.feature3Desc" },
  ];

  return (
    <div className="min-h-[60vh] py-12">
      <div className="container-main">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t("sendParcel.title")}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {t("sendParcel.subtitle")}
          </p>
          <p className="text-jemo-orange font-semibold text-lg mb-8">
            {t("sendParcel.comingSoon")}
          </p>
          <Button asChild size="lg">
            <Link href={`/${locale}/marketplace`}>
              {t("sendParcel.browseMarketplace")}
            </Link>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-card text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{t(feature.titleKey)}</h3>
                <p className="text-sm text-gray-500">{t(feature.descKey)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
