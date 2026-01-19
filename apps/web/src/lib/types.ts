export type UserRole = "CUSTOMER" | "VENDOR" | "DELIVERY_AGENCY" | "ADMIN";

export type KycStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";

export interface UpgradeRolePayload {
  role: "VENDOR";
  businessName?: string;
  businessAddress?: string;
  vehicleType?: string;
  licensePlate?: string;
}

export interface KycSubmission {
  id: string;
  documentType: string;
  documentUrl: string;
  status: KycStatus;
  submittedAt: string;
}

export type OrderStatus =
  | "PENDING"       // Order created, awaiting payment confirmation (or COD)
  | "CONFIRMED"     // Payment confirmed / COD accepted, vendor notified
  | "IN_TRANSIT"    // Order picked up by delivery, on the way to customer
  | "DELIVERED"     // Delivered to customer
  | "COMPLETED"     // Customer confirmed receipt, funds released to vendor
  | "CANCELLED";    // Order cancelled

export type CancelledBy = "CUSTOMER" | "VENDOR" | "ADMIN";

export type PaymentStatus = "INITIATED" | "SUCCESS" | "FAILED" | "REFUNDED";

export type DeliveryStatus =
  | "SEARCHING_RIDER"
  | "ASSIGNED"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export type DeliveryJobStatus =
  | "OPEN"         // Job is available for agencies to accept
  | "ACCEPTED"     // Agency has accepted the job
  | "DELIVERED"    // Successfully delivered
  | "CANCELLED";   // Job was cancelled

export type DeliveryType = "VENDOR_DELIVERY" | "JEMO_RIDER";

export type DeliveryMethod = "VENDOR_SELF" | "JEMO_RIDER";

export type DisputeStatus = "OPEN" | "RESOLVED" | "REJECTED";

export type ProductStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";

export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK";

export type ProductCondition = "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "REFURBISHED";

export type PaymentPolicy = "POD_ONLY" | "ONLINE_ONLY" | "MIXED_CITY_RULE";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: UserRole;
  name: string;
}

export interface Product {
  id: string;
  vendorProfileId: string;
  name: string;
  description: string;
  price: string;
  discountPrice?: string | null;
  stock: number;
  stockStatus: StockStatus;
  city?: string;
  deliveryType: DeliveryType;
  // Vendor delivery options
  pickupAvailable?: boolean;
  localDelivery?: boolean;
  nationwideDelivery?: boolean;
  freeDelivery?: boolean;
  flatDeliveryFee?: string | null;
  sameCityDeliveryFee?: string | null;
  otherCityDeliveryFee?: string | null;
  // Status
  status: ProductStatus;
  condition: ProductCondition;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  // Payment Policy
  paymentPolicy: PaymentPolicy;
  mtnMomoEnabled: boolean;
  orangeMoneyEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  vendorProfile?: {
    id: string;
    businessName: string;
    businessAddress: string;
  };
  category?: {
    id: string;
    slug?: string;
    nameEn: string;
    nameFr: string;
  };
  // Frontend-added fields
  isFavorited?: boolean;
  reviewStats?: {
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  jemoDeliveryPricing?: {
    sameCityFee: number;
    otherCityFee: number;
  };
}

export interface ProductImage {
  id: string;
  url: string;
  objectKey?: string;
  mimeType?: string;
  size?: number;
  isMain: boolean;
  sortOrder?: number;
}

export type OrderPaymentMethod = 'COD' | 'MYCOOLPAY';

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: string;
  // Delivery information
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryCity?: string;
  productCity?: string;           // Snapshot of product city at order time
  deliveryMethod?: DeliveryType;  // VENDOR_DELIVERY or JEMO_RIDER
  deliveryFee?: number;           // Delivery fee in XAF (integer)
  deliveryFeeAgencyId?: string;
  deliveryFeeRule?: string;
  // Cancellation info
  cancelledBy?: CancelledBy;
  cancelReason?: string;
  // Payment
  paymentMethod: OrderPaymentMethod;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  // Earnings breakdown
  subtotalAmount?: string;
  commissionAmount?: string;
  commissionRate?: string;
  vendorPayoutAmount?: string;
  fundsReleasedAt?: string;
  // Relations
  items?: OrderItem[];
  payment?: Payment;
  delivery?: Delivery;
  deliveryJob?: OrderDeliveryJob;
}

// Delivery job info for customer view
export interface OrderDeliveryJob {
  id: string;
  status: DeliveryJobStatus;
  pickupCity: string;
  dropoffCity: string;
  fee?: number;
  acceptedAt: string | null;
  deliveredAt: string | null;
  agency?: {
    id: string;
    name: string;
    phone: string | null;
  };
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  product?: Product;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: string;
  status: PaymentStatus;
  paymentMethod: string;
  paidAt: string | null;
}

export interface Delivery {
  id: string;
  orderId: string;
  riderProfileId: string | null;
  deliveryType: DeliveryType;
  status: DeliveryStatus;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface CartItemProduct {
  id: string;
  name: string;
  price: string;
  imageUrl: string | null;
}

export interface CartItem {
  product: CartItemProduct;
  quantity: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API response format for products list
export interface ProductListItem {
  id: string;
  name: string;
  price: string;
  discountPrice?: string | null;
  stock: number;
  stockStatus?: StockStatus;
  city?: string;
  deliveryType: DeliveryType;
  condition?: ProductCondition;
  vendorProfileId?: string;
  vendorBusinessName: string;
  vendorCity: string;
  imageUrl: string | null;
  isFavorited?: boolean;
  // Payment Policy
  paymentPolicy?: PaymentPolicy;
  mtnMomoEnabled?: boolean;
  orangeMoneyEnabled?: boolean;
  category?: {
    id: string;
    slug: string;
    nameEn: string;
    nameFr: string;
  };
}

// Vendor types
export interface VendorProfile {
  id: string;
  userId: string;
  businessName: string;
  businessAddress: string;
  kycStatus: KycStatus;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
}

export interface VendorProduct {
  id: string;
  vendorProfileId: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  stockStatus: StockStatus;
  deliveryType: DeliveryType;
  status: ProductStatus;
  condition: ProductCondition;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  // Payment Policy
  paymentPolicy?: PaymentPolicy;
  mtnMomoEnabled?: boolean;
  orangeMoneyEnabled?: boolean;
}

export interface VendorOrder {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: string;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryCity?: string;
  productCity?: string;
  deliveryMethod?: DeliveryMethod;
  deliveryFee?: number;
  cancelReason?: string;
  cancelledBy?: CancelledBy;
  cancelledAt?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    name: string;
    phone: string | null;
    email: string;
  };
  items?: VendorOrderItem[];
  payment?: Payment;
  delivery?: Delivery;
  deliveryJob?: OrderDeliveryJob;
}

export interface VendorOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  product?: {
    id: string;
    name: string;
    images?: ProductImage[];
  };
}

export interface KycResponse {
  kycStatus: KycStatus;
  latestSubmission: {
    id: string;
    documentType: string;
    documentUrl: string;
    status: KycStatus;
    createdAt: string;
    reviewNotes?: string | null;
  } | null;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  stock: number;
  deliveryType: DeliveryType;
  images?: string[];
}

/**
 * Payload for updating product images
 * Only includes fields accepted by the backend (no mimeType/size)
 */
export interface ProductImagePayload {
  objectKey: string;
  url: string;
  sortOrder: number;
  isMain: boolean;
}

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  stockStatus?: StockStatus;
  deliveryType?: DeliveryType;
  categoryId?: string;
  city?: string;
  condition?: ProductCondition;
  images?: ProductImagePayload[];
  // Payment Policy
  paymentPolicy?: PaymentPolicy;
  mtnMomoEnabled?: boolean;
  orangeMoneyEnabled?: boolean;
}

// Rider types
export interface RiderProfile {
  id: string;
  userId: string;
  vehicleType: string;
  licensePlate: string | null;
  kycStatus: KycStatus;
}

export interface RiderDelivery {
  id: string;
  orderId: string;
  riderProfileId: string | null;
  deliveryType: DeliveryType;
  status: DeliveryStatus;
  pickupAddress: string;
  dropoffAddress: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    totalAmount: string;
    deliveryAddress: string;
    deliveryPhone: string;
    customer?: {
      name: string;
      phone: string | null;
    };
    items?: {
      id: string;
      quantity: number;
      unitPrice: string;
      product?: {
        name: string;
      };
    }[];
  };
  vendorProfile?: {
    businessName: string;
    businessAddress: string;
  };
}

// DeliveryJob types for delivery agencies
export interface DeliveryJob {
  id: string;
  orderId: string;
  pickupAddress: string;
  pickupCity: string;
  dropoffAddress: string;
  dropoffCity: string;
  status: DeliveryJobStatus;
  assignedAgencyId: string | null;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    status: OrderStatus;
    totalAmount: string;
    deliveryFee: string | null;
    deliveryAddress: string;
    deliveryPhone: string;
  };
}

export interface AvailableJob {
  id: string;
  orderId: string;
  fee: number;
  pickup: {
    address: string;
    city: string;
    vendorName: string;
  };
  dropoff: {
    address: string;
    city: string;
    customerPhone: string;
  };
  createdAt: string;
}

// Admin types
export interface AdminKycSubmission {
  id: string;
  vendorProfileId: string | null;
  riderProfileId: string | null;
  vendorApplicationId?: string; // For new vendor application flow
  status: KycStatus;
  documentType: string;
  documentUrl: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  vendorProfile?: {
    businessName: string;
    businessAddress: string;
    user?: {
      id: string;
      name: string;
      phone: string | null;
      email: string;
      role: UserRole;
    };
  };
  riderProfile?: {
    vehicleType: string;
    licensePlate: string | null;
    user?: {
      id: string;
      name: string;
      phone: string | null;
      email: string;
      role: UserRole;
    };
  };
  // New vendor application data (from wizard flow)
  vendorApplication?: {
    id: string;
    type: "BUSINESS" | "INDIVIDUAL";
    status: string;
    businessName: string | null;
    businessAddress: string | null;
    businessPhone: string | null;
    businessEmail: string | null;
    fullNameOnId: string | null;
    location: string | null;
    phoneNormalized: string | null;
    uploads: Array<{
      id: string;
      kind: string;
      storagePath: string;
      mimeType: string;
      originalFileName: string;
    }>;
    user: {
      id: string;
      name: string;
      phone: string | null;
      email: string;
      role: UserRole;
    };
  };
}

export interface AdminOrder {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: string;
  deliveryAddress: string;
  deliveryPhone: string;
  deliveryCity?: string;
  productCity?: string;
  deliveryMethod?: DeliveryMethod;
  deliveryFee?: number;
  cancelledBy?: CancelledBy;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  inTransitAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  customer?: {
    id: string;
    name: string;
    phone: string | null;
    email: string;
  };
  items?: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string;
    product?: {
      name: string;
      vendorProfile?: {
        businessName: string;
      };
    };
  }[];
  payment?: {
    id: string;
    amount: string;
    status: PaymentStatus;
    paymentMethod: string;
    paidAt: string | null;
  };
  delivery?: {
    id: string;
    status: DeliveryStatus;
    riderProfile?: {
      user?: {
        name: string;
        phone: string | null;
      };
    };
  };
  deliveryJob?: OrderDeliveryJob;
}

export interface AdminPayment {
  id: string;
  orderId: string;
  amount: string;
  status: PaymentStatus;
  paymentMethod: string;
  paidAt: string | null;
  createdAt: string;
  order?: {
    id: string;
    customer?: {
      name: string;
      phone: string | null;
    };
  };
}

export interface AdminDispute {
  id: string;
  orderId: string;
  customerId: string;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  order?: {
    id: string;
    totalAmount: string;
    customer?: {
      name: string;
      phone: string | null;
    };
  };
  customer?: {
    name: string;
    phone: string | null;
  };
}

// =============================================
// VENDOR WALLET TYPES
// =============================================

export type WalletTransactionType = 
  | 'CREDIT_PENDING'
  | 'CREDIT_AVAILABLE'
  | 'DEBIT_WITHDRAWAL'
  | 'REVERSAL';

export type WalletTransactionReferenceType = 'ORDER' | 'PAYOUT' | 'ADJUSTMENT';

export type WalletTransactionStatus = 'PENDING' | 'POSTED' | 'CANCELLED';

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: number;
  currency: string;
  referenceType: WalletTransactionReferenceType;
  referenceId: string;
  status: WalletTransactionStatus;
  note?: string;
  createdAt: string;
}

export interface VendorWalletSummary {
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
  currency: string;
  pendingPayouts: number;
  recentTransactions: WalletTransaction[];
  updatedAt: string;
}

export interface VendorPayoutProfile {
  preferredMethod: 'CM_MOMO' | 'CM_OM';
  phone: string;
  fullName: string;
  updatedAt: string;
}

export type PayoutStatus = 'REQUESTED' | 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface Payout {
  id: string;
  amount: number;
  status: PayoutStatus;
  method: 'CM_MOMO' | 'CM_OM';
  destinationPhone: string;
  appTransactionRef: string;
  providerRef?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}
