import { Product, StoreSettings, PromoBanner } from '../types';
import INITIAL_PRODUCTS_JSON from './initialProducts.json';
import DEFAULT_CATALOG_JSON from './defaultCatalog.json';

export const INITIAL_PRODUCTS: Product[] = INITIAL_PRODUCTS_JSON as Product[];
export const DEFAULT_CATALOG: Product[] = DEFAULT_CATALOG_JSON as Product[];
export const initialProducts: Product[] = INITIAL_PRODUCTS_JSON as Product[];

export const STORE_DEFAULTS: StoreSettings = {
  name: 'Chaurasia Kirana Store',
  tagline: 'Ghar tak taaza kirana, sabse tezi se!',
  phone: '9424316081',
  whatsapp: '9424316081',
  address: 'Shop No. 4, Main Market, Near Shiv Mandir, Ward No. 12, Waidhan',
  serviceArea: 'Waidhan, Singrauli',
  deliveryTime: 'Bharosemand Delivery',
  deliveryTagline: 'Shuddh Samaan, Bharosemand Delivery - Waidhan Store',
  minOrderForFreeDelivery: 199,
  deliveryCharge: 25,
  adminPin: '@2508',
};

export const DEFAULT_BANNERS: PromoBanner[] = [
  {
    id: 'banner-stayfree-xl',
    title: 'Stayfree Secure XL (40 Pads) @ ₹180 Only!',
    subtitle: 'MRP ₹270 pack just at ₹180 on orders above ₹1999! (Regular Price: ₹200)',
    badge: '🌟 EXCLUSIVE CART REWARD',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/101/211/3509/front_en.12.400.jpg',
    linkCategory: 'Personal Care',
    gradient: 'from-pink-600 via-rose-600 to-rose-700',
    buttonText: 'Claim Deal ➔',
    actionType: 'stayfree_deal',
    isActive: true,
    order: 1,
  },
  {
    id: 'banner-parle-50off',
    title: 'FLAT 50% OFF on Selected Parle Biscuits!',
    subtitle: 'Parle-G, Monaco, Krackjack aur Hide & Seek par aadhe daam ki chhoot.',
    badge: '🍪 CRAZY BISCUIT OFFER',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/1018/front_en.10.400.jpg',
    linkCategory: 'Snacks & Biscuits',
    gradient: 'from-amber-500 via-orange-500 to-orange-600',
    buttonText: 'Grab Biscuits ➔',
    actionType: 'parle_deal',
    isActive: true,
    order: 2,
  },
  {
    id: 'banner-free-delivery',
    title: 'FREE Doorstep Delivery on Orders Above ₹999!',
    subtitle: 'No minimum surge charges. Pure Kirana delivered directly to your home.',
    badge: '⚡ FAST & FREE DELIVERY',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    linkCategory: 'All',
    gradient: 'from-emerald-600 via-teal-600 to-teal-700',
    buttonText: 'Shop Daily Kirana ➔',
    actionType: 'free_delivery',
    isActive: true,
    order: 3,
  },
  {
    id: 'banner-parchi-upload',
    title: 'Ghar Baithe Parchi Bhejein ya Type Karein!',
    subtitle: 'Handwritten parchi photo upload karein ya digital list likhein, hum pack karke bhej denge.',
    badge: '📝 QUICKEST ORDERING',
    imageUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
    linkCategory: 'All',
    gradient: 'from-amber-600 via-amber-700 to-orange-700',
    buttonText: 'Upload / Type Parchi ➔',
    actionType: 'parchi',
    isActive: true,
    order: 4,
  },
  {
    id: 'banner-stationery-whatsapp',
    title: 'School Stationery & WhatsApp Direct Order',
    subtitle: 'Copies, Pens, Registers & WhatsApp order assistance on 9424316081.',
    badge: '🎒 SCHOOL & DIRECT SUPPORT',
    imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=600&q=80',
    linkCategory: 'Copies & Registers',
    gradient: 'from-indigo-600 via-purple-600 to-violet-700',
    buttonText: 'Chat on WhatsApp ➔',
    actionType: 'whatsapp',
    isActive: true,
    order: 5,
  },
];

export const GROCERY_CATEGORIES = [
  'All',
  'Snacks & Biscuits',
  'Tea, Coffee & Drinks',
  'Health & Nutrition',
  'Personal Care',
  'Household Essentials',
  'Packaged Foods',
  'Atta & Flours',
  'Rice & Dal',
  'Oil & Ghee',
  'Spices & Salt',
  'Dairy & Bakery',
] as const;

export const STATIONERY_CATEGORIES = [
  'All',
  'Copies & Registers',
  'Pens, Pencils & Geometry',
  'Art, Craft & Fevicol',
  'Office & Daily Stationery',
] as const;

export const CATEGORIES = [
  ...GROCERY_CATEGORIES,
  'Copies & Registers',
  'Pens, Pencils & Geometry',
  'Art, Craft & Fevicol',
  'Office & Daily Stationery',
] as const;
