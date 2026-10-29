import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { PromoBanner, Product } from '../types';
import { DEFAULT_BANNERS } from '../data/initialProducts';
import { SPECIAL_DEAL_PRODUCTS, STAYFREE_REWARD_PRODUCT_ID } from '../data/specialDealsCatalog';

interface HomeBannerCarouselProps {
  banners?: PromoBanner[];
  products?: Product[];
  cartQuantities?: Record<string, number>;
  onAddToCart?: (product: Product) => void;
  onUpdateQuantity?: (itemKey: string, qty: number) => void;
  onClaimStayfreeDeal?: () => void;
  onFilterParleBiscuits?: () => void;
  onOpenParchi?: () => void;
  onOpenDigitalParchi?: () => void;
  onShopGrocery?: () => void;
  onSelectCategory?: (categoryName: string) => void;
  onSelectProduct?: (product: Product) => void;
  whatsappNumber?: string;
}

export const HomeBannerCarousel: React.FC<HomeBannerCarouselProps> = ({
  banners,
  products = [],
  cartQuantities = {},
  onAddToCart,
  onUpdateQuantity,
  onClaimStayfreeDeal,
  onFilterParleBiscuits,
  onOpenParchi,
  onOpenDigitalParchi,
  onShopGrocery,
  onSelectCategory,
  onSelectProduct,
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

  // 3.5 Seconds Auto-Sliding Loop Engine (Pauses on Hover / Touch / Stepper Interaction)
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

  // Helper to resolve linked product
  const getLinkedProduct = (banner: PromoBanner): Product | undefined => {
    if (banner.productId) {
      const found = products.find((p) => p.id === banner.productId);
      if (found) return found;
      // Fallback in special deals catalog
      return SPECIAL_DEAL_PRODUCTS.find((p) => p.id === banner.productId);
    }
    if (banner.id === 'banner-stayfree-xl' || banner.actionType === 'stayfree_deal') {
      const found = products.find((p) => p.id === STAYFREE_REWARD_PRODUCT_ID);
      if (found) return found;
      return SPECIAL_DEAL_PRODUCTS.find((p) => p.id === STAYFREE_REWARD_PRODUCT_ID);
    }
    return undefined;
  };

  // Slide Action Trigger Handler
  const handleBannerAction = (banner: PromoBanner, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. Specific product deal
    if (banner.targetType === 'product' || banner.productId) {
      const prod = getLinkedProduct(banner);
      if (prod) {
        if (onSelectProduct) {
          onSelectProduct(prod);
        } else if (onSelectCategory && prod.category) {
          onSelectCategory(prod.category);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
    }

    // 2. Named deals
    if (banner.actionType === 'stayfree_deal' || banner.id === 'banner-stayfree-xl') {
      if (onClaimStayfreeDeal) {
        onClaimStayfreeDeal();
      } else if (onSelectCategory) {
        onSelectCategory('Personal Care');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (banner.actionType === 'parle_deal' || banner.id === 'banner-parle-50off') {
      if (onFilterParleBiscuits) onFilterParleBiscuits();
    } else if (banner.actionType === 'free_delivery' || banner.id === 'banner-free-delivery') {
      if (onShopGrocery) {
        onShopGrocery();
      } else if (onSelectCategory) {
        onSelectCategory('All');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (banner.targetType === 'parchi' || banner.actionType === 'parchi' || banner.id === 'banner-parchi-upload') {
      if (onOpenDigitalParchi) {
        onOpenDigitalParchi();
      } else if (onOpenParchi) {
        onOpenParchi();
      }
    } else if (banner.targetType === 'whatsapp' || banner.actionType === 'whatsapp' || banner.id === 'banner-stationery-whatsapp') {
      const cleanPhone = whatsappNumber.replace(/\D/g, '').slice(-10);
      const text = encodeURIComponent(
        'Namaste Kiranape! Mujhe grocery aur household items order karne hain. Kripya details confirm karein.'
      );
      window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
    } else if (banner.targetType === 'category' || banner.linkCategory) {
      if (onSelectCategory) {
        onSelectCategory(banner.linkCategory || 'All');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (onShopGrocery) {
        onShopGrocery();
      }
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

          const linkedProduct = getLinkedProduct(banner);
          const showDirectAdd = Boolean(
            (banner.showDirectAdd || banner.id === 'banner-stayfree-xl') && linkedProduct
          );
          const qtyInCart = linkedProduct ? cartQuantities[linkedProduct.id] || 0 : 0;

          return (
            <div
              key={banner.id || index}
              onClick={() => handleBannerAction(banner)}
              className={`w-full flex-shrink-0 bg-gradient-to-br ${gradientClass} text-white relative overflow-hidden cursor-pointer`}
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

                  {/* CTA Action Area: Direct Add-to-Cart Counter OR CTA Button */}
                  <div className="pt-2 sm:pt-3 flex items-center gap-2">
                    {showDirectAdd && linkedProduct ? (
                      qtyInCart === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsPaused(true);
                            if (onAddToCart) onAddToCart(linkedProduct);
                            setTimeout(() => setIsPaused(false), 2000);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-stone-950 hover:bg-stone-100 active:scale-95 text-xs font-heading font-black shadow-md transition-all cursor-pointer group"
                          aria-label={`Add ${linkedProduct.name} to cart`}
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3] text-emerald-700" />
                          <span>+ ADD</span>
                        </button>
                      ) : (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center bg-white text-stone-950 rounded-xl p-0.5 shadow-md border border-stone-200"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsPaused(true);
                              if (onUpdateQuantity) onUpdateQuantity(linkedProduct.id, qtyInCart - 1);
                              setTimeout(() => setIsPaused(false), 2000);
                            }}
                            className="w-7 h-7 flex items-center justify-center hover:bg-stone-100 text-stone-800 rounded-lg active:scale-90 transition-transform cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <span className="w-7 text-center font-heading font-black text-xs text-stone-950">
                            {qtyInCart}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsPaused(true);
                              if (onUpdateQuantity) onUpdateQuantity(linkedProduct.id, qtyInCart + 1);
                              setTimeout(() => setIsPaused(false), 2000);
                            }}
                            className="w-7 h-7 flex items-center justify-center hover:bg-stone-100 text-stone-800 rounded-lg active:scale-90 transition-transform cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleBannerAction(banner, e)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white text-stone-900 hover:bg-stone-100 active:scale-95 text-xs font-heading font-extrabold shadow-md transition-all cursor-pointer group"
                      >
                        <span>{banner.buttonText || 'Claim Deal ➔'}</span>
                        <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    )}
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
