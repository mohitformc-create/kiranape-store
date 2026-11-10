import { Product } from '../types';
import { INITIAL_PRODUCTS } from './initialProducts';
import { STATIONERY_PRODUCTS } from './stationeryCatalog';
import { SPECIAL_DEAL_PRODUCTS } from './specialDealsCatalog';
import { UPSELL_PRODUCTS } from './upsellCatalog';
import { FREE_GIFT_ITEMS } from '../utils/rewardsEngine';

/**
 * Kiranapė Master 199 Products Catalog
 * Combines:
 * - 162 Core Grocery & Household items
 * - 20 Comprehensive School & Office Stationery items
 * - 5 Special Deal Items (Stayfree XL reward & Parle 50% deals)
 * - 9 High-Impulse Daily Essentials Upsell items
 * - 3 Bumper Celebration Tier Gift Reward items
 * Total: Exactly 199 verified products
 */

const buildMaster199Catalog = (): Product[] => {
  const map = new Map<string, Product>();

  // 1. Core initial grocery products (162 items)
  INITIAL_PRODUCTS.forEach((item) => {
    map.set(item.id, {
      ...item,
      originalPrice: Number(item.originalPrice) || 0,
      discountPercent: Number(item.discountPercent) || 0,
      finalPrice: Number(item.finalPrice) || Number(item.originalPrice) || 0,
      isAvailable: item.isAvailable ?? true,
      stock: item.stock ?? 100,
    });
  });

  // 2. School & Office Stationery (20 items)
  STATIONERY_PRODUCTS.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, {
        ...item,
        originalPrice: Number(item.originalPrice) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        finalPrice: Number(item.finalPrice) || Number(item.originalPrice) || 0,
        isAvailable: item.isAvailable ?? true,
        stock: item.stock ?? 50,
      });
    }
  });

  // 3. Special Deals (5 items)
  SPECIAL_DEAL_PRODUCTS.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, {
        ...item,
        originalPrice: Number(item.originalPrice) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        finalPrice: Number(item.finalPrice) || Number(item.originalPrice) || 0,
        isAvailable: item.isAvailable ?? true,
        stock: item.stock ?? 50,
      });
    }
  });

  // 4. Upsell Impulse Products (9 items)
  UPSELL_PRODUCTS.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, {
        ...item,
        originalPrice: Number(item.originalPrice) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        finalPrice: Number(item.finalPrice) || Number(item.originalPrice) || 0,
        isAvailable: item.isAvailable ?? true,
        stock: item.stock ?? 80,
      });
    }
  });

  // 5. Celebration Bumper Gift Items (3 items)
  FREE_GIFT_ITEMS.forEach((gift) => {
    if (!map.has(gift.id)) {
      map.set(gift.id, {
        id: gift.id,
        name: gift.name,
        hindiName: gift.name,
        category: 'Snacks & Biscuits',
        department: 'grocery',
        unit: gift.pack,
        originalPrice: Number(gift.mrp) || 100,
        discountPercent: 100,
        finalPrice: 0,
        imageUrl: gift.imageUrl || 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80',
        isAvailable: true,
        stock: 50,
        description: `Exclusive Bumper Celebration Gift Pack (${gift.pack}). Free with qualifying order!`,
        updatedAt: Date.now(),
      });
    }
  });

  return Array.from(map.values());
};

export const MASTER_199_PRODUCTS: Product[] = buildMaster199Catalog();
