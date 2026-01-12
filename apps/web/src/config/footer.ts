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
  { labelKey: "footer.sellerCenter", href: "/vendor" },
  { labelKey: "footer.sellerFaq", href: "/help/seller-faq" },
];

// Shopping Guide links
export const shoppingGuideLinks = [
  { labelKey: "footer.howToRegister", href: "/help/how-to-register" },
  { labelKey: "footer.howToOrder", href: "/help/how-to-order" },
  { labelKey: "footer.howToPay", href: "/help/how-to-pay" },
  { labelKey: "footer.deliveryInfo", href: "/help/delivery" },
];

// Help Center links
export const helpCenterLinks = [
  { labelKey: "footer.faqs", href: "/help/faqs" },
  { labelKey: "footer.returnsPolicy", href: "/help/returns" },
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
  { label: "Discount", href: "/help/faqs#discount" },
  { label: "Service commitment", href: "/help/faqs#service" },
  { label: "Feedback", href: "/help/faqs#feedback" },
  { label: "Payments", href: "/help/faqs#payments" },
  { label: "Wishlist", href: "/help/faqs#wishlist" },
  { label: "Store", href: "/help/faqs#store" },
  { label: "Cart", href: "/help/faqs#cart" },
  { label: "Coupon", href: "/help/faqs#coupon" },
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
