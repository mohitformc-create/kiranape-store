import React from 'react';
import { CustomCategory, Product } from '../types';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface CategoryTileGridProps {
  categories: CustomCategory[];
  products: Product[];
  department?: 'grocery' | 'stationery';
  onSelectCategory: (categoryName: string) => void;
}

const DEFAULT_GRADIENT_CYCLE = [
  'to-amber-50/60',
  'to-emerald-50/60',
  'to-sky-50/60',
  'to-rose-50/50',
  'to-purple-50/50',
  'to-orange-50/50',
];

// Curated high-res authentic packshots for instant Blinkit look
const CURATED_PACKSHOTS: Record<string, string> = {
  'Atta & Flours': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80',
  'Rice & Dal': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80',
  'Oil & Ghee': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80',
  'Spices & Salt': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&auto=format&fit=crop&q=80',
  'Dairy & Bakery': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80',
  'Pooja Samagri': 'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?w=400&auto=format&fit=crop&q=80',
  'Snacks & Biscuits': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80',
  'Tea, Coffee & Drinks': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80',
  'Packaged Foods': 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400&auto=format&fit=crop&q=80',
  'Health & Nutrition': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
  'Household Essentials': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&auto=format&fit=crop&q=80',
  'Personal Care': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80',
  'Baby Care': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&auto=format&fit=crop&q=80',
  'Copies & Registers': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop&q=80',
  'Pens, Pencils & Geometry': 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
  'Art, Craft & Fevicol': 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=400&auto=format&fit=crop&q=80',
  'Office & Daily Stationery': 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=400&auto=format&fit=crop&q=80',
};

const PASTEL_BOTTOM_GRADIENTS: Record<string, string> = {
  'Atta & Flours': 'to-amber-50/60',
  'Rice & Dal': 'to-emerald-50/60',
  'Oil & Ghee': 'to-yellow-50/60',
  'Spices & Salt': 'to-rose-50/50',
  'Dairy & Bakery': 'to-sky-50/60',
  'Pooja Samagri': 'to-amber-50/60',
  'Snacks & Biscuits': 'to-orange-50/50',
  'Tea, Coffee & Drinks': 'to-teal-50/50',
  'Packaged Foods': 'to-purple-50/50',
  'Health & Nutrition': 'to-green-50/50',
  'Household Essentials': 'to-blue-50/50',
  'Personal Care': 'to-pink-50/50',
  'Baby Care': 'to-fuchsia-50/50',
  'Copies & Registers': 'to-sky-50/60',
  'Pens, Pencils & Geometry': 'to-indigo-50/50',
  'Art, Craft & Fevicol': 'to-amber-50/60',
  'Office & Daily Stationery': 'to-emerald-50/50',
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
    const gradientBottom =
      PASTEL_BOTTOM_GRADIENTS[cat.name] ||
      DEFAULT_GRADIENT_CYCLE[idx % DEFAULT_GRADIENT_CYCLE.length];

    // Prioritize custom uploaded photo set by Admin, then live product packshot, then curated fallback
    const packshotUrl =
      cat.imageUrl ||
      cat.image_url ||
      firstProductImageMap[cat.name] ||
      CURATED_PACKSHOTS[cat.name] ||
      getCategoryFallbackSvg(cat.name);

    return (
      <button
        key={cat.id || cat.name}
        type="button"
        onClick={() => onSelectCategory(cat.name)}
        className={`bg-gradient-to-b from-white to-neutral-50/60 rounded-2xl border border-neutral-150 p-2 flex flex-col items-center justify-between shadow-sm overflow-hidden group select-none cursor-pointer active:scale-95 hover:shadow-md transition-all duration-200 ${extraClasses}`}
        title={`View ${cat.name}`}
      >
        {/* Category Image - Fills 65% to 70% of card height naturally without distortion, no tiny inner box */}
        <div className="w-full h-[68%] flex items-center justify-center overflow-hidden">
          <img
            src={packshotUrl}
            alt={cat.name}
            loading="lazy"
            className="w-full h-24 sm:h-28 object-contain transition-transform duration-200 hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                CURATED_PACKSHOTS[cat.name] ||
                'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80';
            }}
          />
        </div>

        {/* Category Name Label */}
        <span className="text-xs font-semibold text-neutral-800 text-center line-clamp-2 mt-1 block px-1">
          {cat.name}
        </span>
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
