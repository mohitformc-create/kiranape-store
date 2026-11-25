import React, { useRef, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, CartItem } from '../types';
import { BlinkitProductPlaceholder } from './BlinkitProductPlaceholder';
import { hasRealDisplayImage, hasSupabaseStorageImage } from '../utils/studioImageUpload';

interface UpsellCarouselProps {
  products?: Product[];
  cartItems?: CartItem[];
  onAddToCart: (product: Product) => void;
  onUpdateQuantity?: (itemKey: string, quantity: number) => void;
  title?: string;
  subtitle?: string;
  className?: string;
}

const UpsellImage: React.FC<{ product: Product }> = ({ product }) => {
  const [errored, setErrored] = useState(false);
  const rawUrl = product.imageUrl || product.image || product.image_url || product.thumbnail || '';
  const showReal = hasRealDisplayImage(rawUrl) && !errored;

  if (!showReal) {
    return (
      <BlinkitProductPlaceholder
        name={product.name}
        category={product.category}
        weight={product.unit}
        className="w-full h-full"
      />
    );
  }

  return (
    <img
      src={rawUrl}
      alt={product.name}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setErrored(true)}
      className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
    />
  );
};

const POPULAR_IMPULSE_PATTERN =
  /snack|biscuit|tea|chai|coffee|namkeen|chips|chocolate|maggi|noodle|oil|ghee|soap|shampoo|sugar|salt|dal|atta|cookie|drink|juice/i;

export const UpsellCarousel: React.FC<UpsellCarouselProps> = ({
  products = [],
  cartItems = [],
  onAddToCart,
  title = 'Would you like to consider buying',
  subtitle = 'Popular daily essentials & quick add-ons',
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const inCartProductIds = useMemo(() => {
    const ids = new Set<string>();
    cartItems.forEach((item) => {
      if (item.quantity > 0) ids.add(item.product.id);
    });
    return ids;
  }, [cartItems]);

  // Select 8 popular / high-margin items from Supabase products NOT currently in the cart
  const suggestedProducts = useMemo(() => {
    const candidates = products.filter(
      (prod) =>
        prod.isAvailable !== false &&
        !inCartProductIds.has(prod.id) &&
        Number(prod.finalPrice) > 0
    );

    if (candidates.length === 0) return [];

    const scored = candidates.map((prod) => {
      let score = 0;
      if (prod.isCartRecommended || prod.featuredInCart) score += 100;
      const text = `${prod.name} ${prod.category || ''}`;
      if (POPULAR_IMPULSE_PATTERN.test(text)) score += 35;
      const img = prod.imageUrl || prod.image_url || '';
      if (hasSupabaseStorageImage(img)) score += 40;
      else if (hasRealDisplayImage(img)) score += 20;

      const mrp = Number(prod.originalPrice) || Number(prod.finalPrice);
      const sell = Number(prod.finalPrice);
      if (mrp > sell) {
        const pct = ((mrp - sell) / mrp) * 100;
        score += Math.min(25, Math.round(pct));
      }
      // Sweet-spot add-on price range ₹15–₹250
      if (sell >= 15 && sell <= 250) score += 15;

      return { prod, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((s) => s.prod);
  }, [products, inCartProductIds]);

  if (suggestedProducts.length === 0) {
    return null;
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -220 : 220,
      behavior: 'smooth',
    });
  };

  const handleAddClick = (product: Product) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(20);
      } catch {}
    }
    onAddToCart(product);
  };

  return (
    <section className={`bg-white rounded-2xl border border-stone-200/90 p-3.5 shadow-2xs space-y-2.5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-heading font-black text-stone-900 text-sm tracking-tight leading-snug">
            {title}
          </h4>
          {subtitle && (
            <p className="text-[11px] text-stone-500 font-medium">{subtitle}</p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Scroll suggestions left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Scroll suggestions right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Cards */}
      <div
        ref={scrollContainerRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-0.5 snap-x snap-mandatory touch-pan-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {suggestedProducts.map((prod) => {
          const mrp = Number(prod.originalPrice) || Number(prod.finalPrice);
          const sellingPrice = Number(prod.finalPrice);
          const hasDiscount = mrp > sellingPrice && mrp > 0;
          const discountPercent = hasDiscount
            ? Math.round(((mrp - sellingPrice) / mrp) * 100)
            : 0;

          return (
            <div
              key={prod.id}
              className="w-[148px] sm:w-[158px] flex-shrink-0 snap-start bg-stone-50/60 rounded-xl p-2.5 border border-stone-200/80 flex flex-col justify-between group hover:border-emerald-300 transition-colors"
            >
              {/* Product Photo */}
              <div className="w-full h-24 bg-white rounded-lg flex items-center justify-center p-1.5 relative overflow-hidden mb-2 border border-stone-100">
                <UpsellImage product={prod} />
              </div>

              {/* Weight & Title */}
              <div className="flex-1 min-w-0 mb-2">
                <div className="text-[10px] font-semibold text-stone-500 truncate">
                  {prod.unit || '1 Pack'}
                </div>
                <h5 className="font-heading font-bold text-xs text-stone-900 line-clamp-2 leading-snug mt-0.5 min-h-[2rem]">
                  {prod.name}
                </h5>
              </div>

              {/* Pricing Row with (X% off) */}
              <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5 mb-2 tabular-nums">
                <span className="font-heading font-black text-sm text-stone-950">
                  ₹{sellingPrice}
                </span>
                {hasDiscount && (
                  <span className="text-[11px] text-stone-400 line-through">
                    ₹{mrp}
                  </span>
                )}
                {hasDiscount && discountPercent > 0 && (
                  <span className="text-[10px] font-bold text-[#0c831f]">
                    ({discountPercent}% off)
                  </span>
                )}
              </div>

              {/* Bold ADD TO CART Button */}
              <button
                type="button"
                onClick={() => handleAddClick(prod)}
                className="w-full py-2 px-2 rounded-lg bg-[#0c831f] hover:bg-[#0a731b] active:scale-[0.97] text-white font-heading font-black text-[11px] tracking-wide uppercase transition-all cursor-pointer whitespace-nowrap"
              >
                ADD TO CART
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
