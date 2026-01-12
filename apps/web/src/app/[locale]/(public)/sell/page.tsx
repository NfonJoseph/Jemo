"use client";

import { Store, CheckCircle, TrendingUp, Shield } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SellPage() {
  const t = useTranslations();
  const locale = useLocale();

  const benefits = [
    { icon: TrendingUp, titleKey: "sell.benefit1Title", descKey: "sell.benefit1Desc" },
    { icon: Shield, titleKey: "sell.benefit2Title", descKey: "sell.benefit2Desc" },
    { icon: CheckCircle, titleKey: "sell.benefit3Title", descKey: "sell.benefit3Desc" },
  ];

  return (
    <div className="min-h-[60vh] py-12">
      <div className="container-main">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <Store className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t("sell.title")}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {t("sell.subtitle")}
          </p>
          <Button asChild size="lg">
            <Link href={`/${locale}/account/vendor/apply`}>
              {t("sell.startSelling")}
            </Link>
          </Button>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {benefits.map((benefit, idx) => {
            const Icon = benefit.icon;
            return (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-card text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{t(benefit.titleKey)}</h3>
                <p className="text-sm text-gray-500">{t(benefit.descKey)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
