import React, { useMemo } from 'react';
import { Product, ProductVariant } from '../types';
import { ProductCard } from './ProductCard';
import { Flame, Sparkles, ChevronRight } from 'lucide-react';

interface MostShoppedSliderProps {
  products: Product[];
  cartQuantities: Record<string, number>;
  department?: 'grocery' | 'stationery';
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  onUpdateQuantity: (itemKey: string, newQuantity: number) => void;
  onViewAllCategory?: (categoryName: string) => void;
}

export const MostShoppedSlider: React.FC<MostShoppedSliderProps> = ({
  products,
  cartQuantities,
  department = 'grocery',
  onAddToCart,
  onUpdateQuantity,
  onViewAllCategory,
}) => {
  // Select top essentials based on active department
  const topFiveEssentials = useMemo(() => {
    if (!products || products.length === 0) return [];

    const isStat = department === 'stationery';
    const priorityKeywords = isStat
      ? ['classmate', 'reynolds', 'fevicol', 'jk copier', 'apsara', 'kangaro', 'cello tape']
      : ['good day', 'red label', 'surf excel', 'dove', 'atta', 'fortune', 'bourbon', 'marie'];

    const pool = products.filter((p) => {
      const isItemStat =
        p.department === 'stationery' ||
        p.category.includes('Copies') ||
        p.category.includes('Pens') ||
        p.category.includes('Art') ||
        p.category.includes('Office');
      return isStat ? isItemStat : !isItemStat;
    });

    const scored = pool.map((item) => {
      const lowerName = item.name.toLowerCase();
      let score = 0;
      priorityKeywords.forEach((kw, idx) => {
        if (lowerName.includes(kw)) {
          score += (priorityKeywords.length - idx) * 10;
        }
      });
      if ((item as any).isFeatured) score += 50;
      if (item.isAvailable !== false) score += 5;
      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 6).map((s) => s.item);
  }, [products, department]);

  if (topFiveEssentials.length === 0) return null;

  return (
    <section className="mb-6 bg-white rounded-3xl p-3.5 sm:p-4 border border-stone-200/90 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-2xs">
            {department === 'stationery' ? <Sparkles className="w-4 h-4 text-amber-300" /> : <Flame className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-sm sm:text-base text-stone-900 leading-tight">
              {department === 'stationery'
                ? 'टॉप स्टेशनरी बेस्टसेलर्स (Top Stationery Bestsellers)'
                : 'Most Shopped Daily Essentials'}
            </h3>
            <p className="text-[11px] text-stone-500">
              {department === 'stationery'
                ? 'क्लासमेट कॉपियां, रेनॉलड्स पेन व फेविकोल — 10-20 मिनट में घर पर'
                : 'Top customer favorites directly at wholesale rates'}
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
