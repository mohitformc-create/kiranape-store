import React, { useRef, useMemo } from 'react';
import { Plus, Minus, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, CartItem } from '../types';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface UpsellCarouselProps {
  products?: Product[];
  cartItems?: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (itemKey: string, quantity: number) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

// Helper to normalize product image lookup across possible backend keys
const getProductImage = (prod: Product): string => {
  return (
    prod.imageUrl ||
    prod.image ||
    prod.image_url ||
    prod.thumbnail ||
    getCategoryFallbackSvg(prod.category, prod.name)
  );
};

export const UpsellCarousel: React.FC<UpsellCarouselProps> = ({
  products = [],
  cartItems = [],
  onAddToCart,
  onUpdateQuantity,
  title = 'You might also like',
  subtitle = 'Frequently added daily essentials with fast delivery',
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter ONLY products where isCartRecommended === true (or featuredInCart === true) and in-stock
  const recommendedProducts = useMemo(() => {
    return products.filter(
      (prod) => Boolean(prod.isCartRecommended || prod.featuredInCart) && prod.isAvailable !== false
    );
  }, [products]);

  // STRICT REQUIREMENT: If NO products are flagged as recommended by Admin, HIDE the entire section completely
  if (recommendedProducts.length === 0) {
    return null;
  }

  // Map of product quantities currently in the cart
  const cartQuantityMap = useMemo(() => {
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

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }
  };

  const handleAddClick = (product: Product) => {
    triggerHaptic();
    onAddToCart(product);
  };

  const handleQuantityStep = (productId: string, newQty: number, product?: Product) => {
    triggerHaptic();
    if (onUpdateQuantity) {
      onUpdateQuantity(productId, newQty);
    } else if (newQty > 0 && product) {
      onAddToCart(product);
    }
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
        {recommendedProducts.map((prod) => {
          const inCartCount = cartQuantityMap[prod.id] || 0;
          const mrp = prod.originalPrice || prod.finalPrice;
          const sellingPrice = prod.finalPrice;
          const hasDiscount = mrp > sellingPrice;
          const discountPercent = prod.discountPercent || (hasDiscount ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0);
          const imageSrc = getProductImage(prod);

          return (
            <div
              key={prod.id}
              className="w-[140px] xs:w-[150px] sm:w-[165px] flex-shrink-0 snap-start bg-white rounded-2xl p-2.5 border border-stone-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              {/* Product Image Box - Packshot Sizing & Fallback */}
              <div className="w-full h-24 bg-white rounded-xl flex items-center justify-center p-2 relative overflow-hidden mb-2 border border-stone-100">
                <img
                  src={imageSrc}
                  alt={prod.name}
                  className="w-full h-full object-contain mix-blend-multiply transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = getCategoryFallbackSvg(prod.category, prod.name);
                  }}
                />

                {/* Discount Badge */}
                {hasDiscount && (
                  <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                    {discountPercent}% OFF
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
                {prod.hindiName && (
                  <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                    {prod.hindiName}
                  </p>
                )}
              </div>

              {/* Price & Action Button Row */}
              <div className="flex items-center justify-between gap-1 pt-1 border-t border-stone-100">
                {/* Price Display */}
                <div className="flex flex-col leading-none">
                  <span className="font-heading font-extrabold text-xs sm:text-sm text-stone-950">
                    ₹{sellingPrice}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] text-stone-400 line-through">
                      ₹{mrp}
                    </span>
                  )}
                </div>

                {/* Blinkit-Style Green Quick "+ ADD" Button / Sleek Quantity Stepper */}
                {inCartCount === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleAddClick(prod)}
                    className="h-7 px-3 rounded-lg bg-[#0c831f] hover:bg-[#0a731b] active:scale-90 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center shadow-xs transition-transform cursor-pointer"
                  >
                    + ADD
                  </button>
                ) : (
                  <div className="h-7 min-w-[70px] flex items-center justify-between bg-[#0c831f] text-white rounded-lg px-1 shadow-xs font-bold text-xs animate-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => handleQuantityStep(prod.id, inCartCount - 1, prod)}
                      className="w-5 h-5 flex items-center justify-center hover:bg-black/20 active:scale-90 rounded cursor-pointer transition-transform"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3 text-white stroke-[2.5]" />
                    </button>
                    <span className="w-5 text-center text-xs font-black text-white select-none">
                      {inCartCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityStep(prod.id, inCartCount + 1, prod)}
                      className="w-5 h-5 flex items-center justify-center hover:bg-black/20 active:scale-90 rounded cursor-pointer transition-transform"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3 text-white stroke-[2.5]" />
                    </button>
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
