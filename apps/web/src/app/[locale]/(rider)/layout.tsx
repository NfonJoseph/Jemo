"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useTranslations, useLocale } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  Truck,
  Package,
  Clock,
  LogOut,
  Menu,
  X,
  Settings,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DeliveryAgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("deliveryAgencyNav");
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const DELIVERY_NAV = [
    { label: t("dashboard"), href: `/${locale}/rider`, icon: Home },
    { label: t("available"), href: `/${locale}/rider/deliveries/available`, icon: Package },
    { label: t("myDeliveries"), href: `/${locale}/rider/deliveries/me`, icon: Clock },
    { label: t("shipments"), href: `/${locale}/rider/shipments`, icon: Truck },
    { label: t("wallet"), href: `/${locale}/rider/wallet`, icon: DollarSign },
    { label: t("settings"), href: `/${locale}/rider/settings`, icon: Settings },
  ];

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push(`/${locale}/login?redirect=/${locale}/rider`);
    }
  }, [isLoading, isLoggedIn, router, locale]);

  const handleLogout = () => {
    logout();
    router.push(`/${locale}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  // Only DELIVERY_AGENCY role can access this area
  if (user?.role !== "DELIVERY_AGENCY") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t("accessDenied")}</h1>
          <p className="text-gray-600 mb-6">
            {t("accessDeniedDesc")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
              <Link href={`/${locale}`}>{t("goHome")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-jemo-orange shadow-md">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href={`/${locale}/rider`} className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Jemo"
              width={80}
              height={28}
              className="h-7 w-auto"
            />
            <span className="text-white text-sm font-medium">{t("delivery")}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 md:hidden transition-opacity",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 bg-jemo-orange">
          <Link href={`/${locale}/rider`} className="flex items-center gap-2">
            <Truck className="w-6 h-6 text-white" />
            <span className="text-white font-semibold">{t("deliveryPortal")}</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/20"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200">
          <p className="font-medium text-gray-900 truncate">{user?.name}</p>
          <p className="text-sm text-gray-500 truncate">
            {user?.phone || user?.email}
          </p>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1">
          {DELIVERY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-jemo-orange rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
            onClick={() => setSidebarOpen(false)}
          >
            <Home className="w-5 h-5" />
            {t("backToStore")}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

