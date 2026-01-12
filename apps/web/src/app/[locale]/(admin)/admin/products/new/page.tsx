"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useTranslations, useLocale } from "@/lib/translations";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Zap, Tag, Loader2 } from "lucide-react";

// Types
interface Vendor {
  id: string;
  businessName: string;
  email: string;
}

const CATEGORIES = [
  "ELECTRONICS",
  "FASHION",
  "HOME_GARDEN",
  "COMPUTING",
  "HEALTH_BEAUTY",
  "SUPERMARKET",
  "BABY_KIDS",
  "GAMING",
  "SPORTS_OUTDOORS",
  "AUTOMOTIVE",
  "BOOKS_STATIONERY",
  "OTHER",
] as const;

const DELIVERY_TYPES = ["VENDOR_DELIVERY", "JEMO_RIDER"] as const;
const DEAL_TYPES = ["TODAYS_DEAL", "FLASH_SALE"] as const;

export default function CreateProductPage() {
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations("admin.products");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // State
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    nameEn: "",
    nameFr: "",
    description: "",
    descriptionEn: "",
    descriptionFr: "",
    price: "",
    stock: "0",
    category: "OTHER" as typeof CATEGORIES[number],
    deliveryType: "JEMO_RIDER" as typeof DELIVERY_TYPES[number],
    isActive: true,
    vendorProfileId: "",
    dealType: "TODAYS_DEAL" as typeof DEAL_TYPES[number],
    flashSalePrice: "",
    flashSaleDiscountPercent: "",
    flashSaleStartAt: "",
    flashSaleEndAt: "",
    imageUrls: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load vendors
  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const data = await api.get<Vendor[]>("/admin/products/vendors", true);
      setVendors(data);
    } catch (err) {
      console.error("Failed to load vendors:", err);
      toast.error(t("loadVendorsError"));
    } finally {
      setVendorsLoading(false);
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
    if (!formData.vendorProfileId) {
      newErrors.vendorProfileId = t("errors.vendorRequired");
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
        name: formData.name,
        nameEn: formData.nameEn || null,
        nameFr: formData.nameFr || null,
        description: formData.description,
        descriptionEn: formData.descriptionEn || null,
        descriptionFr: formData.descriptionFr || null,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock, 10) || 0,
        category: formData.category,
        deliveryType: formData.deliveryType,
        isActive: formData.isActive,
        vendorProfileId: formData.vendorProfileId,
        dealType: formData.dealType,
        flashSalePrice: formData.flashSalePrice ? parseFloat(formData.flashSalePrice) : null,
        flashSaleDiscountPercent: formData.flashSaleDiscountPercent ? parseInt(formData.flashSaleDiscountPercent, 10) : null,
        flashSaleStartAt: formData.flashSaleStartAt || null,
        flashSaleEndAt: formData.flashSaleEndAt || null,
        imageUrls: formData.imageUrls.filter(Boolean),
      };

      await api.post("/admin/products", payload, true);
      toast.success(t("createSuccess"));
      router.push(`/${locale}/admin/products`);
    } catch (err) {
      console.error("Failed to create product:", err);
      toast.error(t("createError"));
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

  if (vendorsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
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
        <h1 className="text-2xl font-bold text-gray-900">{t("createProduct")}</h1>
      </div>

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

            {/* Name EN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("nameEn")}
              </label>
              <input
                type="text"
                value={formData.nameEn}
                onChange={(e) => handleChange("nameEn", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
                placeholder={t("nameEnPlaceholder")}
              />
            </div>

            {/* Name FR */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("nameFr")}
              </label>
              <input
                type="text"
                value={formData.nameFr}
                onChange={(e) => handleChange("nameFr", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
                placeholder={t("nameFrPlaceholder")}
              />
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

            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("vendor")} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vendorProfileId}
                onChange={(e) => handleChange("vendorProfileId", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent ${errors.vendorProfileId ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">{t("selectVendor")}</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.businessName} ({vendor.email})
                  </option>
                ))}
              </select>
              {errors.vendorProfileId && <p className="mt-1 text-sm text-red-500">{errors.vendorProfileId}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("category")}
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`category.${cat}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("price")} (FCFA) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleChange("price", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-jemo-orange focus:border-transparent ${errors.price ? "border-red-500" : "border-gray-300"}`}
                placeholder="0.00"
              />
              {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
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
                    {t(`deliveryType.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="rounded border-gray-300 text-jemo-orange focus:ring-jemo-orange"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                {t("isActive")}
              </label>
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
                  step="0.01"
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

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button type="button" variant="outline" asChild>
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
                {t("saveProduct")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
