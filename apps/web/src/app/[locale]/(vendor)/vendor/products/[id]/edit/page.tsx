"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { UpdateProductPayload, VendorProduct, ProductImage, ProductImagePayload, PaymentPolicy } from "@/lib/types";
import { useLocale } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/shared";
import { ChevronLeft, Loader2, ImagePlus, Trash2, Star, GripVertical, Plus, X } from "lucide-react";

// Image interface for form state
interface FormImage {
  id?: string;
  objectKey: string;
  url: string;
  mimeType: string;
  size: number;
  sortOrder: number;
  isMain: boolean;
  isNew?: boolean; // Track if image was newly added
}

// Helper to extract object key from URL
function extractKeyFromUrl(url: string): string {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    // Get path without leading slash
    return urlObj.pathname.replace(/^\//, "") || `url-${Date.now()}`;
  } catch {
    // If not a valid URL, use hash
    return `url-${url.substring(0, 20).replace(/[^a-zA-Z0-9]/g, "")}-${Date.now()}`;
  }
}

// Convert ProductImage from API to FormImage
function toFormImage(img: ProductImage, index: number): FormImage {
  return {
    id: img.id,
    objectKey: img.objectKey || extractKeyFromUrl(img.url),
    url: img.url || "",
    mimeType: "image/jpeg",
    size: 0,
    sortOrder: img.sortOrder ?? index,
    isMain: Boolean(img.isMain),
    isNew: false,
  };
}

/**
 * Convert FormImage to ProductImagePayload for API
 * ONLY include fields accepted by backend: objectKey, url, sortOrder, isMain
 * Do NOT include mimeType, size, id, etc. - they will cause validation errors
 */
function toImagePayload(img: FormImage, index: number): ProductImagePayload {
  return {
    objectKey: img.objectKey || extractKeyFromUrl(img.url),
    url: img.url,
    sortOrder: index,
    isMain: Boolean(img.isMain),
  };
}

// Default form state to prevent uncontrolled->controlled warnings
function getDefaultFormState() {
  return {
    name: "",
    description: "",
    price: "",
    stock: "",
    stockStatus: "IN_STOCK" as "IN_STOCK" | "OUT_OF_STOCK",
    deliveryType: "VENDOR_DELIVERY" as "VENDOR_DELIVERY" | "JEMO_RIDER",
    categoryId: "",
    city: "",
    condition: "NEW" as "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "REFURBISHED",
    paymentPolicy: "POD_ONLY" as PaymentPolicy,
    mtnMomoEnabled: true,
    orangeMoneyEnabled: true,
  };
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const locale = useLocale();

  const [product, setProduct] = useState<VendorProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state - initialized with safe defaults
  const [form, setForm] = useState(getDefaultFormState);
  
  // Images state - always an array of FormImage objects
  const [images, setImages] = useState<FormImage[]>([]);
  
  // New image URL input
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const products = await api.get<VendorProduct[]>("/vendor/products", true);
        const found = products.find((p) => p.id === params.id);

        if (found) {
          setProduct(found);
          
          // Hydrate form with safe coercion
          setForm({
            name: String(found.name ?? ""),
            description: String(found.description ?? ""),
            price: found.price != null ? String(found.price) : "",
            stock: found.stock != null ? String(found.stock) : "0",
            stockStatus: (found.stockStatus as "IN_STOCK" | "OUT_OF_STOCK") || "IN_STOCK",
            deliveryType: (found.deliveryType as "VENDOR_DELIVERY" | "JEMO_RIDER") || "VENDOR_DELIVERY",
            categoryId: "", // Will be set if available
            city: "",
            condition: (found.condition as typeof form.condition) || "NEW",
            // Payment policy - defaults to POD_ONLY for backwards compatibility
            paymentPolicy: found.paymentPolicy || "POD_ONLY",
            mtnMomoEnabled: found.mtnMomoEnabled !== false,
            orangeMoneyEnabled: found.orangeMoneyEnabled !== false,
          });
          
          // Map images to FormImage objects
          const productImages = found.images || [];
          const mappedImages = productImages.map((img, index) => toFormImage(img, index));
          
          // Ensure exactly one image is marked as main
          if (mappedImages.length > 0 && !mappedImages.some(img => img.isMain)) {
            mappedImages[0].isMain = true;
          }
          
          setImages(mappedImages);
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [params.id, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Add new image from URL
  const handleAddImage = () => {
    const url = newImageUrl.trim();
    if (!url) {
      toast.error("Please enter an image URL");
      return;
    }
    
    if (images.length >= 15) {
      toast.error("Maximum 15 images allowed");
      return;
    }
    
    const newImage: FormImage = {
      objectKey: extractKeyFromUrl(url),
      url: url,
      mimeType: "image/jpeg",
      size: 0,
      sortOrder: images.length,
      isMain: images.length === 0, // First image is main by default
      isNew: true,
    };
    
    setImages((prev) => [...prev, newImage]);
    setNewImageUrl("");
    setErrors((prev) => ({ ...prev, images: "" }));
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      
      // Re-assign sortOrder
      updated.forEach((img, i) => {
        img.sortOrder = i;
      });
      
      // If removed image was main, set first as main
      if (updated.length > 0 && !updated.some(img => img.isMain)) {
        updated[0].isMain = true;
      }
      
      return updated;
    });
  };

  // Set image as main
  const handleSetMain = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isMain: i === index,
      }))
    );
  };

  // Move image up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      // Re-assign sortOrder
      updated.forEach((img, i) => {
        img.sortOrder = i;
      });
      return updated;
    });
  };

  // Move image down
  const handleMoveDown = (index: number) => {
    if (index >= images.length - 1) return;
    setImages((prev) => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      // Re-assign sortOrder
      updated.forEach((img, i) => {
        img.sortOrder = i;
      });
      return updated;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      newErrors.price = "Enter a valid price";
    }

    const stock = parseInt(form.stock, 10);
    if (isNaN(stock) || stock < 0) {
      newErrors.stock = "Enter a valid stock quantity";
    }

    if (images.length === 0) {
      newErrors.images = "At least one image is required";
    } else if (!images.some(img => img.isMain)) {
      newErrors.images = "Please select a main image";
    }

    // Payment policy validation
    if (form.paymentPolicy !== "POD_ONLY" && !form.mtnMomoEnabled && !form.orangeMoneyEnabled) {
      newErrors.paymentProviders = "At least one online payment method required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    // Build payload with properly typed images
    const payload: UpdateProductPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Math.round(parseFloat(form.price)),
      stock: parseInt(form.stock, 10),
      stockStatus: form.stockStatus,
      deliveryType: form.deliveryType,
      // Payment policy
      paymentPolicy: form.paymentPolicy,
      mtnMomoEnabled: form.mtnMomoEnabled,
      orangeMoneyEnabled: form.orangeMoneyEnabled,
      // Map images to the expected payload format
      images: images.map((img, index) => toImagePayload(img, index)),
    };

    try {
      await api.patch<VendorProduct>(`/vendor/products/${params.id}`, payload, true);
      toast.success("Product updated successfully!");
      router.push("/vendor/products");
    } catch (err) {
      console.error("Failed to update product:", err);
      if (err instanceof ApiError) {
        const data = err.data as { message?: string | string[]; error?: string };
        const message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : data?.message || data?.error;
        toast.error(message || "Failed to update product");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-48" />
        <div className="card p-6 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState
        type="error"
        title="Product not found"
        description="The product you're looking for doesn't exist or you don't have access."
        actionLabel="Back to Products"
        actionHref="/vendor/products"
      />
    );
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/vendor/products"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-2"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back to Products</span>
        </Link>
        <h1 className="text-h1 text-gray-900">Edit Product</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Fresh Tomatoes"
            className={errors.name ? "border-red-500" : ""}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe your product..."
            rows={4}
            className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              errors.description ? "border-red-500" : ""
            }`}
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        {/* Price & Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price (XAF) *</Label>
            <Input
              id="price"
              name="price"
              type="number"
              min="0"
              value={form.price}
              onChange={handleChange}
              placeholder="e.g. 5000"
              className={errors.price ? "border-red-500" : ""}
            />
            {errors.price && (
              <p className="text-sm text-red-500">{errors.price}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock Quantity *</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={handleChange}
              placeholder="e.g. 100"
              className={errors.stock ? "border-red-500" : ""}
            />
            {errors.stock && (
              <p className="text-sm text-red-500">{errors.stock}</p>
            )}
          </div>
        </div>

        {/* Stock Status */}
        <div className="space-y-2">
          <Label htmlFor="stockStatus">Stock Status</Label>
          <select
            id="stockStatus"
            name="stockStatus"
            value={form.stockStatus}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="IN_STOCK">In Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>

        {/* Delivery Type */}
        <div className="space-y-2">
          <Label htmlFor="deliveryType">Delivery Type</Label>
          <select
            id="deliveryType"
            name="deliveryType"
            value={form.deliveryType}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="VENDOR_DELIVERY">Vendor Delivery</option>
            <option value="JEMO_RIDER">Jemo Rider</option>
          </select>
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <select
            id="condition"
            name="condition"
            value={form.condition}
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="NEW">New</option>
            <option value="USED_LIKE_NEW">Used - Like New</option>
            <option value="USED_GOOD">Used - Good</option>
            <option value="REFURBISHED">Refurbished</option>
          </select>
        </div>

        {/* Payment Options */}
        <div className="space-y-4 border-t pt-4">
          <Label>
            {locale === "fr" ? "Options de paiement" : "Payment Options"} *
          </Label>
          <p className="text-sm text-gray-500">
            {locale === "fr" 
              ? "Choisissez comment les acheteurs peuvent payer ce produit"
              : "Choose how buyers can pay for this product"}
          </p>
          
          <div className="space-y-3">
            {/* Pay on Delivery Only */}
            <label className={`flex items-start gap-3 p-4 rounded border cursor-pointer transition-colors ${form.paymentPolicy === "POD_ONLY" ? "border-jemo-orange bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
              <input 
                type="radio" 
                name="paymentPolicy" 
                value="POD_ONLY" 
                checked={form.paymentPolicy === "POD_ONLY"} 
                onChange={handleChange} 
                className="mt-1"
              />
              <div>
                <p className="font-medium">
                  {locale === "fr" ? "Paiement à la livraison uniquement" : "Pay on Delivery only"}
                </p>
                <p className="text-sm text-gray-500">
                  {locale === "fr" 
                    ? "Les acheteurs paient en espèces lors de la livraison."
                    : "Buyers pay in cash when the product is delivered."}
                </p>
              </div>
            </label>

            {/* Online Payment Only */}
            <label className={`flex items-start gap-3 p-4 rounded border cursor-pointer transition-colors ${form.paymentPolicy === "ONLINE_ONLY" ? "border-jemo-orange bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
              <input 
                type="radio" 
                name="paymentPolicy" 
                value="ONLINE_ONLY" 
                checked={form.paymentPolicy === "ONLINE_ONLY"} 
                onChange={handleChange} 
                className="mt-1"
              />
              <div>
                <p className="font-medium">
                  {locale === "fr" ? "Paiement en ligne uniquement" : "Online payment only"}
                </p>
                <p className="text-sm text-gray-500">
                  {locale === "fr" 
                    ? "MTN MoMo ou Orange Money requis avant la livraison."
                    : "MTN MoMo or Orange Money required before delivery."}
                </p>
              </div>
            </label>

            {/* Mixed City Rule */}
            <label className={`flex items-start gap-3 p-4 rounded border cursor-pointer transition-colors ${form.paymentPolicy === "MIXED_CITY_RULE" ? "border-jemo-orange bg-orange-50" : "border-gray-200 hover:border-gray-300"}`}>
              <input 
                type="radio" 
                name="paymentPolicy" 
                value="MIXED_CITY_RULE" 
                checked={form.paymentPolicy === "MIXED_CITY_RULE"} 
                onChange={handleChange} 
                className="mt-1"
              />
              <div>
                <p className="font-medium">
                  {locale === "fr" ? "Mixte: Selon la localisation" : "Mixed: Based on location"}
                </p>
                <p className="text-sm text-gray-500">
                  {locale === "fr" 
                    ? "Paiement à la livraison pour la même ville, en ligne pour les autres."
                    : "Pay on Delivery for same city, Online for different cities."}
                </p>
              </div>
            </label>
          </div>

          {/* Online Payment Providers */}
          {form.paymentPolicy !== "POD_ONLY" && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <Label>
                {locale === "fr" ? "Méthodes de paiement activées" : "Enabled Payment Methods"}
              </Label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    name="mtnMomoEnabled" 
                    checked={form.mtnMomoEnabled} 
                    onChange={handleChange}
                  />
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-yellow-400 rounded text-xs font-bold flex items-center justify-center">MTN</span>
                    MTN Mobile Money
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    name="orangeMoneyEnabled" 
                    checked={form.orangeMoneyEnabled} 
                    onChange={handleChange}
                  />
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 rounded text-xs font-bold text-white flex items-center justify-center">OM</span>
                    Orange Money
                  </span>
                </label>
              </div>
              {errors.paymentProviders && (
                <p className="text-sm text-red-500">{errors.paymentProviders}</p>
              )}
            </div>
          )}
        </div>

        {/* Product Images */}
        <div className="space-y-4">
          <Label>Product Images *</Label>
          
          {/* Add new image */}
          <div className="flex gap-2">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddImage}
              disabled={images.length >= 15}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
          
          {errors.images && (
            <p className="text-sm text-red-500">{errors.images}</p>
          )}
          
          {/* Image list */}
          {images.length > 0 ? (
            <div className="space-y-2">
              {images.map((img, index) => (
                <div
                  key={img.objectKey + index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    img.isMain ? "border-jemo-orange bg-orange-50" : "border-gray-200 bg-white"
                  }`}
                >
                  {/* Reorder controls */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Image preview */}
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    {img.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.url}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImagePlus className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Image info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">{img.url}</p>
                    {img.isMain && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-jemo-orange">
                        <Star className="w-3 h-3 fill-current" />
                        Main Image
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!img.isMain && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetMain(index)}
                        title="Set as main image"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg text-center">
              <ImagePlus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">No images added yet</p>
              <p className="text-xs text-gray-400">Add image URLs above</p>
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            {images.length}/15 images. Click the star to set the main image.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
