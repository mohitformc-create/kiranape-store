import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight, ShoppingBag, Truck, FileText, MessageCircle, Heart } from 'lucide-react';
import { PromoBanner } from '../types';
import { DEFAULT_BANNERS } from '../data/initialProducts';

interface HomeBannerCarouselProps {
  banners?: PromoBanner[];
  onClaimStayfreeDeal?: () => void;
  onFilterParleBiscuits?: () => void;
  onOpenParchi?: () => void;
  onOpenDigitalParchi?: () => void;
  onShopGrocery?: () => void;
  onSelectDepartment?: (dept: 'grocery' | 'stationery') => void;
  whatsappNumber?: string;
}

export const HomeBannerCarousel: React.FC<HomeBannerCarouselProps> = ({
  banners,
  onClaimStayfreeDeal,
  onFilterParleBiscuits,
  onOpenParchi,
  onOpenDigitalParchi,
  onShopGrocery,
  onSelectDepartment,
  whatsappNumber = '9424316081',
}) => {
  const activeBanners = banners && banners.length > 0 ? banners : DEFAULT_BANNERS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = activeBanners.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // 3.5 Seconds Auto-Sliding Loop Engine (Pauses on Hover / Touch)
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    autoPlayTimerRef.current = setInterval(() => {
      nextSlide();
    }, 3500);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [isPaused, nextSlide, totalSlides]);

  // Mobile Touch Swipe Handlers (Left/Right Drag)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const diff = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 40; // minimum 40px drag
      if (diff > minSwipeDistance) {
        nextSlide();
      } else if (diff < -minSwipeDistance) {
        prevSlide();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
    // Resume autoplay smoothly after gesture
    setTimeout(() => setIsPaused(false), 800);
  };

  // Slide Action Trigger Handler
  const handleBannerAction = (banner: PromoBanner) => {
    if (banner.actionType === 'stayfree_deal' || banner.id === 'banner-stayfree-xl') {
      if (onClaimStayfreeDeal) onClaimStayfreeDeal();
    } else if (banner.actionType === 'parle_deal' || banner.id === 'banner-parle-50off') {
      if (onFilterParleBiscuits) onFilterParleBiscuits();
    } else if (banner.actionType === 'free_delivery' || banner.id === 'banner-free-delivery') {
      if (onShopGrocery) onShopGrocery();
    } else if (banner.actionType === 'parchi' || banner.id === 'banner-parchi-upload') {
      if (onOpenDigitalParchi) {
        onOpenDigitalParchi();
      } else if (onOpenParchi) {
        onOpenParchi();
      }
    } else if (banner.actionType === 'whatsapp' || banner.id === 'banner-stationery-whatsapp') {
      const cleanPhone = whatsappNumber.replace(/\D/g, '').slice(-10);
      const text = encodeURIComponent(
        'Namaste Kiranape! Mujhe stationery aur grocery order karni hai. Kripya details confirm karein.'
      );
      window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
    } else if (banner.linkCategory) {
      if (onShopGrocery) onShopGrocery();
    }
  };

  if (totalSlides === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm border border-black/[0.04] select-none my-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Promotional Carousel"
    >
      {/* Sliding Track */}
      <div
        className="flex transition-transform duration-500 ease-out will-change-transform"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {activeBanners.map((banner, index) => {
          const gradientClass =
            banner.gradient ||
            (index % 4 === 0
              ? 'from-pink-600 via-rose-600 to-rose-700'
              : index % 4 === 1
              ? 'from-amber-500 via-orange-500 to-orange-600'
              : index % 4 === 2
              ? 'from-emerald-600 via-teal-600 to-teal-700'
              : 'from-indigo-600 via-purple-600 to-violet-700');

          return (
            <div
              key={banner.id || index}
              className={`w-full flex-shrink-0 bg-gradient-to-br ${gradientClass} text-white relative overflow-hidden`}
              style={{ minHeight: '148px' }}
            >
              {/* Subtle ambient background glow circles */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-black/10 blur-xl pointer-events-none" />

              <div className="relative p-4 sm:p-5 flex items-center justify-between gap-3 min-h-[148px] sm:min-h-[160px]">
                {/* Left: Text & CTA */}
                <div className="flex-1 min-w-0 pr-1 z-10 flex flex-col justify-between h-full">
                  <div>
                    {/* Badge */}
                    {banner.badge && (
                      <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-heading font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1.5 border border-white/25 shadow-2xs">
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        <span>{banner.badge}</span>
                      </span>
                    )}

                    {/* Heading */}
                    <h3 className="font-heading font-black text-sm sm:text-lg md:text-xl text-white leading-tight tracking-tight drop-shadow-xs line-clamp-2">
                      {banner.title}
                    </h3>

                    {/* Subtitle */}
                    {banner.subtitle && (
                      <p className="text-[11px] sm:text-xs text-white/90 font-medium leading-relaxed mt-1 line-clamp-2 max-w-md drop-shadow-2xs">
                        {banner.subtitle}
                      </p>
                    )}
                  </div>

                  {/* CTA Action Button */}
                  <div className="pt-2 sm:pt-3">
                    <button
                      type="button"
                      onClick={() => handleBannerAction(banner)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white text-stone-900 hover:bg-stone-100 active:scale-95 text-xs font-heading font-extrabold shadow-md transition-all cursor-pointer group"
                    >
                      <span>{banner.buttonText || 'Claim Deal ➔'}</span>
                      <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Right: Authentic Packshot Graphic with Drop Shadow */}
                <div className="flex-shrink-0 w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center relative z-10">
                  <div className="w-full h-full p-1 bg-white/10 backdrop-blur-xs rounded-2xl border border-white/20 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        className="w-full h-full object-contain drop-shadow-md rounded-xl"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback icon box
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ShoppingBag className="w-12 h-12 text-white/80" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Active Dot Indicators */}
      <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5 z-20 pointer-events-auto">
        {activeBanners.map((_, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                isActive
                  ? 'w-7 h-1.5 bg-white shadow-xs'
                  : 'w-1.5 h-1.5 bg-white/45 hover:bg-white/80'
              }`}
              title={`Jump to slide ${idx + 1}`}
              aria-label={`Slide ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Discrete Desktop Navigation Arrows (Visible on hover) */}
      <div className="hidden sm:flex items-center justify-between absolute inset-y-0 inset-x-2 z-20 pointer-events-none">
        <button
          type="button"
          onClick={prevSlide}
          className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/50 text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer pointer-events-auto active:scale-90 opacity-70 hover:opacity-100"
          title="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={nextSlide}
          className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/50 text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer pointer-events-auto active:scale-90 opacity-70 hover:opacity-100"
          title="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
