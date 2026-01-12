"use client";

import { useLocale } from "@/lib/translations";
import { usePathname, useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { locales, localeNames, type Locale } from "@/i18n/config";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "toggle" | "dropdown";
}

export function LanguageSwitcher({
  className,
  variant = "toggle",
}: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Replace the locale segment in the pathname
    // pathname looks like /fr/marketplace or /en/about
    const segments = pathname.split("/");
    segments[1] = newLocale; // Replace the locale segment
    const newPathname = segments.join("/");

    // Preserve query params
    const queryString = searchParams.toString();
    const newUrl = queryString ? `${newPathname}?${queryString}` : newPathname;

    startTransition(() => {
      // Set cookie for middleware to remember preference
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
      router.push(newUrl);
      router.refresh();
    });
  };

  if (variant === "toggle") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-sm font-medium",
          isPending && "opacity-50 pointer-events-none",
          className
        )}
      >
        {locales.map((loc, index) => (
          <span key={loc} className="flex items-center">
            {index > 0 && <span className="mx-1 opacity-50">/</span>}
            <button
              onClick={() => switchLocale(loc)}
              className={cn(
                "px-1 py-0.5 rounded transition-colors",
                locale === loc
                  ? "font-bold underline underline-offset-2"
                  : "opacity-70 hover:opacity-100"
              )}
              disabled={isPending}
              aria-label={`Switch to ${localeNames[loc]}`}
            >
              {loc.toUpperCase()}
            </button>
          </span>
        ))}
      </div>
    );
  }

  // Dropdown variant
  return (
    <select
      value={locale}
      onChange={(e) => switchLocale(e.target.value as Locale)}
      disabled={isPending}
      className={cn(
        "bg-transparent border border-current rounded px-2 py-1 text-sm cursor-pointer",
        isPending && "opacity-50",
        className
      )}
      aria-label="Select language"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
