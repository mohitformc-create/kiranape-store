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
  const [showAll, setShowAll] = useState(false);
  const { categories: unifiedCategories } = useCategories(products);

  const displayCategories = unifiedCategories.length > 0 ? unifiedCategories : CATEGORIES_DATA;

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
      {/* Section Header: "Browse Categories" with a green "View all" link on the right */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h3 className="font-heading font-black text-base sm:text-lg text-stone-900 tracking-tight">
            Browse Categories
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            3D Quick-Commerce • Fresh & Daily Superstore
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onViewAllClick) {
              onViewAllClick();
            } else {
              setShowAll((prev) => !prev);
            }
          }}
          className="text-xs font-bold text-[#0c831f] hover:text-[#0a731b] active:scale-95 flex items-center gap-0.5 cursor-pointer transition-all"
        >
          <span>View all</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid Layout: 3-column responsive grid (grid grid-cols-3 gap-2.5 sm:gap-3.5) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        {(showAll ? displayCategories : displayCategories.slice(0, 6)).map((tile) => {
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
              className={`bg-gradient-to-b ${tile.gradient} rounded-3xl border p-2.5 flex flex-col justify-between relative overflow-hidden shadow-sm transition-all duration-200 active:scale-95 hover:shadow-md cursor-pointer group select-none min-h-[165px] sm:min-h-[185px]`}
              title={`Browse ${tile.name}`}
            >
              {/* Floating micro-badge at top-right corner */}
              <div className="flex justify-end w-full relative z-10">
                <span className="bg-white/85 backdrop-blur-sm text-[10px] font-bold text-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200/60 shadow-xs leading-none whitespace-nowrap">
                  {tile.badge}
                </span>
              </div>

              {/* 3D Multi-pack Cluster Image Showcase (65% Height) */}
              <div className="w-full h-24 sm:h-28 flex items-center justify-center p-1 relative my-auto">
                {tile.secondaryImage && (
                  <img
                    src={tile.secondaryImage}
                    alt=""
                    aria-hidden="true"
                    className="w-12 h-12 sm:w-14 sm:h-14 object-contain filter drop-shadow-sm absolute right-1 bottom-1 opacity-70 transform translate-x-1 translate-y-1 scale-90 pointer-events-none transition-transform duration-300 group-hover:scale-95"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <img
                  src={mainImage}
                  alt={tile.name}
                  loading="lazy"
                  className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105 relative z-1"
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== tile.fallbackSvg) {
                      target.src = tile.fallbackSvg;
                    }
                  }}
                />
              </div>

              {/* Text & Chevron Footer */}
              <div className="pt-1.5 border-t border-black/5 mt-1 flex items-end justify-between gap-1 relative z-10">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-neutral-900 leading-tight line-clamp-1 group-hover:text-emerald-900 transition-colors">
                    {tile.name}
                  </h4>
                  <p className="text-[11px] font-medium text-neutral-600 line-clamp-1 mt-0.5">
                    {tile.hindiName}
                  </p>
                </div>
                <div className="w-5 h-5 rounded-full bg-white/70 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-2xs">
                  <ChevronRight className="w-3 h-3 text-neutral-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
