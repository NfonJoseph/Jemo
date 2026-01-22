/**
 * Footer Configuration
 * Centralized config for all footer links, social media, and contact info
 */

// Social media links
export const socialLinks = {
  facebook: "https://facebook.com/jemocm",
  whatsapp: "https://wa.me/237682310407",
  instagram: "https://instagram.com/jemocm",
  // Live chat opens the support widget (handled in component)
  liveChat: "#live-chat",
};

// Contact information
export const contactInfo = {
  supportPhone: "+237 682 310 407",
  supportPhoneRaw: "+237682310407",
  email: "support@jemo.cm",
  address: "Douala, Cameroon",
};

// Countries we operate in
export const countriesOperate = [
  "Cameroon", // Primary market
  // Future expansion markets (placeholder)
];

// Sell on Jemo links
export const sellOnJemoLinks = [
  { labelKey: "footer.becomeASeller", href: "/account/vendor/apply" },
  { labelKey: "footer.sellerCenter", href: "/sell" },
  { labelKey: "footer.sellerFaq", href: "/faq#seller-faq" },
];

// Shopping Guide links
export const shoppingGuideLinks = [
  { labelKey: "footer.howToRegister", href: "/shopping-guide#how-to-register" },
  { labelKey: "footer.howToOrder", href: "/shopping-guide#how-to-order" },
  { labelKey: "footer.howToPay", href: "/shopping-guide#how-to-pay" },
  { labelKey: "footer.deliveryInfo", href: "/shopping-guide#delivery-info" },
];

// Help Center links
export const helpCenterLinks = [
  { labelKey: "footer.faqs", href: "/faq" },
  { labelKey: "footer.returnsPolicy", href: "/returns" },
  { labelKey: "footer.disputesSupport", href: "/help/disputes" },
  { labelKey: "footer.contactUs", href: "/contact" },
];

// About JEMO links
export const aboutLinks = [
  { labelKey: "footer.privacyPolicy", href: "/privacy" },
  { labelKey: "footer.termsOfService", href: "/terms" },
  { labelKey: "footer.disclaimer", href: "/disclaimer" },
];

// FAQ tag links (short topics)
export const faqTags = [
  { label: "Discount", href: "/faq#payment-methods" },
  { label: "Service commitment", href: "/faq#customer-support" },
  { label: "Feedback", href: "/faq#customer-support" },
  { label: "Payments", href: "/faq#payment-methods" },
  { label: "Wishlist", href: "/faq#place-order" },
  { label: "Store", href: "/faq#become-vendor" },
  { label: "Cart", href: "/faq#place-order" },
  { label: "Coupon", href: "/faq#payment-methods" },
];

// Benefits row items
export const benefitsItems = [
  {
    iconKey: "gift",
    titleKey: "footer.benefits.greatValue",
    descKey: "footer.benefits.greatValueDesc",
  },
  {
    iconKey: "truck",
    titleKey: "footer.benefits.nationwideDelivery",
    descKey: "footer.benefits.nationwideDeliveryDesc",
  },
  {
    iconKey: "shield",
    titleKey: "footer.benefits.safePayment",
    descKey: "footer.benefits.safePaymentDesc",
  },
  {
    iconKey: "check",
    titleKey: "footer.benefits.shopWithConfidence",
    descKey: "footer.benefits.shopWithConfidenceDesc",
  },
  {
    iconKey: "headphones",
    titleKey: "footer.benefits.liveChat",
    descKey: "footer.benefits.liveChatDesc",
  },
  {
    iconKey: "smartphone",
    titleKey: "footer.benefits.shopOnTheGo",
    descKey: "footer.benefits.shopOnTheGoDesc",
  },
];

// App store links (placeholders - update when apps are available)
export const appStoreLinks = {
  googlePlay: "#google-play", // TODO: Add real Google Play link
  appStore: "#app-store", // TODO: Add real App Store link
};
