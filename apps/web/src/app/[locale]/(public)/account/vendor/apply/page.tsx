"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toaster";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Step Components
import { TypeSelectionStep } from "./steps/TypeSelectionStep";
import { FeeStep } from "./steps/FeeStep";
import { BusinessDetailsStep } from "./steps/BusinessDetailsStep";
import { IndividualDetailsStep } from "./steps/IndividualDetailsStep";
import { KycPrepStep } from "./steps/KycPrepStep";
import { CaptureStep } from "./steps/CaptureStep";
import { ReviewStep } from "./steps/ReviewStep";
import { SuccessStep } from "./steps/SuccessStep";

// Types
export interface VendorApplication {
  id: string;
  type: "BUSINESS" | "INDIVIDUAL";
  status: string;
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  fullNameOnId?: string;
  location?: string;
  phoneNormalized?: string;
  applicationFeePaid: boolean;
  paymentRef?: string;
  uploads: Array<{
    id: string;
    kind: string;
    originalName: string;
  }>;
}

interface FeeSettings {
  enabled: boolean;
  amount: number;
}

// Step configuration - dynamically generated based on fee settings
function getBusinessSteps(feeEnabled: boolean): string[] {
  return feeEnabled 
    ? ["type", "fee", "details", "review"]
    : ["type", "details", "review"];
}

function getIndividualSteps(feeEnabled: boolean): string[] {
  return feeEnabled
    ? ["type", "fee", "details", "kyc", "capture", "review"]
    : ["type", "details", "kyc", "capture", "review"];
}

export default function VendorApplyPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("vendorWizard");
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [applicationType, setApplicationType] = useState<"BUSINESS" | "INDIVIDUAL" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({ enabled: true, amount: 5000 });

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.push(`/${locale}/login?redirect=/${locale}/account/vendor/apply`);
    }
  }, [authLoading, isLoggedIn, router, locale]);

  // Fetch existing application and fee settings
  const fetchApplication = useCallback(async () => {
    // Wait for auth to be ready
    if (!isLoggedIn || authLoading) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch fee settings (public endpoint, no auth required)
      try {
        const feeData = await api.get<FeeSettings>("/settings/vendor-application-fee");
        setFeeSettings(feeData);
      } catch (feeErr) {
        console.warn("Failed to fetch fee settings, using defaults");
      }

      const data = await api.get<VendorApplication | null>("/vendor-applications/me", true);
      if (data) {
        setApplication(data);
        setApplicationType(data.type);
        // Determine current step based on application state
        if (data.status === "PENDING_MANUAL_VERIFICATION" || data.status === "PENDING_KYC_REVIEW") {
          setIsSubmitted(true);
        } else if (data.status === "APPROVED") {
          router.push(`/${locale}/vendor`);
        } else if (data.status === "REJECTED") {
          setCurrentStep(0); // Allow resubmission
        } else {
          // Determine step based on progress and fee settings
          // Get the appropriate steps for this application type
          const currentSteps = data.type === "BUSINESS" 
            ? getBusinessSteps(feeSettings.enabled) 
            : getIndividualSteps(feeSettings.enabled);
          
          // Find the index of each step type
          const feeStepIndex = currentSteps.indexOf("fee");
          const detailsStepIndex = currentSteps.indexOf("details");
          const kycStepIndex = currentSteps.indexOf("kyc");
          const captureStepIndex = currentSteps.indexOf("capture");
          const reviewStepIndex = currentSteps.indexOf("review");

          // If fee is enabled and not paid, go to fee step
          if (feeSettings.enabled && !data.applicationFeePaid && feeStepIndex >= 0) {
            setCurrentStep(feeStepIndex);
          } else if (data.type === "BUSINESS") {
            if (!data.businessName) {
              setCurrentStep(detailsStepIndex);
            } else {
              const hasTaxDoc = data.uploads?.some(u => u.kind === "TAXPAYER_DOC");
              setCurrentStep(hasTaxDoc ? reviewStepIndex : detailsStepIndex);
            }
          } else {
            if (!data.fullNameOnId) {
              setCurrentStep(detailsStepIndex);
            } else {
              const hasAllKyc = ["ID_FRONT", "ID_BACK", "SELFIE"].every(
                kind => data.uploads?.some(u => u.kind === kind)
              );
              if (hasAllKyc) {
                setCurrentStep(reviewStepIndex);
              } else if (captureStepIndex >= 0) {
                setCurrentStep(captureStepIndex);
              } else {
                setCurrentStep(kycStepIndex >= 0 ? kycStepIndex : detailsStepIndex);
              }
            }
          }
        }
      }
    } catch {
      // No application exists yet - silently ignore
    } finally {
      setLoading(false);
    }
  }, [locale, router, isLoggedIn, authLoading]);

  useEffect(() => {
    if (isLoggedIn && !authLoading) {
      fetchApplication();
    }
  }, [isLoggedIn, authLoading, fetchApplication]);

  // Get steps array based on application type and fee settings
  const getSteps = () => {
    if (!applicationType) return ["type"];
    return applicationType === "BUSINESS" 
      ? getBusinessSteps(feeSettings.enabled) 
      : getIndividualSteps(feeSettings.enabled);
  };

  const steps = getSteps();
  const totalSteps = steps.length;

  // Create or update application
  const createApplication = async (type: "BUSINESS" | "INDIVIDUAL") => {
    try {
      const data = await api.post<VendorApplication>("/vendor-applications", { type }, true);
      setApplication(data);
      setApplicationType(type);
      setCurrentStep(1);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      }
    }
  };

  // Handle step navigation
  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!application) return;
    
    setIsSubmitting(true);
    try {
      await api.post(`/vendor-applications/${application.id}/submit`, {}, true);
      setIsSubmitted(true);
      toast.success(applicationType === "BUSINESS" 
        ? t("success.businessTitle") 
        : t("success.individualTitle"));
    } catch (err) {
      if (err instanceof ApiError) {
        // Extract message from API error data
        const errorData = err.data as { message?: string } | null;
        const message = errorData?.message || err.message;
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="py-8">
        <div className="container-main max-w-2xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="card p-6 space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Success state (submitted)
  if (isSubmitted) {
    return (
      <SuccessStep
        type={applicationType!}
        onGoToAccount={() => router.push(`/${locale}/account`)}
      />
    );
  }

  // Render current step
  const renderStep = () => {
    const stepName = steps[currentStep];

    switch (stepName) {
      case "type":
        return (
          <TypeSelectionStep
            onSelect={createApplication}
            existingType={application?.type}
          />
        );
      
      case "fee":
        return (
          <FeeStep
            application={application}
            onPaid={(updated) => {
              setApplication(updated);
              nextStep();
            }}
          />
        );
      
      case "details":
        if (applicationType === "BUSINESS") {
          return (
            <BusinessDetailsStep
              application={application}
              onSaved={(updated) => {
                setApplication(updated);
                nextStep();
              }}
              onBack={prevStep}
            />
          );
        }
        return (
          <IndividualDetailsStep
            application={application}
            onSaved={(updated) => {
              setApplication(updated);
              nextStep();
            }}
            onBack={prevStep}
          />
        );
      
      case "kyc":
        return (
          <KycPrepStep onNext={nextStep} onBack={prevStep} />
        );
      
      case "capture":
        return (
          <CaptureStep
            application={application}
            onComplete={(updated) => {
              setApplication(updated);
              nextStep();
            }}
            onBack={prevStep}
          />
        );
      
      case "review":
        return (
          <ReviewStep
            application={application}
            type={applicationType!}
            onSubmit={handleSubmit}
            onBack={prevStep}
            isSubmitting={isSubmitting}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="py-8 min-h-screen bg-gray-50">
      <div className="container-main max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/${locale}/account`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </Link>
          <h1 className="text-h1 text-gray-900">{t("title")}</h1>
          <p className="text-gray-500 mt-1">{t("subtitle")}</p>
        </div>

        {/* Stepper (only show after type selection) */}
        {applicationType && currentStep > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.slice(1).map((step, index) => {
                const stepIndex = index + 1;
                const isActive = currentStep === stepIndex;
                const isCompleted = currentStep > stepIndex;
                
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isActive
                            ? "bg-jemo-orange text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          stepIndex
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs text-center ${
                          isActive ? "text-jemo-orange font-medium" : "text-gray-500"
                        }`}
                      >
                        {t(`steps.${step}`)}
                      </span>
                    </div>
                    {index < steps.length - 2 && (
                      <div
                        className={`flex-1 h-1 mx-2 rounded ${
                          currentStep > stepIndex + 1 ? "bg-green-500" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="card bg-white p-6 shadow-card">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
