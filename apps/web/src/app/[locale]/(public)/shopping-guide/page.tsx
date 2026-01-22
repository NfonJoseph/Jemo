"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import {
  UserPlus,
  ShoppingCart,
  CreditCard,
  Truck,
  Star,
  Phone,
  Mail,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Clock,
  Package,
  MapPin,
  Shield,
  MessageCircle,
  ChevronRight,
} from "lucide-react";

export default function ShoppingGuidePage() {
  const locale = useLocale();
  const t = useTranslations("shoppingGuide");

  const registerSteps = [
    t("register.step1"),
    t("register.step2"),
    t("register.step3"),
    t("register.step4"),
  ];

  const orderSteps = [
    t("order.step1"),
    t("order.step2"),
    t("order.step3"),
    t("order.step4"),
    t("order.step5"),
  ];

  const paymentMethods = [
    { icon: Smartphone, label: "MTN Mobile Money", color: "bg-yellow-500" },
    { icon: Smartphone, label: "Orange Money", color: "bg-orange-500" },
    { icon: Truck, label: t("payment.pod"), color: "bg-green-500" },
  ];

  const deliveryMethods = [
    {
      icon: Package,
      title: t("delivery.methods.vendor.title"),
      description: t("delivery.methods.vendor.desc"),
    },
    {
      icon: Truck,
      title: t("delivery.methods.jemo.title"),
      description: t("delivery.methods.jemo.desc"),
    },
    {
      icon: MapPin,
      title: t("delivery.methods.pickup.title"),
      description: t("delivery.methods.pickup.desc"),
    },
  ];

  const orderStatuses = [
    { label: t("delivery.status.pending"), desc: t("delivery.status.pendingDesc"), color: "bg-yellow-100 text-yellow-800" },
    { label: t("delivery.status.confirmed"), desc: t("delivery.status.confirmedDesc"), color: "bg-blue-100 text-blue-800" },
    { label: t("delivery.status.inTransit"), desc: t("delivery.status.inTransitDesc"), color: "bg-purple-100 text-purple-800" },
    { label: t("delivery.status.completed"), desc: t("delivery.status.completedDesc"), color: "bg-green-100 text-green-800" },
    { label: t("delivery.status.cancelled"), desc: t("delivery.status.cancelledDesc"), color: "bg-red-100 text-red-800" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white overflow-hidden pb-16">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-jemo-orange">
              {t("hero.title")}
            </h1>
            <p className="text-xl text-white mb-4">
              {t("hero.subtitle")}
            </p>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="container-main relative z-10 pb-8">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#how-to-register" className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-full text-sm font-medium transition-colors">
              {t("nav.register")}
            </a>
            <a href="#how-to-order" className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-full text-sm font-medium transition-colors">
              {t("nav.order")}
            </a>
            <a href="#how-to-pay" className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-full text-sm font-medium transition-colors">
              {t("nav.pay")}
            </a>
            <a href="#delivery-info" className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-full text-sm font-medium transition-colors">
              {t("nav.delivery")}
            </a>
          </div>
        </div>
      </section>
      
      {/* Wave divider - moved outside the hero section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 -mt-16">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>

      {/* How to Register */}
      <section id="how-to-register" className="py-16 bg-white scroll-mt-20">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-green-100 rounded-2xl">
                <UserPlus className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {t("register.title")}
                </h2>
                <p className="text-gray-600">{t("register.subtitle")}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-100">
              <div className="space-y-4">
                {registerSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 pt-1">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-white rounded-xl border border-green-200">
                <p className="text-gray-600">
                  <CheckCircle className="w-5 h-5 text-green-500 inline mr-2" />
                  {t("register.note")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Place an Order */}
      <section id="how-to-order" className="py-16 bg-gray-50 scroll-mt-20">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-100 rounded-2xl">
                <ShoppingCart className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {t("order.title")}
                </h2>
                <p className="text-gray-600">{t("order.subtitle")}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="space-y-4">
                {orderSteps.map((step, index) => (
                  <div key={index} className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 pt-1">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-gray-600">
                  <ArrowRight className="w-5 h-5 text-blue-500 inline mr-2" />
                  {t("order.note")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to Pay */}
      <section id="how-to-pay" className="py-16 bg-white scroll-mt-20">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-orange-100 rounded-2xl">
                <CreditCard className="w-10 h-10 text-orange-600" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {t("payment.title")}
                </h2>
                <p className="text-gray-600">{t("payment.subtitle")}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Payment Methods */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {t("payment.methodsTitle")}
                </h3>
                <div className="space-y-3">
                  {paymentMethods.map((method, index) => (
                    <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-xl">
                      <div className={`${method.color} p-2 rounded-lg`}>
                        <method.icon className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-gray-700">{method.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How Online Payment Works */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {t("payment.howItWorks")}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <span className="text-gray-700">{t("payment.step1")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <span className="text-gray-700">{t("payment.step2")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <span className="text-gray-700">{t("payment.step3")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <span className="text-gray-700">{t("payment.step4")}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm text-green-700">
                    <Shield className="w-4 h-4 inline mr-1" />
                    {t("payment.secureNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Information */}
      <section id="delivery-info" className="py-16 bg-gray-50 scroll-mt-20">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-purple-100 rounded-2xl">
                <Truck className="w-10 h-10 text-purple-600" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {t("delivery.title")}
                </h2>
                <p className="text-gray-600">{t("delivery.subtitle")}</p>
              </div>
            </div>

            {/* Delivery Methods */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {deliveryMethods.map((method, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <method.icon className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{method.title}</h3>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </div>
              ))}
            </div>

            {/* Delivery Fees */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("delivery.feesTitle")}
              </h3>
              <p className="text-gray-600 mb-4">{t("delivery.feesDesc")}</p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                  {t("delivery.feesFactor1")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                  {t("delivery.feesFactor2")}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-purple-500" />
                  {t("delivery.feesFactor3")}
                </li>
              </ul>
              <p className="mt-4 text-gray-600 italic">{t("delivery.feesNote")}</p>
            </div>

            {/* Order Status Flow */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {t("delivery.statusTitle")}
              </h3>
              <div className="space-y-3">
                {orderStatuses.map((status, index) => (
                  <div key={index} className="flex items-center gap-4 bg-white p-3 rounded-xl">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 text-sm">{status.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Completion & Reviews */}
      <section className="py-16 bg-white">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-yellow-100 rounded-2xl">
                <Star className="w-10 h-10 text-yellow-600" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {t("reviews.title")}
                </h2>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-8 border border-yellow-100">
              <ul className="space-y-4 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-700">{t("reviews.step1")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-700">{t("reviews.step2")}</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-700">{t("reviews.step3")}</span>
                </li>
              </ul>
              <p className="text-gray-600 italic">{t("reviews.note")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Need Help */}
      <section className="py-16 bg-gradient-to-r from-jemo-orange to-orange-600 text-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("help.title")}
            </h2>
            <p className="text-xl text-white/90 mb-8">
              {t("help.description")}
            </p>
            <div className="flex flex-wrap justify-center gap-6">
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
            </div>
            <p className="mt-6 text-white/80">
              {t("help.tagline")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
