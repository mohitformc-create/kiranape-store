import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';

export interface PromoSlide {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  ctaText: string;
  actionType: 'openParchiModal' | 'filterCategory' | 'openWhatsAppHelp' | 'openCustomOrderWhatsApp';
  targetCategory?: string;
  themeGradient: string;
}

export const PROMO_BANNERS: PromoSlide[] = [
  // SLIDE 1: PARCHI ORDER
  {
    id: 'banner_parchi',
    tag: '📸 INSTANT ORDER',
    title: 'Ghar Baithe Parchi Bhejein!',
    subtitle: 'Kagaz ki parchi ka photo kheencho ya upload karo, dukaan ka saara samaan ghar baithe paayein.',
    ctaText: 'Parchi Bhejein ➔',
    actionType: 'openParchiModal',
    themeGradient: 'from-emerald-700 via-green-600 to-emerald-800',
  },
  // SLIDE 2: FREE DELIVERY ABOVE ₹999
  {
    id: 'banner_free_delivery',
    tag: '🚚 SPECIAL OFFER',
    title: '₹999 Ke Upar FREE Delivery!',
    subtitle: 'Mahine ka ration mangwaayein bina kisi delivery charge ya hidden fee ke.',
    ctaText: 'Ration Kharidein ➔',
    actionType: 'filterCategory',
    targetCategory: 'Atta & Flours',
    themeGradient: 'from-amber-600 via-yellow-500 to-amber-700',
  },
  // SLIDE 3: HYGIENE & DISCOUNT
  {
    id: 'banner_discount_hygiene',
    tag: '✨ 100% SHUDH & HYGIENIC',
    title: 'Get More Discounts & Hygenic Products',
    subtitle: 'Shuddh chakki aata, unpolished daalein aur branded packaging seedhe aapke doorstep par.',
    ctaText: 'View Offers ➔',
    actionType: 'filterCategory',
    targetCategory: 'Rice & Dal',
    themeGradient: 'from-teal-700 via-emerald-600 to-teal-800',
  },
  // SLIDE 4: REPLACEMENT GUARANTEE
  {
    id: 'banner_easy_replacement',
    tag: '🤝 100% REPLACEMENT GUARANTEE',
    title: 'Haathon-Haath Replacement Guarantee!',
    subtitle: 'Samaan mein koi bhi dikkat ho? Turant contact karein, bina sawal kiye turant badal kar doosra diya jaayega.',
    ctaText: 'WhatsApp Help ➔',
    actionType: 'openWhatsAppHelp',
    themeGradient: 'from-blue-700 via-indigo-600 to-blue-800',
  },
  // SLIDE 5: CUSTOM WHATSAPP REQUEST
  {
    id: 'banner_custom_whatsapp',
    tag: '💬 JO NAHI MILA, WOH BHI MILEGA',
    title: 'Samaan App Par Nahi Dikh Raha?',
    subtitle: 'Chinta mat karein! Abhi saare products upload ho rahe hain. Bas WhatsApp karein, dukan ka har samaan aapke ghar pahunchega!',
    ctaText: 'WhatsApp Par Likhein ➔',
    actionType: 'openCustomOrderWhatsApp',
    themeGradient: 'from-emerald-600 via-teal-600 to-green-700',
  },
];

export const STATIONERY_PROMO_BANNERS: PromoSlide[] = [
  {
    id: 'stat_banner_1',
    tag: '🎒 SCHOOL & OFFICE EXPRESS',
    title: 'School & College Stationery Ab Ghar Baithe!',
    subtitle: 'Classmate copies, registers, Reynolds pens aur art craft supplies 10-20 min mein ghar mangwaayein.',
    ctaText: 'Copies & Pens ➔',
    actionType: 'filterCategory',
    targetCategory: 'Copies & Registers',
    themeGradient: 'from-blue-700 via-indigo-600 to-blue-800',
  },
  {
    id: 'stat_banner_2',
    tag: '🎨 ART & CRAFT SPECIALS',
    title: 'Fevicol, Chart Paper & Craft Supplies',
    subtitle: 'Pidilite Fevicol MR, Fevikwik, scissors, cello tape aur coloring kits sabse saste rates par.',
    ctaText: 'Art & Craft Dekhein ➔',
    actionType: 'filterCategory',
    targetCategory: 'Art, Craft & Fevicol',
    themeGradient: 'from-purple-700 via-pink-600 to-indigo-800',
  },
  {
    id: 'stat_banner_3',
    tag: '📎 OFFICE ESSENTIALS',
    title: 'JK Copier A4 Paper Rim, Tape & Staplers',
    subtitle: 'Office printing paper, document envelopes, staplers aur sticky notes wholesale rates par.',
    ctaText: 'Office Stationery ➔',
    actionType: 'filterCategory',
    targetCategory: 'Office & Daily Stationery',
    themeGradient: 'from-emerald-700 via-teal-600 to-cyan-800',
  },
];

interface HeroBannerProps {
  department?: 'grocery' | 'stationery';
  onOpenParchiModal?: () => void;
  onSelectCategory?: (category: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  department = 'grocery',
  onOpenParchiModal,
  onSelectCategory,
}) => {
  const activeBanners = department === 'stationery' ? STATIONERY_PROMO_BANNERS : PROMO_BANNERS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Reset index on department change
  useEffect(() => {
    setCurrentIndex(0);
  }, [department]);

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, activeBanners.length]);

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleAction = (banner: PromoSlide) => {
    switch (banner.actionType) {
      case 'openParchiModal':
        if (onOpenParchiModal) onOpenParchiModal();
        break;
      case 'filterCategory':
        if (banner.targetCategory && onSelectCategory) {
          onSelectCategory(banner.targetCategory);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        break;
      case 'openWhatsAppHelp': {
        const text = 'Namaste Kiranape, mujhe samaan ke replacement ya support ke baare mein baat karni hai.';
        const url = `https://wa.me/919424316081?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        break;
      }
      case 'openCustomOrderWhatsApp': {
        const text = 'Namaste Kiranape, mujhe ye samaan order karna hai jo app par nahi mil raha: ';
        const url = `https://wa.me/919424316081?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        break;
      }
      default:
        break;
    }
  };

  const current = activeBanners[currentIndex] || activeBanners[0];

  return (
    <section
      id="hero-promo-carousel"
      aria-label="Kiranape Promotional Highlights"
      className="relative mb-4 rounded-2xl sm:rounded-3xl overflow-hidden shadow-md group select-none transition-all duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner Slide with Dynamic Gradient Theme */}
      <div
        onClick={() => handleAction(current)}
        className={`relative min-h-[175px] sm:min-h-[195px] md:min-h-[210px] bg-gradient-to-r ${current.themeGradient} p-5 sm:p-7 text-white flex flex-col justify-between cursor-pointer transition-all duration-500 overflow-hidden`}
      >
        {/* Decorative Background Elements */}
        <div className="absolute -right-8 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -left-8 -top-10 w-44 h-44 rounded-full bg-black/10 blur-lg pointer-events-none" />

        {/* Top Tag & Slide Number */}
        <div className="relative z-10 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/30 backdrop-blur-xs text-white text-[10px] sm:text-xs font-black uppercase tracking-wider border border-white/20 shadow-2xs">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>{current.tag}</span>
          </span>

          <span className="text-[10px] sm:text-[11px] font-bold text-white/80 bg-white/10 backdrop-blur-2xs px-2 py-0.5 rounded-full">
            {currentIndex + 1} / {PROMO_BANNERS.length}
          </span>
        </div>

        {/* Center Content */}
        <div className="relative z-10 my-2 max-w-xl">
          <h2 className="font-heading font-black text-xl sm:text-2xl md:text-3xl text-white leading-tight tracking-tight drop-shadow-sm">
            {current.title}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-white/90 line-clamp-2 leading-relaxed font-medium">
            {current.subtitle}
          </p>
        </div>

        {/* CTA Button Row */}
        <div className="relative z-10 flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAction(current);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-stone-900 font-heading font-black text-xs sm:text-sm shadow-md hover:bg-amber-300 hover:text-stone-950 active:scale-95 transition-all cursor-pointer"
          >
            <span>{current.ctaText}</span>
          </button>

          <span className="text-[11px] text-white/90 font-bold hidden xs:inline-block">
            🚚 Shuddh Samaan, Bharosemand Delivery
          </span>
        </div>
      </div>

      {/* Navigation Arrows (Visible on hover on desktop) */}
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Previous slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Next slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-2.5 left-0 right-0 z-20 flex items-center justify-center gap-1.5 pointer-events-auto">
        {activeBanners.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(idx);
            }}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              currentIndex === idx
                ? 'w-6 bg-white shadow-xs'
                : 'w-1.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  );
};
