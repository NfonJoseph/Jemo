export type UserRole = "CUSTOMER" | "VENDOR" | "RIDER" | "ADMIN";

export type KycStatus = "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";

export interface UpgradeRolePayload {
  role: "VENDOR" | "RIDER";
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
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "INITIATED" | "SUCCESS" | "FAILED" | "REFUNDED";

export type DeliveryStatus =
  | "SEARCHING_RIDER"
  | "ASSIGNED"
  | "PICKED_UP"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "CANCELLED";

export type DeliveryType = "VENDOR_DELIVERY" | "JEMO_RIDER";

export type DisputeStatus = "OPEN" | "RESOLVED" | "REJECTED";

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
  stock: number;
  deliveryType: DeliveryType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  vendorProfile?: {
    businessName: string;
    businessAddress: string;
  };
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: string;
  deliveryAddress: string;
  deliveryPhone: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  payment?: Payment;
  delivery?: Delivery;
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
  stock: number;
  deliveryType: DeliveryType;
  vendorBusinessName: string;
  vendorCity: string;
  imageUrl: string | null;
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
  deliveryType: DeliveryType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
}

export interface VendorOrder {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: string;
  deliveryAddress: string;
  deliveryPhone: string;
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

export interface UpdateProductPayload {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  deliveryType?: DeliveryType;
  images?: string[];
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

// Admin types
export interface AdminKycSubmission {
  id: string;
  vendorProfileId: string | null;
  riderProfileId: string | null;
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
}

export interface AdminOrder {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: string;
  deliveryAddress: string;
  deliveryPhone: string;
  createdAt: string;
  updatedAt: string;
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

