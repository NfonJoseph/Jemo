"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade, Navigation } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import { useLocale } from "@/lib/translations";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import "swiper/css/navigation";

// Slide configuration with locale-specific routes
interface SlideConfig {
  id: number;
  images: {
    en: string;
    fr: string;
  };
  href: {
    en: string;
    fr: string;
  };
  alt: {
    en: string;
    fr: string;
  };
}

const slides: SlideConfig[] = [
  {
    id: 1,
    images: {
      en: "/slider/en/slide-1.jpg",
      fr: "/slider/fr/slide-1.jpg",
    },
    href: {
      en: "/en/marketplace",
      fr: "/fr/marketplace",
    },
    alt: {
      en: "Shop quality products on Jemo Marketplace",
      fr: "Achetez des produits de qualité sur Jemo",
    },
  },
  {
    id: 2,
    images: {
      en: "/slider/en/slide-2.jpg",
      fr: "/slider/fr/slide-2.jpg",
    },
    href: {
      en: "/en/sell",
      fr: "/fr/vendre",
    },
    alt: {
      en: "Sell on Jemo - Start your business today",
      fr: "Vendez sur Jemo - Lancez votre entreprise",
    },
  },
  {
    id: 3,
    images: {
      en: "/slider/en/slide-3.jpg",
      fr: "/slider/fr/slide-3.jpg",
    },
    href: {
      en: "/en/send-package",
      fr: "/fr/envoyer-colis",
    },
    alt: {
      en: "Send packages with Jemo - Fast delivery",
      fr: "Envoyez vos colis avec Jemo - Livraison rapide",
    },
  },
];

type LocaleKey = "en" | "fr";

export function HeroSlider() {
  const rawLocale = useLocale();
  // Ensure locale is valid, default to French
  const locale: LocaleKey = rawLocale === "en" || rawLocale === "fr" ? rawLocale : "fr";
  const [isLoading, setIsLoading] = useState(true);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (swiperInstance?.autoplay) {
      swiperInstance.autoplay.stop();
    }
  }, [swiperInstance]);

  const handleMouseLeave = useCallback(() => {
    if (swiperInstance?.autoplay) {
      swiperInstance.autoplay.start();
    }
  }, [swiperInstance]);

  return (
    <div
      className="relative w-full h-full min-h-[200px] overflow-hidden bg-neutral-50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Skeleton loader */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-gray-100 animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
        </div>
      )}

      <Swiper
        modules={[Autoplay, Pagination, EffectFade, Navigation]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={700}
        loop
        autoplay={{
          delay: 7000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
        }}
        pagination={{
          clickable: true,
          bulletClass: "swiper-pagination-bullet !w-2.5 !h-2.5 !bg-jemo-orange/50 !opacity-100",
          bulletActiveClass: "!bg-jemo-orange !w-6 !rounded-full",
        }}
        navigation={{
          enabled: true,
          prevEl: ".hero-slider-prev",
          nextEl: ".hero-slider-next",
        }}
        onSwiper={setSwiperInstance}
        className="h-full w-full hero-slider"
      >
        {slides.map((slide, idx) => (
          <SwiperSlide
            key={slide.id}
            className="!h-full !w-full"
          >
            <Link
              href={slide.href[locale]}
              className="relative block w-full h-full min-h-[200px] bg-neutral-50 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-jemo-orange focus-visible:ring-offset-2"
              aria-label={slide.alt[locale]}
            >
              <Image
                src={slide.images[locale]}
                alt={slide.alt[locale]}
                fill
                priority={idx === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 900px"
                className="object-contain transition-all duration-300 group-hover:scale-[1.02] group-hover:brightness-105"
                onLoad={handleImageLoad}
              />
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Navigation Arrows - Hidden on mobile */}
      <button
        className="hero-slider-prev hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-lg transition-all hover:scale-105 disabled:opacity-50"
        aria-label="Previous slide"
      >
        <svg
          className="w-5 h-5 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <button
        className="hero-slider-next hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full items-center justify-center shadow-lg transition-all hover:scale-105 disabled:opacity-50"
        aria-label="Next slide"
      >
        <svg
          className="w-5 h-5 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* Custom styles for Swiper */}
      <style jsx global>{`
        .hero-slider,
        .hero-slider .swiper-wrapper,
        .hero-slider .swiper-slide {
          height: 100% !important;
        }
        .hero-slider .swiper-slide {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-slider .swiper-pagination {
          bottom: 12px !important;
        }
        .hero-slider .swiper-pagination-bullet {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
}
