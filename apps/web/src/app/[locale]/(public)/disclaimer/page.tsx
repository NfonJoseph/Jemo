"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import {
  AlertCircle,
  Info,
  Store,
  Package,
  FileWarning,
  ExternalLink,
  ShieldX,
  AlertTriangle,
  UserX,
  FileEdit,
  Phone,
  Mail,
  Globe,
  CheckCircle,
} from "lucide-react";

export default function DisclaimerPage() {
  const locale = useLocale();
  const t = useTranslations("disclaimer");

  const marketplacePoints = [
    t("marketplace.point1"),
    t("marketplace.point2"),
    t("marketplace.point3"),
    t("marketplace.point4"),
  ];

  const productPoints = [
    t("product.point1"),
    t("product.point2"),
    t("product.point3"),
    t("product.point4"),
  ];

  const accuracyPoints = [
    t("accuracy.point1"),
    t("accuracy.point2"),
    t("accuracy.point3"),
  ];

  const warrantyPoints = [
    t("warranty.point1"),
    t("warranty.point2"),
    t("warranty.point3"),
    t("warranty.point4"),
  ];

  const userResponsibilities = [
    t("user.responsibility1"),
    t("user.responsibility2"),
    t("user.responsibility3"),
    t("user.responsibility4"),
    t("user.responsibility5"),
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white overflow-hidden pb-16">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-6">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-jemo-orange">
              {t("hero.title")}
            </h1>
            <p className="text-sm text-gray-400 mb-4">
              {t("hero.lastUpdated")}
            </p>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </div>
        </div>
      </section>
      
      {/* Wave divider */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 -mt-16">
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

            {/* Important Notice */}
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h2 className="font-bold text-amber-800 mb-2">{t("notice.title")}</h2>
                  <p className="text-amber-700">{t("notice.content")}</p>
                </div>
              </div>
            </div>

            {/* Section 1: General Disclaimer */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Info className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("general.title")}
                </h2>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-gray-600 mb-4">{t("general.desc1")}</p>
                <p className="text-gray-600">{t("general.desc2")}</p>
              </div>
            </section>

            {/* Section 2: Marketplace Nature */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Store className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("marketplace.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("marketplace.subtitle")}</p>
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-100">
                <ul className="space-y-3">
                  {marketplacePoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 3: Product Liability */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("product.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("product.subtitle")}</p>
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-100">
                <ul className="space-y-3">
                  {productPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 4: Accuracy of Information */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-teal-100 rounded-xl">
                  <FileWarning className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("accuracy.title")}
                </h2>
              </div>
              <div className="bg-teal-50 rounded-xl p-6 border border-teal-100">
                <ul className="space-y-3">
                  {accuracyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <Info className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-gray-600 italic">{t("accuracy.note")}</p>
              </div>
            </section>

            {/* Section 5: Third-Party Links */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <ExternalLink className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("thirdParty.title")}
                </h2>
              </div>
              <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                <p className="text-gray-600 mb-4">{t("thirdParty.desc1")}</p>
                <p className="text-gray-600 mb-4">{t("thirdParty.desc2")}</p>
                <p className="text-gray-600">{t("thirdParty.desc3")}</p>
              </div>
            </section>

            {/* Section 6: No Warranties */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-xl">
                  <ShieldX className="w-6 h-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("warranty.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("warranty.subtitle")}</p>
              <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                <ul className="space-y-3">
                  {warrantyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <ShieldX className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 7: Limitation of Liability */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-gray-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("liability.title")}
                </h2>
              </div>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <p className="text-gray-600 mb-4">{t("liability.desc1")}</p>
                <p className="text-gray-600 mb-4">{t("liability.desc2")}</p>
                <p className="text-gray-700 font-medium">{t("liability.note")}</p>
              </div>
            </section>

            {/* Section 8: User Responsibility */}
            <section className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <UserX className="w-6 h-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("user.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("user.subtitle")}</p>
              <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                <ul className="space-y-3">
                  {userResponsibilities.map((resp, index) => (
                    <li key={index} className="flex items-start gap-3 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 9: Changes to Disclaimer */}
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
                <p className="text-gray-600 mb-2">{t("changes.desc2")}</p>
                <p className="text-gray-600 font-medium">{t("changes.note")}</p>
              </div>
            </section>

            {/* Related Policies */}
            <section className="mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("related.title")}</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <Link
                  href={`/${locale}/terms`}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-jemo-orange hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <FileWarning className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="font-medium text-gray-700">{t("related.terms")}</span>
                </Link>
                <Link
                  href={`/${locale}/privacy`}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-jemo-orange hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <FileWarning className="w-5 h-5 text-slate-600" />
                  </div>
                  <span className="font-medium text-gray-700">{t("related.privacy")}</span>
                </Link>
                <Link
                  href={`/${locale}/returns`}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-jemo-orange hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <FileWarning className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="font-medium text-gray-700">{t("related.returns")}</span>
                </Link>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("contact.title")}
            </h2>
            <p className="text-lg text-gray-300 mb-8">
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
