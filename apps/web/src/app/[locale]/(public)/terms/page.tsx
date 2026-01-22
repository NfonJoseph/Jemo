"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import {
  FileText,
  Building,
  UserCheck,
  User,
  Store,
  ShoppingCart,
  Truck,
  RotateCcw,
  Copyright,
  Ban,
  AlertTriangle,
  Shield,
  FileEdit,
  Scale,
  Phone,
  Mail,
  Globe,
} from "lucide-react";

export default function TermsPage() {
  const locale = useLocale();
  const t = useTranslations("terms");

  const eligibilityRequirements = [
    t("eligibility.req1"),
    t("eligibility.req2"),
    t("eligibility.req3"),
  ];

  const vendorObligations = [
    t("vendors.obligation1"),
    t("vendors.obligation2"),
    t("vendors.obligation3"),
    t("vendors.obligation4"),
  ];

  const orderPoints = [
    t("orders.point1"),
    t("orders.point2"),
    t("orders.point3"),
    t("orders.point4"),
  ];

  const shippingPoints = [
    t("shipping.point1"),
    t("shipping.point2"),
    t("shipping.point3"),
  ];

  const prohibitedActivities = [
    t("prohibited.activity1"),
    t("prohibited.activity2"),
    t("prohibited.activity3"),
    t("prohibited.activity4"),
  ];

  const liabilityPoints = [
    t("liability.point1"),
    t("liability.point2"),
  ];

  const indemnifyPoints = [
    t("indemnity.point1"),
    t("indemnity.point2"),
    t("indemnity.point3"),
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white overflow-hidden pb-16">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-jemo-orange">
              {t("hero.title")}
            </h1>
            <p className="text-sm text-indigo-300 mb-4">
              {t("hero.lastUpdated")}
            </p>
            <p className="text-lg text-indigo-200 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </div>
        </div>
      </section>
      
      {/* Wave divider */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 -mt-16">
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
              <p className="text-gray-600 leading-relaxed">{t("hero.intro")}</p>
              <p className="text-gray-600 font-medium">{t("hero.warning")}</p>
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

            {/* Section 2: Eligibility */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("eligibility.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("eligibility.subtitle")}</p>
              <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                <ul className="space-y-3">
                  {eligibilityRequirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2" />
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-gray-600 italic">{t("eligibility.note")}</p>
            </section>

            {/* Section 3: User Accounts */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <User className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("accounts.title")}
                </h2>
              </div>
              
              <div className="space-y-4">
                {/* Registration */}
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                  <h3 className="font-bold text-gray-900 mb-3">{t("accounts.registration.title")}</h3>
                  <p className="text-gray-600 mb-3">{t("accounts.registration.desc")}</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      {t("accounts.registration.point1")}
                    </li>
                    <li className="flex items-center gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      {t("accounts.registration.point2")}
                    </li>
                  </ul>
                </div>

                {/* Termination */}
                <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                  <h3 className="font-bold text-gray-900 mb-3">{t("accounts.termination.title")}</h3>
                  <p className="text-gray-600 mb-3">{t("accounts.termination.desc")}</p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {t("accounts.termination.reason1")}
                    </li>
                    <li className="flex items-center gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {t("accounts.termination.reason2")}
                    </li>
                    <li className="flex items-center gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {t("accounts.termination.reason3")}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 4: Vendors */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Store className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("vendors.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("vendors.subtitle")}</p>
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                <ul className="space-y-3">
                  {vendorObligations.map((obligation, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      {obligation}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-gray-600 italic">{t("vendors.note")}</p>
            </section>

            {/* Section 5: Orders and Payments */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-teal-100 rounded-xl">
                  <ShoppingCart className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("orders.title")}
                </h2>
              </div>
              <div className="bg-teal-50 rounded-xl p-6 border border-teal-100">
                <ul className="space-y-3">
                  {orderPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-teal-500 mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-gray-600">{t("orders.note")}</p>
            </section>

            {/* Section 6: Shipping */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("shipping.title")}
                </h2>
              </div>
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <ul className="space-y-3">
                  {shippingPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-500 mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 7: Returns */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <RotateCcw className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("returns.title")}
                </h2>
              </div>
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                <p className="text-gray-600 mb-4">{t("returns.desc1")}</p>
                <p className="text-gray-600 mb-4">{t("returns.desc2")}</p>
                <Link
                  href={`/${locale}/returns`}
                  className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-800 font-medium"
                >
                  {t("returns.link")} →
                </Link>
              </div>
            </section>

            {/* Section 8: Intellectual Property */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Copyright className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("ip.title")}
                </h2>
              </div>
              <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                <p className="text-gray-600 mb-4">{t("ip.desc1")}</p>
                <p className="text-gray-600">{t("ip.desc2")}</p>
              </div>
            </section>

            {/* Section 9: Prohibited Activities */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Ban className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("prohibited.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("prohibited.subtitle")}</p>
              <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                <ul className="space-y-3">
                  {prohibitedActivities.map((activity, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-700">
                      <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-red-600 font-medium">{t("prohibited.warning")}</p>
            </section>

            {/* Section 10: Limitation of Liability */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("liability.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("liability.subtitle")}</p>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <ul className="space-y-3">
                  {liabilityPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-gray-500 mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-4 text-gray-600 font-medium">{t("liability.note")}</p>
            </section>

            {/* Section 11: Indemnification */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("indemnity.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("indemnity.subtitle")}</p>
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                <ul className="space-y-3">
                  {indemnifyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-500 mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 12: Changes */}
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
                <p className="text-gray-600 mb-2">{t("changes.desc1")}</p>
                <p className="text-gray-600">{t("changes.desc2")}</p>
              </div>
            </section>

            {/* Section 13: Governing Law */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Scale className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("law.title")}
                </h2>
              </div>
              <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                <p className="text-gray-600">{t("law.desc")}</p>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("contact.title")}
            </h2>
            <p className="text-lg text-indigo-200 mb-8">
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
