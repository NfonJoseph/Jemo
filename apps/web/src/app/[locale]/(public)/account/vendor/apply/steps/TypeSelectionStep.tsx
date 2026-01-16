"use client";

import { Building2, User } from "lucide-react";
import { useTranslations } from "@/lib/translations";

interface TypeSelectionStepProps {
  onSelect: (type: "BUSINESS" | "INDIVIDUAL") => void;
  existingType?: "BUSINESS" | "INDIVIDUAL";
}

export function TypeSelectionStep({ onSelect, existingType }: TypeSelectionStepProps) {
  const t = useTranslations("vendorWizard");

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t("typeSelection.title")}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Business Card */}
        <button
          onClick={() => onSelect("BUSINESS")}
          className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg text-left ${
            existingType === "BUSINESS"
              ? "border-jemo-orange bg-jemo-orange/5"
              : "border-gray-200 hover:border-jemo-orange"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("typeSelection.business.title")}
          </h3>
          <p className="text-sm text-gray-500">
            {t("typeSelection.business.description")}
          </p>
        </button>

        {/* Individual Card */}
        <button
          onClick={() => onSelect("INDIVIDUAL")}
          className={`p-6 rounded-xl border-2 transition-all hover:shadow-lg text-left ${
            existingType === "INDIVIDUAL"
              ? "border-jemo-orange bg-jemo-orange/5"
              : "border-gray-200 hover:border-jemo-orange"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <User className="w-7 h-7 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t("typeSelection.individual.title")}
          </h3>
          <p className="text-sm text-gray-500">
            {t("typeSelection.individual.description")}
          </p>
        </button>
      </div>
    </div>
  );
}
