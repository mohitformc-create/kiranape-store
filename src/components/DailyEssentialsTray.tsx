import React from 'react';
import { Plus, Minus, ChevronRight, Zap, Pencil } from 'lucide-react';
import { Product } from '../types';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface DailyEssentialsTrayProps {
  products: Product[];
  cartQuantities: Record<string, number>;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (itemKey: string, newQuantity: number) => void;
  onViewAll?: () => void;
  isAdmin?: boolean;
  onQuickEdit?: (product: Product) => void;
}

export const DailyEssentialsTray: React.FC<DailyEssentialsTrayProps> = ({
  products,
  cartQuantities,
  onAddToCart,
  onUpdateQuantity,
  onViewAll,
  isAdmin = false,
  onQuickEdit,
}) => {
  // Filter for high-impulse daily kitchen essentials (Atta, Oil, Sugar, Salt, Biscuits, Tea, Dal, Ghee)
  const dailyEssentials = React.useMemo(() => {
    const keywords = ['sugar', 'cheeni', 'salt', 'namak', 'oil', 'tel', 'ghee', 'atta', 'dal', 'tea', 'chai', 'biscuit', 'maggi', 'soap'];
    const matched = products.filter((p) => {
      const lower = (p.name + ' ' + (p.category || '')).toLowerCase();
      return keywords.some((k) => lower.includes(k));
    });

    // If matched has enough items, take top 12, otherwise fallback to first 12 products
    return matched.length >= 6 ? matched.slice(0, 14) : products.slice(0, 12);
  }, [products]);

  if (dailyEssentials.length === 0) return null;

  return (
    <section id="daily-essentials-section" className="w-full my-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div>
          <h3 className="font-heading font-black text-base sm:text-lg text-stone-900 tracking-tight flex items-center gap-1.5">
            <span>Taaza Samaan & Daily Essentials</span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
              ⚡ Flash Deals
            </span>
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            Daily kitchen staples with instant doorstep delivery
          </p>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-bold text-[#0c831f] hover:text-[#0a731b] flex items-center gap-0.5 cursor-pointer flex-shrink-0"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal Scroll Tray */}
      <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-2.5 pt-1 scrollbar-none no-scrollbar touch-pan-x scroll-smooth px-0.5">
        {dailyEssentials.map((product) => {
          const quantity = cartQuantities[product.id] || 0;
          const origPrice = Number(product.originalPrice) || 0;
          const finalPrice = Number(product.finalPrice) || origPrice;
          const discountPercent =
            product.discountPercent ||
            (origPrice > finalPrice ? Math.round(((origPrice - finalPrice) / origPrice) * 100) : 0);

          return (
            <div
              key={product.id}
              className="w-36 sm:w-44 flex-shrink-0 bg-white rounded-2xl border border-stone-200/90 p-2.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between select-none relative group"
            >
              {/* Discreet Pencil Edit Button */}
              {isAdmin && onQuickEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onQuickEdit(product);
                  }}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-stone-900/80 hover:bg-stone-950 text-amber-300 hover:text-amber-200 shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer pointer-events-auto"
                  title="Quick Edit Product"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}

              {/* Top: Red/Orange Discount Badge */}
              <div className="flex items-center justify-between w-full mb-1">
                <span className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-2xs">
                  {discountPercent > 0 ? `${discountPercent}% OFF` : 'SUPER DEAL'}
                </span>
                <span className="text-[10px] text-stone-400 font-medium">⚡ 15m</span>
              </div>

              {/* Product Packshot */}
              <div className="w-full h-24 sm:h-28 flex items-center justify-center p-1 overflow-hidden my-0.5">
                <img
                  src={product.imageUrl || getCategoryFallbackSvg(product.category, product.name)}
                  alt={product.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                  onError={(e) => {
                    const fallback = getCategoryFallbackSvg(product.category, product.name);
                    if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                      (e.currentTarget as HTMLImageElement).src = fallback;
                    }
                  }}
                />
              </div>

              {/* Pack Size / Weight Label */}
              <span className="text-[10px] sm:text-[11px] font-bold text-stone-400 block truncate mt-1">
                {product.unit || '1 Pack'}
              </span>

              {/* Product Title */}
              <h4 className="font-heading font-bold text-xs text-stone-900 line-clamp-2 leading-snug mt-0.5 min-h-[2rem]">
                {product.name}
              </h4>

              {/* Price & Green + ADD / Counter Button */}
              <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between gap-1.5">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-black text-stone-950 font-heading">
                    ₹{finalPrice}
                  </span>
                  {origPrice > finalPrice && (
                    <span className="text-[10px] text-stone-400 line-through">
                      ₹{origPrice}
                    </span>
                  )}
                </div>

                {quantity === 0 ? (
                  <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-[#0c831f] text-[#0c831f] hover:text-white border border-[#0c831f]/40 font-heading font-black text-xs transition-all active:scale-95 cursor-pointer shadow-2xs"
                    aria-label={`Add ${product.name} to cart`}
                  >
                    + ADD
                  </button>
                ) : (
                  <div className="flex items-center bg-[#0c831f] text-white rounded-xl py-0.5 px-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                      className="w-5 h-6 flex items-center justify-center text-white hover:bg-black/10 rounded active:scale-90 cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span className="w-5 text-center font-heading font-black text-xs">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                      className="w-5 h-6 flex items-center justify-center text-white hover:bg-black/10 rounded active:scale-90 cursor-pointer"
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
