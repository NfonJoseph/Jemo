"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import {
  Shield,
  Building,
  User,
  Database,
  Share2,
  Store,
  Cookie,
  Lock,
  UserCheck,
  ExternalLink,
  FileEdit,
  Phone,
  Mail,
  Globe,
} from "lucide-react";

export default function PrivacyPolicyPage() {
  const locale = useLocale();
  const t = useTranslations("privacy");

  const personalInfo = [
    t("collect.personal.item1"),
    t("collect.personal.item2"),
    t("collect.personal.item3"),
    t("collect.personal.item4"),
    t("collect.personal.item5"),
  ];

  const accountInfo = [
    t("collect.account.item1"),
    t("collect.account.item2"),
    t("collect.account.item3"),
  ];

  const autoInfo = [
    t("collect.auto.item1"),
    t("collect.auto.item2"),
    t("collect.auto.item3"),
    t("collect.auto.item4"),
  ];

  const usageReasons = [
    t("usage.reason1"),
    t("usage.reason2"),
    t("usage.reason3"),
    t("usage.reason4"),
    t("usage.reason5"),
    t("usage.reason6"),
    t("usage.reason7"),
  ];

  const sharingParties = [
    { title: t("sharing.party1.title"), desc: t("sharing.party1.desc") },
    { title: t("sharing.party2.title"), desc: t("sharing.party2.desc") },
    { title: t("sharing.party3.title"), desc: t("sharing.party3.desc") },
    { title: t("sharing.party4.title"), desc: t("sharing.party4.desc") },
  ];

  const vendorPoints = [
    t("vendor.point1"),
    t("vendor.point2"),
    t("vendor.point3"),
  ];

  const cookieUses = [
    t("cookies.use1"),
    t("cookies.use2"),
    t("cookies.use3"),
  ];

  const securityMeasures = [
    t("security.measure1"),
    t("security.measure2"),
    t("security.measure3"),
  ];

  const userRights = [
    t("rights.right1"),
    t("rights.right2"),
    t("rights.right3"),
    t("rights.right4"),
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white overflow-hidden pb-16">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-jemo-orange">
              {t("hero.title")}
            </h1>
            <p className="text-sm text-slate-400 mb-4">
              {t("hero.lastUpdated")}
            </p>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </div>
        </div>
      </section>
      
      {/* Wave divider */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 -mt-16">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="py-12 bg-white">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">

            {/* Intro */}
            <div className="prose prose-lg max-w-none mb-12">
              <p className="text-gray-600 leading-relaxed">
                {t("hero.intro")}
              </p>
            </div>

            {/* Section 1: About Jemo */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("about.title")}
                </h2>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-gray-600 mb-4">{t("about.desc1")}</p>
                <p className="text-gray-600">{t("about.desc2")}</p>
              </div>
            </section>

            {/* Section 2: Information We Collect */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Database className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("collect.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-6">{t("collect.subtitle")}</p>

              <div className="space-y-6">
                {/* Personal Info */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                  <h3 className="font-bold text-gray-900 mb-3">{t("collect.personal.title")}</h3>
                  <ul className="space-y-2">
                    {personalInfo.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Account Info */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="font-bold text-gray-900 mb-3">{t("collect.account.title")}</h3>
                  <ul className="space-y-2">
                    {accountInfo.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Auto Collected */}
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                  <h3 className="font-bold text-gray-900 mb-3">{t("collect.auto.title")}</h3>
                  <ul className="space-y-2">
                    {autoInfo.map((item, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-700">
                        <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-gray-500 italic">{t("collect.auto.note")}</p>
                </div>
              </div>
            </section>

            {/* Section 3: How We Use */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <User className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("usage.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("usage.subtitle")}</p>
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                <ul className="space-y-3">
                  {usageReasons.map((reason, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 4: Sharing */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Share2 className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("sharing.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4 font-medium">{t("sharing.noSell")}</p>
              <p className="text-gray-600 mb-4">{t("sharing.subtitle")}</p>
              <div className="grid md:grid-cols-2 gap-4">
                {sharingParties.map((party, index) => (
                  <div key={index} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-2">{party.title}</h3>
                    <p className="text-sm text-gray-600">{party.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-gray-600 italic">{t("sharing.note")}</p>
            </section>

            {/* Section 5: Vendor Responsibility */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Store className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("vendor.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("vendor.subtitle")}</p>
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                <ul className="space-y-3">
                  {vendorPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-500 mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-gray-600">{t("vendor.note")}</p>
            </section>

            {/* Section 6: Cookies */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Cookie className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("cookies.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("cookies.subtitle")}</p>
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                <ul className="space-y-2">
                  {cookieUses.map((use, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                      {use}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-gray-600 text-sm">{t("cookies.note")}</p>
            </section>

            {/* Section 7: Security */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-teal-100 rounded-xl">
                  <Lock className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("security.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("security.subtitle")}</p>
              <div className="bg-teal-50 rounded-xl p-6 border border-teal-100">
                <ul className="space-y-2">
                  {securityMeasures.map((measure, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <Lock className="w-4 h-4 text-teal-500" />
                      {measure}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-gray-600 text-sm italic">{t("security.note")}</p>
            </section>

            {/* Section 8: Your Rights */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("rights.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("rights.subtitle")}</p>
              <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                <ul className="space-y-2">
                  {userRights.map((right, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-700">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      {right}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-gray-600">{t("rights.note")}</p>
            </section>

            {/* Section 9: Third Party Links */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <ExternalLink className="w-6 h-6 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("thirdParty.title")}
                </h2>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <p className="text-gray-600">{t("thirdParty.desc1")}</p>
                <p className="text-gray-600 mt-2">{t("thirdParty.desc2")}</p>
              </div>
            </section>

            {/* Section 10: Changes */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileEdit className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("changes.title")}
                </h2>
              </div>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <p className="text-gray-600">{t("changes.desc1")}</p>
                <p className="text-gray-600 mt-2">{t("changes.desc2")}</p>
                <p className="text-gray-600 mt-2 font-medium">{t("changes.note")}</p>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("contact.title")}
            </h2>
            <p className="text-lg text-slate-300 mb-8">
              {t("contact.subtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="tel:+237682310407"
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur px-6 py-4 rounded-xl transition-colors"
              >
                <Phone className="w-6 h-6" />
                <span className="font-semibold">+237 682 310 407</span>
              </a>
              <a
                href="mailto:info@jemo.cm"
                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur px-6 py-4 rounded-xl transition-colors"
              >
                <Mail className="w-6 h-6" />
                <span className="font-semibold">info@jemo.cm</span>
              </a>
              <div className="flex items-center gap-3 bg-jemo-orange/20 px-6 py-4 rounded-xl">
                <Globe className="w-6 h-6 text-jemo-orange" />
                <span className="font-semibold text-jemo-orange">{t("contact.platform")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
