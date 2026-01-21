import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-CM", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

/**
 * Known API error codes that can be translated
 */
export type ApiErrorCode =
  | "INVALID_ORDER_TRANSITION"
  | "INVALID_RECEIVED_TRANSITION"
  | "CANNOT_CANCEL_ORDER"
  | "CANNOT_CANCEL_TERMINAL_ORDER"
  | "INVALID_JOB_TRANSITION"
  | "JOB_NOT_OPEN"
  | "JOB_ALREADY_ASSIGNED"
  | "NOT_ASSIGNED_AGENCY";

/**
 * Extract error code from API error response
 */
export function getApiErrorCode(error: unknown): ApiErrorCode | null {
  if (!error || typeof error !== "object") return null;
  
  // Handle axios-style errors
  const axiosError = error as { response?: { data?: { code?: string } } };
  if (axiosError.response?.data?.code) {
    return axiosError.response.data.code as ApiErrorCode;
  }
  
  // Handle direct error object
  const directError = error as { code?: string };
  if (directError.code) {
    return directError.code as ApiErrorCode;
  }
  
  return null;
}

/**
 * Get translated error message from API error
 * @param error - The error object from API call
 * @param t - Translation function from next-intl
 * @param fallback - Fallback message if no translation found
 */
export function getTranslatedApiError(
  error: unknown,
  t: (key: string, fallback?: { defaultValue?: string }) => string,
  fallback?: string
): string {
  const code = getApiErrorCode(error);
  
  if (code) {
    const translated = t(`errors.statusTransition.${code}`, { defaultValue: "" });
    if (translated) return translated;
  }
  
  // Try to get message from error
  if (error && typeof error === "object") {
    const axiosError = error as { response?: { data?: { message?: string } } };
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    
    const directError = error as { message?: string };
    if (directError.message) {
      return directError.message;
    }
  }
  
  return fallback || "An error occurred";
}
