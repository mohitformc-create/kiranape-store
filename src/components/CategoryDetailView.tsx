import React, { useMemo, useState } from 'react';
import { Product, ProductVariant, CustomCategory } from '../types';
import { ProductCard } from './ProductCard';
import { ArrowLeft, Search, X, Sparkles } from 'lucide-react';

interface CategoryDetailViewProps {
  categoryName: string;
  categories: CustomCategory[];
  products: Product[];
  cartQuantities: Record<string, number>;
  onBackToCategories: () => void;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  onUpdateQuantity: (itemKey: string, newQuantity: number) => void;
  onSelectCategory: (categoryName: string) => void;
}

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  categoryName,
  categories,
  products,
  cartQuantities,
  onBackToCategories,
  onAddToCart,
  onUpdateQuantity,
  onSelectCategory,
}) => {
  const [internalSearch, setInternalSearch] = useState<string>('');

  // Selectable categories excluding 'All'
  const selectableCategories = useMemo(() => {
    return categories.filter((c) => c.name !== 'All');
  }, [categories]);

  // Current category metadata
  const currentCategoryMeta = useMemo(() => {
    return categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  }, [categories, categoryName]);

  // Filter products for active category and in-category search query
  const categoryProducts = useMemo(() => {
    const list = products.filter(
      (p) => p.category.toLowerCase() === categoryName.toLowerCase()
    );

    if (!internalSearch.trim()) {
      return list;
    }

    const q = internalSearch.trim().toLowerCase();
    return list.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const hindi = (p.hindiName || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const unit = (p.unit || '').toLowerCase();
      return name.includes(q) || hindi.includes(q) || cat.includes(q) || unit.includes(q);
    });
  }, [products, categoryName, internalSearch]);

  return (
    <div className="w-full pb-10">
      {/* 1. TOP AMAZON FRESH STYLE HORIZONTAL CATEGORY TABS */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-2 sm:p-2.5 mb-3.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none no-scrollbar touch-pan-x">
          {/* All Categories Pill */}
          <button
            type="button"
            onClick={onBackToCategories}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 active:scale-95"
          >
            <span>🏠</span>
            <span>All Categories</span>
          </button>

          {/* Individual Category Tabs */}
          {selectableCategories.map((cat) => {
            const isActive = cat.name.toLowerCase() === categoryName.toLowerCase();
            return (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => {
                  setInternalSearch('');
                  onSelectCategory(cat.name);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 border-2 border-emerald-500 font-extrabold shadow-xs'
                    : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 shadow-2xs'
                }`}
              >
                <span className="text-base leading-none">{cat.icon || '🏷️'}</span>
                <span>{cat.name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-0.5 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CATEGORY HEADER BAR: Back Button + Title + Clean Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs p-3 sm:p-4 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Left: Back Button & Category Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            id="cat-back-btn"
            onClick={onBackToCategories}
            className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 border border-stone-200"
            title="Back to all categories"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl">
                {currentCategoryMeta?.icon || '🏷️'}
              </span>
              <h2 className="font-heading font-black text-stone-900 text-base sm:text-lg truncate">
                {categoryName}
              </h2>
              <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                {categoryProducts.length} items
              </span>
            </div>
            {currentCategoryMeta?.hindiName && (
              <p className="text-xs text-stone-400 font-medium ml-7 sm:ml-8 mt-0.5">
                {currentCategoryMeta.hindiName}
              </p>
            )}
          </div>
        </div>

        {/* Right: In-Category Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            id="cat-search-input"
            type="text"
            value={internalSearch}
            onChange={(e) => setInternalSearch(e.target.value)}
            placeholder={`Search in ${categoryName}...`}
            className="w-full pl-8 pr-8 py-2 bg-stone-50 focus:bg-white text-xs text-stone-900 placeholder:text-stone-400 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 font-medium transition-all"
          />
          {internalSearch && (
            <button
              type="button"
              onClick={() => setInternalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded-full cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. FULL-WIDTH SPACIOUS ULTRA-CLEAN PRODUCT GRID (NO CLUTTER, NO SIDEBARS) */}
      {categoryProducts.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-stone-200 shadow-xs my-4">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
            <Search className="w-7 h-7" />
          </div>
          <h4 className="font-heading font-bold text-stone-900 text-base sm:text-lg">
            {internalSearch
              ? `No items match "${internalSearch}" in ${categoryName}`
              : `No items available in ${categoryName} right now`}
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
            {internalSearch
              ? 'Try searching with general keywords or check other categories.'
              : 'Our inventory is being restocked. Please browse other departments.'}
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            {internalSearch ? (
              <button
                type="button"
                onClick={() => setInternalSearch('')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            ) : null}
            <button
              type="button"
              onClick={onBackToCategories}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Return to All Categories
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
          {categoryProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantityInCart={cartQuantities[product.id] || 0}
              cartQuantities={cartQuantities}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
            />
          ))}
        </div>
      )}
    </div>
  );
};
