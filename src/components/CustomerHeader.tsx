import React from 'react';
import { Sparkles } from 'lucide-react';
import { Product, ProductCategory, AppUser, StoreSettings, CustomCategory } from '../types';
import { useCategories } from '../data/categoriesData';
import { SearchBar } from './SearchBar';
import { NimbuMirchiCharm } from './NimbuMirchiCharm';

interface CustomerHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: ProductCategory;
  onSelectCategory: (category: ProductCategory) => void;
  totalCartItems: number;
  cartTotalAmount: number;
  onOpenCart: () => void;
  onOpenAdminPin?: () => void;
  onSecretAdminTrigger?: () => void;
  currentUser?: AppUser | null;
  onOpenAuth?: (tab?: 'customer' | 'admin') => void;
  onLogout?: () => void;
  onOpenTracker?: () => void;
  hasActiveOrders?: boolean;
  storeSettings?: StoreSettings;
  categories?: CustomCategory[];
  products?: Product[];
  selectedDepartment?: 'grocery' | 'stationery';
  onSelectDepartment?: (dept: 'grocery' | 'stationery') => void;
  onOpenParchiModal?: () => void;
  onOpenVoiceModal?: () => void;
  onOpenDigitalParchiModal?: () => void;
  onOpenLaunchPoster?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onSecretAdminTrigger,
  products = [],
  onOpenLaunchPoster,
}) => {
  // Dynamically load ALL unique categories present in the live Supabase/store products catalog
  const { categories: liveCategories } = useCategories(products);

  return (
    <header className="sticky top-0 z-40 w-full max-w-full bg-white/95 backdrop-blur-md shadow-xs border-b border-stone-200/70">
      <div className="px-3 sm:px-4 pt-2 pb-2.5">
        <div className="max-w-6xl mx-auto space-y-2">
          {/* Top Brand Bar with subtle Nimbu-Mirchi Nazarbattu charm tucked into far right corner */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <img
                src="/logo.png"
                alt="Kiranapė Logo"
                className="w-8 h-8 rounded-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="font-heading font-black text-lg sm:text-xl text-[#0c831f] tracking-tight whitespace-nowrap">
                Kiranapė
              </span>
            </div>

            {/* Subtle traditional Nimbu-Mirchi charm in far corner */}
            <NimbuMirchiCharm className="-my-1.5 flex-shrink-0" />
          </div>

          {/* Full-Width Rounded-2xl Search Bar */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSecretAdminTrigger={onSecretAdminTrigger}
            className="w-full"
          />

          {/* Top Horizontal Category Strip: Dynamically includes ALL unique categories from live products */}
          <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar touch-pan-x scroll-smooth">
            {onOpenLaunchPoster && (
              <button
                type="button"
                id="tab-launch-offers-pill"
                onClick={onOpenLaunchPoster}
                className="px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs hover:brightness-105 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-100" />
                <span>Launch Offers</span>
              </button>
            )}

            {/* 'All' Reset Tab */}
            <button
              type="button"
              onClick={() => onSelectCategory('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 active:scale-95 ${
                selectedCategory === 'All'
                  ? 'bg-[#0c831f] text-white font-black shadow-xs'
                  : 'bg-stone-100/90 hover:bg-stone-200/80 text-stone-800 border border-stone-200/80'
              }`}
            >
              <span className="text-sm leading-none">🛒</span>
              <span>All</span>
              {products.length > 0 && (
                <span
                  className={`text-[10px] font-semibold tabular-nums ${
                    selectedCategory === 'All' ? 'text-emerald-100' : 'text-stone-500'
                  }`}
                >
                  ({products.length})
                </span>
              )}
            </button>

            {liveCategories.map((cat) => {
              const isSelected =
                selectedCategory.trim().toLowerCase() === cat.categoryTarget.trim().toLowerCase();
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.categoryTarget)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-[#0c831f] text-white font-black shadow-xs'
                      : 'bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/90'
                  }`}
                >
                  <span className="text-sm leading-none">{cat.icon || '🏷️'}</span>
                  <span>{cat.name}</span>
                  {cat.itemCount > 0 && (
                    <span
                      className={`text-[10px] font-semibold tabular-nums ${
                        isSelected ? 'text-emerald-100' : 'text-stone-400'
                      }`}
                    >
                      ({cat.itemCount})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
