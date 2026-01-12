"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import { categories } from "@/config/categories";
import {
  socialLinks,
  contactInfo,
  countriesOperate,
  sellOnJemoLinks,
  shoppingGuideLinks,
  helpCenterLinks,
  aboutLinks,
  faqTags,
  benefitsItems,
  appStoreLinks,
} from "@/config/footer";
import {
  Gift,
  Truck,
  Shield,
  CheckCircle,
  Headphones,
  Smartphone,
  Facebook,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Max categories to display in footer
const MAX_FOOTER_CATEGORIES = 10;

// Icon mapping for benefits
const benefitIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  gift: Gift,
  truck: Truck,
  shield: Shield,
  check: CheckCircle,
  headphones: Headphones,
  smartphone: Smartphone,
};

// ============================================
// TIER 1: Benefits Row
// ============================================
function BenefitsRow() {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 py-6">
      {benefitsItems.map((item, index) => {
        const Icon = benefitIcons[item.iconKey] || Gift;
        return (
          <div key={index} className="flex flex-col items-center text-center p-3">
            <Icon className="w-8 h-8 text-gray-500 mb-2" />
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {t(item.titleKey)}
            </h4>
            <p className="text-xs text-gray-500 leading-tight">
              {t(item.descKey)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// TIER 1: Subscription Column
// ============================================
function SubscriptionColumn() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubscribing(true);
    // TODO: Implement actual subscription API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setEmail("");
    setIsSubscribing(false);
    // TODO: Show success toast
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900">
        {t("footer.subscription")}
      </h3>
      
      <form onSubmit={handleSubscribe} className="flex">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("footer.emailPlaceholder")}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
          aria-label={t("footer.emailPlaceholder")}
          required
        />
        <Button
          type="submit"
          disabled={isSubscribing}
          className="rounded-l-none bg-jemo-orange hover:bg-jemo-orange/90 text-white px-4"
        >
          {t("footer.subscribe")}
        </Button>
      </form>
      
      <p className="text-xs text-gray-500">
        {t("footer.subscribeHelper")}
      </p>

      {/* Stay Connected */}
      <div className="pt-2">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          {t("footer.stayConnected")}
        </h4>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Facebook */}
          <a
            href={socialLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 bg-blue-600 rounded-md flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5" />
          </a>
          
          {/* WhatsApp */}
          <a
            href={socialLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-500 rounded-md text-green-600 hover:bg-green-50 transition-colors"
            aria-label="WhatsApp"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-sm font-medium">WhatsApp</span>
          </a>
          
          {/* Live Chat */}
          <button
            onClick={() => {
              // TODO: Open live chat widget
              console.log("Open live chat");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-jemo-orange text-white rounded-md hover:bg-jemo-orange/90 transition-colors"
            aria-label="Live Chat"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{t("footer.liveChat")}</span>
          </button>
          
          {/* Instagram */}
          <a
            href={socialLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-md flex items-center justify-center text-white hover:opacity-90 transition-opacity"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TIER 1: Link Column Component
// ============================================
interface LinkColumnProps {
  title: string;
  links: Array<{ labelKey: string; href: string }>;
}

function LinkColumn({ title, links }: LinkColumnProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-4">{title}</h3>
      <ul className="space-y-2">
        {links.map((link, index) => (
          <li key={index}>
            <Link
              href={`/${locale}${link.href}`}
              className="text-sm text-gray-600 hover:text-jemo-orange transition-colors"
            >
              {t(link.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// TIER 2: FAQ Tags
// ============================================
function FaqTags() {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="mb-6">
      <h3 className="text-base font-bold text-gray-900 mb-2">
        {t("footer.faqs")}
      </h3>
      <p className="text-sm text-gray-600">
        {faqTags.map((tag, index) => (
          <span key={index}>
            <Link
              href={`/${locale}${tag.href}`}
              className="hover:text-jemo-orange transition-colors"
            >
              {tag.label}
            </Link>
            {index < faqTags.length - 1 && ", "}
          </span>
        ))}
      </p>
    </div>
  );
}

// ============================================
// TIER 2: Browse by Category
// ============================================
function BrowseByCategory() {
  const t = useTranslations();
  const locale = useLocale();
  const displayCategories = categories.slice(0, MAX_FOOTER_CATEGORIES);

  return (
    <div className="mb-6">
      <h3 className="text-base font-bold text-gray-900 mb-2">
        {t("footer.browseByCategory")}
      </h3>
      <p className="text-sm text-gray-600">
        {displayCategories.map((cat, index) => (
          <span key={cat.id}>
            <Link
              href={`/${locale}/marketplace?category=${cat.slug}`}
              className="hover:text-jemo-orange transition-colors"
            >
              {t(cat.labelKey)}
            </Link>
            {index < displayCategories.length - 1 && ", "}
          </span>
        ))}
      </p>
    </div>
  );
}

// ============================================
// TIER 2: About JEMO
// ============================================
function AboutJemo() {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <div className="mb-6">
      <h3 className="text-base font-bold text-gray-900 mb-2">
        {t("footer.aboutJemo")}
      </h3>
      <p className="text-sm text-gray-600">
        {aboutLinks.map((link, index) => (
          <span key={index}>
            <Link
              href={`/${locale}${link.href}`}
              className="hover:text-jemo-orange transition-colors"
            >
              {t(link.labelKey)}
            </Link>
            {index < aboutLinks.length - 1 && ", "}
          </span>
        ))}
      </p>
    </div>
  );
}

// ============================================
// TIER 2: App Badges
// ============================================
function AppBadges() {
  return (
    <div className="flex items-center gap-3 mt-4">
      <a
        href={appStoreLinks.googlePlay}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
        aria-label="Download on Google Play"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
        </svg>
        <span className="font-medium">Google Play</span>
      </a>
      <a
        href={appStoreLinks.appStore}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors text-sm"
        aria-label="Download on App Store"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        <span className="font-medium">App Store</span>
      </a>
    </div>
  );
}

// ============================================
// TIER 2: Countries We Operate
// ============================================
function CountriesWeOperate() {
  const t = useTranslations();

  return (
    <div className="mb-6">
      <h3 className="text-base font-bold text-gray-900 mb-2">
        {t("footer.countriesWeOperate")}
      </h3>
      <p className="text-sm text-gray-600">
        {countriesOperate.join(", ")}
      </p>
    </div>
  );
}

// ============================================
// TIER 2: Contact Us
// ============================================
function ContactUs() {
  const t = useTranslations();

  return (
    <div>
      <h3 className="text-base font-bold text-gray-900 mb-3">
        {t("footer.contactUs")}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-3">
          <span className="text-gray-500 w-16 flex-shrink-0">{t("footer.address")}:</span>
          <span className="text-gray-700">{contactInfo.address}</span>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-gray-500 w-16 flex-shrink-0">{t("footer.phone")}:</span>
          <a 
            href={`tel:${contactInfo.supportPhoneRaw}`}
            className="text-gray-700 hover:text-jemo-orange transition-colors"
          >
            {contactInfo.supportPhone}
          </a>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-gray-500 w-16 flex-shrink-0">{t("footer.email")}:</span>
          <a 
            href={`mailto:${contactInfo.email}`}
            className="text-gray-700 hover:text-jemo-orange transition-colors"
          >
            {contactInfo.email}
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN FOOTER COMPONENT
// ============================================
export function Footer() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto">
      {/* ====== TIER 1: White Background ====== */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4">
          {/* Benefits Row */}
          <BenefitsRow />

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* 4-Column Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-8">
            {/* Column 1: Subscription + Social */}
            <SubscriptionColumn />

            {/* Column 2: Sell on Jemo */}
            <LinkColumn
              title={t("footer.sellOnJemo")}
              links={sellOnJemoLinks}
            />

            {/* Column 3: Shopping Guide */}
            <LinkColumn
              title={t("footer.shoppingGuide")}
              links={shoppingGuideLinks}
            />

            {/* Column 4: Help Center */}
            <LinkColumn
              title={t("footer.helpCenter")}
              links={helpCenterLinks}
            />
          </div>
        </div>
      </div>

      {/* ====== TIER 2: Light Gray Background ====== */}
      <div className="bg-gray-100 border-t border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side */}
            <div>
              <FaqTags />
              <BrowseByCategory />
              <AboutJemo />
              <AppBadges />
            </div>

            {/* Right Side */}
            <div>
              <CountriesWeOperate />
              <ContactUs />
            </div>
          </div>
        </div>
      </div>

      {/* ====== BOTTOM BAR: Copyright ====== */}
      <div className="bg-gray-200 border-t border-gray-300">
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <p className="text-center text-sm text-gray-600">
            © {currentYear} JEMO. {t("footer.allRightsReserved")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
