import React, { useState, useEffect, useMemo } from 'react';
import { Search, Mic, Pencil, ChevronRight, Sparkles, MapPin, Check, X } from 'lucide-react';
import { CustomCategory, Product, ProductCategory } from '../types';
import { subscribeToFirestoreCategories } from '../services/firebase';
import { getCustomerSelectedLocation, setCustomerSelectedLocation, getDeliveryLocations } from '../services/storageService';

export interface MasterCategoryTile {
  id: string;
  name: string;
  hindiName: string;
  categoryTarget: ProductCategory;
  badge: string;
  gradient: string;
  primaryImage: string;
  secondaryImage?: string;
  keywords: string[];
}

// Exact 9 Master Category Definitions specified in requirements
export const MASTER_CATEGORIES: MasterCategoryTile[] = [
  {
    id: 'cat-atta-flours',
    name: 'Atta, Besan & Flours',
    hindiName: 'आटा & बेसन & सूजी',
    categoryTarget: 'Atta & Flours',
    badge: 'Up to 15% OFF',
    gradient: 'from-amber-50 to-orange-100/50 border-amber-200/80',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/103/001/0173/front_en.24.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/106/301/2136/front_en.8.400.jpg',
    keywords: ['atta', 'besan', 'flours', 'flour', 'sooji', 'suji', 'maida', 'aashirvaad', 'आटा', 'बेसन', 'सूजी'],
  },
  {
    id: 'cat-oil-ghee-masalas',
    name: 'Oil, Ghee & Masalas',
    hindiName: 'तेल, घी & मसाले',
    categoryTarget: 'Oil & Ghee',
    badge: 'Festival Deals',
    gradient: 'from-yellow-50 to-amber-100/60 border-yellow-200/80',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/600/728/0014/front_en.10.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/126/201/0114/front_en.22.400.jpg',
    keywords: ['oil', 'ghee', 'masalas', 'masala', 'mustard', 'refined', 'everest', 'haldi', 'mirch', 'fortune', 'sikka', 'तेल', 'घी', 'मसाले'],
  },
  {
    id: 'cat-rice-dals-grains',
    name: 'Rice, Dals & Grains',
    hindiName: 'चावल, दाल & अनाज',
    categoryTarget: 'Rice & Dal',
    badge: 'Bulk Savings',
    gradient: 'from-blue-50 to-sky-100/60 border-blue-200/80',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/601/305/0014/front_en.15.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/106/500/0315/front_en.14.400.jpg',
    keywords: ['rice', 'dals', 'dal', 'grains', 'basmati', 'toor', 'chana', 'moong', 'arhar', 'rajma', 'चावल', 'दाल', 'अनाज'],
  },
  {
    id: 'cat-personal-care',
    name: 'Personal Care',
    hindiName: 'नहाने, बाल & त्वचा',
    categoryTarget: 'Personal Care',
    badge: 'Up to 30% OFF',
    gradient: 'from-rose-50 to-pink-100/60 border-rose-200/80',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/101/211/3509/front_en.12.400.jpg',
    keywords: ['personal care', 'soap', 'shampoo', 'skin', 'hair', 'dove', 'vaseline', 'ponds', 'stayfree', 'dettol', 'नहाने', 'बाल', 'त्वचा'],
  },
  {
    id: 'cat-snacks-biscuits',
    name: 'Snacks & Biscuits',
    hindiName: 'नाश्ता & बिस्कुट',
    categoryTarget: 'Snacks & Biscuits',
    badge: 'Crispy Deals',
    gradient: 'from-orange-50 to-red-100/50 border-orange-200/80',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/171/910/1012/front_en.16.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/105/800/0111/front_en.25.400.jpg',
    keywords: ['snacks', 'biscuits', 'parle-g', 'good day', 'haldiram', 'bhujia', 'lays', 'chips', 'maggi', 'namkeen', 'नाश्ता', 'बिस्कुट'],
  },
  {
    id: 'cat-household-cleaning',
    name: 'Household & Cleaning',
    hindiName: 'सफाई & जरूरतें',
    categoryTarget: 'Household Essentials',
    badge: 'Best Price',
    gradient: 'from-cyan-50 to-teal-100/60 border-cyan-200/80',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/103/002/0165/front_en.14.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/139/600/0118/front_en.15.400.jpg',
    keywords: ['household', 'cleaning', 'surf excel', 'vim', 'comfort', 'harpic', 'detergent', 'dishwash', 'सफाई', 'जरूरतें'],
  },
  {
    id: 'cat-tea-coffee-drinks',
    name: 'Tea, Coffee & Drinks',
    hindiName: 'चाय, कॉफी & पेय',
    categoryTarget: 'Tea, Coffee & Drinks',
    badge: 'Best Price',
    gradient: 'from-amber-50 to-yellow-100/60 border-amber-200/80',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/106/500/0216/front_en.12.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/761/303/494/2800/front_en.10.400.jpg',
    keywords: ['tea', 'coffee', 'drinks', 'chai', 'tata tea', 'nescafe', 'bournvita', 'beverages', 'चाय', 'कॉफी', 'पेय'],
  },
  {
    id: 'cat-dairy-pooja',
    name: 'Dairy & Pooja Samagri',
    hindiName: 'डेयरी, ब्रेड & पूजा',
    categoryTarget: 'Dairy & Bakery',
    badge: 'Best Price',
    gradient: 'from-yellow-50/70 to-lime-100/50 border-yellow-200/70',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/126/201/0213/front_en.19.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/126/201/0114/front_en.22.400.jpg',
    keywords: ['dairy', 'pooja', 'samagri', 'amul', 'milk', 'butter', 'bread', 'agarbatti', 'diya', 'dhoop', 'डेयरी', 'ब्रेड', 'पूजा'],
  },
  {
    id: 'cat-school-stationery',
    name: 'School & Office Stationery',
    hindiName: 'स्टेशनरी & कॉपी',
    categoryTarget: 'Copies & Registers',
    badge: 'Best Price',
    gradient: 'from-purple-50 to-violet-100/60 border-purple-200/80',
    primaryImage: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
    keywords: ['school', 'office', 'stationery', 'notebook', 'register', 'classmate', 'pen', 'pencil', 'a4', 'स्टेशनरी', 'कॉपी'],
  },
];

interface CategoriesScreenProps {
  onSelectCategory: (categoryTarget: ProductCategory) => void;
  onOpenVoiceModal?: () => void;
  onGlobalSearch?: (query: string) => void;
  products?: Product[];
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  onSelectCategory,
  onOpenVoiceModal,
  onGlobalSearch,
  products = [],
}) => {
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [firestoreCategories, setFirestoreCategories] = useState<CustomCategory[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    return getCustomerSelectedLocation() || 'Waidhan Store';
  });
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const deliveryLocations = useMemo(() => getDeliveryLocations(), []);

  // 1. Listen directly to Firebase Cloud Firestore 'categories' collection with fallback
  useEffect(() => {
    const unsubscribe = subscribeToFirestoreCategories(
      (cats) => {
        if (cats && cats.length > 0) {
          setFirestoreCategories(cats);
        }
      },
      (err) => {
        console.warn('Firestore categories subscription error in CategoriesScreen:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Merge Firestore categories data or custom photos into the 9 Master tiles
  const renderedCategories = useMemo(() => {
    return MASTER_CATEGORIES.map((master) => {
      // Find matching custom category from Firestore if any
      const matchedFirestore = firestoreCategories.find(
        (fc) =>
          fc.name.toLowerCase() === master.name.toLowerCase() ||
          fc.name.toLowerCase() === master.categoryTarget.toLowerCase() ||
          (fc.hindiName && master.hindiName.includes(fc.hindiName))
      );

      // Check if any product in catalog has an authentic photo to reinforce cluster
      const firstCatProduct = products.find(
        (p) => p.category && p.category.toLowerCase() === master.categoryTarget.toLowerCase() && p.imageUrl
      );

      return {
        ...master,
        customImageUrl: matchedFirestore?.imageUrl || matchedFirestore?.image_url,
        catalogPhotoFallback: firstCatProduct?.imageUrl,
      };
    });
  }, [firestoreCategories, products]);

  // Filter categories by local search query
  const filteredCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return renderedCategories;
    const q = categorySearchQuery.trim().toLowerCase();
    return renderedCategories.filter((cat) => {
      const matchName = cat.name.toLowerCase().includes(q);
      const matchHindi = cat.hindiName.toLowerCase().includes(q);
      const matchKeyword = cat.keywords.some((k) => k.toLowerCase().includes(q));
      return matchName || matchHindi || matchKeyword;
    });
  }, [renderedCategories, categorySearchQuery]);

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
              <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center shadow-xs flex-shrink-0">
                <span className="text-emerald-950 font-black text-sm">KP</span>
              </div>
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
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
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
          2. CATEGORY PAGE TITLE & OFFERS BADGE
      ========================================================================= */}
      <section className="max-w-4xl mx-auto px-3 sm:px-4 pt-3.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="font-heading font-black text-lg sm:text-xl text-neutral-900 tracking-tight leading-tight">
              सब सामान व कैटेगरीज़
            </h1>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Waidhan's Fresh & Daily Superstore
            </p>
          </div>

          {/* Right Corner Offers Badge */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-2.5 py-1 text-xs font-semibold flex items-center gap-1 shadow-2xs flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="whitespace-nowrap">Offers: Flat 20% OFF on first order</span>
          </div>
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
              className="mt-4 px-4 py-1.5 rounded-full bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
            >
              Show all 9 categories
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
            {filteredCategories.map((tile) => {
              const displayImage =
                tile.customImageUrl || tile.catalogPhotoFallback || tile.primaryImage;

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
                        if (target.src !== tile.primaryImage) {
                          target.src = tile.primaryImage;
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
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
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
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left text-xs font-bold transition-all ${
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
