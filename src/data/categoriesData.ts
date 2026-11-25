import { useState, useEffect, useMemo } from 'react';
import { ProductCategory, CustomCategory, Product } from '../types';
import { subscribeToFirestoreCategories } from '../services/firebase';
import { hasRealDisplayImage, hasSupabaseStorageImage } from '../utils/studioImageUpload';

export interface UnifiedCategoryTile {
  id: string;
  name: string;
  hindiName: string;
  icon: string;
  categoryTarget: ProductCategory;
  itemCount: number;
  badge: string;
  gradient: string;
  imageUrl: string;
  primaryImage: string; // compatibility alias
  secondaryImage?: string;
  fallbackSvg: string;
  keywords: string[];
}

interface CategoryVisualMeta {
  icon: string;
  hindiName: string;
  gradient: string;
  accentBg: string;
  keywords: string[];
}

const CATEGORY_VISUAL_RULES: Array<{ pattern: RegExp; meta: CategoryVisualMeta }> = [
  {
    pattern: /atta|flour|besan|sooji|suji|maida|rava/i,
    meta: {
      icon: '🌾',
      hindiName: 'आटा, बेसन व सूजी',
      gradient: 'from-amber-50 to-orange-100/50 border-amber-200/80',
      accentBg: '#FEF3C7',
      keywords: ['atta', 'besan', 'flours', 'flour', 'sooji', 'maida', 'आटा', 'बेसन'],
    },
  },
  {
    pattern: /oil|ghee|tel|mustard|refined|vanaspati/i,
    meta: {
      icon: '🫒',
      hindiName: 'तेल व घी',
      gradient: 'from-yellow-50 to-amber-100/60 border-yellow-200/80',
      accentBg: '#FEF9C3',
      keywords: ['oil', 'ghee', 'mustard', 'refined', 'तेल', 'घी'],
    },
  },
  {
    pattern: /rice|dal|pulse|grain|chawal|poha|rajma|chana/i,
    meta: {
      icon: '🍚',
      hindiName: 'चावल, दाल व अनाज',
      gradient: 'from-sky-50 to-blue-100/50 border-sky-200/80',
      accentBg: '#E0F2FE',
      keywords: ['rice', 'dal', 'dals', 'grains', 'basmati', 'चावल', 'दाल'],
    },
  },
  {
    pattern: /spice|masala|salt|namak|haldi|mirch|pickle|achaar|condiment/i,
    meta: {
      icon: '🌶️',
      hindiName: 'मसाले, नमक व अचार',
      gradient: 'from-orange-50 to-red-100/50 border-orange-200/80',
      accentBg: '#FFEDD5',
      keywords: ['spices', 'masala', 'salt', 'namak', 'haldi', 'मसाले', 'नमक'],
    },
  },
  {
    pattern: /snack|biscuit|namkeen|chips|cookie|noodle|maggi|pasta|chocolate|candy|sweet|mithai/i,
    meta: {
      icon: '🍪',
      hindiName: 'नाश्ता, बिस्कुट व नमकीन',
      gradient: 'from-rose-50 to-orange-100/50 border-rose-200/80',
      accentBg: '#FFE4E6',
      keywords: ['snacks', 'biscuits', 'namkeen', 'chips', 'maggi', 'नाश्ता', 'बिस्कुट'],
    },
  },
  {
    pattern: /tea|coffee|drink|beverage|juice|cold|soda|sharbat|chai/i,
    meta: {
      icon: '☕',
      hindiName: 'चाय, कॉफी व पेय',
      gradient: 'from-teal-50 to-emerald-100/50 border-teal-200/80',
      accentBg: '#CCFBF1',
      keywords: ['tea', 'coffee', 'drinks', 'beverages', 'chai', 'चाय', 'कॉफी'],
    },
  },
  {
    pattern: /dairy|milk|bread|bakery|butter|paneer|curd|dahi|cheese|egg/i,
    meta: {
      icon: '🥛',
      hindiName: 'डेयरी व बेकरी',
      gradient: 'from-blue-50 to-indigo-100/50 border-blue-200/80',
      accentBg: '#DBEAFE',
      keywords: ['dairy', 'milk', 'bakery', 'bread', 'butter', 'डेयरी', 'ब्रेड'],
    },
  },
  {
    pattern: /personal|care|soap|shampoo|hair|skin|face|oral|tooth|groom|beauty|cosmetic|hygiene/i,
    meta: {
      icon: '🧴',
      hindiName: 'पर्सनल केयर व सौंदर्य',
      gradient: 'from-pink-50 to-rose-100/50 border-pink-200/80',
      accentBg: '#FCE7F3',
      keywords: ['personal care', 'soap', 'shampoo', 'skin', 'hair', 'साबुन', 'शैम्पू'],
    },
  },
  {
    pattern: /household|clean|detergent|wash|surf|vim|harpic|home|kitchen|disinfect/i,
    meta: {
      icon: '🧼',
      hindiName: 'घरेलू सफाई व ज़रूरतें',
      gradient: 'from-cyan-50 to-teal-100/50 border-cyan-200/80',
      accentBg: '#CFFAFE',
      keywords: ['household', 'cleaning', 'detergent', 'surf', 'vim', 'सफाई'],
    },
  },
  {
    pattern: /pooja|puja|agarbatti|dhoop|diya|spiritual|temple/i,
    meta: {
      icon: '🪔',
      hindiName: 'पूजा सामग्री',
      gradient: 'from-amber-50 to-yellow-100/60 border-amber-200/80',
      accentBg: '#FEF3C7',
      keywords: ['pooja', 'puja', 'agarbatti', 'dhoop', 'पूजा'],
    },
  },
  {
    pattern: /baby|diaper|infant|kids/i,
    meta: {
      icon: '🍼',
      hindiName: 'बेबी केयर',
      gradient: 'from-violet-50 to-purple-100/50 border-violet-200/80',
      accentBg: '#EDE9FE',
      keywords: ['baby', 'diaper', 'infant', 'बेबी'],
    },
  },
  {
    pattern: /dry\s*fruit|nut|kaju|badam|almond|cashew|makhana|raisin/i,
    meta: {
      icon: '🥜',
      hindiName: 'ड्राई फ्रूट्स व मेवे',
      gradient: 'from-amber-50 to-stone-100 border-amber-200/80',
      accentBg: '#FEF3C7',
      keywords: ['dry fruits', 'nuts', 'kaju', 'badam', 'मेवे'],
    },
  },
  {
    pattern: /stationery|cop(y|ies)|register|pen|pencil|art|craft|office|school|book/i,
    meta: {
      icon: '📓',
      hindiName: 'स्टेशनरी व कॉपी',
      gradient: 'from-indigo-50 to-violet-100/50 border-indigo-200/80',
      accentBg: '#E0E7FF',
      keywords: ['stationery', 'school', 'office', 'copy', 'pen', 'स्टेशनरी'],
    },
  },
  {
    pattern: /sugar|jaggery|gur|sweetener|honey/i,
    meta: {
      icon: '🍯',
      hindiName: 'चीनी, गुड़ व शहद',
      gradient: 'from-yellow-50 to-orange-100/50 border-yellow-200/80',
      accentBg: '#FEF9C3',
      keywords: ['sugar', 'jaggery', 'honey', 'चीनी', 'गुड़'],
    },
  },
  {
    pattern: /veg|fruit|fresh|sabji|produce/i,
    meta: {
      icon: '🥬',
      hindiName: 'ताज़ा सब्ज़ी व फल',
      gradient: 'from-lime-50 to-emerald-100/50 border-lime-200/80',
      accentBg: '#ECFCCB',
      keywords: ['vegetables', 'fruits', 'fresh', 'सब्ज़ी'],
    },
  },
  {
    pattern: /health|pharma|wellness|ayurved|medicine|otc/i,
    meta: {
      icon: '🩺',
      hindiName: 'हेल्थ व वेलनेस',
      gradient: 'from-emerald-50 to-teal-100/50 border-emerald-200/80',
      accentBg: '#D1FAE5',
      keywords: ['health', 'wellness', 'ayurvedic', 'हेल्थ'],
    },
  },
];

const FALLBACK_GRADIENTS = [
  'from-emerald-50 to-teal-100/50 border-emerald-200/80',
  'from-amber-50 to-yellow-100/50 border-amber-200/80',
  'from-sky-50 to-blue-100/50 border-sky-200/80',
  'from-rose-50 to-pink-100/50 border-rose-200/80',
  'from-violet-50 to-indigo-100/50 border-violet-200/80',
  'from-lime-50 to-emerald-100/50 border-lime-200/80',
];

export function resolveCategoryMeta(categoryName: string, index = 0): CategoryVisualMeta {
  for (const rule of CATEGORY_VISUAL_RULES) {
    if (rule.pattern.test(categoryName)) {
      return rule.meta;
    }
  }
  return {
    icon: '🛒',
    hindiName: 'किराना स्टोर',
    gradient: FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length],
    accentBg: '#F1F5F9',
    keywords: [categoryName.toLowerCase()],
  };
}

export function createCategoryPlaceholderSvg(
  name: string,
  hindiName?: string,
  customIcon?: string
): string {
  const meta = resolveCategoryMeta(name);
  const iconEmoji = customIcon || meta.icon || '🛒';
  const safeName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 22);
  const safeHindi = (hindiName || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 22);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <rect width="200" height="200" rx="28" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="2"/>
    <circle cx="100" cy="84" r="46" fill="${meta.accentBg}"/>
    <text x="100" y="99" font-size="42" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', sans-serif">${iconEmoji}</text>
    <text x="100" y="152" font-size="13" font-weight="700" fill="#1C1917" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${safeName}</text>
    ${safeHindi ? `<text x="100" y="172" font-size="11" font-weight="500" fill="#78716C" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${safeHindi}</text>` : ''}
  </svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Fallback categories used only before live products finish loading
export const CATEGORIES_DATA: UnifiedCategoryTile[] = [
  {
    id: 'cat-atta-flours',
    name: 'Atta & Flours',
    hindiName: 'आटा, बेसन व सूजी',
    icon: '🌾',
    categoryTarget: 'Atta & Flours',
    itemCount: 0,
    badge: 'Staples',
    gradient: 'from-amber-50 to-orange-100/50 border-amber-200/80',
    imageUrl: createCategoryPlaceholderSvg('Atta & Flours', 'आटा, बेसन व सूजी', '🌾'),
    primaryImage: createCategoryPlaceholderSvg('Atta & Flours', 'आटा, बेसन व सूजी', '🌾'),
    fallbackSvg: createCategoryPlaceholderSvg('Atta & Flours', 'आटा, बेसन व सूजी', '🌾'),
    keywords: ['atta', 'besan', 'flours', 'flour', 'sooji', 'maida', 'आटा', 'बेसन'],
  },
  {
    id: 'cat-oil-ghee-masalas',
    name: 'Oil & Ghee',
    hindiName: 'तेल व घी',
    icon: '🫒',
    categoryTarget: 'Oil & Ghee',
    itemCount: 0,
    badge: 'Daily Essential',
    gradient: 'from-yellow-50 to-amber-100/60 border-yellow-200/80',
    imageUrl: createCategoryPlaceholderSvg('Oil & Ghee', 'तेल व घी', '🫒'),
    primaryImage: createCategoryPlaceholderSvg('Oil & Ghee', 'तेल व घी', '🫒'),
    fallbackSvg: createCategoryPlaceholderSvg('Oil & Ghee', 'तेल व घी', '🫒'),
    keywords: ['oil', 'ghee', 'mustard', 'refined', 'तेल', 'घी'],
  },
  {
    id: 'cat-rice-dals-grains',
    name: 'Rice & Dal',
    hindiName: 'चावल, दाल व अनाज',
    icon: '🍚',
    categoryTarget: 'Rice & Dal',
    itemCount: 0,
    badge: 'Bulk Savings',
    gradient: 'from-sky-50 to-blue-100/50 border-sky-200/80',
    imageUrl: createCategoryPlaceholderSvg('Rice & Dal', 'चावल, दाल व अनाज', '🍚'),
    primaryImage: createCategoryPlaceholderSvg('Rice & Dal', 'चावल, दाल व अनाज', '🍚'),
    fallbackSvg: createCategoryPlaceholderSvg('Rice & Dal', 'चावल, दाल व अनाज', '🍚'),
    keywords: ['rice', 'dals', 'dal', 'grains', 'basmati', 'चावल', 'दाल'],
  },
  {
    id: 'cat-spices-salt',
    name: 'Spices & Salt',
    hindiName: 'मसाले व नमक',
    icon: '🌶️',
    categoryTarget: 'Spices & Salt',
    itemCount: 0,
    badge: 'Fresh Spices',
    gradient: 'from-orange-50 to-red-100/50 border-orange-200/80',
    imageUrl: createCategoryPlaceholderSvg('Spices & Salt', 'मसाले व नमक', '🌶️'),
    primaryImage: createCategoryPlaceholderSvg('Spices & Salt', 'मसाले व नमक', '🌶️'),
    fallbackSvg: createCategoryPlaceholderSvg('Spices & Salt', 'मसाले व नमक', '🌶️'),
    keywords: ['spices', 'masala', 'salt', 'haldi', 'mirch', 'मसाले'],
  },
  {
    id: 'cat-snacks-biscuits',
    name: 'Snacks & Biscuits',
    hindiName: 'नाश्ता व बिस्कुट',
    icon: '🍪',
    categoryTarget: 'Snacks & Biscuits',
    itemCount: 0,
    badge: 'Crispy Deals',
    gradient: 'from-rose-50 to-orange-100/50 border-rose-200/80',
    imageUrl: createCategoryPlaceholderSvg('Snacks & Biscuits', 'नाश्ता व बिस्कुट', '🍪'),
    primaryImage: createCategoryPlaceholderSvg('Snacks & Biscuits', 'नाश्ता व बिस्कुट', '🍪'),
    fallbackSvg: createCategoryPlaceholderSvg('Snacks & Biscuits', 'नाश्ता व बिस्कुट', '🍪'),
    keywords: ['snacks', 'biscuits', 'namkeen', 'chips', 'maggi', 'नाश्ता', 'बिस्कुट'],
  },
  {
    id: 'cat-tea-coffee-drinks',
    name: 'Tea, Coffee & Drinks',
    hindiName: 'चाय, कॉफी व पेय',
    icon: '☕',
    categoryTarget: 'Tea, Coffee & Drinks',
    itemCount: 0,
    badge: 'Best Price',
    gradient: 'from-teal-50 to-emerald-100/50 border-teal-200/80',
    imageUrl: createCategoryPlaceholderSvg('Tea, Coffee & Drinks', 'चाय, कॉफी व पेय', '☕'),
    primaryImage: createCategoryPlaceholderSvg('Tea, Coffee & Drinks', 'चाय, कॉफी व पेय', '☕'),
    fallbackSvg: createCategoryPlaceholderSvg('Tea, Coffee & Drinks', 'चाय, कॉफी व पेय', '☕'),
    keywords: ['tea', 'coffee', 'drinks', 'chai', 'चाय', 'कॉफी'],
  },
  {
    id: 'cat-personal-care',
    name: 'Personal Care',
    hindiName: 'पर्सनल केयर',
    icon: '🧴',
    categoryTarget: 'Personal Care',
    itemCount: 0,
    badge: 'Daily Care',
    gradient: 'from-pink-50 to-rose-100/50 border-pink-200/80',
    imageUrl: createCategoryPlaceholderSvg('Personal Care', 'पर्सनल केयर', '🧴'),
    primaryImage: createCategoryPlaceholderSvg('Personal Care', 'पर्सनल केयर', '🧴'),
    fallbackSvg: createCategoryPlaceholderSvg('Personal Care', 'पर्सनल केयर', '🧴'),
    keywords: ['personal care', 'soap', 'shampoo', 'skin', 'hair'],
  },
  {
    id: 'cat-household-cleaning',
    name: 'Household Essentials',
    hindiName: 'सफाई व ज़रूरतें',
    icon: '🧼',
    categoryTarget: 'Household Essentials',
    itemCount: 0,
    badge: 'Best Price',
    gradient: 'from-cyan-50 to-teal-100/50 border-cyan-200/80',
    imageUrl: createCategoryPlaceholderSvg('Household Essentials', 'सफाई व ज़रूरतें', '🧼'),
    primaryImage: createCategoryPlaceholderSvg('Household Essentials', 'सफाई व ज़रूरतें', '🧼'),
    fallbackSvg: createCategoryPlaceholderSvg('Household Essentials', 'सफाई व ज़रूरतें', '🧼'),
    keywords: ['household', 'cleaning', 'surf', 'vim', 'detergent', 'सफाई'],
  },
];

/**
 * Dynamically extracts ALL unique categories present in live products,
 * enriched with item counts, best available product photography (preferring Supabase Storage),
 * clean category icon fallback, and Hindi metadata.
 */
export function buildDynamicCategories(
  products: Product[],
  firestoreCategories: CustomCategory[] = []
): UnifiedCategoryTile[] {
  if (!products || products.length === 0) {
    return CATEGORIES_DATA;
  }

  // Group products by normalized category name while preserving original clean display name
  const grouped = new Map<
    string,
    {
      displayName: string;
      items: Product[];
    }
  >();

  for (const prod of products) {
    const rawCat = (prod.category || '').trim();
    if (!rawCat || rawCat.toLowerCase() === 'all') continue;
    const key = rawCat.toLowerCase();
    const existing = grouped.get(key);
    if (existing) {
      existing.items.push(prod);
    } else {
      grouped.set(key, {
        displayName: rawCat,
        items: [prod],
      });
    }
  }

  if (grouped.size === 0) {
    return CATEGORIES_DATA;
  }

  const entries = Array.from(grouped.values()).sort((a, b) => {
    // Sort by item count descending, then alphabetically for clean predictability
    if (b.items.length !== a.items.length) {
      return b.items.length - a.items.length;
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return entries.map((entry, idx) => {
    const name = entry.displayName;
    const lowerName = name.toLowerCase();
    const count = entry.items.length;

    const matchedFirestore = firestoreCategories.find(
      (fc) => fc.name && fc.name.trim().toLowerCase() === lowerName
    );
    const meta = resolveCategoryMeta(name, idx);

    const icon = matchedFirestore?.icon || meta.icon;
    const hindiName = matchedFirestore?.hindiName || meta.hindiName;
    const fallbackSvg = createCategoryPlaceholderSvg(name, hindiName, icon);

    // Prefer Supabase-hosted studio photos from products inside this category
    const supabaseImgs = entry.items
      .map((p) => p.imageUrl || p.image_url || '')
      .filter((url) => hasSupabaseStorageImage(url));

    const anyRealImgs = entry.items
      .map((p) => p.imageUrl || p.image_url || '')
      .filter((url) => hasRealDisplayImage(url));

    const fsImg =
      matchedFirestore?.imageUrl && hasRealDisplayImage(matchedFirestore.imageUrl)
        ? matchedFirestore.imageUrl
        : matchedFirestore?.image_url && hasRealDisplayImage(matchedFirestore.image_url)
        ? matchedFirestore.image_url
        : '';

    const primaryImage = supabaseImgs[0] || fsImg || anyRealImgs[0] || fallbackSvg;
    const secondaryImage =
      supabaseImgs[1] && supabaseImgs[1] !== primaryImage
        ? supabaseImgs[1]
        : anyRealImgs[1] && anyRealImgs[1] !== primaryImage
        ? anyRealImgs[1]
        : undefined;

    return {
      id: `dyn-cat-${lowerName.replace(/[^a-z0-9]+/g, '-')}`,
      name,
      hindiName,
      icon,
      categoryTarget: name as ProductCategory,
      itemCount: count,
      badge: `${count} ${count === 1 ? 'item' : 'items'}`,
      gradient: meta.gradient,
      imageUrl: primaryImage,
      primaryImage,
      secondaryImage,
      fallbackSvg,
      keywords: Array.from(new Set([...meta.keywords, lowerName, hindiName.toLowerCase()])),
    };
  });
}

// Unified custom hook that dynamically computes ALL live product categories
export function useCategories(products: Product[] = []) {
  const [firestoreCategories, setFirestoreCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToFirestoreCategories(
      (cats) => {
        if (cats && cats.length > 0) {
          setFirestoreCategories(cats);
        }
      },
      (err) => {
        console.warn('Firestore categories subscription warning in useCategories:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  const categories = useMemo(
    () => buildDynamicCategories(products, firestoreCategories),
    [products, firestoreCategories]
  );

  return { categories, rawFirestoreCategories: firestoreCategories };
}
