"use client";

import { useState } from "react";
import { cn, formatPrice } from "@/lib/utils";
import type { Product, ProductListItem } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "@/lib/translations";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";

type ProductCardProduct = Product | ProductListItem;

interface ProductCardProps {
  product: ProductCardProduct;
  className?: string;
}

function getImageUrl(product: ProductCardProduct): string {
  if ("imageUrl" in product && product.imageUrl) return product.imageUrl;
  if ("images" in product && product.images?.length) {
    return product.images.find((img) => img.isMain)?.url || product.images[0]?.url || "/placeholder-product.svg";
  }
  return "/placeholder-product.svg";
}

function getVendorCity(product: ProductCardProduct): string {
  if ("vendorCity" in product) return product.vendorCity;
  if ("city" in product && product.city) return product.city;
  if ("vendorProfile" in product) return product.vendorProfile?.businessAddress?.split(",")[0] || "Cameroon";
  return "Cameroon";
}

function getIsFavorited(product: ProductCardProduct): boolean {
  if ("isFavorited" in product) return Boolean(product.isFavorited);
  return false;
}

export function ProductCard({
  product,
  className,
}: ProductCardProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const { user } = useAuth();
  const toast = useToast();
  
  const imageUrl = getImageUrl(product);
  const vendorCity = getVendorCity(product);
  const initialFavorited = getIsFavorited(product);
  
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if logged in
    if (!user) {
      toast.error(t("loginToFavorite") || "Please log in to add favorites");
      return;
    }
    
    if (isToggling) return;
    
    setIsToggling(true);
    
    // Optimistic update
    setIsFavorited(!isFavorited);
    
    try {
      const result = await api.post<{ isFavorited: boolean }>(
        `/favorites/${product.id}/toggle`,
        {},
        true
      );
      setIsFavorited(result.isFavorited);
    } catch (err) {
      // Revert on error
      setIsFavorited(isFavorited);
      console.error("Failed to toggle favorite:", err);
      toast.error(t("error") || "Something went wrong");
    } finally {
      setIsToggling(false);
    }
  };

  // Calculate display price
  const displayPrice = "discountPrice" in product && product.discountPrice 
    ? product.discountPrice 
    : product.price;
  const hasDiscount = "discountPrice" in product && product.discountPrice && product.discountPrice < product.price;

  return (
    <Link
      href={`/${locale}/products/${product.id}`}
      className={cn(
        "card-hover block p-3 group tap-highlight-none relative",
        className
      )}
    >
      {/* Square image container - 1:1 aspect ratio */}
      <div className="relative aspect-[1/1] mb-3 bg-gray-100 rounded-md overflow-hidden">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Out of Stock</span>
          </div>
        )}
        
        {/* Favorite Button - Always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleFavorite}
          disabled={isToggling}
          className={cn(
            "absolute top-2 right-2 w-8 h-8 rounded-full transition-all",
            isFavorited 
              ? "bg-red-50 hover:bg-red-100" 
              : "bg-white/90 hover:bg-white shadow-sm"
          )}
          aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart 
            className={cn(
              "w-4 h-4 transition-colors",
              isFavorited 
                ? "fill-red-500 text-red-500" 
                : "text-gray-500 hover:text-red-500"
            )} 
          />
        </Button>
      </div>

      <div className="space-y-1.5">
        <h3 className="text-body font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        <div className="flex items-center gap-2">
          <p className="text-h3 text-jemo-orange font-bold">
            {formatPrice(displayPrice)}
          </p>
          {hasDiscount && (
            <p className="text-sm text-gray-400 line-through">
              {formatPrice(product.price)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 text-small text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>{vendorCity}</span>
        </div>
      </div>
    </Link>
  );
}
