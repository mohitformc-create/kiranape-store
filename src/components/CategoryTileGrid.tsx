import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { CustomCategory, Product } from '../types';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface CategoryTileGridProps {
  categories: CustomCategory[];
  products: Product[];
  department?: 'grocery' | 'stationery';
  onSelectCategory: (categoryName: string) => void;
}

// 6 Core Highlighted Categories requested
const CORE_CATEGORIES: {
  id: string;
  name: string;
  hindiName: string;
  categoryTarget: string;
  gradient: string;
  packshotUrl: string;
}[] = [
  {
    id: 'core-atta',
    name: 'Atta & Flours',
    hindiName: 'आटा और मैदा',
    categoryTarget: 'Atta & Flours',
    gradient: 'from-white to-amber-50/60',
    packshotUrl: 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg',
  },
  {
    id: 'core-oil',
    name: 'Oil & Ghee',
    hindiName: 'तेल और शुद्ध घी',
    categoryTarget: 'Oil & Ghee',
    gradient: 'from-white to-yellow-50/60',
    packshotUrl: 'https://images.openfoodfacts.org/images/products/890/600/728/0014/front_en.3.400.jpg',
  },
  {
    id: 'core-rice-dal',
    name: 'Rice & Dal',
    hindiName: 'दाल और चावल',
    categoryTarget: 'Rice & Dal',
    gradient: 'from-white to-emerald-50/60',
    packshotUrl: 'https://images.openfoodfacts.org/images/products/890/171/200/1018/front_en.3.400.jpg',
  },
  {
    id: 'core-spices',
    name: 'Spices & Salt',
    hindiName: 'मसाले और नमक',
    categoryTarget: 'Spices & Salt',
    gradient: 'from-white to-rose-50/60',
    packshotUrl: 'https://images.openfoodfacts.org/images/products/890/105/885/2160/front_en.12.400.jpg',
  },
  {
    id: 'core-snacks-drinks',
    name: 'Snacks & Drinks',
    hindiName: 'नमकीन, चाय व बिस्कुट',
    categoryTarget: 'Snacks & Biscuits',
    gradient: 'from-white to-orange-50/60',
    packshotUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/1018/front_en.10.400.jpg',
  },
  {
    id: 'core-stationery',
    name: 'School & Stationery',
    hindiName: 'कॉपियां व पेन',
    categoryTarget: 'Copies & Registers',
    gradient: 'from-white to-sky-50/60',
    packshotUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
  },
];

const PASTEL_GRADIENTS: Record<string, string> = {
  'Atta & Flours': 'from-white to-amber-50/60',
  'Rice & Dal': 'from-white to-emerald-50/60',
  'Oil & Ghee': 'from-white to-yellow-50/60',
  'Spices & Salt': 'from-white to-rose-50/60',
  'Dairy & Bakery': 'from-white to-sky-50/60',
  'Pooja Samagri': 'from-white to-amber-50/60',
  'Snacks & Biscuits': 'from-white to-orange-50/60',
  'Tea, Coffee & Drinks': 'from-white to-teal-50/60',
  'Packaged Foods': 'from-white to-purple-50/60',
  'Health & Nutrition': 'from-white to-green-50/60',
  'Household Essentials': 'from-white to-blue-50/60',
  'Personal Care': 'from-white to-pink-50/60',
  'Baby Care': 'from-white to-fuchsia-50/60',
  'Copies & Registers': 'from-white to-sky-50/60',
  'Pens, Pencils & Geometry': 'from-white to-indigo-50/60',
  'Art, Craft & Fevicol': 'from-white to-amber-50/60',
  'Office & Daily Stationery': 'from-white to-emerald-50/60',
};

export const CategoryTileGrid: React.FC<CategoryTileGridProps> = ({
  categories,
  products,
  department = 'grocery',
  onSelectCategory,
}) => {
  const [showAll, setShowAll] = useState(false);

  // Map product image fallbacks
  const firstProductImageMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of products) {
      if (p.category && p.imageUrl && !map[p.category]) {
        map[p.category] = p.imageUrl;
      }
    }
    return map;
  }, [products]);

  // Additional categories if "View all" is clicked
  const allEligibleCategories = React.useMemo(() => {
    return categories.filter((c) => c.name !== 'All');
  }, [categories]);

  return (
    <section id="browse-categories-section" className="mb-6 w-full">
      {/* Section Header: "Browse Categories" with a green "View all" link on the right */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h3 className="font-heading font-black text-base sm:text-lg text-stone-900 tracking-tight">
            Browse Categories
          </h3>
          <p className="text-xs text-stone-500 font-medium">
            Explore authentic grocery and daily essentials
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="text-xs font-bold text-[#0c831f] hover:text-[#0a731b] active:scale-95 flex items-center gap-0.5 cursor-pointer transition-all"
        >
          <span>{showAll ? 'Show less' : 'View all'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid Layout: 3-column responsive grid (grid grid-cols-3 gap-3) */}
      {!showAll ? (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
          {CORE_CATEGORIES.map((cat) => {
            const fallbackSvg = getCategoryFallbackSvg(cat.name);
            const imageSrc = cat.packshotUrl || firstProductImageMap[cat.name] || fallbackSvg;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.categoryTarget)}
                className={`bg-gradient-to-b ${cat.gradient} rounded-2xl border border-neutral-150 p-2 flex flex-col items-center justify-between shadow-2xs hover:shadow-xs group select-none cursor-pointer active:scale-95 transition-all duration-200 overflow-hidden`}
                title={`Browse ${cat.name}`}
              >
                {/* Category Image - Occupies 65% to 70% of card height without constrained inner box */}
                <div className="w-full h-[68%] flex items-center justify-center overflow-hidden">
                  <img
                    src={imageSrc}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-24 sm:h-28 object-contain transition-transform duration-200 group-hover:scale-105 p-2"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackSvg;
                    }}
                  />
                </div>

                {/* Bold Category Name Label */}
                <span className="text-xs font-semibold text-neutral-800 text-center line-clamp-1 pb-2 block px-1 leading-tight">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 animate-in fade-in duration-200">
          {allEligibleCategories.map((cat) => {
            const gradient = PASTEL_GRADIENTS[cat.name] || 'from-white to-amber-50/50';
            const fallbackSvg = getCategoryFallbackSvg(cat.name);
            const packshotUrl =
              cat.imageUrl ||
              cat.image_url ||
              firstProductImageMap[cat.name] ||
              fallbackSvg;

            return (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => onSelectCategory(cat.name)}
                className={`bg-gradient-to-b ${gradient} rounded-2xl border border-neutral-150 p-2 flex flex-col items-center justify-between shadow-2xs hover:shadow-xs group select-none cursor-pointer active:scale-95 transition-all duration-200 overflow-hidden`}
                title={`Browse ${cat.name}`}
              >
                <div className="w-full h-[68%] flex items-center justify-center overflow-hidden">
                  <img
                    src={packshotUrl}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-24 sm:h-28 object-contain transition-transform duration-200 group-hover:scale-105 p-2"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackSvg;
                    }}
                  />
                </div>

                <span className="text-xs font-semibold text-neutral-800 text-center line-clamp-1 pb-2 block px-1 leading-tight">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
