import React, { useState, useMemo, useRef } from 'react';
import { Search, ChevronRight, X } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { useCategories, CATEGORIES_DATA, UnifiedCategoryTile } from '../data/categoriesData';
import { isMasterAdminPin } from '../config/adminConfig';
import { NimbuMirchiCharm } from './NimbuMirchiCharm';

export type MasterCategoryTile = UnifiedCategoryTile;
export const MASTER_CATEGORIES = CATEGORIES_DATA;

interface CategoriesScreenProps {
  onSelectCategory: (categoryTarget: ProductCategory) => void;
  onOpenVoiceModal?: () => void;
  onGlobalSearch?: (query: string) => void;
  onSecretAdminTrigger?: () => void;
  products?: Product[];
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  onSelectCategory,
  onGlobalSearch,
  onSecretAdminTrigger,
  products = [],
}) => {
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const categorySearchInputRef = useRef<HTMLInputElement>(null);

  // Dynamically load ALL unique categories from live Supabase/store products
  const { categories: unifiedCategories } = useCategories(products);
  const displayCategories = unifiedCategories.length > 0 ? unifiedCategories : CATEGORIES_DATA;

  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return displayCategories;
    const q = categorySearchQuery.trim().toLowerCase();
    return displayCategories.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(q);
      const matchHindi = cat.hindiName.toLowerCase().includes(q);
      const matchKeyword = cat.keywords.some((k) => k.toLowerCase().includes(q));
      return matchName || matchHindi || matchKeyword;
    });
  }, [displayCategories, categorySearchQuery]);

  const handleTileClick = (target: ProductCategory) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(15);
      } catch {
        // ignore
      }
    }
    onSelectCategory(target);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onGlobalSearch && categorySearchQuery.trim()) {
      onGlobalSearch(categorySearchQuery.trim());
    }
  };

  return (
    <div className="w-full min-h-screen bg-stone-50 pb-28">
      {/* Top Header & Search Bar */}
      <header className="bg-[#0C5A2B] text-white pt-3 pb-4 px-3 sm:px-4 shadow-md sticky top-0 z-30 transition-all">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img
                src="/logo.png"
                alt="Kiranapė Logo"
                className="w-8 h-8 rounded-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="font-heading font-black text-base sm:text-lg tracking-tight text-white">
                Kiranapė
              </span>
            </div>
            <NimbuMirchiCharm className="-my-1.5" />
          </div>

          <div className="relative">
            <div className="bg-white rounded-full px-3.5 sm:px-4 py-2.5 flex items-center shadow-sm border border-emerald-700/20 text-stone-900 transition-all focus-within:ring-2 focus-within:ring-amber-400">
              <Search className="w-4 h-4 text-stone-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                id="categories-search-input"
                ref={categorySearchInputRef}
                value={categorySearchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isMasterAdminPin(val)) {
                    setCategorySearchQuery('');
                    categorySearchInputRef.current?.blur();
                    onSecretAdminTrigger?.();
                    return;
                  }
                  setCategorySearchQuery(val);
                }}
                onKeyDown={(e) => {
                  if (isMasterAdminPin(categorySearchQuery) && e.key === 'Enter') {
                    e.preventDefault();
                    setCategorySearchQuery('');
                    categorySearchInputRef.current?.blur();
                    onSecretAdminTrigger?.();
                    return;
                  }
                  handleSearchKeyDown(e);
                }}
                placeholder="यहाँ कैटेगरी या सामान खोजें..."
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
              />
              {categorySearchQuery && (
                <button
                  type="button"
                  onClick={() => setCategorySearchQuery('')}
                  className="p-1 text-stone-400 hover:text-stone-700"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <section className="max-w-5xl mx-auto px-3 sm:px-4 pt-4 pb-2 flex items-baseline justify-between gap-2">
        <div>
          <h1 className="font-heading font-black text-lg sm:text-xl text-stone-900 tracking-tight leading-tight">
            सभी कैटेगरीज़ (All Categories)
          </h1>
          <p className="text-xs text-stone-500 font-medium mt-0.5 tabular-nums">
            {displayCategories.length} categories · {products.length} live products
          </p>
        </div>
      </section>

      {/* Dynamic All-Categories Grid */}
      <main className="max-w-5xl mx-auto p-3 sm:p-4">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200/80 shadow-xs my-4">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              🔍
            </div>
            <h3 className="font-bold text-stone-900 text-base">
              No categories matched "{categorySearchQuery}"
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
              Try searching with common terms like atta, oil, dal, soap, or biscuits.
            </p>
            <button
              type="button"
              onClick={() => setCategorySearchQuery('')}
              className="mt-4 px-4 py-2 rounded-xl bg-[#0c831f] text-white text-xs font-bold hover:bg-[#0a731b] cursor-pointer"
            >
              Show all {displayCategories.length} categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3.5">
            {filteredCategories.map((tile) => {
              const displayImage = tile.imageUrl || tile.primaryImage || tile.fallbackSvg;

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
                  className={`bg-gradient-to-b ${tile.gradient} rounded-2xl border p-2.5 flex flex-col justify-between relative overflow-hidden shadow-2xs transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group select-none min-h-[168px] sm:min-h-[188px]`}
                >
                  {/* Top Row: Icon & Item Count */}
                  <div className="flex items-center justify-between w-full relative z-10 text-[10px] font-bold text-stone-700">
                    <span className="text-sm leading-none" aria-hidden="true">
                      {tile.icon}
                    </span>
                    <span className="tabular-nums whitespace-nowrap">
                      {tile.itemCount > 0 ? `${tile.itemCount} items` : tile.badge}
                    </span>
                  </div>

                  {/* Category Photo / Icon */}
                  <div className="w-full h-22 sm:h-26 flex items-center justify-center p-1 relative my-auto">
                    {tile.secondaryImage && (
                      <img
                        src={tile.secondaryImage}
                        alt=""
                        aria-hidden="true"
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 sm:w-14 sm:h-14 object-contain filter drop-shadow-sm absolute right-1 bottom-1 opacity-65 transform translate-x-0.5 translate-y-0.5 scale-90 pointer-events-none transition-transform duration-300 group-hover:scale-95"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}

                    <img
                      src={displayImage}
                      alt={tile.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-300 group-hover:scale-105 relative z-1"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (target.src !== tile.fallbackSvg) {
                          target.src = tile.fallbackSvg;
                        }
                      }}
                    />
                  </div>

                  {/* Category Footer */}
                  <div className="pt-1.5 border-t border-black/5 mt-1 flex items-end justify-between gap-1 relative z-10">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-bold text-stone-900 leading-tight line-clamp-2 group-hover:text-emerald-900 transition-colors">
                        {tile.name}
                      </h2>
                      <p className="text-[10px] font-medium text-stone-600 line-clamp-1 mt-0.5">
                        {tile.hindiName}
                      </p>
                    </div>

                    <div className="w-5 h-5 rounded-full bg-white/80 group-hover:bg-[#0c831f] group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-2xs">
                      <ChevronRight className="w-3 h-3 text-stone-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
