import React, { useRef } from 'react';
import { Plus, Minus, Check, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, CartItem } from '../types';
import { UPSELL_PRODUCTS } from '../data/upsellCatalog';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface UpsellCarouselProps {
  cartItems?: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (itemKey: string, quantity: number) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const UpsellCarousel: React.FC<UpsellCarouselProps> = ({
  cartItems = [],
  onAddToCart,
  onUpdateQuantity,
  title = 'You might also like',
  subtitle = 'Frequently added daily essentials with fast delivery',
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Map of product quantities currently in the cart
  const cartQuantityMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    cartItems.forEach((item) => {
      map[item.product.id] = (map[item.product.id] || 0) + item.quantity;
    });
    return map;
  }, [cartItems]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 240;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleAddClick = (product: Product) => {
    // 0ms instant feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
    onAddToCart(product);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-heading font-black text-stone-900 text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{title}</span>
          </h4>
          {subtitle && <p className="text-[11px] text-stone-500 font-medium">{subtitle}</p>}
        </div>

        {/* Desktop Carousel Controls */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrolling Cards Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-1 snap-x snap-mandatory touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {UPSELL_PRODUCTS.map((prod) => {
          const inCartCount = cartQuantityMap[prod.id] || 0;
          const hasDiscount = prod.originalPrice > prod.finalPrice;

          return (
            <div
              key={prod.id}
              className="w-[140px] xs:w-[150px] sm:w-[165px] flex-shrink-0 snap-start bg-white rounded-2xl p-2.5 border border-stone-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
            >
              {/* Product Image Box */}
              <div className="relative w-full aspect-square rounded-xl bg-stone-50 overflow-hidden flex items-center justify-center mb-2 border border-stone-100/80">
                <img
                  src={prod.imageUrl || getCategoryFallbackSvg(prod.category, prod.name)}
                  alt={prod.name}
                  className="w-full h-full object-contain p-1.5 drop-shadow-xs"
                  loading="lazy"
                  onError={(e) => {
                    const fallback = getCategoryFallbackSvg(prod.category, prod.name);
                    if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                      (e.currentTarget as HTMLImageElement).src = fallback;
                    }
                  }}
                />

                {/* Discount Badge */}
                {hasDiscount && (
                  <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                    {prod.discountPercent || Math.round(((prod.originalPrice - prod.finalPrice) / prod.originalPrice) * 100)}% OFF
                  </span>
                )}
              </div>

              {/* Title & Weight */}
              <div className="flex-1 min-w-0 mb-2">
                <span className="text-[10px] font-extrabold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md inline-block mb-1">
                  {prod.unit}
                </span>
                <h5 className="font-heading font-bold text-xs text-stone-900 line-clamp-2 leading-tight">
                  {prod.name}
                </h5>
              </div>

              {/* Price & Action Button Row */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-100">
                {/* Price Display */}
                <div className="flex flex-col leading-none">
                  <span className="font-heading font-extrabold text-xs sm:text-sm text-stone-950">
                    ₹{prod.finalPrice}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] text-stone-400 line-through">
                      ₹{prod.originalPrice}
                    </span>
                  )}
                </div>

                {/* Blinkit-Style Green Quick "+ ADD" Button / Active Stepper */}
                {inCartCount === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleAddClick(prod)}
                    className="h-7 px-3 rounded-lg bg-[#0c831f] hover:bg-[#0a731b] active:scale-90 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center shadow-xs transition-transform cursor-pointer"
                  >
                    + ADD
                  </button>
                ) : (
                  <div className="h-7 flex items-center bg-[#0c831f] text-white rounded-lg px-1 shadow-xs font-bold text-xs">
                    {onUpdateQuantity ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(prod.id, inCartCount - 1)}
                          className="w-5 h-5 flex items-center justify-center hover:bg-black/20 rounded cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                        <span className="w-5 text-center text-xs font-black">{inCartCount}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(prod.id, inCartCount + 1)}
                          className="w-5 h-5 flex items-center justify-center hover:bg-black/20 rounded cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddClick(prod)}
                        className="px-2 flex items-center gap-1 text-xs font-black"
                      >
                        <Check className="w-3 h-3" />
                        <span>{inCartCount} in cart</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
