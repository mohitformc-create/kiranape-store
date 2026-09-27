import React, { useMemo, useState } from 'react';
import { Product, ProductVariant, CustomCategory } from '../types';
import { ProductCard } from './ProductCard';
import { ArrowLeft, Search, Sparkles, Store, Filter, ChevronDown, Check } from 'lucide-react';

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

interface SubCategoryDef {
  id: string;
  name: string;
  hindiName?: string;
  icon: string;
  match: (p: Product) => boolean;
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
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [internalSearch, setInternalSearch] = useState<string>('');
  const [showDeptDropdown, setShowDeptDropdown] = useState<boolean>(false);

  // Find category metadata
  const currentCatMeta = useMemo(() => {
    return categories.find((c) => c.name === categoryName);
  }, [categories, categoryName]);

  // Filter products strictly for this category
  const categoryProducts = useMemo(() => {
    return products.filter((p) => p.category === categoryName);
  }, [products, categoryName]);

  // Categories list excluding 'All'
  const selectableCategories = useMemo(() => {
    return categories.filter((c) => c.name !== 'All');
  }, [categories]);

  // Left Sidebar Sub-categories mapped to department
  const subCategoryList: SubCategoryDef[] = useMemo(() => {
    const catLower = categoryName.toLowerCase();

    if (catLower.includes('oil') || catLower.includes('ghee')) {
      return [
        { id: 'all', name: 'All Oils & Ghee', hindiName: 'सभी तेल व घी', icon: '🛢️', match: () => true },
        { id: 'mustard', name: 'Mustard Oil', hindiName: 'सरसों तेल', icon: '🟡', match: (p) => p.name.toLowerCase().includes('mustard') || p.name.toLowerCase().includes('kachi ghani') || p.name.toLowerCase().includes('sarson') },
        { id: 'soya', name: 'Soyabean Oil', hindiName: 'सोयाबीन तेल', icon: '🌱', match: (p) => p.name.toLowerCase().includes('soya') || p.name.toLowerCase().includes('soyabean') },
        { id: 'desi_ghee', name: 'Desi Ghee', hindiName: 'देसी घी', icon: '🧈', match: (p) => (p.name.toLowerCase().includes('ghee') || p.name.toLowerCase().includes('desi')) && !p.name.toLowerCase().includes('cow') },
        { id: 'cow_ghee', name: 'Cow Ghee', hindiName: 'गाय का घी', icon: '🥛', match: (p) => p.name.toLowerCase().includes('cow') || (p.name.toLowerCase().includes('ghee') && p.name.toLowerCase().includes('cow')) },
        { id: 'sunflower', name: 'Sunflower Oil', hindiName: 'सूरजमुखी तेल', icon: '🌻', match: (p) => p.name.toLowerCase().includes('sunflower') || p.name.toLowerCase().includes('sunlite') },
        { id: 'vanaspati', name: 'Vanaspati Dalda', hindiName: 'वनस्पति डालडा', icon: '🥫', match: (p) => p.name.toLowerCase().includes('vanaspati') || p.name.toLowerCase().includes('dalda') },
        { id: 'spices', name: 'Cooking Spices', hindiName: 'खड़े मसाले', icon: '🌶️', match: (p) => p.name.toLowerCase().includes('masala') || p.name.toLowerCase().includes('haldi') || p.name.toLowerCase().includes('jeera') },
      ];
    }

    if (catLower.includes('snack') || catLower.includes('biscuit')) {
      return [
        { id: 'all', name: 'All Biscuits', hindiName: 'सभी बिस्किट', icon: '🍪', match: () => true },
        { id: 'cookies', name: 'Good Day & Butter', hindiName: 'गुड डे व बटर', icon: '🍪', match: (p) => p.name.toLowerCase().includes('good day') || p.name.toLowerCase().includes('butter') },
        { id: 'marie', name: 'Marie & Tea Biscuits', hindiName: 'मारी बिस्किट', icon: '☕', match: (p) => p.name.toLowerCase().includes('marie') },
        { id: 'healthy', name: 'NutriChoice & Oats', hindiName: 'न्यूट्री चॉइस', icon: '🌾', match: (p) => p.name.toLowerCase().includes('nutrichoice') || p.name.toLowerCase().includes('digestive') },
        { id: 'crackers', name: '50-50 & Crackers', hindiName: 'नमकीन बिस्किट', icon: '🥨', match: (p) => p.name.toLowerCase().includes('50-50') || p.name.toLowerCase().includes('cracker') },
        { id: 'creams', name: 'Bourbon & Treat', hindiName: 'क्रीम बिस्किट', icon: '🍫', match: (p) => p.name.toLowerCase().includes('bourbon') || p.name.toLowerCase().includes('treat') || p.name.toLowerCase().includes('oreo') },
        { id: 'rusk', name: 'Toastea & Rusk', hindiName: 'टोस्ट व रस्क', icon: '🥖', match: (p) => p.name.toLowerCase().includes('rusk') || p.name.toLowerCase().includes('toastea') },
        { id: 'namkeen', name: 'Namkeen & Chips', hindiName: 'नमकीन व चिप्स', icon: '🥔', match: (p) => p.name.toLowerCase().includes('namkeen') || p.name.toLowerCase().includes('chips') || p.name.toLowerCase().includes('bhujia') },
      ];
    }

    if (catLower.includes('atta') || catLower.includes('dal') || catLower.includes('grain')) {
      return [
        { id: 'all', name: 'All Atta & Dal', hindiName: 'सभी आटा व दाल', icon: '🌾', match: () => true },
        { id: 'chakki', name: 'Chakki Atta', hindiName: 'चक्की आटा', icon: '🍞', match: (p) => p.name.toLowerCase().includes('atta') || p.name.toLowerCase().includes('flour') },
        { id: 'maida_besan', name: 'Maida, Sooji & Besan', hindiName: 'मैदा, सूजी, बेसन', icon: '🥣', match: (p) => p.name.toLowerCase().includes('maida') || p.name.toLowerCase().includes('sooji') || p.name.toLowerCase().includes('besan') },
        { id: 'toor_dal', name: 'Arhar / Toor Dal', hindiName: 'अरहर दाल', icon: '🍲', match: (p) => p.name.toLowerCase().includes('toor') || p.name.toLowerCase().includes('arhar') },
        { id: 'other_dal', name: 'Moong, Chana & Urad', hindiName: 'मूँग व चना दाल', icon: '🧆', match: (p) => p.name.toLowerCase().includes('moong') || p.name.toLowerCase().includes('chana') || p.name.toLowerCase().includes('urad') },
        { id: 'rice', name: 'Basmati & Daily Rice', hindiName: 'चावल', icon: '🍚', match: (p) => p.name.toLowerCase().includes('rice') || p.name.toLowerCase().includes('chawal') },
      ];
    }

    if (catLower.includes('tea') || catLower.includes('coffee') || catLower.includes('drink')) {
      return [
        { id: 'all', name: 'All Drinks', hindiName: 'सभी चाय व ड्रिंक्स', icon: '☕', match: () => true },
        { id: 'tea_leaf', name: 'Red Label & Premium Tea', hindiName: 'पत्ती चाय', icon: '🍵', match: (p) => p.name.toLowerCase().includes('tea') || p.name.toLowerCase().includes('chai') || p.name.toLowerCase().includes('red label') },
        { id: 'coffee', name: 'Instant Coffee', hindiName: 'कॉफ़ी', icon: '☕', match: (p) => p.name.toLowerCase().includes('coffee') || p.name.toLowerCase().includes('nescafe') || p.name.toLowerCase().includes('bru') },
        { id: 'cold_drinks', name: 'Cold Drinks & Soda', hindiName: 'कोल्ड ड्रिंक्स', icon: '🥤', match: (p) => p.name.toLowerCase().includes('coke') || p.name.toLowerCase().includes('thums') || p.name.toLowerCase().includes('sprite') || p.name.toLowerCase().includes('soda') },
        { id: 'juices', name: 'Fruit Juices & Sharbat', hindiName: 'जूस व शरबत', icon: '🧃', match: (p) => p.name.toLowerCase().includes('juice') || p.name.toLowerCase().includes('frooti') || p.name.toLowerCase().includes('maaza') },
      ];
    }

    if (catLower.includes('personal') || catLower.includes('care') || catLower.includes('beauty')) {
      return [
        { id: 'all', name: 'All Personal Care', hindiName: 'पर्सनल केयर', icon: '🧴', match: () => true },
        { id: 'soaps', name: 'Bathing Soaps', hindiName: 'नहाने का साबुन', icon: '🧼', match: (p) => p.name.toLowerCase().includes('soap') || p.name.toLowerCase().includes('lux') || p.name.toLowerCase().includes('dove') || p.name.toLowerCase().includes('lifebuoy') },
        { id: 'hair', name: 'Hair Oils & Shampoos', hindiName: 'हेयर केयर', icon: '💆', match: (p) => p.name.toLowerCase().includes('shampoo') || p.name.toLowerCase().includes('hair') || p.name.toLowerCase().includes('oil') },
        { id: 'oral', name: 'Oral Care & Toothpaste', hindiName: 'टूथपेस्ट', icon: '🪥', match: (p) => p.name.toLowerCase().includes('paste') || p.name.toLowerCase().includes('colgate') || p.name.toLowerCase().includes('close up') },
        { id: 'skin', name: 'Skin Creams & Talc', hindiName: 'क्रीम व पाउडर', icon: '✨', match: (p) => p.name.toLowerCase().includes('cream') || p.name.toLowerCase().includes('talc') || p.name.toLowerCase().includes('powder') },
      ];
    }

    if (catLower.includes('house') || catLower.includes('detergent') || catLower.includes('cleaning')) {
      return [
        { id: 'all', name: 'All Household', hindiName: 'घर की सफाई', icon: '🧼', match: () => true },
        { id: 'detergent', name: 'Washing Powders', hindiName: 'सर्फ व वाशिंग पाउडर', icon: '🧺', match: (p) => p.name.toLowerCase().includes('surf') || p.name.toLowerCase().includes('detergent') || p.name.toLowerCase().includes('tide') || p.name.toLowerCase().includes('rin') },
        { id: 'dishwash', name: 'Dishwash Bars & Liquid', hindiName: 'बर्तन बार', icon: '🍽️', match: (p) => p.name.toLowerCase().includes('bar') || p.name.toLowerCase().includes('vim') || p.name.toLowerCase().includes('dish') },
        { id: 'cleaners', name: 'Floor & Toilet Cleaners', hindiName: 'क्लीनर', icon: '🧹', match: (p) => p.name.toLowerCase().includes('cleaner') || p.name.toLowerCase().includes('harpic') || p.name.toLowerCase().includes('lizol') },
        { id: 'pooja', name: 'Pooja Samagri', hindiName: 'पूजा सामग्री', icon: '🪔', match: (p) => p.name.toLowerCase().includes('agarbatti') || p.name.toLowerCase().includes('kapoor') || p.name.toLowerCase().includes('pooja') },
      ];
    }

    // Default fallback sub-categories
    return [
      { id: 'all', name: 'All Products', hindiName: 'सभी उत्पाद', icon: currentCatMeta?.icon || '📦', match: () => true },
      { id: 'bestseller', name: 'Popular Picks', hindiName: 'लोकप्रिय', icon: '⭐', match: () => true },
      { id: 'wholesale', name: 'Wholesale Packs', hindiName: 'थोक पैक', icon: '🏷️', match: (p) => Boolean(p.variants && p.variants.length > 0) },
    ];
  }, [categoryName, currentCatMeta]);

  // Department Popular Brands for "Shop by brands" carousel
  const popularBrands = useMemo(() => {
    const catLower = categoryName.toLowerCase();

    if (catLower.includes('oil') || catLower.includes('ghee')) {
      return ['Fortune', 'Saffola', 'Dhara', 'Patanjali', 'Emami Healthy', 'Amul', 'Mahakosh'];
    }
    if (catLower.includes('snack') || catLower.includes('biscuit')) {
      return ['Britannia', 'Parle', 'Sunfeast', 'Cadbury', 'Oreo', 'Haldiram'];
    }
    if (catLower.includes('atta') || catLower.includes('dal') || catLower.includes('grain')) {
      return ['Aashirvaad', 'Fortune', 'India Gate', 'Tata Sampann', 'Daawat'];
    }
    if (catLower.includes('tea') || catLower.includes('coffee') || catLower.includes('drink')) {
      return ['Tata Tea', 'Red Label', 'Taj Mahal', 'Nescafe', 'Bru', 'Coca-Cola'];
    }
    if (catLower.includes('personal') || catLower.includes('care')) {
      return ['Dove', 'Lux', 'Lifebuoy', 'Colgate', 'Close Up', 'Ponds'];
    }
    if (catLower.includes('house') || catLower.includes('clean')) {
      return ['Surf Excel', 'Rin', 'Vim', 'Tide', 'Ariel', 'Harpic'];
    }

    return ['Tata', 'Amul', 'Nestle', 'Britannia', 'Patanjali'];
  }, [categoryName]);

  // Apply sub-category, brand filter, and search
  const displayedProducts = useMemo(() => {
    return categoryProducts.filter((p) => {
      // 1. Search Query
      const matchesSearch =
        !internalSearch.trim() ||
        p.name.toLowerCase().includes(internalSearch.toLowerCase().trim()) ||
        (p.hindiName && p.hindiName.toLowerCase().includes(internalSearch.toLowerCase().trim())) ||
        (p.description && p.description.toLowerCase().includes(internalSearch.toLowerCase().trim()));

      if (!matchesSearch) return false;

      // 2. Sub-Category match
      if (selectedSubCatId !== 'all') {
        const subCat = subCategoryList.find((s) => s.id === selectedSubCatId);
        if (subCat && !subCat.match(p)) {
          return false;
        }
      }

      // 3. Brand match
      if (selectedBrand) {
        const nameLower = p.name.toLowerCase();
        if (!nameLower.includes(selectedBrand.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [categoryProducts, internalSearch, selectedSubCatId, selectedBrand, subCategoryList]);

  const handleDepartmentSwitch = (newCatName: string) => {
    setSelectedSubCatId('all');
    setSelectedBrand(null);
    setInternalSearch('');
    setShowDeptDropdown(false);
    onSelectCategory(newCatName);
  };

  return (
    <div className="pb-16 select-none animate-in fade-in duration-200">
      {/* 1. Ondoor Header with Back button, Category Title & Search/Filter */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-stone-200 shadow-2xs mb-3 sm:mb-4">
        <div className="flex items-center justify-between gap-2.5">
          {/* Back button */}
          <button
            type="button"
            id="cat-back-to-home-btn"
            onClick={onBackToCategories}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-heading font-black transition-all active:scale-95 cursor-pointer border border-stone-200 flex-shrink-0"
            title="Back to all categories"
          >
            <ArrowLeft className="w-4 h-4 text-[#c62828]" />
            <span className="hidden xs:inline">Back</span>
          </button>

          {/* Department Selector with Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              id="cat-department-dropdown-btn"
              onClick={() => setShowDeptDropdown(!showDeptDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-heading font-black border border-emerald-200 transition-colors cursor-pointer max-w-[170px] sm:max-w-xs truncate"
            >
              <span className="text-sm">{currentCatMeta?.icon || '📦'}</span>
              <span className="truncate">{categoryName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-800 flex-shrink-0" />
            </button>

            {showDeptDropdown && (
              <div className="absolute left-0 top-full mt-1.5 z-40 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 px-3 py-1 block">
                  Switch Category
                </span>
                {selectableCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleDepartmentSwitch(c.name)}
                    className={`w-full text-left px-3 py-2 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      c.name === categoryName
                        ? 'bg-emerald-50 text-emerald-800 font-black'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{c.icon || '🏷️'}</span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    {c.name === categoryName && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick In-Category Search */}
          <div className="relative flex-1 min-w-[120px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="cat-search-input"
              type="text"
              value={internalSearch}
              onChange={(e) => setInternalSearch(e.target.value)}
              placeholder={`Search in ${categoryName}...`}
              className="w-full pl-8 pr-7 py-1.5 bg-stone-50 focus:bg-white text-xs text-stone-900 placeholder:text-stone-400 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-medium"
            />
            {internalSearch && (
              <button
                type="button"
                onClick={() => setInternalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Split-View: Left Navigation Sidebar + Right Product Grid */}
      <div className="flex bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-2xs overflow-hidden min-h-[560px]">
        {/* Left Navigation: Vertical scrollbar with circular icons & active green bar */}
        <aside className="w-20 sm:w-28 flex-shrink-0 bg-stone-50 border-r border-stone-200 py-2 flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-none no-scrollbar">
          {subCategoryList.map((sub) => {
            const isActive = selectedSubCatId === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                id={`subcat-split-${sub.id}`}
                onClick={() => {
                  setSelectedSubCatId(sub.id);
                  setSelectedBrand(null);
                }}
                className={`relative flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-emerald-800 font-black border-l-4 border-emerald-600 shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-100/80 border-l-4 border-transparent'
                }`}
              >
                {/* Circular Icon Container */}
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl mb-1 transition-transform ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 scale-105 shadow-2xs ring-2 ring-emerald-600/20'
                      : 'bg-white border border-stone-200 text-stone-700'
                  }`}
                >
                  <span>{sub.icon}</span>
                </div>

                {/* Subcategory Label */}
                <span className="text-[10px] sm:text-[11px] leading-tight line-clamp-2 px-1 font-bold">
                  {sub.name}
                </span>
                {sub.hindiName && (
                  <span className="text-[9px] text-stone-400 font-medium leading-none mt-0.5 line-clamp-1">
                    {sub.hindiName}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick department switchers at bottom of left bar */}
          <div className="pt-2 mt-auto border-t border-stone-200/80 px-1">
            <span className="text-[9px] font-extrabold uppercase text-stone-400 block text-center mb-1">
              All Depts
            </span>
            {selectableCategories.slice(0, 4).map((c) => {
              if (c.name === categoryName) return null;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleDepartmentSwitch(c.name)}
                  className="w-full py-1 text-center text-[10px] text-stone-600 hover:text-emerald-700 truncate block rounded hover:bg-white transition-colors cursor-pointer"
                  title={c.name}
                >
                  <span className="block text-sm">{c.icon || '🏷️'}</span>
                  <span className="truncate block font-semibold">{c.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Product Grid Area */}
        <main className="flex-1 min-w-0 p-2.5 sm:p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Horizontal "Shop by brands" carousel widget inside the listing */}
          {popularBrands.length > 0 && (
            <div className="bg-stone-50 rounded-xl p-2 sm:p-2.5 border border-stone-200/80 mb-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                  <span>🏷️</span> Popular Brands
                </span>
                {selectedBrand && (
                  <button
                    type="button"
                    onClick={() => setSelectedBrand(null)}
                    className="text-[10px] text-[#c62828] font-bold hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedBrand(null)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                    selectedBrand === null
                      ? 'bg-[#c62828] text-white shadow-2xs font-black'
                      : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                  }`}
                >
                  All
                </button>

                {popularBrands.map((brand) => {
                  const isSelected = selectedBrand === brand;
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setSelectedBrand(isSelected ? null : brand)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 active:scale-95 border ${
                        isSelected
                          ? 'bg-[#c62828] text-white border-[#c62828] shadow-2xs font-black'
                          : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200'
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filter Pill indicator if filtered */}
          {(selectedSubCatId !== 'all' || selectedBrand || internalSearch) && (
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-600 bg-red-50/60 p-2 rounded-xl border border-red-200">
              <span className="font-bold text-[#c62828]">Filtered by:</span>
              {selectedSubCatId !== 'all' && (
                <span className="bg-white px-2 py-0.5 rounded-md text-stone-900 font-bold shadow-2xs border border-red-200 flex items-center gap-1 text-[11px]">
                  <span>{subCategoryList.find((s) => s.id === selectedSubCatId)?.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubCatId('all')}
                    className="hover:text-red-600 font-black cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedBrand && (
                <span className="bg-white px-2 py-0.5 rounded-md text-stone-900 font-bold shadow-2xs border border-red-200 flex items-center gap-1 text-[11px]">
                  <span>Brand: {selectedBrand}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBrand(null)}
                    className="hover:text-red-600 font-black cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {internalSearch && (
                <span className="bg-white px-2 py-0.5 rounded-md text-stone-900 font-bold shadow-2xs border border-red-200 flex items-center gap-1 text-[11px]">
                  <span>Search: "{internalSearch}"</span>
                  <button
                    type="button"
                    onClick={() => setInternalSearch('')}
                    className="hover:text-red-600 font-black cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedSubCatId('all');
                  setSelectedBrand(null);
                  setInternalSearch('');
                }}
                className="text-[11px] font-bold text-stone-500 hover:text-stone-900 underline ml-auto cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Right Product Grid: 2-Column on Mobile, 3-Column on Tablet/Desktop */}
          {displayedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-7 text-center border border-stone-200 shadow-2xs my-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-2.5 text-2xl shadow-inner">
                📦
              </div>
              <h3 className="font-heading font-black text-stone-900 text-sm sm:text-base">
                {internalSearch || selectedBrand || selectedSubCatId !== 'all'
                  ? 'No items match your active filters'
                  : 'Adding Fresh Stock Soon!'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 leading-relaxed">
                {internalSearch || selectedBrand || selectedSubCatId !== 'all'
                  ? 'Try clearing the search term or switching the brand filter.'
                  : 'Fresh stock arriving shortly. You can also order directly via WhatsApp!'}
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setInternalSearch('');
                    setSelectedBrand(null);
                    setSelectedSubCatId('all');
                  }}
                  className="px-3.5 py-1.5 bg-[#0c831f] hover:bg-[#096b18] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {displayedProducts.map((product) => (
                <div key={product.id} className="h-full">
                  <ProductCard
                    product={product}
                    cartQuantities={cartQuantities}
                    onAddToCart={onAddToCart}
                    onUpdateQuantity={onUpdateQuantity}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
