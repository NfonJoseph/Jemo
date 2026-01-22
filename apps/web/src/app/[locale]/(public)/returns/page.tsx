"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import {
  RotateCcw,
  AlertTriangle,
  Package,
  Ban,
  FileText,
  CheckCircle,
  CreditCard,
  Shield,
  Scale,
  Store,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  Camera,
  ArrowRight,
  Info,
} from "lucide-react";

export default function ReturnsPage() {
  const locale = useLocale();
  const t = useTranslations("returns");

  const eligibleReasons = [
    t("eligible.reason1"),
    t("eligible.reason2"),
    t("eligible.reason3"),
    t("eligible.reason4"),
  ];

  const nonReturnableItems = [
    t("nonReturnable.item1"),
    t("nonReturnable.item2"),
    t("nonReturnable.item3"),
    t("nonReturnable.item4"),
    t("nonReturnable.item5"),
  ];

  const returnSteps = [
    t("howTo.step1"),
    t("howTo.step2"),
    t("howTo.step3"),
    t("howTo.step4"),
    t("howTo.step5"),
  ];

  const sellerVariations = [
    t("sellerPolicy.variation1"),
    t("sellerPolicy.variation2"),
    t("sellerPolicy.variation3"),
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 text-white overflow-hidden pb-16">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6">
              <RotateCcw className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-jemo-orange">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-teal-100 mb-4 font-semibold">
              {t("hero.subtitle")}
            </p>
            <p className="text-base text-teal-200 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </div>
        </div>
      </section>
      
      {/* Wave divider */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 -mt-16">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Content Sections */}
      <div className="py-12 bg-white">
        <div className="container-main">
          <div className="max-w-4xl mx-auto space-y-12">

            {/* Section 1: Marketplace Disclaimer */}
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
                  <Info className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {t("disclaimer.title")}
                  </h2>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      {t("disclaimer.point1")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      {t("disclaimer.point2")}
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      {t("disclaimer.point3")}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2: Eligible Reasons */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("eligible.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("eligible.subtitle")}</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <ul className="space-y-3">
                  {eligibleReasons.map((reason, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-800 font-medium">{t("eligible.warning")}</p>
                </div>
              </div>
            </section>

            {/* Section 3: Non-Returnable Items */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Ban className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("nonReturnable.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("nonReturnable.subtitle")}</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <ul className="space-y-3">
                  {nonReturnableItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-700">
                      <Ban className="w-5 h-5 text-red-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Section 4: How to Request a Return */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("howTo.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("howTo.subtitle")}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="space-y-4">
                  {returnSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 pt-1">{step}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-gray-600 italic">{t("howTo.note")}</p>
              </div>
            </section>

            {/* Section 5: Return Approval */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Package className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("approval.title")}
                </h2>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    {t("approval.point1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    {t("approval.point2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    {t("approval.point3")}
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">{t("approval.warning")}</p>
                </div>
              </div>
            </section>

            {/* Section 6: Refund Policy */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CreditCard className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("refund.title")}
                </h2>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    {t("refund.point1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    {t("refund.point2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    {t("refund.point3")}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 7: After-Sales Support */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Shield className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("afterSales.title")}
                </h2>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    {t("afterSales.point1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    {t("afterSales.point2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    {t("afterSales.point3")}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 8: Dispute Resolution */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Scale className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("dispute.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("dispute.subtitle")}</p>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    {t("dispute.point1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    {t("dispute.point2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    {t("dispute.point3")}
                  </li>
                </ul>
              </div>
            </section>

            {/* Section 9: Seller Policy Variations */}
            <section>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Store className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("sellerPolicy.title")}
                </h2>
              </div>
              <p className="text-gray-600 mb-4">{t("sellerPolicy.subtitle")}</p>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <ul className="space-y-3">
                  {sellerVariations.map((variation, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-700">
                      <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      {variation}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-gray-600 italic">{t("sellerPolicy.note")}</p>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Contact Section */}
      <section className="py-16 bg-gradient-to-r from-jemo-orange to-orange-600 text-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("contact.title")}
            </h2>
            <p className="text-xl text-white/90 mb-8">
              {t("contact.subtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="tel:+237682310407"
                className="flex items-center gap-3 bg-white/20 hover:bg-white/30 backdrop-blur px-6 py-4 rounded-xl transition-colors"
              >
                <Phone className="w-6 h-6" />
                <span className="font-semibold">+237 682 310 407</span>
              </a>
              <a
                href="mailto:support@jemo.cm"
                className="flex items-center gap-3 bg-white/20 hover:bg-white/30 backdrop-blur px-6 py-4 rounded-xl transition-colors"
              >
                <Mail className="w-6 h-6" />
                <span className="font-semibold">support@jemo.cm</span>
              </a>
              <div className="flex items-center gap-3 bg-white/20 px-6 py-4 rounded-xl">
                <MessageCircle className="w-6 h-6" />
                <span className="font-semibold">{t("contact.liveChat")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
