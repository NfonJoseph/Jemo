"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { items, totalAmount, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="py-12">
        <div className="container-main">
          <EmptyState
            type="cart"
            title="Your cart is empty"
            description="Browse our products and add items to your cart."
            actionLabel="Start Shopping"
            actionHref="/products"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 pb-32 md:pb-12">
      <div className="container-main">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h1 text-gray-900">Shopping Cart</h1>
          <Button variant="ghost" size="sm" onClick={clearCart}>
            Clear All
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="card p-4 flex gap-4"
              >
                <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                  <Image
                    src={item.product.imageUrl || "/placeholder-product.svg"}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.product.id}`}
                    className="text-body font-medium text-gray-900 hover:text-jemo-orange line-clamp-2"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-h3 text-jemo-orange font-bold mt-1">
                    {formatPrice(item.product.price)}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1)
                        }
                        className="p-1.5 hover:bg-gray-100 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1)
                        }
                        className="p-1.5 hover:bg-gray-100 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-2 text-gray-400 hover:text-status-error transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary - Desktop */}
          <div className="hidden lg:block">
            <div className="card p-6 sticky top-24">
              <h2 className="text-h3 text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between text-body">
                  <span className="text-gray-500">
                    Subtotal ({items.length} items)
                  </span>
                  <span className="text-gray-900">{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-body">
                  <span className="text-gray-500">Delivery</span>
                  <span className="text-gray-900">Calculated at checkout</span>
                </div>
              </div>

              <div className="flex justify-between text-h3 mb-6">
                <span className="text-gray-900">Total</span>
                <span className="text-jemo-orange font-bold">
                  {formatPrice(totalAmount)}
                </span>
              </div>

              <Button asChild className="w-full">
                <Link href="/checkout">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Proceed to Checkout
                </Link>
              </Button>

              <p className="text-small text-gray-500 text-center mt-4">
                Pay with MTN MoMo, Orange Money, or Cash on Delivery
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-40">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-small text-gray-500">
              Total ({items.length} items)
            </p>
            <p className="text-h3 text-jemo-orange font-bold">
              {formatPrice(totalAmount)}
            </p>
          </div>
          <Button asChild className="flex-1">
            <Link href="/checkout">Checkout</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

