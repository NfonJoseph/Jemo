"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/api";
import { useLocale } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { ChevronLeft, Loader2, Star, X, Upload } from "lucide-react";

const CAMEROON_CITIES = [
  { value: "douala", label: "Douala" },
  { value: "yaounde", label: "Yaoundé" },
  { value: "garoua", label: "Garoua" },
  { value: "bamenda", label: "Bamenda" },
  { value: "maroua", label: "Maroua" },
  { value: "bafoussam", label: "Bafoussam" },
  { value: "ngaoundere", label: "Ngaoundéré" },
  { value: "bertoua", label: "Bertoua" },
  { value: "ebolowa", label: "Ebolowa" },
  { value: "buea", label: "Buea" },
  { value: "kribi", label: "Kribi" },
  { value: "limbe", label: "Limbe" },
  { value: "kumba", label: "Kumba" },
  { value: "dschang", label: "Dschang" },
  { value: "foumban", label: "Foumban" },
  { value: "kumbo", label: "Kumbo" },
];

interface Category {
  id: string;
  nameEn: string;
  nameFr: string;
}

interface ImageData {
  id: string;
  objectKey: string;
  url: string;
  mimeType: string;
  size: number;
  sortOrder: number;
  isMain: boolean;
  uploading?: boolean;
}

export default function NewProductPage() {
  const router = useRouter();
  const locale = useLocale();
  const toast = useToast();

  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    price: "",
    discountPrice: "",
    stock: "0",
    stockStatus: "IN_STOCK",
    city: "",
    deliveryType: "VENDOR_DELIVERY",
    pickupAvailable: false,
    localDelivery: true,
    nationwideDelivery: false,
    freeDelivery: false,
    flatDeliveryFee: "",
    sameCityDeliveryFee: "",
    otherCityDeliveryFee: "",
    condition: "NEW",
    authenticityConfirmed: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ImageData[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feeType, setFeeType] = useState<"flat" | "varies">("flat");
  const [tempProductId] = useState(`temp-${Date.now()}`);

  useEffect(() => {
    api.get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => toast.error("Failed to load categories"));
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const filesToUpload = Array.from(files).slice(0, 15 - images.length);
    
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      const id = `img-${Date.now()}-${Math.random()}`;
      const newImg: ImageData = {
        id,
        objectKey: "",
        url: URL.createObjectURL(file),
        mimeType: file.type,
        size: file.size,
        sortOrder: images.length + i,
        // Only set first image as main if there are no existing images
        isMain: images.length === 0 && i === 0,
        uploading: true,
      };
      setImages((prev) => [...prev, newImg]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("productId", tempProductId);

        console.log("[Upload] Starting upload for file:", file.name, "size:", file.size, "type:", file.type);

        const result = await api.upload<{ success: boolean; objectKey: string; url: string; mimeType: string; size: number }>(
          "/uploads/product-image",
          formData,
          true
        );

        console.log("[Upload] Success:", result);

        setImages((prev) =>
          prev.map((img) =>
            img.id === id ? { ...img, objectKey: result.objectKey, url: result.url, uploading: false } : img
          )
        );
      } catch (err) {
        console.error("[Upload] Failed:", err);
        setImages((prev) => prev.filter((img) => img.id !== id));
        
        // Extract error message
        let errorMessage = "Failed to upload image";
        if (err instanceof ApiError) {
          const data = err.data as { message?: string; errorCode?: string };
          errorMessage = data?.message || err.rawBody || errorMessage;
          console.error("[Upload] Error details:", { status: err.status, data, rawBody: err.rawBody });
        }
        toast.error(`Upload failed: ${errorMessage}`);
      }
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      if (filtered.length > 0 && !filtered.some((img) => img.isMain)) {
        filtered[0].isMain = true;
      }
      return filtered.map((img, idx) => ({ ...img, sortOrder: idx }));
    });
  };

  const setMainImage = (id: string) => {
    setImages((prev) => prev.map((img) => ({ ...img, isMain: img.id === id })));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Required";
    if (!form.description.trim()) errs.description = "Required";
    if (!form.categoryId) errs.categoryId = "Required";
    if (!form.price || parseFloat(form.price) <= 0) errs.price = "Enter valid price";
    if (form.discountPrice && parseFloat(form.discountPrice) >= parseFloat(form.price)) {
      errs.discountPrice = "Must be less than price";
    }
    if (!form.city) errs.city = "Required";
    if (form.deliveryType === "VENDOR_DELIVERY" && !form.pickupAvailable && !form.localDelivery && !form.nationwideDelivery) {
      errs.deliveryOptions = "Select at least one";
    }
    if (!form.authenticityConfirmed) errs.authenticityConfirmed = "Required";
    if (images.filter((i) => !i.uploading && i.objectKey).length === 0) errs.images = "Add at least one image";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return toast.error("Fix errors");
    setSubmitting(true);

    const validImages = images.filter((i) => i.objectKey && !i.uploading);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId,
      price: Math.round(parseFloat(form.price)),
      discountPrice: form.discountPrice ? Math.round(parseFloat(form.discountPrice)) : undefined,
      stock: parseInt(form.stock, 10),
      stockStatus: form.stockStatus,
      city: form.city,
      deliveryType: form.deliveryType,
      pickupAvailable: form.pickupAvailable,
      localDelivery: form.localDelivery,
      nationwideDelivery: form.nationwideDelivery,
      freeDelivery: form.freeDelivery,
      flatDeliveryFee: !form.freeDelivery && feeType === "flat" ? parseFloat(form.flatDeliveryFee || "0") : undefined,
      sameCityDeliveryFee: !form.freeDelivery && feeType === "varies" ? parseFloat(form.sameCityDeliveryFee || "0") : undefined,
      otherCityDeliveryFee: !form.freeDelivery && feeType === "varies" ? parseFloat(form.otherCityDeliveryFee || "0") : undefined,
      condition: form.condition,
      authenticityConfirmed: form.authenticityConfirmed,
      images: validImages.map((i) => ({
        objectKey: i.objectKey,
        url: i.url,
        mimeType: i.mimeType,
        size: i.size,
        sortOrder: i.sortOrder,
        isMain: i.isMain,
      })),
    };

    try {
      await api.post("/vendor/products", payload, true);
      toast.success("Product created! Pending review.");
      router.push(`/${locale}/vendor/products`);
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string | string[] };
        toast.error(Array.isArray(data?.message) ? data.message[0] : data?.message || "Failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl pb-24">
      <div className="mb-6">
        <Link href={`/${locale}/vendor/products`} className="flex items-center text-gray-500 hover:text-gray-700 mb-2">
          <ChevronLeft className="w-5 h-5" /> Back
        </Link>
        <h1 className="text-2xl font-bold">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold border-b pb-2">Basic Info</h2>
          <div>
            <Label>Name *</Label>
            <Input name="name" value={form.name} onChange={handleChange} className={errors.name ? "border-red-500" : ""} />
          </div>
          <div>
            <Label>Category *</Label>
            <select name="categoryId" value={form.categoryId} onChange={handleChange} className={`w-full h-10 border rounded px-3 ${errors.categoryId ? "border-red-500" : ""}`}>
              <option value="">Select</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{locale === "fr" ? c.nameFr : c.nameEn}</option>)}
            </select>
          </div>
          <div>
            <Label>Description *</Label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className={`w-full border rounded px-3 py-2 ${errors.description ? "border-red-500" : ""}`} />
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="font-semibold border-b pb-2">Images (1-15) *</h2>
          <div className="border-2 border-dashed rounded p-6 text-center cursor-pointer hover:border-jemo-orange" onClick={() => document.getElementById("imgInput")?.click()}>
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
            <p className="text-sm text-gray-500">Click to upload</p>
            <input id="imgInput" type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
          </div>
          {errors.images && <p className="text-sm text-red-500">{errors.images}</p>}
          <div className="grid grid-cols-4 gap-2">
            {images.map((img) => (
              <div key={img.id} className={`relative aspect-square rounded overflow-hidden border-2 ${img.isMain ? "border-jemo-orange" : "border-gray-200"}`}>
                <Image src={img.url} alt="" fill className="object-cover" />
                {img.uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                {!img.uploading && (
                  <>
                    <button type="button" onClick={() => setMainImage(img.id)} className={`absolute top-1 left-1 p-1 rounded-full ${img.isMain ? "bg-jemo-orange" : "bg-black/50"}`}><Star className={`w-3 h-3 ${img.isMain ? "text-white fill-white" : "text-white"}`} /></button>
                    <button type="button" onClick={() => removeImage(img.id)} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 hover:bg-red-500"><X className="w-3 h-3 text-white" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="font-semibold border-b pb-2">Pricing</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Price (FCFA) *</Label><Input name="price" type="number" min="1" value={form.price} onChange={handleChange} className={errors.price ? "border-red-500" : ""} /></div>
            <div><Label>Discount Price</Label><Input name="discountPrice" type="number" min="0" value={form.discountPrice} onChange={handleChange} className={errors.discountPrice ? "border-red-500" : ""} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Stock *</Label><Input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} /></div>
            <div><Label>Status</Label><select name="stockStatus" value={form.stockStatus} onChange={handleChange} className="w-full h-10 border rounded px-3"><option value="IN_STOCK">In Stock</option><option value="OUT_OF_STOCK">Out of Stock</option></select></div>
          </div>
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="font-semibold border-b pb-2">Location & Delivery</h2>
          <div><Label>City *</Label><select name="city" value={form.city} onChange={handleChange} className={`w-full h-10 border rounded px-3 ${errors.city ? "border-red-500" : ""}`}><option value="">Select</option>{CAMEROON_CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div className="flex gap-4">
            <label className={`flex-1 p-3 border rounded cursor-pointer ${form.deliveryType === "VENDOR_DELIVERY" ? "border-jemo-orange bg-orange-50" : ""}`}><input type="radio" name="deliveryType" value="VENDOR_DELIVERY" checked={form.deliveryType === "VENDOR_DELIVERY"} onChange={handleChange} className="mr-2" />You Deliver</label>
            <label className={`flex-1 p-3 border rounded cursor-pointer ${form.deliveryType === "JEMO_RIDER" ? "border-jemo-orange bg-orange-50" : ""}`}><input type="radio" name="deliveryType" value="JEMO_RIDER" checked={form.deliveryType === "JEMO_RIDER"} onChange={handleChange} className="mr-2" />Jemo Delivery</label>
          </div>
          {form.deliveryType === "VENDOR_DELIVERY" && (
            <>
              <div className="space-y-2">
                <Label>Options *</Label>
                <label className="flex items-center gap-2"><input type="checkbox" name="pickupAvailable" checked={form.pickupAvailable} onChange={handleChange} />Pickup</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="localDelivery" checked={form.localDelivery} onChange={handleChange} />Local Delivery</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="nationwideDelivery" checked={form.nationwideDelivery} onChange={handleChange} />Nationwide</label>
                {errors.deliveryOptions && <p className="text-sm text-red-500">{errors.deliveryOptions}</p>}
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" name="freeDelivery" checked={form.freeDelivery} onChange={handleChange} /><span className="text-green-600 font-medium">Free Delivery</span></label>
              {!form.freeDelivery && (
                <div className="space-y-3">
                  <div className="flex gap-2"><button type="button" onClick={() => setFeeType("flat")} className={`px-3 py-1 rounded ${feeType === "flat" ? "bg-jemo-orange text-white" : "bg-gray-100"}`}>Flat</button><button type="button" onClick={() => setFeeType("varies")} className={`px-3 py-1 rounded ${feeType === "varies" ? "bg-jemo-orange text-white" : "bg-gray-100"}`}>Varies</button></div>
                  {feeType === "flat" ? <Input name="flatDeliveryFee" type="number" placeholder="Flat fee" value={form.flatDeliveryFee} onChange={handleChange} /> : <div className="grid grid-cols-2 gap-2"><Input name="sameCityDeliveryFee" type="number" placeholder="Same city" value={form.sameCityDeliveryFee} onChange={handleChange} /><Input name="otherCityDeliveryFee" type="number" placeholder="Other city" value={form.otherCityDeliveryFee} onChange={handleChange} /></div>}
                </div>
              )}
            </>
          )}
        </section>

        <section className="card p-6 space-y-4">
          <h2 className="font-semibold border-b pb-2">Condition</h2>
          <select name="condition" value={form.condition} onChange={handleChange} className="w-full h-10 border rounded px-3"><option value="NEW">New</option><option value="USED_LIKE_NEW">Like New</option><option value="USED_GOOD">Good</option><option value="REFURBISHED">Refurbished</option></select>
          <label className={`flex items-start gap-3 p-4 rounded border ${errors.authenticityConfirmed ? "border-red-500 bg-red-50" : "bg-gray-50"}`}><input type="checkbox" name="authenticityConfirmed" checked={form.authenticityConfirmed} onChange={handleChange} className="mt-1" /><div><p className="font-medium">I confirm this product is genuine *</p><p className="text-sm text-gray-500">You confirm this product is authentic and accurately described.</p></div></label>
        </section>

        <div className="flex gap-4 sticky bottom-0 bg-white p-4 border-t">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={submitting} className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90">{submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : "Create Product"}</Button>
        </div>
      </form>
    </div>
  );
}
