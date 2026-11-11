import React, { useState, useMemo, useRef } from 'react';
import { Search, Mic, Pencil, ChevronRight, MapPin, Check, X, Barcode } from 'lucide-react';
import { Product, ProductCategory } from '../types';
import { getCustomerSelectedLocation, setCustomerSelectedLocation, getDeliveryLocations } from '../services/storageService';
import { useCategories, CATEGORIES_DATA, UnifiedCategoryTile } from '../data/categoriesData';
import { isMasterAdminPin } from '../config/adminConfig';

export type MasterCategoryTile = UnifiedCategoryTile;
export const MASTER_CATEGORIES = CATEGORIES_DATA;

interface CategoriesScreenProps {
  onSelectCategory: (categoryTarget: ProductCategory) => void;
  onOpenVoiceModal?: () => void;
  onOpenBarcodeScanner?: () => void;
  onGlobalSearch?: (query: string) => void;
  onSecretAdminTrigger?: () => void;
  products?: Product[];
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  onSelectCategory,
  onOpenVoiceModal,
  onOpenBarcodeScanner,
  onGlobalSearch,
  onSecretAdminTrigger,
  products = [],
}) => {
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const categorySearchInputRef = useRef<HTMLInputElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    return getCustomerSelectedLocation() || 'Waidhan Store';
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const deliveryLocations = useMemo(() => getDeliveryLocations(), []);

  // Unified categories synchronized identically with Home screen
  const { categories: unifiedCategories } = useCategories(products);
  const displayCategories = unifiedCategories.length > 0 ? unifiedCategories : CATEGORIES_DATA;

  // Filter categories by local search query
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
    // Tactile haptic feedback on mobile devices
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
    <div className="w-full min-h-screen bg-neutral-50 pb-28">
      {/* =========================================================================
          1. TOP HEADER & SEARCH BAR (Dark Emerald Green #0C5A2B)
      ========================================================================= */}
      <header className="bg-[#0C5A2B] text-white pt-3 pb-4 px-3 sm:px-4 shadow-md sticky top-0 z-30 transition-all">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Brand Row + Store Selector */}
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
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-black text-base sm:text-lg tracking-tight text-white">
                    Kiranapė
                  </span>
                  <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-1.5 py-0.5 rounded-sm tracking-wider uppercase">
                    EXPRESS
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-amber-300 tracking-wide">
                  SUPERSTORE • 10-15 MIN
                </p>
              </div>
            </div>

            {/* Store selector pill with edit pencil icon */}
            <button
              type="button"
              id="category-store-selector-pill"
              onClick={() => setShowLocationPicker(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-800/80 hover:bg-emerald-800 border border-emerald-600/60 rounded-full px-3 py-1 text-xs font-semibold text-emerald-50 shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-[150px]">{selectedLocation}</span>
              <Pencil className="w-3 h-3 text-emerald-200 stroke-[2.2] flex-shrink-0 ml-0.5" />
            </button>
          </div>

          {/* Sleek, High-Contrast Search Pill */}
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
                  if (isMasterAdminPin(categorySearchQuery)) {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setCategorySearchQuery('');
                      categorySearchInputRef.current?.blur();
                      onSecretAdminTrigger?.();
                      return;
                    }
                  }
                  handleSearchKeyDown(e);
                }}
                placeholder="Search in Categories..."
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
              />
              {categorySearchQuery && (
                <button
                  type="button"
                  onClick={() => setCategorySearchQuery('')}
                  className="p-1 text-stone-400 hover:text-stone-700 mr-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Barcode Search Scanner Icon */}
              {onOpenBarcodeScanner && (
                <button
                  type="button"
                  id="category-barcode-scan-btn"
                  onClick={onOpenBarcodeScanner}
                  className="p-1.5 rounded-full text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 active:scale-90 transition-transform cursor-pointer flex-shrink-0"
                  title="Scan Barcode / SKU"
                  aria-label="Scan Barcode"
                >
                  <Barcode className="w-4 h-4 text-emerald-700" />
                </button>
              )}

              {/* Voice Search Microphone Icon */}
              <button
                type="button"
                id="category-voice-search-btn"
                onClick={onOpenVoiceModal}
                className="p-1 rounded-full text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 active:scale-90 transition-transform cursor-pointer flex-shrink-0"
                title="Voice Search"
                aria-label="Voice Search"
              >
                <Mic className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. CATEGORY PAGE TITLE (Offers pill removed per request)
      ========================================================================= */}
      <section className="max-w-4xl mx-auto px-3 sm:px-4 pt-3.5 pb-2">
        <div>
          <h1 className="font-heading font-black text-lg sm:text-xl text-neutral-900 tracking-tight leading-tight">
            सब सामान व कैटेगरीज़
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Waidhan's Fresh & Daily Superstore
          </p>
        </div>
      </section>

      {/* =========================================================================
          3. 3D "BROWSE CATEGORIES" GRID LAYOUT & TILE STYLING (Exact 9 Tiles)
      ========================================================================= */}
      <main className="max-w-4xl mx-auto p-3 sm:p-4">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-neutral-200/80 shadow-xs my-4">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
              🔍
            </div>
            <h3 className="font-bold text-neutral-900 text-base">No categories matched "{categorySearchQuery}"</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Try searching with common terms like atta, oil, dal, soap, or biscuits.
            </p>
            <button
              type="button"
              onClick={() => setCategorySearchQuery('')}
              className="mt-4 px-4 py-1.5 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 cursor-pointer"
            >
              Show all 9 categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
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
                  className={`bg-gradient-to-b ${tile.gradient} rounded-3xl border p-2.5 flex flex-col justify-between relative overflow-hidden shadow-sm transition-all duration-200 active:scale-95 hover:shadow-md cursor-pointer group select-none min-h-[175px] sm:min-h-[195px]`}
                >
                  {/* Top Floating Micro-Badge */}
                  <div className="flex justify-end w-full relative z-10">
                    <span className="bg-white/85 backdrop-blur-sm text-[10px] font-bold text-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200/60 shadow-xs leading-none whitespace-nowrap">
                      {tile.badge}
                    </span>
                  </div>

                  {/* 3D Multi-Pack Cluster Image Showcase (65% Height) */}
                  <div className="w-full h-24 sm:h-28 flex items-center justify-center p-1 relative my-auto">
                    {/* Multi-pack secondary cluster item in background if available */}
                    {tile.secondaryImage && (
                      <img
                        src={tile.secondaryImage}
                        alt=""
                        aria-hidden="true"
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain filter drop-shadow-sm absolute right-1 bottom-1 opacity-70 transform translate-x-1 translate-y-1 scale-90 pointer-events-none transition-transform duration-300 group-hover:scale-95"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}

                    {/* Primary Hero Packshot with Drop Shadow */}
                    <img
                      src={displayImage}
                      alt={tile.name}
                      className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105 relative z-1"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        if (target.src !== tile.fallbackSvg) {
                          target.src = tile.fallbackSvg;
                        }
                      }}
                    />
                  </div>

                  {/* Text & Chevron Arrow Footer */}
                  <div className="pt-1.5 border-t border-black/5 mt-1 flex items-end justify-between gap-1 relative z-10">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-bold text-neutral-900 leading-tight line-clamp-1 group-hover:text-emerald-900 transition-colors">
                        {tile.name}
                      </h2>
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
        )}
      </main>

      {/* Location Selector Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-700" />
                <h3 className="font-heading font-black text-base text-stone-900">Select Store Location</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationPicker(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Kiranapė delivers fresh grocery across Waidhan and Singrauli region:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {deliveryLocations.map((loc) => {
                const isSelected = selectedLocation.toLowerCase().includes(loc.toLowerCase());
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setCustomerSelectedLocation(loc);
                      setShowLocationPicker(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border-2 border-emerald-600 shadow-2xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200/80'
                    }`}
                  >
                    <span>{loc}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-700" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
