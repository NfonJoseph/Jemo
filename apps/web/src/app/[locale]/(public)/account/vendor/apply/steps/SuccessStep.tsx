"use client";

import { CheckCircle2, Phone } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";

interface SuccessStepProps {
  type: "BUSINESS" | "INDIVIDUAL";
  onGoToAccount: () => void;
}

export function SuccessStep({ type, onGoToAccount }: SuccessStepProps) {
  const t = useTranslations("vendorWizard");

  return (
    <div className="py-8 min-h-screen bg-gray-50">
      <div className="container-main max-w-md">
        <div className="card bg-white p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {type === "BUSINESS" 
              ? t("success.businessTitle") 
              : t("success.individualTitle")}
          </h1>

          <p className="text-gray-600 mb-6">
            {type === "BUSINESS"
              ? t("success.businessMessage")
              : t("success.individualMessage")}
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center gap-3 text-left">
            <Phone className="w-6 h-6 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              {type === "BUSINESS"
                ? t("accountStatus.pendingVerification")
                : t("accountStatus.pendingKyc")}
            </p>
          </div>

          <Button
            onClick={onGoToAccount}
            className="w-full bg-jemo-orange hover:bg-jemo-orange/90"
          >
            {t("back")} {t("title")}
          </Button>
        </div>
      </div>
    </div>
  );
}
