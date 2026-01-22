"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Store,
  Truck,
  CreditCard,
  Package,
  Target,
  Globe,
  Shield,
  CheckCircle,
  Users,
  Briefcase,
  MapPin,
  Smartphone,
  Clock,
  Eye,
  Heart,
  ArrowRight,
  Zap,
  HandshakeIcon,
  TrendingUp,
  PackageCheck,
} from "lucide-react";

export default function AboutPage() {
  const locale = useLocale();
  const t = useTranslations("about");

  const whatWeDo = [
    {
      icon: ShoppingBag,
      label: t("whatWeDo.marketplace"),
      color: "bg-blue-500",
    },
    {
      icon: Store,
      label: t("whatWeDo.vendorTools"),
      color: "bg-purple-500",
    },
    {
      icon: Truck,
      label: t("whatWeDo.delivery"),
      color: "bg-green-500",
    },
    {
      icon: CreditCard,
      label: t("whatWeDo.payments"),
      color: "bg-orange-500",
    },
    {
      icon: Package,
      label: t("whatWeDo.sendPackage"),
      color: "bg-pink-500",
    },
  ];

  const localFeatures = [
    { icon: Smartphone, label: t("builtForCameroon.payOnDelivery") },
    { icon: CreditCard, label: t("builtForCameroon.mobileMoney") },
    { icon: MapPin, label: t("builtForCameroon.localPricing") },
    { icon: Truck, label: t("builtForCameroon.cityLogistics") },
  ];

  const securityFeatures = [
    t("secure.feature1"),
    t("secure.feature2"),
    t("secure.feature3"),
    t("secure.feature4"),
  ];

  const vendorBenefits = [
    t("empowering.benefit1"),
    t("empowering.benefit2"),
    t("empowering.benefit3"),
    t("empowering.benefit4"),
    t("empowering.benefit5"),
  ];

  const deliveryBenefits = [
    t("delivery.benefit1"),
    t("delivery.benefit2"),
    t("delivery.benefit3"),
    t("delivery.benefit4"),
  ];

  const whyChoose = [
    t("whyChoose.reason1"),
    t("whyChoose.reason2"),
    t("whyChoose.reason3"),
    t("whyChoose.reason4"),
    t("whyChoose.reason5"),
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-jemo-orange/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-jemo-orange">
              {t("hero.title")}
            </h1>
            <p className="text-xl md:text-2xl text-jemo-orange font-semibold mb-4">
              {t("hero.subtitle")}
            </p>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t("hero.description")}
            </p>
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

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="p-4 bg-jemo-orange/10 rounded-2xl">
                <Target className="w-10 h-10 text-jemo-orange" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {t("mission.title")}
              </h2>
            </div>
            <p className="text-xl text-gray-600 text-center leading-relaxed mb-6">
              {t("mission.description")}
            </p>
            <p className="text-lg text-gray-500 text-center italic">
              {t("mission.belief")}
            </p>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("whatWeDo.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("whatWeDo.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {whatWeDo.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-lg hover:border-jemo-orange/30 transition-all group"
              >
                <div
                  className={`${item.color} w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}
                >
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">{item.label}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-lg font-semibold text-jemo-orange mt-8">
            {t("whatWeDo.allInOne")}
          </p>
        </div>
      </section>

      {/* Built for Cameroon */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Globe className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {t("builtForCameroon.title")}
                </h2>
              </div>
              
              <p className="text-lg text-gray-600 mb-6">
                {t("builtForCameroon.description")}
              </p>

              <div className="space-y-3 mb-8">
                <p className="font-medium text-gray-800">{t("builtForCameroon.weUnderstand")}</p>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {t("builtForCameroon.understand1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {t("builtForCameroon.understand2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {t("builtForCameroon.understand3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {t("builtForCameroon.understand4")}
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-6">{t("builtForCameroon.supports")}</h3>
              <div className="grid grid-cols-2 gap-4">
                {localFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3"
                  >
                    <feature.icon className="w-6 h-6 text-green-200" />
                    <span className="text-sm font-medium">{feature.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Secure & Transparent */}
      <section className="py-20 bg-gray-50">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 mb-4">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t("secure.title")}
              </h2>
              <p className="text-lg text-gray-600">
                {t("secure.subtitle")}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {securityFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
                >
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-gray-700 font-medium">{feature}</p>
                </div>
              ))}
            </div>

            <p className="text-center text-lg text-gray-600 mt-8">
              {t("secure.fairness")}
            </p>
          </div>
        </div>
      </section>

      {/* Empowering Local Businesses */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">{t("empowering.vendorGets")}</h3>
                <div className="space-y-3">
                  {vendorBenefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-200 flex-shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-purple-200 font-medium">
                  {t("empowering.noBarriers")}
                </p>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Briefcase className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {t("empowering.title")}
                </h2>
              </div>
              
              <p className="text-lg text-gray-600 mb-4">
                {t("empowering.description")}
              </p>
              <p className="text-lg text-gray-600">
                {t("empowering.backbone")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reliable Delivery Network */}
      <section className="py-20 bg-gray-50">
        <div className="container-main">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <Truck className="w-10 h-10 text-jemo-orange" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("delivery.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("delivery.subtitle")}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {deliveryBenefits.map((benefit, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-jemo-orange/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  {index === 0 && <Zap className="w-6 h-6 text-jemo-orange" />}
                  {index === 1 && <CreditCard className="w-6 h-6 text-jemo-orange" />}
                  {index === 2 && <Clock className="w-6 h-6 text-jemo-orange" />}
                  {index === 3 && <PackageCheck className="w-6 h-6 text-jemo-orange" />}
                </div>
                <p className="text-gray-700 font-medium">{benefit}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-lg text-gray-600 mt-8">
            {t("delivery.conclusion")}
          </p>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 bg-gradient-to-r from-jemo-orange to-orange-600 text-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <Eye className="w-12 h-12 mx-auto mb-6 text-white/80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("vision.title")}
            </h2>
            <p className="text-xl text-white/90 leading-relaxed">
              {t("vision.description")}
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose Jemo */}
      <section className="py-20 bg-white">
        <div className="container-main">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("whyChoose.title")}
            </h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid sm:grid-cols-2 gap-4">
              {whyChoose.map((reason, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl"
                >
                  <CheckCircle className="w-6 h-6 text-jemo-orange flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{reason}</span>
                </div>
              ))}
            </div>
            
            <p className="text-center text-lg font-semibold text-gray-800 mt-8">
              {t("whyChoose.ecosystem")}
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container-main text-center">
          <div className="flex justify-center gap-4 mb-6">
            <Heart className="w-8 h-8 text-jemo-orange" />
            <Users className="w-8 h-8 text-blue-400" />
            <HandshakeIcon className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {t("cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-jemo-orange hover:bg-jemo-orange/90 font-semibold text-lg px-8"
            >
              <Link href={`/${locale}/products`}>
                {t("cta.browse")}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 font-semibold text-lg px-8"
            >
              <Link href={`/${locale}/sell`}>
                {t("cta.startSelling")}
              </Link>
            </Button>
          </div>
          <p className="mt-8 text-xl font-semibold text-jemo-orange italic">
            {t("cta.tagline")}
          </p>
        </div>
      </section>
    </div>
  );
}
