"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { CreateProductPayload, VendorProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { ChevronLeft, Loader2, ImagePlus } from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    deliveryType: "VENDOR_DELIVERY" as "VENDOR_DELIVERY" | "JEMO_RIDER",
    imageUrl: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
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

    if (!form.imageUrl.trim()) {
      newErrors.imageUrl = "Image URL is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setSubmitting(true);

    const payload: CreateProductPayload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Math.round(parseFloat(form.price)),
      stock: parseInt(form.stock, 10),
      deliveryType: form.deliveryType,
      images: [form.imageUrl.trim()],
    };

    try {
      await api.post<VendorProduct>("/vendor/products", payload, true);
      toast.success("Product created successfully!");
      router.push("/vendor/products");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { message?: string | string[] };
        const message = Array.isArray(data?.message)
          ? data.message[0]
          : data?.message;
        toast.error(message || "Failed to create product");
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setSubmitting(false);
    }
  };

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
        <h1 className="text-h1 text-gray-900">Add New Product</h1>
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

        {/* Image URL */}
        <div className="space-y-2">
          <Label htmlFor="imageUrl">Product Image URL *</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id="imageUrl"
                name="imageUrl"
                value={form.imageUrl}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
                className={errors.imageUrl ? "border-red-500" : ""}
              />
            </div>
            <div className="w-16 h-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <ImagePlus className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
          {errors.imageUrl && (
            <p className="text-sm text-red-500">{errors.imageUrl}</p>
          )}
          <p className="text-xs text-gray-500">
            Paste a direct link to your product image
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
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
                Creating...
              </>
            ) : (
              "Create Product"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

