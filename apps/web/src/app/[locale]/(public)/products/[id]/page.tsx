"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import type { Product, Order, PaymentPolicy } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { useLocale, useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/shared";
// Cameroon cities list
const CAMEROON_CITIES = [
  "Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua", "Bafoussam",
  "Ngaoundéré", "Bertoua", "Ebolowa", "Buea", "Kribi", "Limbe",
  "Kumba", "Nkongsamba", "Edéa", "Loum", "Mbalmayo", "Sangmélima",
  "Dschang", "Foumban", "Mbouda", "Bafang", "Bandjoun", "Tiko",
  "Mutengene", "Wum", "Fundong", "Kumbo", "Nkambe", "Mamfe",
  "Kousseri", "Mora", "Mokolo", "Guider", "Pitoa", "Meiganga",
  "Tibati", "Batouri", "Yokadouma", "Abong-Mbang"
];
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
  Heart,
  Star,
  Package,
  ChevronDown,
  Search,
} from "lucide-react";

// Review type
interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: { id: string; name: string };
  product: { id: string; name: string };
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
}

interface DeliveryFeeResult {
  available: boolean;
  fee: number | null;
  feeType: 'free' | 'flat' | 'same_city' | 'other_city' | 'jemo' | null;
  reason?: string;
  agencyId?: string;
  agencyName?: string;
  rule?: 'SAME_CITY' | 'OTHER_CITY';
}

// Payment method availability result
interface PaymentMethodResult {
  method: 'POD' | 'ONLINE' | null;
  mtnMomoEnabled: boolean;
  orangeMoneyEnabled: boolean;
  reason: string;
}

/**
 * Determine available payment method based on product's payment policy and selected city
 */
function getAvailablePaymentMethod(
  paymentPolicy: PaymentPolicy | undefined,
  productCity: string | undefined,
  selectedCity: string | undefined,
  mtnMomoEnabled: boolean = true,
  orangeMoneyEnabled: boolean = true
): PaymentMethodResult {
  // Default to POD_ONLY for backwards compatibility
  const policy = paymentPolicy || 'POD_ONLY';
  
  // Normalize city names for comparison
  const normalizedProductCity = (productCity || '').toLowerCase().trim();
  const normalizedSelectedCity = (selectedCity || '').toLowerCase().trim();
  const isSameCity = normalizedProductCity === normalizedSelectedCity;
  
  if (policy === 'POD_ONLY') {
    return {
      method: 'POD',
      mtnMomoEnabled: false,
      orangeMoneyEnabled: false,
      reason: 'payOnDeliveryOnly',
    };
  }
  
  if (policy === 'ONLINE_ONLY') {
    return {
      method: 'ONLINE',
      mtnMomoEnabled,
      orangeMoneyEnabled,
      reason: 'onlinePaymentRequired',
    };
  }
  
  // MIXED_CITY_RULE
  if (!selectedCity) {
    return {
      method: null,
      mtnMomoEnabled: false,
      orangeMoneyEnabled: false,
      reason: 'selectCityFirst',
    };
  }
  
  if (isSameCity) {
    return {
      method: 'POD',
      mtnMomoEnabled: false,
      orangeMoneyEnabled: false,
      reason: 'sameCityPayOnDelivery',
    };
  } else {
    return {
      method: 'ONLINE',
      mtnMomoEnabled,
      orangeMoneyEnabled,
      reason: 'otherCityOnlinePayment',
    };
  }
}

// Star Rating Component
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// City Selector Component
function CitySelector({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (city: string) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCities = useMemo(() => {
    if (!search.trim()) return CAMEROON_CITIES;
    return CAMEROON_CITIES.filter((city) =>
      city.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white hover:border-gray-400 transition-colors"
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-jemo-orange/20"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredCities.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No cities found</div>
            ) : (
              filteredCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    onChange(city);
                    setIsOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    value === city ? 'bg-jemo-orange/10 text-jemo-orange font-medium' : 'text-gray-700'
                  }`}
                >
                  {city}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Review Card Component
function ReviewCard({ review }: { review: Review }) {
  const initials = review.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="border-b border-gray-100 py-4 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-jemo-orange/10 flex items-center justify-center text-jemo-orange font-medium text-sm">
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{review.user.name}</span>
            <span className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
          <StarRating rating={review.rating} size="sm" />
          {review.comment && (
            <p className="mt-2 text-sm text-gray-600">{review.comment}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Reviewed: {review.product.name}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
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

  // Favorites state
  const [isFavorited, setIsFavorited] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  // Delivery calculator state
  const [selectedCity, setSelectedCity] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<DeliveryFeeResult | null>(null);
  const [calculatingFee, setCalculatingFee] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [showVendorReviews, setShowVendorReviews] = useState(true);

  useEffect(() => {
    async function fetchProduct() {
      if (!params.id) return;

      try {
        const data = await api.get<Product>(`/products/${params.id}`);
        setProduct(data);
        setIsFavorited(data.isFavorited || false);
        setReviewStats(data.reviewStats || null);
      } catch (err) {
        setError("Product not found");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [params.id]);

  // Fetch reviews when vendor profile is available
  useEffect(() => {
    if (!product?.vendorProfile?.id) return;

    async function fetchReviews() {
      setReviewsLoading(true);
      try {
        const endpoint = showVendorReviews
          ? `/reviews/vendor/${product!.vendorProfile!.id}?page=${reviewPage}&pageSize=5`
          : `/reviews/product/${product!.id}?page=${reviewPage}&pageSize=5`;
        
        const result = await api.get<{
          data: Review[];
          stats: ReviewStats;
          pagination: { total: number; totalPages: number };
        }>(endpoint);
        
        if (reviewPage === 1) {
          setReviews(result.data);
        } else {
          setReviews((prev) => [...prev, ...result.data]);
        }
        setReviewStats(result.stats);
        setHasMoreReviews(reviewPage < result.pagination.totalPages);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setReviewsLoading(false);
      }
    }

    fetchReviews();
  }, [product?.vendorProfile?.id, product?.id, reviewPage, showVendorReviews]);

  // Calculate delivery fee when city changes
  useEffect(() => {
    if (!selectedCity || !product?.id) {
      setDeliveryFee(null);
      return;
    }

    async function calculateFee() {
      setCalculatingFee(true);
      try {
        // For Jemo Delivery, use the new quote API
        if (product!.deliveryType === "JEMO_RIDER") {
          const quoteResult = await api.get<{
            fee: number;
            currency: string;
            agencyId: string;
            agencyName: string;
            rule: 'SAME_CITY' | 'OTHER_CITY';
            available: boolean;
            message?: string;
          }>(`/delivery/quote?productId=${product!.id}&toCity=${encodeURIComponent(selectedCity)}`);

          if (quoteResult.available) {
            setDeliveryFee({
              available: true,
              fee: quoteResult.fee,
              feeType: 'jemo',
              agencyId: quoteResult.agencyId,
              agencyName: quoteResult.agencyName,
              rule: quoteResult.rule,
            });
          } else {
            setDeliveryFee({
              available: false,
              fee: null,
              feeType: null,
              reason: quoteResult.message || "Jemo Delivery not available for this location",
            });
          }
        } else {
          // For vendor delivery, use the existing endpoint
          const result = await api.get<DeliveryFeeResult>(
            `/products/${product!.id}/delivery-fee?city=${encodeURIComponent(selectedCity)}`
          );
          setDeliveryFee(result);
        }
      } catch (err) {
        console.error("Failed to calculate delivery fee:", err);
        setDeliveryFee({
          available: false,
          fee: null,
          feeType: null,
          reason: "Failed to calculate",
        });
      } finally {
        setCalculatingFee(false);
      }
    }

    calculateFee();
  }, [selectedCity, product?.id, product?.deliveryType]);

  // Compute available payment method based on product policy and selected city
  const paymentMethodResult = useMemo(() => {
    return getAvailablePaymentMethod(
      product?.paymentPolicy,
      product?.city || product?.vendorProfile?.businessAddress?.split(",")[0],
      selectedCity,
      product?.mtnMomoEnabled ?? true,
      product?.orangeMoneyEnabled ?? true
    );
  }, [product?.paymentPolicy, product?.city, product?.vendorProfile?.businessAddress, selectedCity, product?.mtnMomoEnabled, product?.orangeMoneyEnabled]);

  // Pre-fill phone from user data
  useEffect(() => {
    if (user?.phone) {
      setDeliveryPhone(user.phone);
    }
  }, [user]);

  const handleToggleFavorite = async () => {
    if (!isLoggedIn) {
      toast.error(t("loginToFavorite"));
      return;
    }

    if (togglingFavorite || !product) return;

    setTogglingFavorite(true);
    setIsFavorited(!isFavorited);

    try {
      const result = await api.post<{ isFavorited: boolean }>(
        `/favorites/${product.id}/toggle`,
        {},
        true
      );
      setIsFavorited(result.isFavorited);
    } catch (err) {
      setIsFavorited(isFavorited);
      console.error("Failed to toggle favorite:", err);
      toast.error(tCommon("error"));
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleBuyNowClick = () => {
    if (user?.role === "ADMIN") {
      toast.error("Admins cannot place orders. This is a customer feature.");
      return;
    }
    setShowOrderForm(true);
  };

  const handlePlaceOrder = async () => {
    if (!product || !isLoggedIn) return;

    if (!deliveryAddress.trim()) {
      toast.error(locale === "fr" ? "Veuillez entrer une adresse de livraison." : "Please enter a delivery address.");
      return;
    }

    if (!deliveryPhone.trim()) {
      toast.error(locale === "fr" ? "Veuillez entrer un numéro de téléphone." : "Please enter a phone number.");
      return;
    }

    // Check if payment method is determined
    if (!paymentMethodResult.method) {
      toast.error(locale === "fr" ? "Veuillez sélectionner une ville de livraison." : "Please select a delivery city.");
      return;
    }

    // For Jemo Delivery, validate that delivery is available
    if (product.deliveryType === "JEMO_RIDER") {
      if (!selectedCity) {
        toast.error(locale === "fr" ? "Veuillez sélectionner une ville de livraison." : "Please select a delivery city.");
        return;
      }
      if (!deliveryFee?.available) {
        toast.error(locale === "fr" ? "La livraison Jemo n'est pas disponible pour cette destination." : "Jemo Delivery is not available for this destination.");
        return;
      }
    }

    setOrdering(true);

    // Determine payment method based on product policy
    const paymentMethod = paymentMethodResult.method === 'ONLINE' 
      ? (paymentMethodResult.mtnMomoEnabled ? 'MTN_MOBILE_MONEY' : 'ORANGE_MONEY')
      : 'COD';

    const orderPayload = {
      items: [{ productId: product.id, quantity: Number(quantity) }],
      paymentMethod,
      deliveryAddress: deliveryAddress.trim(),
      deliveryPhone: deliveryPhone.trim(),
      // Include delivery city for server-side fee calculation
      deliveryCity: selectedCity || undefined,
      // For vendor delivery, pass client-calculated fee; for Jemo Delivery, server calculates
      deliveryFee: product.deliveryType !== "JEMO_RIDER" ? (deliveryFee?.fee || 0) : undefined,
    };

    try {
      const order = await api.post<Order>("/orders", orderPayload, true);
      toast.success("Order placed successfully!");
      router.push(`/${locale}/orders/${order.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          toast.error("Please login to place an order.");
          router.push(`/${locale}/login`);
          return;
        }
        
        const data = err.data as { message?: string | string[] };
        const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
        toast.error(message || "Could not place order. Please try again.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setOrdering(false);
    }
  };

  const images = product?.images?.length
    ? product.images
    : [{ id: "placeholder", url: "/placeholder-product.svg", isMain: true }];

  const currentImage = images[selectedImage]?.url || images[0]?.url;
  const vendorCity = product?.city || product?.vendorProfile?.businessAddress?.split(",")[0] || "Cameroon";
  const isInStock = product && product.stock > 0;

  // Calculate display price and total
  const displayPrice = product?.discountPrice || product?.price || "0";
  const hasDiscount = product?.discountPrice && parseFloat(product.discountPrice) < parseFloat(product.price);
  const productTotal = parseFloat(displayPrice) * quantity;
  const deliveryTotal = deliveryFee?.available && deliveryFee.fee !== null ? deliveryFee.fee : 0;
  const grandTotal = productTotal + deliveryTotal;

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
            actionHref={`/${locale}/products`}
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
          <span className="text-body">{tCommon("back")}</span>
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
                    {t("outOfStock")}
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
            {/* Title and Favorite Button */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-h1 text-gray-900 mb-2">{product.name}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-jemo-orange">
                    {formatPrice(displayPrice)}
                  </p>
                  {hasDiscount && (
                    <p className="text-lg text-gray-400 line-through">
                      {formatPrice(product.price)}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                disabled={togglingFavorite}
                className={`w-12 h-12 rounded-full ${
                  isFavorited
                    ? "bg-red-50 hover:bg-red-100"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <Heart
                  className={`w-6 h-6 ${
                    isFavorited
                      ? "fill-red-500 text-red-500"
                      : "text-gray-500"
                  }`}
                />
              </Button>
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
              {reviewStats && reviewStats.totalReviews > 0 && (
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{reviewStats.averageRating} ({reviewStats.totalReviews})</span>
                </div>
              )}
            </div>

            {/* Condition Badge */}
            {product.condition && product.condition !== "NEW" && (
              <div className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 rounded text-sm">
                {t(`condition.${product.condition}`) || product.condition}
              </div>
            )}

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {isInStock ? (
                <>
                  <Check className="w-5 h-5 text-status-success" />
                  <span className="text-status-success font-medium">
                    {t("inStock")} ({product.stock} {t("stock")})
                  </span>
                </>
              ) : (
                <span className="text-status-error font-medium">{t("outOfStock")}</span>
              )}
            </div>

            {/* Delivery Calculator Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-gray-700">
                <Truck className="w-5 h-5" />
                <span className="font-medium">{t("deliveryTo")}</span>
              </div>

              <CitySelector
                value={selectedCity}
                onChange={setSelectedCity}
                placeholder={t("selectDeliveryCity")}
              />

              {calculatingFee ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">{t("calculating")}</span>
                </div>
              ) : deliveryFee ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("productLocation")}:</span>
                    <span className="font-medium">{vendorCity}</span>
                  </div>
                  {deliveryFee.available ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t("deliveryFee")}:</span>
                        <span className="font-medium text-green-600">
                          {deliveryFee.fee === 0
                            ? t("freeDelivery")
                            : formatPrice(deliveryFee.fee!)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between">
                        <span className="text-gray-700 font-medium">{t("estimatedTotal")}:</span>
                        <span className="text-jemo-orange font-bold">
                          {formatPrice(grandTotal)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-red-500">{t("deliveryNotAvailable")}</div>
                  )}
                </div>
              ) : selectedCity === "" ? (
                <p className="text-sm text-gray-500">
                  {t("selectCityForDelivery")}
                </p>
              ) : null}

              {/* Delivery Options */}
              <div className="text-xs text-gray-500 space-y-1 border-t border-gray-200 pt-2">
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3" />
                  <span>
                    {product.deliveryType === "JEMO_RIDER"
                      ? t("deliveryType.jemoRider")
                      : t("deliveryType.vendorDelivery")}
                  </span>
                </div>
                {product.pickupAvailable && (
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    <span>{t("pickupAvailable")}</span>
                  </div>
                )}
              </div>

              {/* Payment Method Info */}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="font-medium text-sm">{tCommon("paymentMethod")}</span>
                </div>
                
                {paymentMethodResult.method === 'POD' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">
                      {tCommon("payOnDelivery")}
                    </span>
                  </div>
                )}
                
                {paymentMethodResult.method === 'ONLINE' && (
                  <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-700 font-medium mb-2">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      {tCommon("onlinePayment")}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {paymentMethodResult.mtnMomoEnabled && (
                        <span className="flex items-center gap-1">
                          <span className="w-5 h-5 bg-yellow-400 rounded text-[10px] font-bold flex items-center justify-center">MTN</span>
                          <span className="text-gray-600">MoMo</span>
                        </span>
                      )}
                      {paymentMethodResult.orangeMoneyEnabled && (
                        <span className="flex items-center gap-1">
                          <span className="w-5 h-5 bg-orange-500 rounded text-[10px] font-bold text-white flex items-center justify-center">OM</span>
                          <span className="text-gray-600">Orange</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {!paymentMethodResult.method && selectedCity && (
                  <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500">
                    {tCommon("selectCityForPayment")}
                  </div>
                )}

                {/* Contextual payment message based on policy */}
                {product.paymentPolicy === 'MIXED_CITY_RULE' && selectedCity && (
                  <p className="mt-2 text-xs text-gray-500">
                    {paymentMethodResult.method === 'POD' 
                      ? tCommon("sameCityPod")
                      : tCommon("otherCityOnline")}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-h3 text-gray-900 mb-2">{t("description")}</h2>
              <p className="text-body text-gray-700 whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Quantity Selector */}
            {isInStock && (
              <div className="flex items-center gap-4">
                <span className="text-body text-gray-700">{t("quantity")}:</span>
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
                            {t("buyNow")}
                          </Button>
                        </>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                          <h3 className="text-h3 text-gray-900">{t("deliveryDetails")}</h3>
                          
                          {/* Payment Method Display */}
                          <div className="p-3 rounded-lg border bg-white">
                            <p className="text-xs text-gray-500 mb-1">{tCommon("paymentMethod")}</p>
                            {paymentMethodResult.method === 'POD' ? (
                              <div className="flex items-center gap-2 text-green-700 font-medium">
                                <Check className="w-4 h-4" />
                                {tCommon("payOnDelivery")}
                              </div>
                            ) : paymentMethodResult.method === 'ONLINE' ? (
                              <div className="flex items-center gap-2 text-blue-700 font-medium">
                                <CreditCard className="w-4 h-4" />
                                {tCommon("onlinePayment")}
                                <span className="text-xs font-normal">
                                  ({paymentMethodResult.mtnMomoEnabled ? 'MTN MoMo' : ''}{paymentMethodResult.mtnMomoEnabled && paymentMethodResult.orangeMoneyEnabled ? ' / ' : ''}{paymentMethodResult.orangeMoneyEnabled ? 'Orange Money' : ''})
                                </span>
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm">
                                {tCommon("selectCityForPayment")}
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="deliveryAddress">{t("deliveryAddress")}</Label>
                            <Input
                              id="deliveryAddress"
                              placeholder={t("deliveryAddressPlaceholder")}
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              className="bg-white"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="deliveryPhone">{t("phoneNumber")}</Label>
                            <Input
                              id="deliveryPhone"
                              type="tel"
                              placeholder={t("phonePlaceholder")}
                              value={deliveryPhone}
                              onChange={(e) => setDeliveryPhone(e.target.value)}
                              className="bg-white"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              className="flex-1"
                              onClick={() => setShowOrderForm(false)}
                              disabled={ordering}
                            >
                              {tCommon("cancel")}
                            </Button>
                            <Button
                              className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                              onClick={handlePlaceOrder}
                              disabled={ordering || !deliveryAddress.trim() || !deliveryPhone.trim() || !paymentMethodResult.method}
                            >
                              {ordering ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  {t("placingOrder")}
                                </>
                              ) : (
                                t("placeOrder")
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-gray-700 mb-3">
                        {t("loginToOrder")}
                      </p>
                      <Button asChild className="bg-jemo-orange hover:bg-jemo-orange/90">
                        <Link href={`/${locale}/login?redirect=/products/${product.id}`}>
                          <LogIn className="w-4 h-4 mr-2" />
                          {t("loginToContinue")}
                        </Link>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Vendor Reviews Section */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-h2 text-gray-900">{t("vendorReviews")}</h2>
            {product.vendorProfile?.id && (
              <button
                onClick={() => {
                  setShowVendorReviews(!showVendorReviews);
                  setReviewPage(1);
                  setReviews([]);
                }}
                className="text-sm text-jemo-orange hover:underline"
              >
                {showVendorReviews ? t("showProductReviews") : t("showAllReviews")}
              </button>
            )}
          </div>

          {/* Rating Summary */}
          {reviewStats && reviewStats.totalReviews > 0 ? (
            <div className="flex flex-col md:flex-row gap-8 mb-8">
              {/* Average Rating */}
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900">
                  {reviewStats.averageRating}
                </div>
                <StarRating rating={Math.round(reviewStats.averageRating)} />
                <p className="text-sm text-gray-500 mt-1">
                  {t("basedOnReviews", { count: reviewStats.totalReviews })}
                </p>
              </div>

              {/* Rating Breakdown */}
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = reviewStats.ratingBreakdown[stars as 1 | 2 | 3 | 4 | 5] || 0;
                  const percentage = reviewStats.totalReviews > 0
                    ? (count / reviewStats.totalReviews) * 100
                    : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 w-12">{stars} star</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t("noReviewsYet")}</p>
              <p className="text-sm text-gray-400">{t("beFirstToReview")}</p>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length > 0 && (
            <div className="space-y-0">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}

              {hasMoreReviews && (
                <div className="text-center pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => setReviewPage((p) => p + 1)}
                    disabled={reviewsLoading}
                  >
                    {reviewsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Load more reviews"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {reviewsLoading && reviews.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-40">
        {showOrderForm && isLoggedIn ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder={t("deliveryAddress")}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="w-32">
                <Input
                  type="tel"
                  placeholder={t("phoneNumber")}
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowOrderForm(false)}
                disabled={ordering}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90"
                onClick={handlePlaceOrder}
                disabled={ordering || !deliveryAddress.trim() || !deliveryPhone.trim()}
              >
                {ordering ? <Loader2 className="w-5 h-5 animate-spin" /> : t("placeOrder")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-small text-gray-500">{t("total")}</p>
                <p className="text-h3 text-jemo-orange font-bold">
                  {formatPrice(grandTotal)}
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
                      {t("buyNow")}
                    </Button>
                  ) : (
                    <Button asChild size="lg" className="flex-1 bg-jemo-orange hover:bg-jemo-orange/90">
                      <Link href={`/${locale}/login?redirect=/products/${product.id}`}>
                        {t("loginToContinue")}
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
