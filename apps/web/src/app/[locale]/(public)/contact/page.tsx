"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Headphones,
  Package,
  CreditCard,
  UserCheck,
  User,
  Send,
  HelpCircle,
  Handshake,
  Building,
  Truck,
  MessageCircle,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

export default function ContactPage() {
  const locale = useLocale();
  const t = useTranslations("contact");

  const contactMethods = [
    {
      icon: Phone,
      title: t("getInTouch.phone.title"),
      value: "+237 682 310 407",
      color: "bg-green-500",
      href: "tel:+237682310407",
    },
    {
      icon: Mail,
      title: t("getInTouch.email.title"),
      value: "support@jemo.cm",
      color: "bg-blue-500",
      href: "mailto:support@jemo.cm",
    },
    {
      icon: MapPin,
      title: t("getInTouch.area.title"),
      value: t("getInTouch.area.value"),
      color: "bg-purple-500",
      href: null,
    },
  ];

  const supportTopics = [
    { icon: Package, label: t("support.topics.orders") },
    { icon: CreditCard, label: t("support.topics.payments") },
    { icon: UserCheck, label: t("support.topics.vendor") },
    { icon: User, label: t("support.topics.account") },
    { icon: Send, label: t("support.topics.packages") },
    { icon: HelpCircle, label: t("support.topics.general") },
  ];

  const partnerServices = [
    t("partners.services.vendorOnboarding"),
    t("partners.services.business"),
    t("partners.services.delivery"),
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-jemo-orange via-orange-500 to-orange-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {t("hero.title")}
            </h1>
            <p className="text-2xl text-white/90 font-semibold mb-4">
              {t("hero.subtitle")}
            </p>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
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

      {/* Get in Touch */}
      <section className="py-16 bg-white">
        <div className="container-main">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            {t("getInTouch.title")}
          </h2>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {contactMethods.map((method, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl transition-shadow"
              >
                <div
                  className={`${method.color} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4`}
                >
                  <method.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {method.title}
                </h3>
                {method.href ? (
                  <a
                    href={method.href}
                    className="text-xl font-bold text-jemo-orange hover:underline"
                  >
                    {method.value}
                  </a>
                ) : (
                  <p className="text-xl font-bold text-jemo-orange">
                    {method.value}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Support */}
      <section className="py-16 bg-gray-50">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Headphones className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {t("support.title")}
              </h2>
            </div>

            <p className="text-lg text-gray-600 text-center mb-8">
              {t("support.description")}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {supportTopics.map((topic, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm border border-gray-100"
                >
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <topic.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-gray-700 font-medium text-sm">
                    {topic.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Support Hours */}
      <section className="py-16 bg-white">
        <div className="container-main">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="p-3 bg-green-100 rounded-xl">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {t("hours.title")}
              </h2>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
                  <span className="font-medium text-gray-700">
                    {t("hours.weekdays")}
                  </span>
                  <span className="font-bold text-jemo-orange">
                    8:00 AM – 8:00 PM
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm">
                  <span className="font-medium text-gray-700">
                    {t("hours.weekends")}
                  </span>
                  <span className="font-bold text-gray-500">
                    {t("hours.limited")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vendors & Partners */}
      <section className="py-16 bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
        <div className="container-main">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Handshake className="w-12 h-12 mx-auto mb-4 text-purple-200" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("partners.title")}
              </h2>
              <p className="text-xl text-purple-200">
                {t("partners.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-lg mb-6 text-purple-100">
                  {t("partners.contactFor")}
                </p>
                <ul className="space-y-3">
                  {partnerServices.map((service, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {index === 0 && <Building className="w-5 h-5 text-purple-300" />}
                      {index === 1 && <Handshake className="w-5 h-5 text-purple-300" />}
                      {index === 2 && <Truck className="w-5 h-5 text-purple-300" />}
                      <span className="text-white">{service}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
                <div className="space-y-4">
                  <a
                    href="tel:+237682310407"
                    className="flex items-center gap-4 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                  >
                    <Phone className="w-6 h-6 text-purple-200" />
                    <span className="font-semibold">+237 682 310 407</span>
                  </a>
                  <a
                    href="mailto:partners@jemo.cm"
                    className="flex items-center gap-4 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                  >
                    <Mail className="w-6 h-6 text-purple-200" />
                    <span className="font-semibold">partners@jemo.cm</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Urgent Help */}
      <section className="py-16 bg-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-xl flex-shrink-0">
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {t("urgent.title")}
                  </h2>
                  <p className="text-gray-600 mb-6">
                    {t("urgent.description")}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <a
                      href="tel:+237682310407"
                      className="inline-flex items-center gap-2 bg-jemo-orange text-white px-6 py-3 rounded-xl font-semibold hover:bg-jemo-orange/90 transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                      {t("urgent.call")}
                    </a>
                    <a
                      href="https://wa.me/237682310407"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {t("urgent.whatsapp")}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
