"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Product, Order } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/shared";
import {
  MapPin,
  Truck,
  Store,
  Check,
  Minus,
  Plus,
  ChevronLeft,
  Loader2,
  CreditCard,
  LogIn,
  Phone,
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      if (!params.id) return;

      try {
        const data = await api.get<Product>(`/products/${params.id}`);
        setProduct(data);
      } catch (err) {
        setError("Product not found");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [params.id]);

  // Pre-fill phone from user data
  useEffect(() => {
    if (user?.phone) {
      setDeliveryPhone(user.phone);
    }
  }, [user]);

  const handleBuyNowClick = () => {
    // Block ADMIN from placing orders
    if (user?.role === "ADMIN") {
      toast.error("Admins cannot place orders. This is a customer feature.");
      return;
    }
    setShowOrderForm(true);
  };

  const handlePlaceOrder = async () => {
    if (!product || !isLoggedIn) return;

    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address.");
      return;
    }

    if (!deliveryPhone.trim()) {
      toast.error("Please enter a phone number.");
      return;
    }

    setOrdering(true);

    const orderPayload = {
      items: [{ productId: product.id, quantity: Number(quantity) }],
      paymentMethod: "COD",
      deliveryAddress: deliveryAddress.trim(),
      deliveryPhone: deliveryPhone.trim(),
    };

    if (process.env.NODE_ENV === "development") {
      console.log("[BuyNow] Payload:", orderPayload);
    }

    try {
      const order = await api.post<Order>("/orders", orderPayload, true);

      toast.success("Order placed successfully!");
      router.push(`/orders/${order.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          toast.error("Please login to place an order.");
          router.push("/login");
          return;
        }
        
        if (err.status === 403) {
          toast.error("You are not allowed to place orders.");
          return;
        }
        
        const data = err.data as { message?: string | string[] };
        const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
        
        if (process.env.NODE_ENV === "development") {
          console.error("[BuyNow] Error data:", err.data);
        }
        
        if (message?.toLowerCase().includes("stock")) {
          toast.error("Sorry, this product is out of stock.");
        } else {
          toast.error(message || "Could not place order. Please try again.");
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setOrdering(false);
    }
  };

  const images = product?.images?.length
    ? product.images
    : [{ id: "placeholder", url: "/placeholder-product.svg", isPrimary: true }];

  const currentImage = images[selectedImage]?.url || images[0]?.url;
  const vendorCity =
    product?.vendorProfile?.businessAddress?.split(",")[0] || "Cameroon";
  const isInStock = product && product.stock > 0;

  if (loading) {
    return (
      <div className="py-6">
        <div className="container-main">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="error"
            title="Product not found"
            description="The product you're looking for doesn't exist or has been removed."
            actionLabel="Browse Products"
            actionHref="/products"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 pb-32 md:pb-12">
      <div className="container-main">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 tap-highlight-none"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-body">Back</span>
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
              <Image
                src={currentImage}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
              {!isInStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                      selectedImage === idx
                        ? "border-jemo-orange"
                        : "border-transparent"
                    }`}
                  >
                    <Image
                      src={img.url}
                      alt={`${product.name} ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-h1 text-gray-900 mb-2">{product.name}</h1>
              <p className="text-3xl font-bold text-jemo-orange">
                {formatPrice(product.price)}
              </p>
            </div>

            {/* Vendor Info */}
            <div className="flex items-center gap-4 text-body text-gray-500">
              <div className="flex items-center gap-1.5">
                <Store className="w-4 h-4" />
                <span>{product.vendorProfile?.businessName || "Vendor"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{vendorCity}</span>
              </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {isInStock ? (
                <>
                  <Check className="w-5 h-5 text-status-success" />
                  <span className="text-status-success font-medium">
                    In Stock ({product.stock} available)
                  </span>
                </>
              ) : (
                <span className="text-status-error font-medium">Out of Stock</span>
              )}
            </div>

            {/* Delivery Type */}
            <div className="flex items-center gap-2 text-body text-gray-700">
              <Truck className="w-5 h-5 text-gray-500" />
              <span>
                {product.deliveryType === "JEMO_RIDER"
                  ? "Delivery by Jemo Rider"
                  : "Delivery by Vendor"}
              </span>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-h3 text-gray-900 mb-2">Description</h2>
              <p className="text-body text-gray-700 whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Quantity Selector */}
            {isInStock && (
              <div className="flex items-center gap-4">
                <span className="text-body text-gray-700">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
                    className="p-2 hover:bg-gray-100 transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Buy Now Section */}
            <div className="hidden md:block space-y-4">
              {!authLoading && (
                <>
                  {isLoggedIn ? (
                    <>
                      {!showOrderForm ? (
                        <>
                          <Button
                            size="lg"
                            className="w-full bg-jemo-orange hover:bg-jemo-orange/90"
                            onClick={handleBuyNowClick}
                            disabled={!isInStock}
                          >
                            <CreditCard className="w-5 h-5 mr-2" />
                            Buy Now (Pay on Delivery)
                          </Button>
                          <p className="text-small text-gray-500 text-center">
                            You&apos;ll confirm your order immediately
                          </p>
                        </>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                          <h3 className="text-h3 text-gray-900">Delivery Details</h3>
                          
                          <div className="space-y-2">
                            <Label htmlFor="deliveryAddress">Delivery Address</Label>
                            <Input
                              id="deliveryAddress"
                              placeholder="Enter your delivery address"
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              className="bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="deliveryPhone">Phone Number</Label>
                            <Input
                              id="deliveryPhone"
                              type="tel"
                              placeholder="e.g. 670123456"
                              value={deliveryPhone}
                              onChange={(e) => setDeliveryPhone(e.target.value)}
                              className="bg-white"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setShowOrderForm(false)}
                              disabled={ordering}
                            >
                              Cancel
                            </Button>
                            <Button
                              className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                              onClick={handlePlaceOrder}
                              disabled={ordering || !deliveryAddress.trim() || !deliveryPhone.trim()}
                            >
                              {ordering ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Placing...
                                </>
                              ) : (
                                "Place Order"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-gray-700 mb-3">
                        Login to place your order
                      </p>
                      <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                        <Link href={`/login?redirect=/products/${product.id}`}>
                          <LogIn className="w-4 h-4 mr-2" />
                          Login to continue
                        </Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-40">
        {showOrderForm && isLoggedIn ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Delivery address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="w-32">
                <Input
                  type="tel"
                  placeholder="Phone"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowOrderForm(false)}
                disabled={ordering}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                onClick={handlePlaceOrder}
                disabled={ordering || !deliveryAddress.trim() || !deliveryPhone.trim()}
              >
                {ordering ? <Loader2 className="w-5 h-5 animate-spin" /> : "Place Order"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-small text-gray-500">Total</p>
                <p className="text-h3 text-jemo-orange font-bold">
                  {formatPrice(parseFloat(product.price) * quantity)}
                </p>
              </div>
              {!authLoading && (
                <>
                  {isLoggedIn ? (
                    <Button
                      size="lg"
                      onClick={handleBuyNowClick}
                      disabled={!isInStock}
                      className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                    >
                      Buy Now
                    </Button>
                  ) : (
                    <Button asChild size="lg" className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90">
                      <Link href={`/login?redirect=/products/${product.id}`}>
                        Login to Buy
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
            {isLoggedIn && (
              <p className="text-small text-gray-500 text-center mt-2">
                Pay on Delivery
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
