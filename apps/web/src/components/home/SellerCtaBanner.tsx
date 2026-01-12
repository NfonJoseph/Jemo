"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { ArrowRight, Store, TrendingUp, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// ANIMATED BACKGROUND SHAPES
// ============================================
function BackgroundShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Main radial gradient glow - orange accent */}
      <div 
        className="absolute -right-20 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(228, 106, 46, 0.4) 0%, rgba(228, 106, 46, 0.1) 40%, transparent 70%)",
        }}
      />
      
      {/* Secondary subtle glow */}
      <div 
        className="absolute right-10 bottom-0 w-[300px] h-[300px] rounded-full opacity-10"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 60%)",
        }}
      />

      {/* Abstract geometric shapes */}
      <svg 
        className="absolute right-8 top-1/2 -translate-y-1/2 w-64 h-64 lg:w-80 lg:h-80 opacity-10"
        viewBox="0 0 200 200"
        fill="none"
      >
        {/* Circles pattern */}
        <circle cx="100" cy="100" r="80" stroke="rgba(228, 106, 46, 0.5)" strokeWidth="1" fill="none" />
        <circle cx="100" cy="100" r="60" stroke="rgba(228, 106, 46, 0.3)" strokeWidth="1" fill="none" />
        <circle cx="100" cy="100" r="40" stroke="rgba(228, 106, 46, 0.2)" strokeWidth="1" fill="none" />
        
        {/* Dot pattern */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const x = 100 + 70 * Math.cos((angle * Math.PI) / 180);
          const y = 100 + 70 * Math.sin((angle * Math.PI) / 180);
          return (
            <circle 
              key={i}
              cx={x} 
              cy={y} 
              r="3" 
              fill="rgba(228, 106, 46, 0.4)"
            />
          );
        })}
      </svg>

      {/* Floating small shapes */}
      <div className="absolute right-1/4 top-8 w-3 h-3 bg-jemo-orange/20 rounded-full animate-pulse" />
      <div className="absolute right-1/3 bottom-12 w-2 h-2 bg-jemo-orange/30 rounded-full animate-pulse delay-300" />
      <div className="absolute right-20 top-1/4 w-4 h-4 bg-white/5 rounded-full" />
    </div>
  );
}

// ============================================
// FEATURE BADGES (optional enhancement)
// ============================================
function FeatureBadges() {
  const t = useTranslations("sellerCta");
  
  const features = [
    { icon: TrendingUp, labelKey: "feature1" },
    { icon: Shield, labelKey: "feature2" },
    { icon: Zap, labelKey: "feature3" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 mt-6">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <div 
            key={index}
            className="flex items-center gap-1.5 text-xs text-gray-300 bg-white/5 px-2.5 py-1.5 rounded-full"
          >
            <Icon className="w-3.5 h-3.5 text-jemo-orange" />
            <span>{t(feature.labelKey)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN SELLER CTA BANNER
// ============================================
export function SellerCtaBanner() {
  const t = useTranslations("sellerCta");
  const locale = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection Observer for fade-in animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-12 md:py-16">
      <div className="max-w-screen-xl mx-auto px-4">
        <div 
          className={cn(
            "relative overflow-hidden rounded-2xl lg:rounded-3xl",
            // Transition for fade-in
            "transition-all duration-700 ease-out",
            isVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-8"
          )}
          style={{
            // Premium gradient background: deep navy → slightly lighter
            background: "linear-gradient(135deg, #0a1628 0%, #152238 50%, #1a2d4a 100%)",
          }}
        >
          {/* Animated gradient overlay */}
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              background: "linear-gradient(45deg, transparent 0%, rgba(228, 106, 46, 0.03) 50%, transparent 100%)",
              backgroundSize: "200% 200%",
              animation: "gradientShift 8s ease infinite",
            }}
          />

          {/* Background decorative shapes */}
          <BackgroundShapes />

          {/* Content Container */}
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-8 md:p-12 lg:p-16">
            {/* Left Column: Content */}
            <div className="flex flex-col justify-center text-center lg:text-left">
              {/* Small tag */}
              <div className="inline-flex items-center gap-2 text-jemo-orange text-sm font-medium mb-4 justify-center lg:justify-start">
                <Store className="w-4 h-4" />
                <span>{t("tag")}</span>
              </div>

              {/* Headline */}
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                {t("headline")}
              </h2>

              {/* Supporting text */}
              <p className="text-gray-300 text-base md:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0 mb-8">
                {t("description")}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                {/* Primary CTA */}
                <Button
                  asChild
                  size="lg"
                  className={cn(
                    "bg-jemo-orange hover:bg-jemo-orange/90 text-white font-semibold",
                    "px-8 py-3 h-auto text-base rounded-xl",
                    "shadow-lg shadow-jemo-orange/25 hover:shadow-xl hover:shadow-jemo-orange/30",
                    "transform transition-all duration-200",
                    "hover:-translate-y-0.5 active:translate-y-0",
                    "group"
                  )}
                >
                  <Link href={`/${locale}/account/vendor/apply`}>
                    {t("ctaPrimary")}
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                {/* Secondary Link */}
                <Link
                  href={`/${locale}/sell`}
                  className={cn(
                    "text-gray-300 hover:text-white text-sm font-medium",
                    "underline underline-offset-4 decoration-gray-500 hover:decoration-white",
                    "transition-colors duration-200"
                  )}
                >
                  {t("ctaSecondary")}
                </Link>
              </div>

              {/* Feature badges */}
              <FeatureBadges />
            </div>

            {/* Right Column: Visual Element (Desktop only) */}
            <div className="hidden lg:flex items-center justify-center relative">
              {/* Abstract seller illustration */}
              <div className="relative w-full max-w-sm">
                {/* Main icon container */}
                <div 
                  className="relative z-10 w-32 h-32 mx-auto rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(228, 106, 46, 0.2) 0%, rgba(228, 106, 46, 0.05) 100%)",
                    border: "1px solid rgba(228, 106, 46, 0.2)",
                  }}
                >
                  <Store className="w-16 h-16 text-jemo-orange/80" />
                </div>

                {/* Floating stat cards */}
                <div 
                  className="absolute -top-4 -right-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10"
                  style={{ animation: "float 3s ease-in-out infinite" }}
                >
                  <div className="text-jemo-orange font-bold text-lg">1000+</div>
                  <div className="text-gray-400 text-xs">{t("statSellers")}</div>
                </div>

                <div 
                  className="absolute -bottom-2 -left-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10"
                  style={{ animation: "float 3s ease-in-out infinite 1.5s" }}
                >
                  <div className="text-green-400 font-bold text-lg">24h</div>
                  <div className="text-gray-400 text-xs">{t("statSetup")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style jsx global>{`
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </section>
  );
}
