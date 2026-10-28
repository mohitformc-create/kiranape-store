import { Product } from '../types';

export const STAYFREE_REWARD_PRODUCT_ID = 'prod-stayfree-secure-xl-40';
export const STAYFREE_REGULAR_PRICE = 200;
export const STAYFREE_REWARD_PRICE = 180;
export const STAYFREE_MRP = 270;
export const STAYFREE_UNLOCK_THRESHOLD = 1999;

export const SPECIAL_DEAL_PRODUCTS: Product[] = [
  // 1. STAYFREE EXCLUSIVE CART REWARD DEAL
  {
    id: STAYFREE_REWARD_PRODUCT_ID,
    name: 'Stayfree Secure XL Sanitary Pads with Wings (40 Pads)',
    hindiName: 'स्टेफ्री सिक्योर एक्सएल सेनेटरी पैड्स (40 पैड्स)',
    category: 'Personal Care',
    department: 'grocery',
    unit: 'Pack of 40',
    originalPrice: STAYFREE_MRP,
    finalPrice: STAYFREE_REGULAR_PRICE,
    discountPercent: 26,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/101/211/3509/front_en.12.400.jpg',
    isAvailable: true,
    stock: 60,
    description: 'Cottony soft cover with LeakLock technology. Special Reward: Grab at ₹180 on orders above ₹1999 (Regular ₹200, MRP ₹270).',
    updatedAt: Date.now(),
  },

  // 2. PARLE BISCUITS STEAL DEALS (FLAT 50% OFF)
  {
    id: 'prod-parle-g-gold-1kg',
    name: 'Parle-G Gold Glucose Biscuits Mega Pack',
    hindiName: 'पारले-जी गोल्ड बिस्कुट 1kg फैमिली पैक',
    category: 'Snacks & Biscuits',
    department: 'grocery',
    unit: '1kg Mega Pack',
    originalPrice: 140,
    finalPrice: 70,
    discountPercent: 50,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/1018/front_en.10.400.jpg',
    isAvailable: true,
    stock: 50,
    description: 'Bigger, crispier golden wheat glucose biscuits. Steal Deal: FLAT 50% OFF (MRP ₹140 @ ₹70).',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-parle-monaco-classic-salted',
    name: 'Parle Monaco Classic Salted Crackers',
    hindiName: 'पारले मोनाको क्लासिक नमकीन बिस्कुट',
    category: 'Snacks & Biscuits',
    department: 'grocery',
    unit: '200g (Pack of 4)',
    originalPrice: 60,
    finalPrice: 30,
    discountPercent: 50,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/2039/front_en.10.400.jpg',
    isAvailable: true,
    stock: 50,
    description: 'Light, crispy salted crackers with signature punchy taste. Steal Deal: FLAT 50% OFF (MRP ₹60 @ ₹30).',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-parle-krackjack-sweet-salty',
    name: 'Parle Krackjack Sweet & Salty Crackers',
    hindiName: 'पारले क्रैकजैक नमकीन-मीठा बिस्कुट',
    category: 'Snacks & Biscuits',
    department: 'grocery',
    unit: '200g (Pack of 4)',
    originalPrice: 60,
    finalPrice: 30,
    discountPercent: 50,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/3029/front_en.10.400.jpg',
    isAvailable: true,
    stock: 50,
    description: 'The original sweet & salty crunchy cracker. Steal Deal: FLAT 50% OFF (MRP ₹60 @ ₹30).',
    updatedAt: Date.now(),
  },
  {
    id: 'prod-parle-hide-and-seek-choco',
    name: 'Parle Hide & Seek Chocolate Chip Cookies',
    hindiName: 'पारले हाइड एंड सीक चॉकलेट चिप्स कुकीज',
    category: 'Snacks & Biscuits',
    department: 'grocery',
    unit: '120g',
    originalPrice: 50,
    finalPrice: 25,
    discountPercent: 50,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/4019/front_en.10.400.jpg',
    isAvailable: true,
    stock: 50,
    description: 'Mouthwatering cookies packed with rich chocolate chips. Steal Deal: FLAT 50% OFF (MRP ₹50 @ ₹25).',
    updatedAt: Date.now(),
  },
];
