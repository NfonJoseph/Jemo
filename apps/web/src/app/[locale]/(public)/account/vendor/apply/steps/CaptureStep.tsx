"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Upload, RefreshCw, CheckCircle2, X, Loader2 } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import type { VendorApplication } from "../page";

interface CaptureStepProps {
  application: VendorApplication | null;
  onComplete: (updated: VendorApplication) => void;
  onBack: () => void;
}

type DocumentKind = "ID_FRONT" | "ID_BACK" | "SELFIE";

interface CapturedImage {
  kind: DocumentKind;
  data: string; // Base64 or blob URL
  file?: File;
}

export function CaptureStep({ application, onComplete, onBack }: CaptureStepProps) {
  const t = useTranslations("vendorWizard");
  const toast = useToast();

  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [activeCamera, setActiveCamera] = useState<DocumentKind | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<DocumentKind, boolean>>({
    ID_FRONT: false,
    ID_BACK: false,
    SELFIE: false,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRefs = {
    ID_FRONT: useRef<HTMLInputElement>(null),
    ID_BACK: useRef<HTMLInputElement>(null),
    SELFIE: useRef<HTMLInputElement>(null),
  };

  // Check existing uploads
  useEffect(() => {
    if (application?.uploads) {
      const existing = application.uploads
        .filter(u => ["ID_FRONT", "ID_BACK", "SELFIE"].includes(u.kind))
        .map(u => ({
          kind: u.kind as DocumentKind,
          data: "", // Placeholder - already uploaded
        }));
      setCapturedImages(existing);
    }
  }, [application]);

  // Check camera support
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(device => device.kind === "videoinput");
        setCameraSupported(hasCamera);
      } catch {
        setCameraSupported(false);
      }
    };
    checkCamera();
  }, []);

  // Start camera
  const startCamera = useCallback(async (kind: DocumentKind) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: kind === "SELFIE" ? "user" : "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setActiveCamera(kind);
    } catch {
      setCameraSupported(false);
      toast.error(t("capture.uploadFallback"));
    }
  }, [t, toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setActiveCamera(null);
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !activeCamera) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      
      // Convert to File
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `${activeCamera}.jpg`, { type: "image/jpeg" });
          
          setCapturedImages(prev => {
            const filtered = prev.filter(img => img.kind !== activeCamera);
            return [...filtered, { kind: activeCamera, data: dataUrl, file }];
          });
          
          stopCamera();
        });
    }
  }, [activeCamera, stopCamera]);

  // Handle file upload fallback
  const handleFileSelect = useCallback((kind: DocumentKind, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("errors.invalidFileType"));
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("errors.fileTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImages(prev => {
        const filtered = prev.filter(img => img.kind !== kind);
        return [...filtered, { kind, data: event.target?.result as string, file }];
      });
    };
    reader.readAsDataURL(file);
  }, [t, toast]);

  // Remove captured image
  const removeImage = (kind: DocumentKind) => {
    setCapturedImages(prev => prev.filter(img => img.kind !== kind));
  };

  // Check if a document is captured
  const isDocumentCaptured = (kind: DocumentKind) => {
    return capturedImages.some(img => img.kind === kind) ||
           application?.uploads?.some(u => u.kind === kind);
  };

  // Upload all and proceed
  const handleProceed = async () => {
    if (!application) return;

    const toUpload = capturedImages.filter(img => img.file);
    
    if (toUpload.length === 0 && 
        !["ID_FRONT", "ID_BACK", "SELFIE"].every(kind => 
          application.uploads?.some(u => u.kind === kind)
        )) {
      toast.error(t("errors.missingFields"));
      return;
    }

    setIsUploading(true);

    try {
      for (const img of toUpload) {
        if (!img.file) continue;
        
        setUploadProgress(prev => ({ ...prev, [img.kind]: true }));
        
        const formData = new FormData();
        formData.append("file", img.file);

        await fetch(`/api/vendor-applications/${application.id}/upload/${img.kind}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jemo_token")}`,
          },
          body: formData,
        });

        setUploadProgress(prev => ({ ...prev, [img.kind]: false }));
      }

      // Refetch application
      const updated = await api.get<VendorApplication>("/vendor-applications/me", true);
      if (updated) {
        onComplete(updated);
      }
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // All required documents captured
  const allCaptured = ["ID_FRONT", "ID_BACK", "SELFIE"].every(kind =>
    isDocumentCaptured(kind as DocumentKind)
  );

  const renderDocumentCard = (kind: DocumentKind, label: string) => {
    const captured = capturedImages.find(img => img.kind === kind);
    const existingUpload = application?.uploads?.find(u => u.kind === kind);
    const isCaptured = captured || existingUpload;

    return (
      <div
        key={kind}
        className={`rounded-xl border-2 p-4 transition-all ${
          isCaptured ? "border-green-500 bg-green-50" : "border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-gray-900">{label}</span>
          {isCaptured && <CheckCircle2 className="w-5 h-5 text-green-600" />}
        </div>

        {captured?.data ? (
          <div className="relative">
            <img
              src={captured.data}
              alt={label}
              className="w-full h-32 object-cover rounded-lg"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1 right-1 bg-white/80 hover:bg-white"
              onClick={() => removeImage(kind)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : existingUpload ? (
          <div className="h-32 bg-green-100 rounded-lg flex items-center justify-center">
            <span className="text-green-700 text-sm">{t("capture.captured")}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cameraSupported && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => startCamera(kind)}
              >
                <Camera className="w-4 h-4 mr-2" />
                {t("capture.capture")}
              </Button>
            )}
            <Button
              variant={cameraSupported ? "ghost" : "outline"}
              className="w-full"
              onClick={() => fileInputRefs[kind].current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {t("capture.upload")}
            </Button>
            <input
              ref={fileInputRefs[kind]}
              type="file"
              accept="image/*"
              capture={kind === "SELFIE" ? "user" : "environment"}
              onChange={(e) => handleFileSelect(kind, e)}
              className="hidden"
            />
          </div>
        )}

        {uploadProgress[kind] && (
          <div className="mt-2 flex items-center gap-2 text-sm text-jemo-orange">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {t("capture.title")}
        </h2>
        <p className="text-gray-500 text-sm">
          {t("capture.subtitle")}
        </p>
        {!cameraSupported && (
          <p className="text-amber-600 text-sm mt-2">
            {t("capture.uploadFallback")}
          </p>
        )}
      </div>

      {/* Camera Modal */}
      {activeCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="p-4 bg-black flex items-center justify-center gap-4">
            <Button variant="outline" onClick={stopCamera}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={capturePhoto}
              className="bg-jemo-orange hover:bg-jemo-orange/90"
            >
              <Camera className="w-4 h-4 mr-2" />
              {t("capture.capture")}
            </Button>
          </div>
        </div>
      )}

      {/* Document Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {renderDocumentCard("ID_FRONT", t("capture.idFront"))}
        {renderDocumentCard("ID_BACK", t("capture.idBack"))}
        {renderDocumentCard("SELFIE", t("capture.selfie"))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          {t("back")}
        </Button>
        <Button
          onClick={handleProceed}
          disabled={!allCaptured || isUploading}
          className="bg-jemo-orange hover:bg-jemo-orange/90"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            t("next")
          )}
        </Button>
      </div>
    </div>
  );
}
