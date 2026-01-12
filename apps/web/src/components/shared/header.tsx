"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations, useLocale } from "@/lib/translations";
import {
  Search,
  User,
  Menu,
  X,
  LogIn,
  LogOut,
  Package,
  Heart,
  UserPlus,
  Store,
  Bike,
  Shield,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const t = useTranslations("header");
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const NAV_ITEMS = [
    { label: t("marketplace"), href: `/${locale}/marketplace` },
    { label: t("about"), href: `/${locale}/about` },
    { label: t("contact"), href: `/${locale}/contact` },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${locale}/marketplace?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    router.push(`/${locale}`);
  };

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-jemo-orange shadow-md">
        <div className="container-main">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center h-16">
            {/* Logo */}
            <Link href={`/${locale}`} className="flex-shrink-0 tap-highlight-none">
              <Image
                src="/logo-white.png"
                alt="Jemo"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Search - Centered */}
            <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-6">
              <div className="relative">
                <Input
                  type="search"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-white"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-jemo-orange transition-colors"
                  aria-label={t("searchPlaceholder")}
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            {/* Right Group: Nav + Icons */}
            <div className="flex items-center gap-4 ml-auto flex-shrink-0">
              {/* Nav Items */}
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white text-sm font-medium hover:text-white/80 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}

              {/* Role-specific Dashboard Icon */}
              {isLoggedIn && user?.role === "VENDOR" && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-white hover:bg-white/20"
                >
                  <Link href={`/${locale}/vendor`} aria-label={t("vendorDashboard")}>
                    <Store className="w-5 h-5" />
                  </Link>
                </Button>
              )}
              {isLoggedIn && user?.role === "RIDER" && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-white hover:bg-white/20"
                >
                  <Link href={`/${locale}/rider`} aria-label={t("riderDashboard")}>
                    <Bike className="w-5 h-5" />
                  </Link>
                </Button>
              )}
              {isLoggedIn && user?.role === "ADMIN" && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-white hover:bg-white/20"
                >
                  <Link href={`/${locale}/admin`} aria-label={t("adminDashboard")}>
                    <Shield className="w-5 h-5" />
                  </Link>
                </Button>
              )}

              {/* Favorites */}
              <Button
                variant="ghost"
                size="icon"
                asChild
                className="text-white hover:bg-white/20"
              >
                <Link href={`/${locale}/favorites`} aria-label={t("favorites")}>
                  <Heart className="w-5 h-5" />
                </Link>
              </Button>

              {/* Language Toggle */}
              <LanguageSwitcher className="text-white" />

              {/* Account Menu */}
              <div className="relative" ref={accountMenuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  aria-label={t("myAccount")}
                >
                  <User className="w-5 h-5" />
                </Button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {isLoggedIn ? (
                      <>
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user?.phone || user?.email}
                          </p>
                        </div>
                        {user?.role === "VENDOR" && (
                          <Link
                            href={`/${locale}/vendor`}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-jemo-orange font-medium hover:bg-orange-50"
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            <Store className="w-4 h-4" />
                            {t("vendorDashboard")}
                          </Link>
                        )}
                        {user?.role === "RIDER" && (
                          <Link
                            href={`/${locale}/rider`}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-jemo-orange font-medium hover:bg-orange-50"
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            <Bike className="w-4 h-4" />
                            {t("riderDashboard")}
                          </Link>
                        )}
                        {user?.role === "ADMIN" && (
                          <Link
                            href={`/${locale}/admin`}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-jemo-orange font-medium hover:bg-orange-50"
                            onClick={() => setAccountMenuOpen(false)}
                          >
                            <Shield className="w-4 h-4" />
                            {t("adminDashboard")}
                          </Link>
                        )}
                        <Link
                          href={`/${locale}/account`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          {t("myAccount")}
                        </Link>
                        <Link
                          href={`/${locale}/orders`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <Package className="w-4 h-4" />
                          {t("myOrders")}
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <LogOut className="w-4 h-4" />
                          {t("logout")}
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href={`/${locale}/login`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <LogIn className="w-4 h-4" />
                          {t("login")}
                        </Link>
                        <Link
                          href={`/${locale}/register`}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-jemo-orange font-medium hover:bg-gray-50"
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <UserPlus className="w-4 h-4" />
                          {t("register")}
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden">
            {/* Top Row */}
            <div className="flex items-center justify-between h-14">
              {/* Logo */}
              <Link href={`/${locale}`} className="flex-shrink-0 tap-highlight-none">
                <Image
                  src="/logo-white.png"
                  alt="Jemo"
                  width={100}
                  height={32}
                  className="h-8 w-auto"
                  priority
                />
              </Link>

              {/* Mobile Icons */}
              <div className="flex items-center gap-1">
                {/* Role-specific Dashboard Icon */}
                {isLoggedIn && user?.role === "VENDOR" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="text-white hover:bg-white/20 h-9 w-9"
                  >
                    <Link href={`/${locale}/vendor`} aria-label={t("vendorDashboard")}>
                      <Store className="w-5 h-5" />
                    </Link>
                  </Button>
                )}
                {isLoggedIn && user?.role === "RIDER" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="text-white hover:bg-white/20 h-9 w-9"
                  >
                    <Link href={`/${locale}/rider`} aria-label={t("riderDashboard")}>
                      <Bike className="w-5 h-5" />
                    </Link>
                  </Button>
                )}
                {isLoggedIn && user?.role === "ADMIN" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="text-white hover:bg-white/20 h-9 w-9"
                  >
                    <Link href={`/${locale}/admin`} aria-label={t("adminDashboard")}>
                      <Shield className="w-5 h-5" />
                    </Link>
                  </Button>
                )}

                {/* Favorites */}
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-white hover:bg-white/20 h-9 w-9"
                >
                  <Link href={`/${locale}/favorites`} aria-label={t("favorites")}>
                    <Heart className="w-5 h-5" />
                  </Link>
                </Button>

                {/* Language Toggle */}
                <LanguageSwitcher className="text-white" />

                {/* Account */}
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="text-white hover:bg-white/20 h-9 w-9"
                >
                  <Link href={isLoggedIn ? `/${locale}/orders` : `/${locale}/login`} aria-label={t("myAccount")}>
                    <User className="w-5 h-5" />
                  </Link>
                </Button>

                {/* Hamburger */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-9 w-9"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label={t("menu")}
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="pb-3">
              <div className="relative">
                <Input
                  type="search"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-white h-10"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-jemo-orange transition-colors"
                  aria-label={t("searchPlaceholder")}
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 md:hidden transition-opacity duration-300",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-72 bg-white z-50 md:hidden transform transition-transform duration-300 ease-out shadow-xl",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-jemo-orange">
          <span className="text-white font-semibold">{t("menu")}</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 h-9 w-9"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={t("menu")}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Drawer Content */}
        <div className="flex flex-col h-[calc(100%-60px)] overflow-y-auto">
          {/* User Info */}
          {isLoggedIn && (
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.phone || user?.email}</p>
            </div>
          )}

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center py-3 px-2 text-gray-700 hover:text-jemo-orange hover:bg-gray-50 rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-gray-200 mx-4" />

          {/* Quick Links */}
          <div className="p-4 space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 px-2">
              {t("quickLinks")}
            </p>
            <Link
              href={`/${locale}/favorites`}
              className="flex items-center gap-3 py-3 px-2 text-gray-700 hover:text-jemo-orange hover:bg-gray-50 rounded-md transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Heart className="w-4 h-4" />
              {t("favorites")}
            </Link>

            {isLoggedIn ? (
              <>
                {user?.role === "VENDOR" && (
                  <Link
                    href={`/${locale}/vendor`}
                    className="flex items-center gap-3 py-3 px-2 text-jemo-orange font-medium hover:bg-orange-50 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Store className="w-4 h-4" />
                    {t("vendorDashboard")}
                  </Link>
                )}
                {user?.role === "RIDER" && (
                  <Link
                    href={`/${locale}/rider`}
                    className="flex items-center gap-3 py-3 px-2 text-jemo-orange font-medium hover:bg-orange-50 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bike className="w-4 h-4" />
                    {t("riderDashboard")}
                  </Link>
                )}
                {user?.role === "ADMIN" && (
                  <Link
                    href={`/${locale}/admin`}
                    className="flex items-center gap-3 py-3 px-2 text-jemo-orange font-medium hover:bg-orange-50 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    {t("adminDashboard")}
                  </Link>
                )}
                <Link
                  href={`/${locale}/account`}
                  className="flex items-center gap-3 py-3 px-2 text-gray-700 hover:text-jemo-orange hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  {t("myAccount")}
                </Link>
                <Link
                  href={`/${locale}/orders`}
                  className="flex items-center gap-3 py-3 px-2 text-gray-700 hover:text-jemo-orange hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Package className="w-4 h-4" />
                  {t("myOrders")}
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full py-3 px-2 text-gray-700 hover:text-jemo-orange hover:bg-gray-50 rounded-md transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  {t("logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/login`}
                  className="flex items-center gap-3 py-3 px-2 text-gray-700 hover:text-jemo-orange hover:bg-gray-50 rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="w-4 h-4" />
                  {t("login")}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  className="flex items-center gap-3 py-3 px-2 text-jemo-orange font-medium hover:bg-orange-50 rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserPlus className="w-4 h-4" />
                  {t("register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
