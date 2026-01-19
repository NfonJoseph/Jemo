"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  Shield,
  FileCheck,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  Package,
  Users,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "@/lib/translations";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoggedIn, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations("admin");
  const locale = useLocale();

  const ADMIN_NAV = [
    { label: t("nav.dashboard"), href: `/${locale}/admin`, icon: Home },
    { label: "Users", href: `/${locale}/admin/users`, icon: Users },
    { label: "Delivery Agencies", href: `/${locale}/admin/delivery-agencies`, icon: Truck },
    { label: t("nav.products"), href: `/${locale}/admin/products`, icon: Package },
    { label: t("nav.kyc"), href: `/${locale}/admin/kyc`, icon: FileCheck },
    { label: t("nav.orders"), href: `/${locale}/admin/orders`, icon: ShoppingBag },
    { label: t("nav.payments"), href: `/${locale}/admin/payments`, icon: CreditCard },
    { label: t("nav.disputes"), href: `/${locale}/admin/disputes`, icon: AlertTriangle },
  ];

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push(`/${locale}/login?redirect=/${locale}/admin`);
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

  if (user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{t("accessDenied")}</h1>
          <p className="text-gray-600 mb-6">
            {t("accessDeniedDesc")}
          </p>
          <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
            <Link href={`/${locale}`}>{t("goHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-gray-900 shadow-md">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href={`/${locale}/admin`} className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-jemo-orange" />
            <span className="text-white font-semibold">{t("title")}</span>
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
          "fixed top-0 left-0 h-full w-64 bg-gray-900 shadow-lg z-50 transform transition-transform md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <Link href={`/${locale}/admin`} className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-jemo-orange" />
            <span className="text-white font-semibold">{t("portal")}</span>
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
        <div className="p-4 border-b border-gray-800">
          <p className="font-medium text-white truncate">{user?.name}</p>
          <p className="text-sm text-gray-400 truncate">
            {user?.phone || user?.email}
          </p>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors mb-2"
            onClick={() => setSidebarOpen(false)}
          >
            <Home className="w-5 h-5" />
            {t("backToStore")}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-colors"
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

