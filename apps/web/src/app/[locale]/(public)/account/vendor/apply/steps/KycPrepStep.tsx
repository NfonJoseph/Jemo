"use client";

import { IdCard, Camera, Lightbulb, CheckCircle2 } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";

interface KycPrepStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function KycPrepStep({ onNext, onBack }: KycPrepStepProps) {
  const t = useTranslations("vendorWizard");

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {t("kycPrep.title")}
        </h2>
        <p className="text-gray-500 text-sm">
          {t("kycPrep.subtitle")}
        </p>
      </div>

      {/* Requirements */}
      <div className="bg-blue-50 rounded-xl p-5">
        <h3 className="font-medium text-blue-900 mb-4 flex items-center gap-2">
          <IdCard className="w-5 h-5" />
          {t("kycPrep.requirements")}
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <span className="text-blue-800">{t("kycPrep.idFront")}</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <span className="text-blue-800">{t("kycPrep.idBack")}</span>
          </li>
          <li className="flex items-start gap-3">
            <Camera className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <span className="text-blue-800">{t("kycPrep.selfie")}</span>
          </li>
        </ul>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 rounded-xl p-5">
        <h3 className="font-medium text-amber-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          {t("kycPrep.tips")}
        </h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>{t("kycPrep.tip1")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>{t("kycPrep.tip2")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>{t("kycPrep.tip3")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>{t("kycPrep.tip4")}</span>
          </li>
        </ul>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          onClick={onNext}
          className="bg-jemo-orange hover:bg-jemo-orange/90"
        >
          {t("next")}
        </Button>
      </div>
    </div>
  );
}
