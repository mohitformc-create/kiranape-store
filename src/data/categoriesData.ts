import { useState, useEffect, useMemo } from 'react';
import { ProductCategory, CustomCategory, Product } from '../types';
import { subscribeToFirestoreCategories } from '../services/firebase';

export interface UnifiedCategoryTile {
  id: string;
  name: string;
  hindiName: string;
  categoryTarget: ProductCategory;
  badge: string;
  gradient: string;
  imageUrl: string;
  primaryImage: string; // compatibility alias
  secondaryImage?: string;
  fallbackSvg: string;
  keywords: string[];
}

export function createCategoryPlaceholderSvg(name: string, hindiName?: string): string {
  const iconEmoji =
    name.includes('Atta') ? '🌾' :
    name.includes('Oil') ? '🫒' :
    name.includes('Rice') ? '🍚' :
    name.includes('Personal') ? '🧴' :
    name.includes('Snacks') ? '🍪' :
    name.includes('Cleaning') ? '🧼' :
    name.includes('Tea') ? '☕' :
    name.includes('Dairy') ? '🥛' : '📓';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <rect width="200" height="200" rx="28" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
    <circle cx="100" cy="85" r="42" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
    <text x="100" y="98" font-size="38" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI Emoji', sans-serif">${iconEmoji}</text>
    <text x="100" y="148" font-size="12" font-weight="bold" fill="#1E293B" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${name}</text>
    ${hindiName ? `<text x="100" y="166" font-size="11" font-weight="500" fill="#64748B" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif">${hindiName}</text>` : ''}
  </svg>`.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Master unified categories array used by both Home and Categories tabs
export const CATEGORIES_DATA: UnifiedCategoryTile[] = [
  {
    id: 'cat-atta-flours',
    name: 'Atta, Besan & Flours',
    hindiName: 'आटा & बेसन & सूजी',
    categoryTarget: 'Atta & Flours',
    badge: 'Up to 15% OFF',
    gradient: 'from-amber-50 to-orange-100/50 border-amber-200/80',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/001/0173/front_en.24.400.jpg',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/103/001/0173/front_en.24.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/106/301/2136/front_en.8.400.jpg',
    fallbackSvg: createCategoryPlaceholderSvg('Atta & Flours', 'आटा & बेसन'),
    keywords: ['atta', 'besan', 'flours', 'flour', 'sooji', 'suji', 'maida', 'aashirvaad', 'आटा', 'बेसन', 'सूजी'],
  },
  {
    id: 'cat-oil-ghee-masalas',
    name: 'Oil, Ghee & Masalas',
    hindiName: 'तेल, घी & मसाले',
    categoryTarget: 'Oil & Ghee',
    badge: 'Festival Deals',
    gradient: 'from-yellow-50 to-amber-100/60 border-yellow-200/80',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/728/0014/front_en.10.400.jpg',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/600/728/0014/front_en.10.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/126/201/0114/front_en.22.400.jpg',
    fallbackSvg: createCategoryPlaceholderSvg('Oil & Ghee', 'तेल & घी'),
    keywords: ['oil', 'ghee', 'masalas', 'masala', 'mustard', 'refined', 'everest', 'haldi', 'mirch', 'fortune', 'sikka', 'तेल', 'घी', 'मसाले'],
  },
  {
    id: 'cat-rice-dals-grains',
    name: 'Rice, Dals & Grains',
    hindiName: 'चावल, दाल & अनाज',
    categoryTarget: 'Rice & Dal',
    badge: 'Bulk Savings',
    gradient: 'from-blue-50 to-sky-100/60 border-blue-200/80',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/601/305/0014/front_en.15.400.jpg',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/601/305/0014/front_en.15.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/106/500/0315/front_en.14.400.jpg',
    fallbackSvg: createCategoryPlaceholderSvg('Rice & Dal', 'चावल & दाल'),
    keywords: ['rice', 'dals', 'dal', 'grains', 'basmati', 'toor', 'chana', 'moong', 'arhar', 'rajma', 'चावल', 'दाल', 'अनाज'],
  },
  {
    id: 'cat-personal-care',
    name: 'Personal Care',
    hindiName: 'नहाने, बाल & त्वचा',
    categoryTarget: 'Personal Care',
    badge: 'Up to 30% OFF',
    gradient: 'from-rose-50 to-pink-100/60 border-rose-200/80',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/101/211/3509/front_en.12.400.jpg',
    fallbackSvg: createCategoryPlaceholderSvg('Personal Care', 'पर्सनल केयर'),
    keywords: ['personal care', 'soap', 'shampoo', 'skin', 'hair', 'dove', 'vaseline', 'ponds', 'stayfree', 'dettol', 'नहाने', 'बाल', 'त्वचा'],
  },
  {
    id: 'cat-snacks-biscuits',
    name: 'Snacks & Biscuits',
    hindiName: 'नाश्ता & बिस्कुट',
    categoryTarget: 'Snacks & Biscuits',
    badge: 'Crispy Deals',
    gradient: 'from-orange-50 to-red-100/50 border-orange-200/80',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/1012/front_en.16.400.jpg',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/171/910/1012/front_en.16.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/105/800/0111/front_en.25.400.jpg',
    fallbackSvg: createCategoryPlaceholderSvg('Snacks & Biscuits', 'नाश्ता & बिस्कुट'),
    keywords: ['snacks', 'biscuits', 'parle-g', 'good day', 'haldiram', 'bhujia', 'lays', 'chips', 'maggi', 'namkeen', 'नाश्ता', 'बिस्कुट'],
  },
  {
    id: 'cat-household-cleaning',
    name: 'Household & Cleaning',
    hindiName: 'सफाई & जरूरतें',
    categoryTarget: 'Household Essentials',
    badge: 'Best Price',
    gradient: 'from-cyan-50 to-teal-100/60 border-cyan-200/80',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/002/0165/front_en.14.400.jpg',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/103/002/0165/front_en.14.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/139/600/0118/front_en.15.400.jpg',
    fallbackSvg: createCategoryPlaceholderSvg('Household', 'सफाई & जरूरतें'),
    keywords: ['household', 'cleaning', 'surf excel', 'vim', 'comfort', 'harpic', 'detergent', 'dishwash', 'सफाई', 'जरूरतें'],
  },
  {
    id: 'cat-tea-coffee-drinks',
    name: 'Tea, Coffee & Drinks',
    hindiName: 'चाय, कॉफी & पेय',
    categoryTarget: 'Tea, Coffee & Drinks',
    badge: 'Best Price',
    gradient: 'from-amber-50 to-yellow-100/60 border-amber-200/80',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/106/500/0216/front_en.12.400.jpg',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/106/500/0216/front_en.12.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/761/303/494/2800/front_en.10.400.jpg',
    fallbackSvg: createCategoryPlaceholderSvg('Tea & Coffee', 'चाय & कॉफी'),
    keywords: ['tea', 'coffee', 'drinks', 'chai', 'tata tea', 'nescafe', 'bournvita', 'beverages', 'चाय', 'कॉफी', 'पेय'],
  },
  {
    id: 'cat-dairy-pooja',
    name: 'Dairy & Pooja Samagri',
    hindiName: 'डेयरी, ब्रेड & पूजा',
    categoryTarget: 'Dairy & Bakery',
    badge: 'Best Price',
    gradient: 'from-yellow-50/70 to-lime-100/50 border-yellow-200/70',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/126/201/0213/front_en.19.400.jpg',
    primaryImage: 'https://images.openfoodfacts.org/images/products/890/126/201/0213/front_en.19.400.jpg',
    secondaryImage: 'https://images.openfoodfacts.org/images/products/890/126/201/0114/front_en.22.400.jpg',
    fallbackSvg: createCategoryPlaceholderSvg('Dairy & Pooja', 'डेयरी & पूजा'),
    keywords: ['dairy', 'pooja', 'samagri', 'amul', 'milk', 'butter', 'bread', 'agarbatti', 'diya', 'dhoop', 'डेयरी', 'ब्रेड', 'पूजा'],
  },
  {
    id: 'cat-school-stationery',
    name: 'School & Office Stationery',
    hindiName: 'स्टेशनरी & कॉपी',
    categoryTarget: 'Copies & Registers',
    badge: 'Best Price',
    gradient: 'from-purple-50 to-violet-100/60 border-purple-200/80',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
    primaryImage: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=400&auto=format&fit=crop&q=80',
    fallbackSvg: createCategoryPlaceholderSvg('Stationery', 'स्टेशनरी & कॉपी'),
    keywords: ['school', 'office', 'stationery', 'notebook', 'register', 'classmate', 'pen', 'pencil', 'a4', 'स्टेशनरी', 'कॉपी'],
  },
];

// Unified custom hook that synchronizes Firestore categories with master array
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

  const categories = useMemo(() => {
    return CATEGORIES_DATA.map((master) => {
      const matchedFirestore = firestoreCategories.find(
        (fc) =>
          fc.name.toLowerCase() === master.name.toLowerCase() ||
          fc.name.toLowerCase() === master.categoryTarget.toLowerCase() ||
          (fc.hindiName && master.hindiName.includes(fc.hindiName))
      );

      const firstCatProduct = products.find(
        (p) => p.category && p.category.toLowerCase() === master.categoryTarget.toLowerCase() && p.imageUrl
      );

      const resolvedImage =
        matchedFirestore?.imageUrl ||
        matchedFirestore?.image_url ||
        master.imageUrl ||
        firstCatProduct?.imageUrl ||
        master.fallbackSvg;

      return {
        ...master,
        imageUrl: resolvedImage,
        primaryImage: resolvedImage,
      };
    });
  }, [firestoreCategories, products]);

  return { categories, rawFirestoreCategories: firestoreCategories };
}
