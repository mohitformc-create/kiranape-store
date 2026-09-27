import React from 'react';
import { CustomCategory, Product } from '../types';
import { Sparkles, ChevronRight } from 'lucide-react';

interface CategoryTileGridProps {
  categories: CustomCategory[];
  products: Product[];
  onSelectCategory: (categoryName: string) => void;
}

// Visual theme mapping for authentic Instamart / Blinkit soft pastel styling
const CATEGORY_THEMES: Record<
  string,
  { bg: string; border: string; text: string; iconBg: string; badgeBg: string }
> = {
  'Snacks & Biscuits': {
    bg: 'bg-amber-50/90 hover:bg-amber-100/90',
    border: 'border-amber-200/80',
    text: 'text-amber-950',
    iconBg: 'bg-amber-100 text-amber-800',
    badgeBg: 'bg-amber-200/70 text-amber-900',
  },
  'Atta & Flours': {
    bg: 'bg-orange-50/90 hover:bg-orange-100/90',
    border: 'border-orange-200/80',
    text: 'text-orange-950',
    iconBg: 'bg-orange-100 text-orange-800',
    badgeBg: 'bg-orange-200/70 text-orange-900',
  },
  'Rice & Dal': {
    bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
    border: 'border-emerald-200/80',
    text: 'text-emerald-950',
    iconBg: 'bg-emerald-100 text-emerald-800',
    badgeBg: 'bg-emerald-200/70 text-emerald-900',
  },
  'Oil & Ghee': {
    bg: 'bg-yellow-50/90 hover:bg-yellow-100/90',
    border: 'border-yellow-200/80',
    text: 'text-yellow-950',
    iconBg: 'bg-yellow-100 text-yellow-800',
    badgeBg: 'bg-yellow-200/70 text-yellow-900',
  },
  'Spices & Salt': {
    bg: 'bg-rose-50/90 hover:bg-rose-100/90',
    border: 'border-rose-200/80',
    text: 'text-rose-950',
    iconBg: 'bg-rose-100 text-rose-800',
    badgeBg: 'bg-rose-200/70 text-rose-900',
  },
  'Dairy & Bakery': {
    bg: 'bg-sky-50/90 hover:bg-sky-100/90',
    border: 'border-sky-200/80',
    text: 'text-sky-950',
    iconBg: 'bg-sky-100 text-sky-800',
    badgeBg: 'bg-sky-200/70 text-sky-900',
  },
  'Tea, Coffee & Drinks': {
    bg: 'bg-stone-100/90 hover:bg-stone-200/90',
    border: 'border-stone-300/80',
    text: 'text-stone-900',
    iconBg: 'bg-stone-200 text-stone-800',
    badgeBg: 'bg-stone-300/70 text-stone-900',
  },
  'Health & Nutrition': {
    bg: 'bg-teal-50/90 hover:bg-teal-100/90',
    border: 'border-teal-200/80',
    text: 'text-teal-950',
    iconBg: 'bg-teal-100 text-teal-800',
    badgeBg: 'bg-teal-200/70 text-teal-900',
  },
  'Personal Care': {
    bg: 'bg-indigo-50/90 hover:bg-indigo-100/90',
    border: 'border-indigo-200/80',
    text: 'text-indigo-950',
    iconBg: 'bg-indigo-100 text-indigo-800',
    badgeBg: 'bg-indigo-200/70 text-indigo-900',
  },
  'Household Essentials': {
    bg: 'bg-cyan-50/90 hover:bg-cyan-100/90',
    border: 'border-cyan-200/80',
    text: 'text-cyan-950',
    iconBg: 'bg-cyan-100 text-cyan-800',
    badgeBg: 'bg-cyan-200/70 text-cyan-900',
  },
  'Packaged Foods': {
    bg: 'bg-fuchsia-50/90 hover:bg-fuchsia-100/90',
    border: 'border-fuchsia-200/80',
    text: 'text-fuchsia-950',
    iconBg: 'bg-fuchsia-100 text-fuchsia-800',
    badgeBg: 'bg-fuchsia-200/70 text-fuchsia-900',
  },
  'Pooja Samagri': {
    bg: 'bg-amber-100/70 hover:bg-amber-100',
    border: 'border-amber-300/80',
    text: 'text-amber-950',
    iconBg: 'bg-amber-200 text-amber-900',
    badgeBg: 'bg-amber-300/80 text-amber-950',
  },
  'Baby Care': {
    bg: 'bg-pink-50/90 hover:bg-pink-100/90',
    border: 'border-pink-200/80',
    text: 'text-pink-950',
    iconBg: 'bg-pink-100 text-pink-800',
    badgeBg: 'bg-pink-200/70 text-pink-900',
  },
};

const DEFAULT_THEME = {
  bg: 'bg-stone-50/90 hover:bg-stone-100',
  border: 'border-stone-200',
  text: 'text-stone-900',
  iconBg: 'bg-stone-100 text-stone-700',
  badgeBg: 'bg-stone-200 text-stone-700',
};

// Curated 2x2 collage packshot previews for authentic Blinkit storefront aesthetics
const CURATED_COLLAGE_FALLBACKS: Record<string, { name: string; img: string }[]> = {
  'Atta & Flours': [
    { name: 'Aashirvaad Atta', img: 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg' },
    { name: 'Fortune Chakki', img: 'https://images.openfoodfacts.org/images/products/890/600/728/0021/front_en.3.400.jpg' },
    { name: 'Rajdhani Sooji', img: 'https://images.openfoodfacts.org/images/products/890/601/328/0107/front_en.3.400.jpg' },
    { name: 'Rajdhani Besan', img: 'https://images.openfoodfacts.org/images/products/890/601/328/0091/front_en.3.400.jpg' },
  ],
  'Oil & Ghee': [
    { name: 'Fortune Mustard Oil', img: 'https://images.openfoodfacts.org/images/products/890/600/728/0014/front_en.3.400.jpg' },
    { name: 'Fortune Soya Oil', img: 'https://images.openfoodfacts.org/images/products/890/600/728/0120/front_en.3.400.jpg' },
    { name: 'Amul Pure Ghee', img: 'https://images.openfoodfacts.org/images/products/890/126/201/0058/front_en.4.400.jpg' },
    { name: 'Saffola Gold', img: 'https://images.openfoodfacts.org/images/products/890/108/800/4058/front_en.3.400.jpg' },
  ],
  'Snacks & Biscuits': [
    { name: 'Good Day', img: 'https://images.openfoodfacts.org/images/products/890/106/301/2160/front_en.11.400.jpg' },
    { name: 'Marie Gold', img: 'https://images.openfoodfacts.org/images/products/890/106/301/2207/front_en.4.400.jpg' },
    { name: 'Parle-G', img: 'https://images.openfoodfacts.org/images/products/890/171/910/1032/front_en.3.400.jpg' },
    { name: 'Bourbon', img: 'https://images.openfoodfacts.org/images/products/890/106/301/2221/front_en.4.400.jpg' },
  ],
  'Rice & Dal': [
    { name: 'India Gate Basmati', img: 'https://images.openfoodfacts.org/images/products/890/171/200/1018/front_en.3.400.jpg' },
    { name: 'Tata Sampann Toor Dal', img: 'https://images.openfoodfacts.org/images/products/890/105/885/2146/front_en.3.400.jpg' },
    { name: 'Tata Sampann Moong Dal', img: 'https://images.openfoodfacts.org/images/products/890/105/885/2153/front_en.3.400.jpg' },
    { name: 'Tata Sampann Chana Dal', img: 'https://images.openfoodfacts.org/images/products/890/105/885/2160/front_en.3.400.jpg' },
  ],
  'Tea, Coffee & Drinks': [
    { name: 'Red Label Tea', img: 'https://images.openfoodfacts.org/images/products/890/103/038/3859/front_en.4.400.jpg' },
    { name: 'Tata Tea Gold', img: 'https://images.openfoodfacts.org/images/products/890/105/885/2115/front_en.3.400.jpg' },
    { name: 'Nescafe Classic', img: 'https://images.openfoodfacts.org/images/products/761/303/494/3431/front_en.3.400.jpg' },
    { name: 'Coca-Cola', img: 'https://images.openfoodfacts.org/images/products/544/900/000/0996/front_en.4.400.jpg' },
  ],
  'Household Essentials': [
    { name: 'Surf Excel', img: 'https://images.openfoodfacts.org/images/products/890/103/038/3866/front_en.4.400.jpg' },
    { name: 'Vim Bar', img: 'https://images.openfoodfacts.org/images/products/890/103/038/3873/front_en.4.400.jpg' },
    { name: 'Rin Bar', img: 'https://images.openfoodfacts.org/images/products/890/103/038/3880/front_en.4.400.jpg' },
    { name: 'Harpic', img: 'https://images.openfoodfacts.org/images/products/890/139/600/0014/front_en.3.400.jpg' },
  ],
  'Personal Care': [
    { name: 'Dove Soap', img: 'https://images.openfoodfacts.org/images/products/871/716/364/1216/front_en.3.400.jpg' },
    { name: 'Lux Rose', img: 'https://images.openfoodfacts.org/images/products/890/103/038/3897/front_en.4.400.jpg' },
    { name: 'Colgate Strong Teeth', img: 'https://images.openfoodfacts.org/images/products/890/131/400/0016/front_en.3.400.jpg' },
    { name: 'Close Up', img: 'https://images.openfoodfacts.org/images/products/890/103/038/3903/front_en.4.400.jpg' },
  ],
};

export const CategoryTileGrid: React.FC<CategoryTileGridProps> = ({
  categories,
  products,
  onSelectCategory,
}) => {
  // Precompute products list per category
  const categoryProductsMap = React.useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach((p) => {
      const c = p.category || 'Household Essentials';
      if (!map[c]) map[c] = [];
      map[c].push(p);
    });
    return map;
  }, [products]);

  // Filter out the meta "All" category from grid cards
  const displayCategories = React.useMemo(() => {
    return categories.filter((cat) => cat.name !== 'All');
  }, [categories]);

  return (
    <section className="mb-5 sm:mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center text-sm font-black shadow-2xs">
            ⚡
          </div>
          <div>
            <h2 className="font-heading font-black text-stone-900 text-base sm:text-lg tracking-tight">
              Bestsellers & Curated Categories
            </h2>
            <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
              Tap any category to view full instant delivery inventory
            </p>
          </div>
        </div>

        <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          {displayCategories.length} Categories
        </span>
      </div>

      {/* 4-column rounded pastel category cards with 2x2 packshot collages */}
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {displayCategories.map((cat) => {
          const theme = CATEGORY_THEMES[cat.name] || DEFAULT_THEME;
          const catProducts = categoryProductsMap[cat.name] || [];
          const count = catProducts.length;

          // Take up to 4 preview items for the 2x2 collage (or use authentic curated brand packshots if empty)
          const fallbackPacks = CURATED_COLLAGE_FALLBACKS[cat.name] || [];
          const collageImages =
            catProducts.length > 0
              ? catProducts.slice(0, 4).map((p) => ({
                  name: p.name,
                  img: p.imageUrl || 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg',
                }))
              : fallbackPacks.slice(0, 4);

          const hasMore = count > 4 || (count === 0 && fallbackPacks.length >= 4);
          const moreCount = count > 4 ? count - 3 : 12;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.name)}
              className={`group relative flex flex-col justify-between p-2.5 sm:p-3 rounded-2xl border ${theme.border} ${theme.bg} text-left transition-all duration-200 cursor-pointer hover:shadow-md active:scale-[0.98] overflow-hidden`}
            >
              {/* Top: 2x2 Collage of Genuine Packshot Images */}
              <div className="relative w-full aspect-square bg-white rounded-xl p-1.5 border border-stone-200/70 shadow-2xs mb-2 overflow-hidden">
                {collageImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-1 w-full h-full">
                    {collageImages.map((item, idx) => {
                      const isFourthWithMore = idx === 3 && hasMore;
                      return (
                        <div
                          key={`${item.name}-${idx}`}
                          className="relative w-full h-full bg-stone-50 rounded-md overflow-hidden flex items-center justify-center p-0.5"
                        >
                          <img
                            src={item.img}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          {isFourthWithMore && (
                            <div className="absolute inset-0 bg-stone-950/75 backdrop-blur-2xs flex items-center justify-center text-white text-[10px] font-black rounded-md z-10">
                              +{moreCount} more
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Fill remaining slots if fewer than 4 items */}
                    {Array.from({ length: Math.max(0, 4 - collageImages.length) }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="w-full h-full bg-stone-50/60 rounded-md flex items-center justify-center text-stone-300 text-xs"
                      >
                        {cat.icon || '📦'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 rounded-lg text-2xl">
                    <span>{cat.icon || '📦'}</span>
                  </div>
                )}

                {/* Micro Item Count Tag */}
                <div className="absolute top-2 right-2 bg-stone-950/85 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-2xs backdrop-blur-xs">
                  {count > 0 ? `${count} items` : '⚡ 10m'}
                </div>
              </div>

              {/* Bottom Info: Category Title & Hindi Translation */}
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h3
                    className={`font-heading font-black text-xs sm:text-sm leading-tight truncate ${theme.text}`}
                  >
                    {cat.name}
                  </h3>
                  <ChevronRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>
                {cat.hindiName && (
                  <p className="text-[10px] sm:text-[11px] font-medium text-stone-500 truncate mt-0.5">
                    {cat.hindiName}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
