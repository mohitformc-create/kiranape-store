import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { CustomCategory, Product, ProductCategory } from '../types';
import { useCategories, CATEGORIES_DATA } from '../data/categoriesData';

interface CategoryTileGridProps {
  categories: CustomCategory[];
  products: Product[];
  department?: 'grocery' | 'stationery';
  onSelectCategory: (categoryName: string) => void;
  onViewAllClick?: () => void;
}

export const CategoryTileGrid: React.FC<CategoryTileGridProps> = ({
  products = [],
  onSelectCategory,
  onViewAllClick,
}) => {
  const [showAllInline, setShowAllInline] = useState(false);
  const { categories: unifiedCategories } = useCategories(products);

  const displayCategories = unifiedCategories.length > 0 ? unifiedCategories : CATEGORIES_DATA;
  const visibleCategories = showAllInline ? displayCategories : displayCategories.slice(0, 9);

  const handleTileClick = (target: ProductCategory | string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(15);
      } catch {
        // ignore
      }
    }
    onSelectCategory(target);
  };

  return (
    <section id="browse-categories-section" className="mb-6 w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-1 gap-2">
        <div className="min-w-0">
          <h3 className="font-heading font-black text-base sm:text-lg text-stone-900 tracking-tight">
            Browse Categories
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            {displayCategories.length} Categories · Fresh & Daily Superstore
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onViewAllClick) {
              onViewAllClick();
            } else {
              setShowAllInline((prev) => !prev);
            }
          }}
          className="text-xs font-bold text-[#0c831f] hover:text-[#0a731b] active:scale-95 flex items-center gap-0.5 cursor-pointer transition-all whitespace-nowrap shrink-0"
        >
          <span>View All ({displayCategories.length})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Responsive Dynamic Category Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {visibleCategories.map((tile) => {
          const mainImage = tile.imageUrl || tile.primaryImage || tile.fallbackSvg;

          return (
            <div
              key={tile.id}
              onClick={() => handleTileClick(tile.categoryTarget)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTileClick(tile.categoryTarget);
                }
              }}
              className={`bg-gradient-to-b ${tile.gradient} rounded-2xl border p-2.5 flex flex-col justify-between relative overflow-hidden shadow-2xs transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group select-none min-h-[155px] sm:min-h-[170px]`}
              title={`Browse ${tile.name}`}
            >
              {/* Top Row: Category icon + clean item count */}
              <div className="flex items-center justify-between w-full relative z-10 text-[10px] font-semibold text-stone-600">
                <span className="text-sm leading-none" aria-hidden="true">
                  {tile.icon}
                </span>
                <span className="tabular-nums font-bold text-stone-700 whitespace-nowrap">
                  {tile.itemCount > 0 ? `${tile.itemCount} items` : tile.badge}
                </span>
              </div>

              {/* Packshot / Category Image */}
              <div className="w-full h-20 sm:h-24 flex items-center justify-center p-1 relative my-auto">
                {tile.secondaryImage && (
                  <img
                    src={tile.secondaryImage}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 sm:w-12 sm:h-12 object-contain filter drop-shadow-sm absolute right-0.5 bottom-0.5 opacity-65 transform translate-x-0.5 translate-y-0.5 scale-90 pointer-events-none transition-transform duration-300 group-hover:scale-95"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <img
                  src={mainImage}
                  alt={tile.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-300 group-hover:scale-105 relative z-1"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== tile.fallbackSvg) {
                      target.src = tile.fallbackSvg;
                    }
                  }}
                />
              </div>

              {/* Category Name & Chevron */}
              <div className="pt-1.5 border-t border-black/5 mt-1 flex items-end justify-between gap-1 relative z-10">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-stone-900 leading-tight line-clamp-2 group-hover:text-emerald-900 transition-colors">
                    {tile.name}
                  </h4>
                </div>
                <div className="w-5 h-5 rounded-full bg-white/80 group-hover:bg-[#0c831f] group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-2xs">
                  <ChevronRight className="w-3 h-3 text-stone-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / View All Button if more categories exist beyond first 9 */}
      {displayCategories.length > 9 && !showAllInline && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (onViewAllClick) {
                onViewAllClick();
              } else {
                setShowAllInline(true);
              }
            }}
            className="px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-xs font-bold text-[#0c831f] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
          >
            <span>सभी {displayCategories.length} कैटेगरी देखें (View All Categories)</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};
