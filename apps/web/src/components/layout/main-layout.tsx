"use client";

import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { ChatWidget } from "@/components/chat/ChatWidget";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatWidget />
    </div>
  );
}

