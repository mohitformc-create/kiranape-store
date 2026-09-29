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
  adminPin: '9779',
};

export const DEFAULT_BANNERS: PromoBanner[] = [
  {
    id: 'banner-1',
    title: 'Taaza Chakki Atta & Cooking Oils',
    subtitle: 'Shudh chakki atta, mustard & refined oils at wholesale rates!',
    badge: 'UP TO 20% OFF',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/001/0173/front_en.24.400.jpg',
    linkCategory: 'Atta & Flours',
    isActive: true,
    order: 1,
  },
  {
    id: 'banner-2',
    title: 'Festival Puja & Desi Cow Ghee Specials',
    subtitle: 'Pure desi ghee, aromatic spices & dry fruits for your family',
    badge: 'FESTIVE DEALS',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/001/0210/front_en.18.400.jpg',
    linkCategory: 'Oil & Ghee',
    isActive: true,
    order: 2,
  },
];

export const CATEGORIES = [
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
