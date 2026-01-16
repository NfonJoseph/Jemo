"use client";

import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import type { VendorApplication } from "../page";

interface ReviewStepProps {
  application: VendorApplication | null;
  type: "BUSINESS" | "INDIVIDUAL";
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function ReviewStep({ application, type, onSubmit, onBack, isSubmitting }: ReviewStepProps) {
  const t = useTranslations("vendorWizard");

  if (!application) return null;

  const getDocumentLabel = (kind: string) => {
    switch (kind) {
      case "TAXPAYER_DOC":
        return t("business.taxpayerDoc");
      case "ID_FRONT":
        return t("capture.idFront");
      case "ID_BACK":
        return t("capture.idBack");
      case "SELFIE":
        return t("capture.selfie");
      default:
        return kind;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {t("review.title")}
        </h2>
        <p className="text-gray-500 text-sm">
          {t("review.subtitle")}
        </p>
      </div>

      {/* Information Summary */}
      <div className="bg-gray-50 rounded-xl p-5 space-y-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          {type === "BUSINESS" ? t("review.businessInfo") : t("review.personalInfo")}
        </h3>
        
        {type === "BUSINESS" ? (
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">{t("business.businessName")}</dt>
              <dd className="font-medium text-gray-900">{application.businessName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("business.businessAddress")}</dt>
              <dd className="font-medium text-gray-900">{application.businessAddress}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("business.businessPhone")}</dt>
              <dd className="font-medium text-gray-900">{application.businessPhone}</dd>
            </div>
            {application.businessEmail && (
              <div>
                <dt className="text-gray-500">{t("business.businessEmail")}</dt>
                <dd className="font-medium text-gray-900">{application.businessEmail}</dd>
              </div>
            )}
          </dl>
        ) : (
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">{t("individual.fullName")}</dt>
              <dd className="font-medium text-gray-900">{application.fullNameOnId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("individual.location")}</dt>
              <dd className="font-medium text-gray-900">{application.location}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("individual.phone")}</dt>
              <dd className="font-medium text-gray-900">{application.phoneNormalized}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Documents Summary */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          {t("review.documents")}
        </h3>
        <ul className="space-y-2">
          {application.uploads?.map((upload) => (
            <li key={upload.id} className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-gray-700">{getDocumentLabel(upload.kind)}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{upload.originalName}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Fee Status */}
      <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-green-600" />
        <div>
          <p className="font-medium text-green-900">{t("fee.paid")}</p>
          {application.paymentRef && (
            <p className="text-xs text-green-700">
              {t("fee.paymentRef")}: {application.paymentRef}
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="bg-jemo-orange hover:bg-jemo-orange/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            t("review.submit")
          )}
        </Button>
      </div>
    </div>
  );
}
