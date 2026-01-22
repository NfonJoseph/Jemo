import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { TranslationsProvider } from "@/lib/translations";
import { CartProvider } from "@/lib/cart-context";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/components/ui/toaster";
import { MotionProvider } from "@/components/motion";
import "../globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const locales = ["fr", "en"] as const;
type Locale = (typeof locales)[number];

export const metadata: Metadata = {
  title: {
    default: "Jemo - Cameroon's Trusted Marketplace",
    template: "%s | Jemo",
  },
  description:
    "Shop from trusted local vendors in Cameroon. Electronics, fashion, home goods and more with reliable delivery.",
  keywords: ["marketplace", "cameroon", "shopping", "online store", "delivery"],
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Direct message loading function (bypasses next-intl plugin)
async function getMessages(locale: string) {
  try {
    return (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    return (await import(`../../../messages/fr.json`)).default;
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages(locale);

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <TranslationsProvider locale={locale} messages={messages}>
          <MotionProvider>
            <AuthProvider>
              <CartProvider>
                <ToastProvider>{children}</ToastProvider>
              </CartProvider>
            </AuthProvider>
          </MotionProvider>
        </TranslationsProvider>
      </body>
    </html>
  );
}
