import React, { useMemo, useRef, useState } from 'react';
import { Plus, Minus, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { Product } from '../types';
import { BlinkitProductPlaceholder } from './BlinkitProductPlaceholder';
import { hasRealDisplayImage } from '../utils/studioImageUpload';

interface NewArrivalsShelfProps {
  products: Product[];
  cartQuantities: Record<string, number>;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (itemKey: string, newQuantity: number) => void;
  isAdmin?: boolean;
  onQuickEdit?: (product: Product) => void;
}

const NewArrivalImage: React.FC<{ product: Product }> = ({ product }) => {
  const [errored, setErrored] = useState(false);
  const rawUrl = product.imageUrl || product.image_url || '';
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
      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
    />
  );
};

export const NewArrivalsShelf: React.FC<NewArrivalsShelfProps> = ({
  products,
  cartQuantities,
  onAddToCart,
  onUpdateQuantity,
  isAdmin = false,
  onQuickEdit,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pick the 12 most recently added in-stock products from live Supabase/store catalog
  const recentProducts = useMemo(() => {
    const available = products.filter((p) => p.isAvailable !== false && p.name);
    if (available.length === 0) return [];

    const withTime = available.map((p, index) => {
      let ts = 0;
      if (p.createdAt) {
        ts = typeof p.createdAt === 'number' ? p.createdAt : new Date(p.createdAt).getTime();
      } else if (p.updatedAt) {
        ts = Number(p.updatedAt) || 0;
      }
      return {
        product: p,
        ts: Number.isFinite(ts) ? ts : 0,
        index,
      };
    });

    // Sort by newest timestamp first; preserve Supabase created_at DESC array order on tie
    withTime.sort((a, b) => {
      if (b.ts !== a.ts) return b.ts - a.ts;
      return a.index - b.index;
    });

    return withTime.slice(0, 12).map((entry) => entry.product);
  }, [products]);

  if (recentProducts.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -280 : 280,
      behavior: 'smooth',
    });
  };

  return (
    <section id="new-arrivals-section" className="w-full my-5">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="min-w-0">
          <h3 className="font-heading font-black text-base sm:text-lg text-stone-900 tracking-tight truncate">
            🆕 नया स्टॉक (New Arrivals)
          </h3>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            स्टोर में अभी-अभी आए ताज़ा और नए प्रोडक्ट्स · {recentProducts.length} items
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Scroll new arrivals left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Scroll new arrivals right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Row */}
      <div
        ref={scrollRef}
        className="flex gap-2.5 sm:gap-3.5 overflow-x-auto pb-2.5 pt-0.5 scrollbar-none no-scrollbar touch-pan-x scroll-smooth snap-x snap-mandatory px-0.5"
      >
        {recentProducts.map((product) => {
          const quantity = cartQuantities[product.id] || 0;
          const origPrice = Number(product.originalPrice) || 0;
          const finalPrice = Number(product.finalPrice) || origPrice;
          const hasDiscount = origPrice > finalPrice && origPrice > 0;
          const discountPercent = hasDiscount
            ? Math.round(((origPrice - finalPrice) / origPrice) * 100)
            : 0;

          return (
            <div
              key={product.id}
              className="w-38 sm:w-44 flex-shrink-0 snap-start bg-white rounded-2xl border border-stone-200/90 p-2.5 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 transition-all flex flex-col justify-between select-none relative group"
            >
              {/* Quick Edit Pencil for Admin */}
              {isAdmin && onQuickEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onQuickEdit(product);
                  }}
                  className="absolute top-2 right-2 z-20 w-6 h-6 rounded-full bg-stone-900/85 hover:bg-stone-950 text-amber-300 shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                  title="Quick Edit Product"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}

              {/* Image Container */}
              <div className="relative w-full h-28 sm:h-32 rounded-xl bg-stone-50/70 p-1.5 flex items-center justify-center overflow-hidden mb-2">
                <NewArrivalImage product={product} />

                {hasDiscount && (
                  <span className="absolute top-1.5 left-1.5 bg-[#0c831f] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs leading-none">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {/* Clean Metadata + Title */}
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-medium text-stone-500 truncate">
                  {product.unit || '1 Pack'}
                  {product.category ? ` · ${product.category}` : ''}
                </div>
                <h4 className="font-heading font-bold text-xs sm:text-[13px] text-stone-900 line-clamp-2 leading-snug mt-0.5 min-h-[2.1rem]">
                  {product.name}
                </h4>
              </div>

              {/* Price & Quick + ADD Control */}
              <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
                <div className="flex flex-col leading-tight min-w-0 tabular-nums">
                  <span className="text-xs sm:text-sm font-black text-stone-950 font-heading">
                    ₹{finalPrice}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] text-stone-400 line-through">
                      ₹{origPrice}
                    </span>
                  )}
                </div>

                {quantity === 0 ? (
                  <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    className="h-8 px-3 rounded-xl bg-emerald-50 hover:bg-[#0c831f] text-[#0c831f] hover:text-white border border-[#0c831f]/40 font-heading font-black text-xs whitespace-nowrap transition-colors active:scale-95 cursor-pointer"
                    aria-label={`Add ${product.name} to cart`}
                  >
                    + ADD
                  </button>
                ) : (
                  <div className="h-8 flex items-center bg-[#0c831f] text-white rounded-xl px-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                      className="w-6 h-6 flex items-center justify-center text-white hover:bg-black/15 rounded active:scale-90 cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span className="w-5 text-center font-heading font-black text-xs tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-white hover:bg-black/15 rounded active:scale-90 cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
