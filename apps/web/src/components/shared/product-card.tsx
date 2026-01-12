"use client";

import { cn, formatPrice } from "@/lib/utils";
import type { Product, ProductListItem } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/translations";

type ProductCardProduct = Product | ProductListItem;

interface ProductCardProps {
  product: ProductCardProduct;
  onAddToCart?: (product: ProductCardProduct) => void;
  className?: string;
}

function getImageUrl(product: ProductCardProduct): string {
  if ("imageUrl" in product && product.imageUrl) return product.imageUrl;
  if ("images" in product && product.images?.length) {
    return product.images.find((img) => img.isPrimary)?.url || product.images[0]?.url || "/placeholder-product.svg";
  }
  return "/placeholder-product.svg";
}

function getVendorCity(product: ProductCardProduct): string {
  if ("vendorCity" in product) return product.vendorCity;
  if ("vendorProfile" in product) return product.vendorProfile?.businessAddress?.split(",")[0] || "Cameroon";
  return "Cameroon";
}

export function ProductCard({
  product,
  onAddToCart,
  className,
}: ProductCardProps) {
  const locale = useLocale();
  const imageUrl = getImageUrl(product);
  const vendorCity = getVendorCity(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product);
  };

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
      </div>

      <div className="space-y-1.5">
        <h3 className="text-body font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        <p className="text-h3 text-jemo-orange font-bold">
          {formatPrice(product.price)}
        </p>

        <div className="flex items-center gap-1 text-small text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>{vendorCity}</span>
        </div>
      </div>

      {onAddToCart && product.stock > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddToCart}
          className="absolute top-2 right-2 bg-white/90 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Add to cart"
        >
          <ShoppingCart className="w-4 h-4" />
        </Button>
      )}
    </Link>
  );
}

