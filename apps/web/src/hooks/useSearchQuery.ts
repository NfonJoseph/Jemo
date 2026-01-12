"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/translations";

interface UseSearchQueryOptions {
  /** Debounce delay in ms for typing (default: 300) */
  debounceMs?: number;
  /** The query param key to use (default: "q") */
  paramKey?: string;
  /** Target path to navigate to on submit - without locale prefix (default: "/marketplace") */
  targetPath?: string;
  /** Whether to navigate on submit or just update URL (default: true) */
  navigateOnSubmit?: boolean;
}

interface UseSearchQueryReturn {
  /** Current input value (local state) */
  value: string;
  /** Update local input value (does NOT immediately update URL) */
  setValue: (next: string) => void;
  /** Submit search - navigates or updates URL immediately */
  submit: (overrideValue?: string) => void;
  /** Clear search - removes param from URL */
  clear: () => void;
  /** Whether the current path is the target path */
  isOnTargetPath: boolean;
}

/**
 * Hook for managing search query state with URL as source of truth.
 * - Local state for controlled input
 * - Debounced URL updates while typing
 * - Immediate URL update on submit
 * - Navigation to target path if not already there
 * - Locale-aware navigation
 */
export function useSearchQuery(
  options: UseSearchQueryOptions = {}
): UseSearchQueryReturn {
  const {
    debounceMs = 300,
    paramKey = "q",
    targetPath = "/marketplace",
    navigateOnSubmit = true,
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  
  // Full target path with locale
  const fullTargetPath = `/${locale}${targetPath}`;
  
  // Get current value from URL
  const urlValue = searchParams.get(paramKey) || "";
  
  // Local state for controlled input
  const [value, setValueState] = useState(urlValue);
  
  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track if we're on target path (check if pathname starts with the target)
  const isOnTargetPath = pathname === fullTargetPath || pathname.endsWith(targetPath);

  // Sync local state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setValueState(urlValue);
  }, [urlValue]);

  // Build URL with updated query param
  const buildUrl = useCallback(
    (newValue: string, forPath: string): string => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (newValue.trim()) {
        params.set(paramKey, newValue.trim());
      } else {
        params.delete(paramKey);
      }
      
      // Reset page when search changes
      params.delete("page");
      
      const queryString = params.toString();
      return queryString ? `${forPath}?${queryString}` : forPath;
    },
    [searchParams, paramKey]
  );

  // Update URL (debounced or immediate)
  const updateUrl = useCallback(
    (newValue: string, immediate = false) => {
      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const performUpdate = () => {
        const targetUrl = buildUrl(newValue, isOnTargetPath ? pathname : fullTargetPath);
        const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

        // Only update if URL actually changed
        if (targetUrl !== currentUrl) {
          if (isOnTargetPath) {
            // Already on marketplace - just replace URL
            router.replace(targetUrl);
          } else if (navigateOnSubmit) {
            // Navigate to marketplace
            router.push(targetUrl);
          }
        }
      };

      if (immediate) {
        performUpdate();
      } else {
        debounceRef.current = setTimeout(performUpdate, debounceMs);
      }
    },
    [buildUrl, isOnTargetPath, pathname, fullTargetPath, searchParams, router, navigateOnSubmit, debounceMs]
  );

  // Set value - updates local state and optionally debounces URL update
  const setValue = useCallback(
    (next: string) => {
      setValueState(next);
      
      // Only auto-update URL if already on target path
      if (isOnTargetPath) {
        updateUrl(next, false); // debounced
      }
    },
    [isOnTargetPath, updateUrl]
  );

  // Submit - immediate URL update/navigation
  const submit = useCallback(
    (overrideValue?: string) => {
      const finalValue = overrideValue ?? value;
      
      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const targetUrl = buildUrl(finalValue, fullTargetPath);
      const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

      if (isOnTargetPath) {
        // Already on marketplace - replace to avoid history spam
        if (targetUrl !== currentUrl) {
          router.replace(targetUrl);
        }
      } else {
        // Navigate to marketplace
        router.push(targetUrl);
      }
    },
    [value, buildUrl, fullTargetPath, pathname, searchParams, isOnTargetPath, router]
  );

  // Clear search
  const clear = useCallback(() => {
    setValueState("");
    
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramKey);
    params.delete("page");
    
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    const currentUrl = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

    if (newUrl !== currentUrl) {
      router.replace(newUrl);
    }
  }, [pathname, searchParams, paramKey, router]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    value,
    setValue,
    submit,
    clear,
    isOnTargetPath,
  };
}
