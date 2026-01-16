"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { ExternalLink, Loader2 } from "lucide-react";

interface SignedFileLinkProps {
  applicationId: string;
  kind: string;
  label?: string;
  className?: string;
}

/**
 * Component that fetches a signed URL on click and opens it in a new tab
 * Used for secure access to vendor application uploads
 */
export function SignedFileLink({
  applicationId,
  kind,
  label,
  className = "text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center gap-1",
}: SignedFileLinkProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await api.get<{ url: string; expiresIn: number }>(
        `/vendor-applications/${applicationId}/upload/${kind}/url`,
        true
      );
      
      // Open the signed URL in a new tab
      window.open(response.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to get signed URL:", error);
    } finally {
      setLoading(false);
    }
  }, [applicationId, kind, loading]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <ExternalLink className="w-3 h-3" />
      )}
      {label || kind}
    </button>
  );
}
