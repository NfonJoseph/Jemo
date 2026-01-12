"use client";

import Link from "next/link";
import { User, Headphones, Store, Package, LogIn, UserPlus } from "lucide-react";
import { useTranslations, useLocale } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import { getSidebarCategories, type Category } from "@/config/categories";
import { HeroSlider } from "./HeroSlider";
import { Button } from "@/components/ui/button";

// Phone number config
const SUPPORT_PHONE = "+237 682310407";
const SUPPORT_PHONE_FORMATTED = "+237 682 310 407";

// Max categories for sidebar (safety limit)
const MAX_SIDEBAR_CATEGORIES = 10;

// ============================================
// LEFT COLUMN: Categories Sidebar
// ============================================
function CategoriesSidebar({ categories }: { categories: Category[] }) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="h-full min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm flex flex-col">
      <ul className="divide-y divide-gray-100 flex-1 overflow-y-auto">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <li key={category.id}>
              <Link
                href={`/${locale}/marketplace?category=${category.slug}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm text-gray-700 hover:text-jemo-orange"
              >
                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="truncate">{t(category.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href={`/${locale}/marketplace`}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-jemo-orange border-t border-gray-100 shrink-0"
      >
        {t("hero.moreCategories")}
      </Link>
    </div>
  );
}

// ============================================
// RIGHT COLUMN: Quick Actions Cards
// ============================================
function AccountCard() {
  const t = useTranslations();
  const locale = useLocale();
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 animate-pulse shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-jemo-orange/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-jemo-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {t("hero.account.title")}
            </p>
            <Button asChild size="sm" className="w-full">
              <Link href={`/${locale}/account`}>
                {t("hero.account.myAccount")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 shrink-0">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-jemo-orange/10 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-jemo-orange" />
        </div>
        <p className="text-sm font-medium text-gray-700 truncate">
          {t("hero.account.title")}
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={`/${locale}/login`} className="flex items-center justify-center gap-1.5">
            <LogIn className="w-4 h-4 shrink-0" />
            <span className="truncate">{t("hero.account.login")}</span>
          </Link>
        </Button>
        <Button asChild size="sm" className="flex-1">
          <Link href={`/${locale}/register`} className="flex items-center justify-center gap-1.5">
            <UserPlus className="w-4 h-4 shrink-0" />
            <span className="truncate">{t("hero.account.register")}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SupportCard() {
  const t = useTranslations();

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
          <Headphones className="w-5 h-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide truncate">
            {t("hero.support.title")}
          </p>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="font-semibold text-gray-900 hover:text-jemo-orange transition-colors"
          >
            {SUPPORT_PHONE_FORMATTED}
          </a>
        </div>
      </div>
    </div>
  );
}

function QuickActionsCard() {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100 flex-1 flex flex-col min-h-0 overflow-hidden">
      <Link
        href={`/${locale}/account/vendor/apply`}
        className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors flex-1"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Store className="w-5 h-5 text-emerald-600" />
        </div>
        <span className="font-medium text-gray-700 truncate">{t("hero.actions.sell")}</span>
      </Link>
      <Link
        href={`/${locale}/send-parcel`}
        className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors flex-1"
      >
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
          <Package className="w-5 h-5 text-blue-600" />
        </div>
        <span className="font-medium text-gray-700 truncate">{t("hero.actions.sendPackages")}</span>
      </Link>
    </div>
  );
}

function QuickActionsSidebar() {
  return (
    <div className="flex flex-col gap-3 h-full min-w-0 overflow-hidden">
      <AccountCard />
      <SupportCard />
      <QuickActionsCard />
    </div>
  );
}

// ============================================
// MIDDLE COLUMN: Hero Slider Only
// ============================================
function MiddleColumn() {
  return (
    <div className="h-full w-full overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="relative w-full h-full overflow-hidden bg-neutral-50">
        <HeroSlider />
      </div>
    </div>
  );
}

// ============================================
// MOBILE LAYOUT COMPONENTS
// ============================================
function MobileQuickActions() {
  const t = useTranslations();
  const locale = useLocale();
  const { isLoggedIn } = useAuth();

  return (
    <div className="lg:hidden space-y-3 mt-4">
      {/* Account + Support row */}
      <div className="grid grid-cols-2 gap-3">
        {isLoggedIn ? (
          <Link
            href={`/${locale}/account`}
            className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <User className="w-5 h-5 text-jemo-orange shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">{t("hero.account.myAccount")}</span>
          </Link>
        ) : (
          <Link
            href={`/${locale}/login`}
            className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <LogIn className="w-5 h-5 text-jemo-orange shrink-0" />
            <span className="text-sm font-medium text-gray-700 truncate">{t("hero.account.login")}</span>
          </Link>
        )}
        <a
          href={`tel:${SUPPORT_PHONE}`}
          className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <Headphones className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">{t("hero.support.title")}</span>
        </a>
      </div>

      {/* Actions row */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href={`/${locale}/account/vendor/apply`}
          className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <Store className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">{t("hero.actions.sell")}</span>
        </Link>
        <Link
          href={`/${locale}/send-parcel`}
          className="flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <Package className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">{t("hero.actions.sendPackages")}</span>
        </Link>
      </div>
    </div>
  );
}

function MobileMiddleColumn() {
  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Hero slider - fixed height on mobile */}
      <div className="relative h-[200px] sm:h-[260px] overflow-hidden bg-neutral-50">
        <HeroSlider />
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function HomeHeroJumia() {
  const sidebarCategories = getSidebarCategories(MAX_SIDEBAR_CATEGORIES);

  return (
    <section className="bg-jemo-orange py-4">
      {/* Use the same container-main as header for consistent width */}
      <div className="container-main">
        {/* Desktop: 3-column grid with fixed height */}
        <div className="hidden lg:grid lg:grid-cols-[260px_1fr_280px] gap-4 items-stretch h-[440px]">
          <CategoriesSidebar categories={sidebarCategories} />
          <div className="min-w-0 overflow-hidden">
            <MiddleColumn />
          </div>
          <QuickActionsSidebar />
        </div>

        {/* Mobile/Tablet: Stacked layout */}
        <div className="lg:hidden">
          <MobileMiddleColumn />
        </div>

        <MobileQuickActions />
      </div>
    </section>
  );
}
