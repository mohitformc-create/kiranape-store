import React, { useMemo } from 'react';
import { Product, ProductVariant } from '../types';
import { ProductCard } from './ProductCard';
import { Flame, Sparkles, ChevronRight } from 'lucide-react';

interface MostShoppedSliderProps {
  products: Product[];
  cartQuantities: Record<string, number>;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  onUpdateQuantity: (itemKey: string, newQuantity: number) => void;
  onViewAllCategory?: (categoryName: string) => void;
}

export const MostShoppedSlider: React.FC<MostShoppedSliderProps> = ({
  products,
  cartQuantities,
  onAddToCart,
  onUpdateQuantity,
  onViewAllCategory,
}) => {
  // Select top 5 customer essentials strictly (curated FMCG top staples)
  const topFiveEssentials = useMemo(() => {
    if (!products || products.length === 0) return [];

    // Prioritize high-demand FMCG staples
    const priorityKeywords = [
      'good day',
      'red label',
      'surf excel',
      'dove',
      'atta',
      'fortune',
      'bourbon',
      'marie',
    ];

    const scored = [...products].map((item) => {
      const lowerName = item.name.toLowerCase();
      let score = 0;
      priorityKeywords.forEach((kw, idx) => {
        if (lowerName.includes(kw)) {
          score += (priorityKeywords.length - idx) * 10;
        }
      });
      if (item.isFeatured) score += 50;
      if (item.inStock !== false) score += 5;
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map((s) => s.item);
  }, [products]);

  if (topFiveEssentials.length === 0) return null;

  return (
    <section className="mb-6 bg-white rounded-3xl p-3.5 sm:p-4 border border-stone-200/90 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold shadow-2xs">
            <Flame className="w-4 h-4 fill-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-heading font-extrabold text-stone-900 text-base sm:text-lg tracking-tight">
                Most Shopped Essentials
              </h2>
              <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                Top 5
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500">
              Daily customer favorites in Waidhan & nearby
            </p>
          </div>
        </div>
      </div>

      {/* Clean compact single-row horizontal slider */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none no-scrollbar snap-x snap-mandatory">
        {topFiveEssentials.map((product) => (
          <div
            key={product.id}
            className="w-[180px] xs:w-[190px] sm:w-[210px] flex-shrink-0 snap-start"
          >
            <ProductCard
              product={product}
              quantityInCart={cartQuantities[product.id] || 0}
              cartQuantities={cartQuantities}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
