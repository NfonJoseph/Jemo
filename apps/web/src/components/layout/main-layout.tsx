"use client";

import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { useCart } from "@/lib/cart-context";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col">
      <Header cartItemCount={itemCount} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

