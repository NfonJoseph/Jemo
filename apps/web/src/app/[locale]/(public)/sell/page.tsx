"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import {
  Rocket,
  CreditCard,
  Package,
  Shield,
  UserPlus,
  ShoppingBag,
  Bell,
  Truck,
  Wallet,
  CheckCircle,
  ArrowRight,
  Store,
  Home,
  Users,
  Building,
  Briefcase,
  Headphones,
  MessageCircle,
  AlertCircle,
  Lock,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronRight,
} from "lucide-react";

export default function SellPage() {
  const locale = useLocale();
  const t = useTranslations("sell");

  const benefits = [
    {
      icon: Rocket,
      title: t("benefits.reach.title"),
      description: t("benefits.reach.description"),
      color: "bg-blue-500",
    },
    {
      icon: CreditCard,
      title: t("benefits.payment.title"),
      description: t("benefits.payment.description"),
      color: "bg-green-500",
    },
    {
      icon: Package,
      title: t("benefits.delivery.title"),
      description: t("benefits.delivery.description"),
      color: "bg-purple-500",
    },
    {
      icon: Shield,
      title: t("benefits.secure.title"),
      description: t("benefits.secure.description"),
      color: "bg-orange-500",
    },
  ];

  const steps = [
    {
      number: "1",
      icon: UserPlus,
      title: t("steps.register.title"),
      description: t("steps.register.description"),
    },
    {
      number: "2",
      icon: ShoppingBag,
      title: t("steps.products.title"),
      description: t("steps.products.description"),
    },
    {
      number: "3",
      icon: Bell,
      title: t("steps.orders.title"),
      description: t("steps.orders.description"),
    },
    {
      number: "4",
      icon: Truck,
      title: t("steps.deliver.title"),
      description: t("steps.deliver.description"),
    },
    {
      number: "5",
      icon: Wallet,
      title: t("steps.paid.title"),
      description: t("steps.paid.description"),
    },
  ];

  const orderStatuses = [
    { label: t("orderStatus.pending"), color: "bg-yellow-100 text-yellow-800" },
    { label: t("orderStatus.confirmed"), color: "bg-blue-100 text-blue-800" },
    { label: t("orderStatus.inTransit"), color: "bg-purple-100 text-purple-800" },
    { label: t("orderStatus.completed"), color: "bg-green-100 text-green-800" },
    { label: t("orderStatus.cancelled"), color: "bg-red-100 text-red-800" },
  ];

  const sellerTypes = [
    { icon: Store, label: t("sellerTypes.retail") },
    { icon: TrendingUp, label: t("sellerTypes.online") },
    { icon: Home, label: t("sellerTypes.home") },
    { icon: Users, label: t("sellerTypes.wholesalers") },
    { icon: Building, label: t("sellerTypes.distributors") },
    { icon: Briefcase, label: t("sellerTypes.entrepreneurs") },
  ];

  const supportFeatures = [
    { icon: Headphones, label: t("support.vendorSupport") },
    { icon: AlertCircle, label: t("support.disputeResolution") },
    { icon: Truck, label: t("support.deliveryIssues") },
    { icon: MessageCircle, label: t("support.secureComms") },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-jemo-orange via-orange-500 to-orange-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {t("hero.title")}
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-4">
              {t("hero.subtitle")}
            </p>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-jemo-orange hover:bg-gray-100 font-semibold text-lg px-8"
              >
                <Link href={`/${locale}/account/vendor/apply`}>
                  {t("hero.cta")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 font-semibold text-lg px-8"
              >
                <Link href={`/${locale}/products`}>
                  {t("hero.browseProducts")}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      {/* Why Sell on Jemo */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("whySell.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("whySell.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group"
              >
                <div
                  className={`${benefit.color} w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}
                >
                  <benefit.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-main">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("howItWorks.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative flex gap-6 pb-12 last:pb-0">
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-7 top-16 w-0.5 h-[calc(100%-4rem)] bg-gradient-to-b from-jemo-orange to-orange-300" />
                )}
                
                {/* Step number */}
                <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-jemo-orange to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {step.number}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <step.icon className="w-6 h-6 text-jemo-orange" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vendor Wallet Section */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Wallet className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {t("wallet.title")}
                </h2>
              </div>
              
              <p className="text-lg text-gray-600 mb-8">
                {t("wallet.description")}
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{t("wallet.credited")}</h4>
                    <p className="text-gray-600 text-sm">{t("wallet.creditedDesc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <Clock className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{t("wallet.pending")}</h4>
                    <p className="text-gray-600 text-sm">{t("wallet.pendingDesc")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <Lock className="w-6 h-6 text-purple-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{t("wallet.secure")}</h4>
                    <p className="text-gray-600 text-sm">{t("wallet.secureDesc")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <h3 className="text-2xl font-bold mb-6">{t("wallet.secureRelease.title")}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-200" />
                    <span>{t("wallet.secureRelease.step1")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-200" />
                    <span>{t("wallet.secureRelease.step2")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-200" />
                    <span>{t("wallet.secureRelease.step3")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Management */}
      <section className="py-20 bg-gray-50">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("orderManagement.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("orderManagement.subtitle")}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-3xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
              {t("orderManagement.statusFlow")}
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {orderStatuses.map((status, index) => (
                <div key={index} className="flex items-center">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  {index < orderStatuses.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-gray-400 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Options */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("deliveryOptions.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Self Delivery */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border-2 border-blue-200">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-500 rounded-xl">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {t("deliveryOptions.self.title")}
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span>{t("deliveryOptions.self.point1")}</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span>{t("deliveryOptions.self.point2")}</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <span>{t("deliveryOptions.self.point3")}</span>
                </li>
              </ul>
            </div>

            {/* Jemo Delivery */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-8 border-2 border-orange-200">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-jemo-orange rounded-xl">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {t("deliveryOptions.jemo.title")}
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-jemo-orange" />
                  <span>{t("deliveryOptions.jemo.point1")}</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-jemo-orange" />
                  <span>{t("deliveryOptions.jemo.point2")}</span>
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <CheckCircle className="w-5 h-5 text-jemo-orange" />
                  <span>{t("deliveryOptions.jemo.point3")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who Can Sell */}
      <section className="py-20 bg-gray-50">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("whoCanSell.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("whoCanSell.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {sellerTypes.map((type, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md hover:border-jemo-orange/30 transition-all"
              >
                <type.icon className="w-10 h-10 text-jemo-orange mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">{type.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {t("support.title")}
                </h2>
                <p className="text-gray-300 text-lg mb-6">
                  {t("support.description")}
                </p>
                <p className="text-xl font-semibold text-jemo-orange">
                  {t("support.tagline")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {supportFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3"
                  >
                    <feature.icon className="w-6 h-6 text-jemo-orange" />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-jemo-orange to-orange-600 text-white">
        <div className="container-main text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {t("cta.description")}
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-jemo-orange hover:bg-gray-100 font-semibold text-lg px-10 py-6"
          >
            <Link href={`/${locale}/account/vendor/apply`}>
              {t("cta.button")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <p className="mt-6 text-lg text-white/80 font-medium italic">
            {t("cta.tagline")}
          </p>
        </div>
      </section>
    </div>
  );
}
