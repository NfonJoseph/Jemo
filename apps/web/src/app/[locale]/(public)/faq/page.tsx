"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "@/lib/translations";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageCircle,
  Store,
  Package,
  CreditCard,
  Truck,
  User,
  Shield,
  Globe,
  Clock,
  AlertTriangle,
  Headphones,
} from "lucide-react";

interface FAQItem {
  id: string;
  question: string;
  answer: string | string[];
  icon: React.ElementType;
}

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div
      id={item.id}
      className={`bg-white rounded-xl border transition-all scroll-mt-24 ${
        isOpen ? "border-jemo-orange shadow-md" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 p-5 text-left"
      >
        <div className={`p-2 rounded-lg flex-shrink-0 ${isOpen ? "bg-jemo-orange/10" : "bg-gray-100"}`}>
          <item.icon className={`w-5 h-5 ${isOpen ? "text-jemo-orange" : "text-gray-500"}`} />
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold ${isOpen ? "text-jemo-orange" : "text-gray-900"}`}>
            {item.question}
          </h3>
        </div>
        <div className="flex-shrink-0 mt-1">
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-jemo-orange" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pl-16">
          {Array.isArray(item.answer) ? (
            <ul className="space-y-2 text-gray-600">
              {item.answer.map((line, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-jemo-orange mt-1">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 leading-relaxed">{item.answer}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const locale = useLocale();
  const t = useTranslations("faq");
  const [openItems, setOpenItems] = useState<string[]>(["services"]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const faqItems: FAQItem[] = [
    {
      id: "services",
      question: t("items.services.question"),
      answer: t("items.services.answer"),
      icon: Package,
    },
    {
      id: "create-account",
      question: t("items.createAccount.question"),
      answer: [
        t("items.createAccount.step1"),
        t("items.createAccount.step2"),
        t("items.createAccount.step3"),
        t("items.createAccount.step4"),
      ],
      icon: User,
    },
    {
      id: "need-account",
      question: t("items.needAccount.question"),
      answer: [
        t("items.needAccount.benefit1"),
        t("items.needAccount.benefit2"),
        t("items.needAccount.benefit3"),
        t("items.needAccount.benefit4"),
      ],
      icon: User,
    },
    {
      id: "place-order",
      question: t("items.placeOrder.question"),
      answer: [
        t("items.placeOrder.step1"),
        t("items.placeOrder.step2"),
        t("items.placeOrder.step3"),
        t("items.placeOrder.step4"),
        t("items.placeOrder.step5"),
      ],
      icon: Package,
    },
    {
      id: "payment-methods",
      question: t("items.paymentMethods.question"),
      answer: [
        t("items.paymentMethods.method1"),
        t("items.paymentMethods.method2"),
        t("items.paymentMethods.method3"),
        t("items.paymentMethods.method4"),
      ],
      icon: CreditCard,
    },
    {
      id: "payment-type",
      question: t("items.paymentType.question"),
      answer: t("items.paymentType.answer"),
      icon: CreditCard,
    },
    {
      id: "delivery-time",
      question: t("items.deliveryTime.question"),
      answer: t("items.deliveryTime.answer"),
      icon: Clock,
    },
    {
      id: "track-shipment",
      question: t("items.trackShipment.question"),
      answer: [
        t("items.trackShipment.feature1"),
        t("items.trackShipment.feature2"),
        t("items.trackShipment.feature3"),
      ],
      icon: Truck,
    },
    {
      id: "international",
      question: t("items.international.question"),
      answer: t("items.international.answer"),
      icon: Globe,
    },
    {
      id: "become-vendor",
      question: t("items.becomeVendor.question"),
      answer: t("items.becomeVendor.answer"),
      icon: Store,
    },
    {
      id: "prohibited-items",
      question: t("items.prohibitedItems.question"),
      answer: [
        t("items.prohibitedItems.item1"),
        t("items.prohibitedItems.item2"),
        t("items.prohibitedItems.item3"),
        t("items.prohibitedItems.item4"),
      ],
      icon: AlertTriangle,
    },
    {
      id: "delayed-package",
      question: t("items.delayedPackage.question"),
      answer: t("items.delayedPackage.answer"),
      icon: Clock,
    },
    {
      id: "customer-support",
      question: t("items.customerSupport.question"),
      answer: [
        t("items.customerSupport.topic1"),
        t("items.customerSupport.topic2"),
        t("items.customerSupport.topic3"),
        t("items.customerSupport.topic4"),
      ],
      icon: Headphones,
    },
    {
      id: "security",
      question: t("items.security.question"),
      answer: t("items.security.answer"),
      icon: Shield,
    },
    {
      id: "more-help",
      question: t("items.moreHelp.question"),
      answer: t("items.moreHelp.answer"),
      icon: HelpCircle,
    },
  ];

  // Separate seller-related FAQ for easy linking
  const sellerFAQs = faqItems.filter((item) => item.id === "become-vendor");
  const generalFAQs = faqItems.filter((item) => item.id !== "become-vendor");

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 text-white overflow-hidden pb-16">
        <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container-main relative py-20 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6">
              <HelpCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-jemo-orange">
              {t("hero.title")}
            </h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>
      
      {/* Wave divider */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 -mt-16">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>

      {/* Quick Links */}
      <section className="py-8 bg-white">
        <div className="container-main">
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#become-vendor" className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              {t("quickLinks.seller")}
            </a>
            <a href="#payment-methods" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              {t("quickLinks.payments")}
            </a>
            <a href="#track-shipment" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              {t("quickLinks.tracking")}
            </a>
            <a href="#delivery-time" className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm font-medium transition-colors">
              {t("quickLinks.delivery")}
            </a>
          </div>
        </div>
      </section>

      {/* General FAQ Section */}
      <section className="py-12 bg-gray-50">
        <div className="container-main">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              {t("sections.general")}
            </h2>
            <div className="space-y-4">
              {generalFAQs.map((item) => (
                <FAQAccordion
                  key={item.id}
                  item={item}
                  isOpen={openItems.includes(item.id)}
                  onToggle={() => toggleItem(item.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Seller FAQ Section */}
      <section id="seller-faq" className="py-12 bg-white scroll-mt-24">
        <div className="container-main">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Store className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t("sections.seller")}
              </h2>
            </div>
            <div className="space-y-4">
              {sellerFAQs.map((item) => (
                <FAQAccordion
                  key={item.id}
                  item={item}
                  isOpen={openItems.includes(item.id) || true}
                  onToggle={() => toggleItem(item.id)}
                />
              ))}
            </div>

            {/* Additional Seller Info */}
            <div className="mt-8 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 border border-purple-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t("seller.benefitsTitle")}
              </h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-2 h-2 bg-purple-500 rounded-full" />
                  {t("seller.benefit1")}
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-2 h-2 bg-purple-500 rounded-full" />
                  {t("seller.benefit2")}
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-2 h-2 bg-purple-500 rounded-full" />
                  {t("seller.benefit3")}
                </li>
                <li className="flex items-center gap-3 text-gray-700">
                  <span className="w-2 h-2 bg-purple-500 rounded-full" />
                  {t("seller.benefit4")}
                </li>
              </ul>
              <Link
                href={`/${locale}/account/vendor/apply`}
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <Store className="w-5 h-5" />
                {t("seller.applyNow")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Need More Help */}
      <section className="py-16 bg-gradient-to-r from-jemo-orange to-orange-600 text-white">
        <div className="container-main">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("help.title")}
            </h2>
            <p className="text-xl text-white/90 mb-8">
              {t("help.description")}
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
              <Link
                href={`/${locale}/contact`}
                className="flex items-center gap-3 bg-white text-jemo-orange hover:bg-gray-100 px-6 py-4 rounded-xl transition-colors font-semibold"
              >
                <MessageCircle className="w-6 h-6" />
                {t("help.contactUs")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
