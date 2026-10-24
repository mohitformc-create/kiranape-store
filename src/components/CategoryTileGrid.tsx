import React from 'react';
import { CustomCategory, Product } from '../types';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface CategoryTileGridProps {
  categories: CustomCategory[];
  products: Product[];
  department?: 'grocery' | 'stationery';
  onSelectCategory: (categoryName: string) => void;
}

// Ultra-soft subtle pastel tints (Mint, Sky, Lavender, Peach, Cream)
const PASTEL_TINTS: Record<string, string> = {
  'Atta & Flours': 'bg-[#fff7ed]', // peach
  'Rice & Dal': 'bg-[#f0fdf4]', // mint
  'Oil & Ghee': 'bg-[#fefce8]', // soft cream
  'Spices & Salt': 'bg-[#fff1f2]', // soft rose
  'Dairy & Bakery': 'bg-[#f0f9ff]', // sky
  'Pooja Samagri': 'bg-[#fefce8]', // soft golden/cream
  'Snacks & Biscuits': 'bg-[#fff7ed]', // peach
  'Tea, Coffee & Drinks': 'bg-[#f0fdfa]', // soft teal
  'Packaged Foods': 'bg-[#faf5ff]', // lavender
  'Health & Nutrition': 'bg-[#f0fdf4]', // mint
  'Household Essentials': 'bg-[#f0f9ff]', // sky
  'Personal Care': 'bg-[#faf5ff]', // lavender
  'Baby Care': 'bg-[#fdf2f8]', // soft pink
  'Copies & Registers': 'bg-[#f0f9ff]', // sky
  'Pens, Pencils & Geometry': 'bg-[#faf5ff]', // lavender
  'Art, Craft & Fevicol': 'bg-[#fefce8]', // cream
  'Office & Daily Stationery': 'bg-[#f0fdf4]', // mint
};

const DEFAULT_PASTEL_CYCLE = [
  'bg-[#f0fdf4]', // mint
  'bg-[#f0f9ff]', // sky
  'bg-[#faf5ff]', // lavender
  'bg-[#fff7ed]', // peach
  'bg-[#fefce8]', // cream
];

// Curated high-res authentic packshots for instant Blinkit look
const CURATED_PACKSHOTS: Record<string, string> = {
  'Atta & Flours': 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg',
  'Rice & Dal': 'https://images.openfoodfacts.org/images/products/890/171/200/1018/front_en.3.400.jpg',
  'Oil & Ghee': 'https://images.openfoodfacts.org/images/products/890/600/728/0014/front_en.3.400.jpg',
  'Spices & Salt': 'https://images.openfoodfacts.org/images/products/890/105/885/2160/front_en.3.400.jpg',
  'Dairy & Bakery': 'https://images.openfoodfacts.org/images/products/890/126/201/0058/front_en.4.400.jpg',
  'Pooja Samagri': getCategoryFallbackSvg('Pooja Samagri'),
  'Snacks & Biscuits': 'https://images.openfoodfacts.org/images/products/890/106/301/2160/front_en.11.400.jpg',
  'Tea, Coffee & Drinks': 'https://images.openfoodfacts.org/images/products/890/103/038/3859/front_en.4.400.jpg',
  'Packaged Foods': 'https://images.openfoodfacts.org/images/products/890/105/884/7203/front_en.4.400.jpg',
  'Health & Nutrition': 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg',
  'Household Essentials': 'https://images.openfoodfacts.org/images/products/890/103/038/3866/front_en.4.400.jpg',
  'Personal Care': 'https://images.openfoodfacts.org/images/products/871/716/364/1216/front_en.3.400.jpg',
  'Baby Care': getCategoryFallbackSvg('Baby Care'),
  'Copies & Registers': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
  'Pens, Pencils & Geometry': 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
  'Art, Craft & Fevicol': 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&auto=format&fit=crop&q=80',
  'Office & Daily Stationery': 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=400&auto=format&fit=crop&q=80',
};

interface BlinkitSectionConfig {
  id: string;
  title: string;
  hindiTitle?: string;
  matchKeys: string[];
}

const GROCERY_SECTIONS: BlinkitSectionConfig[] = [
  {
    id: 'grocery-kitchen',
    title: 'Grocery & Kitchen',
    hindiTitle: 'किराना व रसोई',
    matchKeys: ['atta', 'flour', 'rice', 'dal', 'oil', 'ghee', 'spice', 'salt', 'masala', 'dairy', 'bakery', 'pooja'],
  },
  {
    id: 'snacks-drinks',
    title: 'Snacks & Drinks',
    hindiTitle: 'नाश्ता व पेय',
    matchKeys: ['snack', 'biscuit', 'tea', 'coffee', 'drink', 'beverage', 'packaged', 'sweets', 'instant', 'health', 'nutrition'],
  },
  {
    id: 'household-essentials',
    title: 'Household Essentials',
    hindiTitle: 'सफाई व घर का सामान',
    matchKeys: ['household', 'clean', 'detergent', 'phenyl', 'harpic', 'vim', 'dishwash', 'laundry', 'surf'],
  },
  {
    id: 'personal-care',
    title: 'Personal Care',
    hindiTitle: 'पर्सनल व बेबी केयर',
    matchKeys: ['personal', 'soap', 'shampoo', 'cream', 'baby', 'oral', 'care', 'tooth', 'paste'],
  },
];

const STATIONERY_SECTIONS: BlinkitSectionConfig[] = [
  {
    id: 'stationery-office',
    title: 'Stationery & Office',
    hindiTitle: 'कॉपियां, पेन व ऑफिस सप्लाइज',
    matchKeys: ['cop', 'register', 'pen', 'pencil', 'geometry', 'craft', 'fevicol', 'art', 'office', 'stationery'],
  },
];

export const CategoryTileGrid: React.FC<CategoryTileGridProps> = ({
  categories,
  products,
  department = 'grocery',
  onSelectCategory,
}) => {
  // First product packshot map by category
  const firstProductImageMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of products) {
      if (p.category && p.imageUrl && !map[p.category]) {
        map[p.category] = p.imageUrl;
      }
    }
    return map;
  }, [products]);

  // Filter out meta "All" category and partition by department
  const eligibleCategories = React.useMemo(() => {
    return categories
      .filter((cat) => cat.name !== 'All')
      .filter((cat) => {
        const isStationery =
          cat.department === 'stationery' ||
          cat.name.includes('Copies') ||
          cat.name.includes('Pens') ||
          cat.name.includes('Art') ||
          cat.name.includes('Office');
        return department === 'stationery' ? isStationery : !isStationery;
      });
  }, [categories, department]);

  // Group categories into Blinkit sections
  const sectionsData = React.useMemo(() => {
    const sectionConfigs = department === 'stationery' ? STATIONERY_SECTIONS : GROCERY_SECTIONS;
    const categorizedMap = new Map<string, CustomCategory[]>();
    const usedCatIds = new Set<string>();

    sectionConfigs.forEach((s) => categorizedMap.set(s.id, []));

    // Sort categories into sections
    eligibleCategories.forEach((cat) => {
      const lowerName = cat.name.toLowerCase();
      let matchedSectionId: string | null = null;

      for (const section of sectionConfigs) {
        if (section.matchKeys.some((k) => lowerName.includes(k))) {
          matchedSectionId = section.id;
          break;
        }
      }

      if (matchedSectionId) {
        categorizedMap.get(matchedSectionId)?.push(cat);
        usedCatIds.add(cat.id || cat.name);
      }
    });

    // Any unassigned categories go into an "Other Essentials" section
    const remaining = eligibleCategories.filter((c) => !usedCatIds.has(c.id || c.name));

    const finalSections: { id: string; title: string; hindiTitle?: string; categories: CustomCategory[] }[] = [];

    sectionConfigs.forEach((s) => {
      const list = categorizedMap.get(s.id) || [];
      if (list.length > 0) {
        finalSections.push({
          id: s.id,
          title: s.title,
          hindiTitle: s.hindiTitle,
          categories: list,
        });
      }
    });

    if (remaining.length > 0) {
      finalSections.push({
        id: 'other-essentials',
        title: 'Daily Essentials',
        hindiTitle: 'दैनिक जरूरतें',
        categories: remaining,
      });
    }

    return finalSections;
  }, [eligibleCategories, department]);

  // Render individual Blinkit Category Card
  const renderCategoryCard = (cat: CustomCategory, idx: number, extraClasses = '') => {
    const bgColor =
      PASTEL_TINTS[cat.name] ||
      DEFAULT_PASTEL_CYCLE[idx % DEFAULT_PASTEL_CYCLE.length];

    const packshotUrl =
      firstProductImageMap[cat.name] ||
      CURATED_PACKSHOTS[cat.name] ||
      getCategoryFallbackSvg(cat.name);

    return (
      <button
        key={cat.id || cat.name}
        type="button"
        onClick={() => onSelectCategory(cat.name)}
        className={`${bgColor} ${extraClasses} rounded-2xl p-2 flex flex-col items-center justify-between text-center aspect-[4/5] shadow-xs active:scale-95 transition-all cursor-pointer hover:shadow-sm border border-black/[0.04] group select-none`}
        title={`View ${cat.name}`}
      >
        {/* Category Image - Clean centered packshot with transparent background support */}
        <div className="w-full flex-1 flex items-center justify-center p-0.5 min-h-0">
          <img
            src={packshotUrl}
            alt={cat.name}
            loading="lazy"
            className="h-16 w-16 object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-200 mix-blend-multiply"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getCategoryFallbackSvg(cat.name);
            }}
          />
        </div>

        {/* Category Title - Compact Blinkit styling */}
        <div className="w-full px-0.5 mt-1">
          <span className="text-[11px] font-semibold text-gray-800 text-center leading-3.5 line-clamp-2 block">
            {cat.name}
          </span>
        </div>
      </button>
    );
  };

  return (
    <section className="mb-6 w-full">
      {sectionsData.map((section) => {
        const totalItems = section.categories.length;
        const fullRowsCount = Math.floor(totalItems / 4);
        const remainder = totalItems % 4;

        // If items are 4 or a multiple of 4, standard 4-column grid
        // If remainder exists, first fullRows*4 go in 4-column grid, and remainder are horizontally centered
        const fullRowItems =
          remainder === 0
            ? section.categories
            : section.categories.slice(0, fullRowsCount * 4);
        const remainderItems =
          remainder === 0
            ? []
            : section.categories.slice(fullRowsCount * 4);

        return (
          <div key={section.id} className="mb-4 last:mb-2">
            {/* Section Header - Blinkit Style */}
            <div className="flex items-center justify-between px-3 mt-3.5 mb-2">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                {section.title}
              </h2>
              {section.hindiTitle && (
                <span className="text-[11px] font-medium text-gray-400">
                  {section.hindiTitle}
                </span>
              )}
            </div>

            {/* 4-Column Grid for full rows */}
            {fullRowItems.length > 0 && (
              <div className="grid grid-cols-4 gap-2 px-3 py-1">
                {fullRowItems.map((cat, idx) => renderCategoryCard(cat, idx, 'w-full'))}
              </div>
            )}

            {/* Seamless Horizontally Centered Row for Remainder Items (Eliminating awkward gaps) */}
            {remainderItems.length > 0 && (
              <div className={`flex justify-center gap-2 px-3 py-1 ${fullRowItems.length > 0 ? 'mt-1' : ''}`}>
                {remainderItems.map((cat, idx) =>
                  renderCategoryCard(
                    cat,
                    fullRowItems.length + idx,
                    'w-[calc((100%-1.5rem)/4)] min-w-[72px] max-w-[96px]'
                  )
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
};
