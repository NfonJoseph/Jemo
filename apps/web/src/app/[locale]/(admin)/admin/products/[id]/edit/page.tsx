"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useTranslations, useLocale } from "@/lib/translations";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Zap, Tag, Loader2, Clock, CheckCircle, XCircle, Ban } from "lucide-react";

// Types
type ProductStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";
type PaymentPolicy = "POD_ONLY" | "ONLINE_ONLY" | "MIXED_CITY_RULE";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  stockStatus: string;
  city: string;
  category: { id: string; slug: string; nameEn: string; nameFr: string } | null;
  deliveryType: string;
  status: ProductStatus;
  condition: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  dealType: "TODAYS_DEAL" | "FLASH_SALE";
  flashSalePrice: number | null;
  flashSaleDiscountPercent: number | null;
  flashSaleStartAt: string | null;
  flashSaleEndAt: string | null;
  paymentPolicy: PaymentPolicy;
  mtnMomoEnabled: boolean;
  orangeMoneyEnabled: boolean;
  vendorProfile: {
    id: string;
    businessName: string;
  };
  images: { id: string; url: string; objectKey: string; isMain: boolean }[];
}

const DELIVERY_TYPES = ["VENDOR_DELIVERY", "JEMO_RIDER"] as const;
const DEAL_TYPES = ["TODAYS_DEAL", "FLASH_SALE"] as const;
const PRODUCT_STATUSES: ProductStatus[] = ["PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"];
const PAYMENT_POLICIES: PaymentPolicy[] = ["POD_ONLY", "ONLINE_ONLY", "MIXED_CITY_RULE"];

// Default form state to prevent uncontrolled->controlled warnings
const getDefaultFormData = () => ({
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  stock: "0",
  stockStatus: "IN_STOCK",
  city: "",
  categoryId: "",
  deliveryType: "JEMO_RIDER" as typeof DELIVERY_TYPES[number],
  status: "PENDING_APPROVAL" as ProductStatus,
  condition: "NEW",
  dealType: "TODAYS_DEAL" as typeof DEAL_TYPES[number],
  flashSalePrice: "",
  flashSaleDiscountPercent: "",
  flashSaleStartAt: "",
  flashSaleEndAt: "",
  paymentPolicy: "POD_ONLY" as PaymentPolicy,
  mtnMomoEnabled: true,
  orangeMoneyEnabled: true,
});

function formatDateTimeLocal(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

// Status badge for display
function StatusBadge({ status }: { status: ProductStatus }) {
  const config: Record<ProductStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    PENDING_APPROVAL: { bg: "bg-yellow-100", text: "text-yellow-700", icon: <Clock className="w-4 h-4" />, label: "Pending Review" },
    APPROVED: { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle className="w-4 h-4" />, label: "Approved" },
    REJECTED: { bg: "bg-red-100", text: "text-red-700", icon: <XCircle className="w-4 h-4" />, label: "Rejected" },
    SUSPENDED: { bg: "bg-gray-100", text: "text-gray-700", icon: <Ban className="w-4 h-4" />, label: "Suspended" },
  };
  const { bg, text, icon, label } = config[status] || config.PENDING_APPROVAL;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations("admin.products");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // State
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  // Form state - initialized with safe defaults
  const [formData, setFormData] = useState(getDefaultFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load product
  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setLoadingProduct(true);
    try {
      const data = await api.get<Product>(`/admin/products/${id}`, true);
      setProduct(data);
      
      // Hydrate form with safe coercion to prevent uncontrolled->controlled issues
      setFormData({
        name: String(data.name ?? ""),
        description: String(data.description ?? ""),
        price: data.price != null ? String(data.price) : "",
        discountPrice: data.discountPrice != null ? String(data.discountPrice) : "",
        stock: data.stock != null ? String(data.stock) : "0",
        stockStatus: String(data.stockStatus ?? "IN_STOCK"),
        city: String(data.city ?? ""),
        categoryId: data.category?.id ?? "",
        deliveryType: (data.deliveryType as typeof DELIVERY_TYPES[number]) || "JEMO_RIDER",
        status: (data.status as ProductStatus) || "PENDING_APPROVAL",
        condition: String(data.condition ?? "NEW"),
        dealType: (data.dealType as typeof DEAL_TYPES[number]) || "TODAYS_DEAL",
        flashSalePrice: data.flashSalePrice != null ? String(data.flashSalePrice) : "",
        flashSaleDiscountPercent: data.flashSaleDiscountPercent != null ? String(data.flashSaleDiscountPercent) : "",
        flashSaleStartAt: formatDateTimeLocal(data.flashSaleStartAt),
        flashSaleEndAt: formatDateTimeLocal(data.flashSaleEndAt),
        paymentPolicy: (data.paymentPolicy as PaymentPolicy) || "POD_ONLY",
        mtnMomoEnabled: data.mtnMomoEnabled !== false,
        orangeMoneyEnabled: data.orangeMoneyEnabled !== false,
      });
    } catch (err) {
      console.error("Failed to load product:", err);
      toast.error(t("loadError"));
      router.push(`/${locale}/admin/products`);
    } finally {
      setLoadingProduct(false);
    }
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t("errors.nameRequired");
    }
    if (!formData.description.trim()) {
      newErrors.description = t("errors.descriptionRequired");
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = t("errors.priceRequired");
    }

    // Flash sale validations
    if (formData.dealType === "FLASH_SALE") {
      if (formData.flashSalePrice && parseFloat(formData.flashSalePrice) >= parseFloat(formData.price)) {
        newErrors.flashSalePrice = t("errors.flashPriceMustBeLower");
      }
      if (formData.flashSaleDiscountPercent) {
        const percent = parseInt(formData.flashSaleDiscountPercent, 10);
        if (percent < 1 || percent > 90) {
          newErrors.flashSaleDiscountPercent = t("errors.discountRange");
        }
      }
      if (formData.flashSaleStartAt && formData.flashSaleEndAt) {
        if (new Date(formData.flashSaleEndAt) <= new Date(formData.flashSaleStartAt)) {
          newErrors.flashSaleEndAt = t("errors.endAfterStart");
        }
      }
    }

    // Payment policy validation
    if (formData.paymentPolicy !== "POD_ONLY" && !formData.mtnMomoEnabled && !formData.orangeMoneyEnabled) {
      newErrors.paymentProviders = "At least one online payment method must be enabled";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price) || 0,
        discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
        stock: parseInt(formData.stock, 10) || 0,
        stockStatus: formData.stockStatus,
        city: formData.city,
        categoryId: formData.categoryId || undefined,
        deliveryType: formData.deliveryType,
        status: formData.status,
        condition: formData.condition,
        dealType: formData.dealType,
        flashSalePrice: formData.flashSalePrice ? parseFloat(formData.flashSalePrice) : null,
        flashSaleDiscountPercent: formData.flashSaleDiscountPercent ? parseInt(formData.flashSaleDiscountPercent, 10) : null,
        flashSaleStartAt: formData.flashSaleStartAt || null,
        flashSaleEndAt: formData.flashSaleEndAt || null,
        paymentPolicy: formData.paymentPolicy,
        mtnMomoEnabled: formData.mtnMomoEnabled,
        orangeMoneyEnabled: formData.orangeMoneyEnabled,
      };

      await api.put(`/admin/products/${id}`, payload, true);
      toast.success(t("updateSuccess"));
      router.push(`/${locale}/admin/products`);
    } catch (err) {
      console.error("Failed to update product:", err);
      toast.error(t("updateError"));
    } finally {
      setLoading(false);
    }
  };

  // Form input handler
  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  if (loadingProduct) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t("productNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/admin/products`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            {tCommon("back")}
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{t("editProduct")}</h1>
      </div>

      {/* Vendor Info & Status */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex-1">
          <p className="text-sm text-blue-700">
            <span className="font-medium">{t("vendor")}:</span> {product.vendorProfile.businessName}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">Status:</span>
          <StatusBadge status={product.status} />
        </div>
      </div>

      {/* Rejection Reason */}
      {product.status === "REJECTED" && product.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">
            <span className="font-medium">Rejection Reason:</span> {product.rejectionReason}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("basicInfo")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("productName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent ${errors.name ? "border-red-500" : "border-gray-300"}`}
                placeholder={t("productNamePlaceholder")}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("description")} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent ${errors.description ? "border-red-500" : "border-gray-300"}`}
                placeholder={t("descriptionPlaceholder")}
              />
              {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("price")} (FCFA) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent ${errors.price ? "border-red-500" : "border-gray-300"}`}
                placeholder="0"
              />
              {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
            </div>

            {/* Discount Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Price (FCFA)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.discountPrice}
                onChange={(e) => handleChange("discountPrice", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
                placeholder="Optional"
              />
            </div>

            {/* Stock */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("stock")}
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
                placeholder="0"
              />
            </div>

            {/* Stock Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Status
              </label>
              <select
                value={formData.stockStatus}
                onChange={(e) => handleChange("stockStatus", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
              >
                <option value="IN_STOCK">In Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
                placeholder="City"
              />
            </div>

            {/* Delivery Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("deliveryType")}
              </label>
              <select
                value={formData.deliveryType}
                onChange={(e) => handleChange("deliveryType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
              >
                {DELIVERY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type === "VENDOR_DELIVERY" ? "Vendor Delivery" : "Jemo Rider"}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
              >
                {PRODUCT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status === "PENDING_APPROVAL" ? "Pending Review" :
                     status === "APPROVED" ? "Approved" :
                     status === "REJECTED" ? "Rejected" : "Suspended"}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => handleChange("condition", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
              >
                <option value="NEW">New</option>
                <option value="USED_LIKE_NEW">Used - Like New</option>
                <option value="USED_GOOD">Used - Good</option>
                <option value="REFURBISHED">Refurbished</option>
              </select>
            </div>
          </div>
        </div>

        {/* Deal Type Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("dealSettings")}</h2>

          {/* Deal Type Selector */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => handleChange("dealType", "TODAYS_DEAL")}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                formData.dealType === "TODAYS_DEAL"
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Tag className="w-5 h-5" />
              <span className="font-medium">{t("dealType.TODAYS_DEAL")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleChange("dealType", "FLASH_SALE")}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                formData.dealType === "FLASH_SALE"
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Zap className="w-5 h-5" />
              <span className="font-medium">{t("dealType.FLASH_SALE")}</span>
            </button>
          </div>

          {/* Flash Sale Fields */}
          {formData.dealType === "FLASH_SALE" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("flashSalePrice")} (FCFA)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.flashSalePrice}
                  onChange={(e) => handleChange("flashSalePrice", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${errors.flashSalePrice ? "border-red-500" : "border-gray-300"}`}
                  placeholder={t("flashSalePricePlaceholder")}
                />
                {errors.flashSalePrice && <p className="mt-1 text-sm text-red-500">{errors.flashSalePrice}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("discountPercent")}
                </label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.flashSaleDiscountPercent}
                  onChange={(e) => handleChange("flashSaleDiscountPercent", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${errors.flashSaleDiscountPercent ? "border-red-500" : "border-gray-300"}`}
                  placeholder="1-90"
                />
                {errors.flashSaleDiscountPercent && <p className="mt-1 text-sm text-red-500">{errors.flashSaleDiscountPercent}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("flashSaleStartAt")}
                </label>
                <input
                  type="datetime-local"
                  value={formData.flashSaleStartAt}
                  onChange={(e) => handleChange("flashSaleStartAt", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("flashSaleEndAt")}
                </label>
                <input
                  type="datetime-local"
                  value={formData.flashSaleEndAt}
                  onChange={(e) => handleChange("flashSaleEndAt", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${errors.flashSaleEndAt ? "border-red-500" : "border-gray-300"}`}
                />
                {errors.flashSaleEndAt && <p className="mt-1 text-sm text-red-500">{errors.flashSaleEndAt}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Payment Policy Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Options</h2>
          <p className="text-sm text-gray-500 mb-4">Configure how buyers can pay for this product</p>

          <div className="space-y-3 mb-6">
            {PAYMENT_POLICIES.map((policy) => (
              <label
                key={policy}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  formData.paymentPolicy === policy
                    ? "border-jemo-orange bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentPolicy"
                  value={policy}
                  checked={formData.paymentPolicy === policy}
                  onChange={(e) => handleChange("paymentPolicy", e.target.value)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {policy === "POD_ONLY" ? "Pay on Delivery only" :
                     policy === "ONLINE_ONLY" ? "Online payment only" :
                     "Mixed: Based on location"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {policy === "POD_ONLY" ? "Buyers pay in cash when the product is delivered" :
                     policy === "ONLINE_ONLY" ? "Buyers must pay via MTN MoMo or Orange Money before delivery" :
                     "Pay on Delivery for same city, Online payment for different cities"}
                  </p>
                </div>
              </label>
            ))}
          </div>

          {/* Online Payment Providers */}
          {formData.paymentPolicy !== "POD_ONLY" && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Enabled Payment Methods
              </label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.mtnMomoEnabled}
                    onChange={(e) => handleChange("mtnMomoEnabled", e.target.checked)}
                    className="w-4 h-4 text-jemo-orange border-gray-300 rounded focus:ring-jemo-orange"
                  />
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-yellow-400 rounded text-xs font-bold flex items-center justify-center">MTN</span>
                    MTN Mobile Money
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.orangeMoneyEnabled}
                    onChange={(e) => handleChange("orangeMoneyEnabled", e.target.checked)}
                    className="w-4 h-4 text-jemo-orange border-gray-300 rounded focus:ring-jemo-orange"
                  />
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 rounded text-xs font-bold text-white flex items-center justify-center">OM</span>
                    Orange Money
                  </span>
                </label>
              </div>
              {errors.paymentProviders && (
                <p className="mt-2 text-sm text-red-500">{errors.paymentProviders}</p>
              )}
            </div>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="ghost" asChild>
            <Link href={`/${locale}/admin/products`}>{tCommon("cancel")}</Link>
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-jemo-orange hover:bg-jemo-orange/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("saving")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t("saveChanges")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
