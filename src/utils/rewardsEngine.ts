/**
 * Kiranape Tiered Bumper Rewards & Mathematical Delivery Fee Engine
 * Enforces strict typing, numeric casting, and synchronized calculations
 * across Cart, Checkout, Database order creation, and Print Slip.
 */

import { CartItem } from '../types';

export const STANDARD_DELIVERY_FEE = 30; // ₹30 standard delivery charge
export const FREE_DELIVERY_THRESHOLD = 499; // Free delivery milestone

export const REWARD_TIERS = {
  TIER_1_FREE_DELIVERY: 499,
  TIER_2_MELODY_CHOCOLATE: 1199,
  TIER_3_PARLE_OCCASIONS: 1999,
  TIER_4_MILANO_COLLECTION: 2599,
} as const;

export interface FreeGiftReward {
  id: string;
  name: string;
  pack: string;
  mrp: number;
  price: 0;
  badge: 'FREE GIFT';
  icon: string;
  tierNumber: number;
  minSubtotal: number;
  imageUrl?: string;
}

export const FREE_GIFT_ITEMS: FreeGiftReward[] = [
  {
    id: 'free-gift-tier-2-melody',
    name: 'Tiramisu Melody Chocolate',
    pack: 'Celebration Pack',
    mrp: 60,
    price: 0,
    badge: 'FREE GIFT',
    icon: '🍫',
    tierNumber: 2,
    minSubtotal: REWARD_TIERS.TIER_2_MELODY_CHOCOLATE,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/101/400/0150/front_en.3.400.jpg',
  },
  {
    id: 'free-gift-tier-3-parle',
    name: 'Parle Assorted Occasions Gift Pack',
    pack: 'Occasions Box',
    mrp: 150,
    price: 0,
    badge: 'FREE GIFT',
    icon: '🍪',
    tierNumber: 3,
    minSubtotal: REWARD_TIERS.TIER_3_PARLE_OCCASIONS,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/1018/front_en.10.400.jpg',
  },
  {
    id: 'free-gift-tier-4-milano',
    name: 'Hide & Seek Milano Collection',
    pack: 'Luxury Assortment',
    mrp: 220,
    price: 0,
    badge: 'FREE GIFT',
    icon: '✨',
    tierNumber: 4,
    minSubtotal: REWARD_TIERS.TIER_4_MILANO_COLLECTION,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/171/910/8055/front_en.6.400.jpg',
  },
];

export interface CartCalculationResult {
  itemsCount: number;
  subtotal: number;
  subtotalOriginalMRP: number;
  totalSavings: number;
  isFreeDelivery: boolean;
  deliveryCharge: number;
  totalPayable: number;
  unlockedGifts: FreeGiftReward[];
  activeTierNumber: number; // 0 (none), 1 (free delivery), 2 (+melody), 3 (+parle), 4 (+milano)
  nextMilestoneAmount: number | null;
  amountNeededForNext: number;
  bannerCopy: string;
  progressPercent: number; // 0 - 100 for visual track
}

/**
 * Calculates cart finances strictly casting all prices and quantities using Number()
 */
export function calculateCartFinancials(
  cartItems: CartItem[],
  customDeliveryFee: number = STANDARD_DELIVERY_FEE,
  customFreeThreshold: number = FREE_DELIVERY_THRESHOLD
): CartCalculationResult {
  const deliveryFeeBase = Number(customDeliveryFee) || STANDARD_DELIVERY_FEE;
  const freeThresholdBase = Number(customFreeThreshold) || FREE_DELIVERY_THRESHOLD;

  let totalItemsCount = 0;
  let subtotalOriginalMRP = 0;
  let subtotal = 0;

  for (const item of cartItems) {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    totalItemsCount += qty;

    const itemPrice = Number(
      item.selectedVariant ? item.selectedVariant.price : item.product?.finalPrice ?? 0
    );
    const itemMRP = Number(
      item.selectedVariant
        ? item.selectedVariant.mrp
        : item.product?.originalPrice ?? itemPrice
    );

    subtotal += itemPrice * qty;
    subtotalOriginalMRP += itemMRP * qty;
  }

  // Round to 2 decimal places and cast strictly to Number to avoid float anomalies
  subtotal = Math.round(Number(subtotal) * 100) / 100;
  subtotalOriginalMRP = Math.round(Number(subtotalOriginalMRP) * 100) / 100;

  const totalSavings = Math.max(0, subtotalOriginalMRP - subtotal);

  // Exact Mathematical Delivery Rules:
  // - const isFreeDelivery = subtotal >= 499;
  // - const deliveryCharge = isFreeDelivery ? 0 : STANDARD_DELIVERY_FEE;
  // - const totalPayable = subtotal + deliveryCharge;
  const isFreeDelivery = subtotal >= freeThresholdBase;
  const deliveryCharge = isFreeDelivery ? 0 : deliveryFeeBase;
  const totalPayable = subtotal + deliveryCharge;

  // Tiered gifts eligibility
  const unlockedGifts = FREE_GIFT_ITEMS.filter((gift) => subtotal >= gift.minSubtotal);

  let activeTierNumber = 0;
  let nextMilestoneAmount: number | null = null;
  let amountNeededForNext = 0;
  let bannerCopy = '';

  if (subtotal < REWARD_TIERS.TIER_1_FREE_DELIVERY) {
    activeTierNumber = 0;
    nextMilestoneAmount = REWARD_TIERS.TIER_1_FREE_DELIVERY;
    amountNeededForNext = REWARD_TIERS.TIER_1_FREE_DELIVERY - subtotal;
    bannerCopy = `Add ₹${amountNeededForNext} more to unlock FREE Delivery 🚚`;
  } else if (subtotal < REWARD_TIERS.TIER_2_MELODY_CHOCOLATE) {
    activeTierNumber = 1;
    nextMilestoneAmount = REWARD_TIERS.TIER_2_MELODY_CHOCOLATE;
    amountNeededForNext = REWARD_TIERS.TIER_2_MELODY_CHOCOLATE - subtotal;
    bannerCopy = `🎉 FREE Delivery unlocked! Add ₹${amountNeededForNext} more to get FREE Tiramisu Melody Chocolate 🍫`;
  } else if (subtotal < REWARD_TIERS.TIER_3_PARLE_OCCASIONS) {
    activeTierNumber = 2;
    nextMilestoneAmount = REWARD_TIERS.TIER_3_PARLE_OCCASIONS;
    amountNeededForNext = REWARD_TIERS.TIER_3_PARLE_OCCASIONS - subtotal;
    bannerCopy = `🎁 Melody Chocolate unlocked! Add ₹${amountNeededForNext} more for FREE Parle Assorted Occasions Pack 🍪`;
  } else if (subtotal < REWARD_TIERS.TIER_4_MILANO_COLLECTION) {
    activeTierNumber = 3;
    nextMilestoneAmount = REWARD_TIERS.TIER_4_MILANO_COLLECTION;
    amountNeededForNext = REWARD_TIERS.TIER_4_MILANO_COLLECTION - subtotal;
    bannerCopy = `🔥 Parle Pack unlocked! Add ₹${amountNeededForNext} more for FREE Hide & Seek Milano Collection ✨`;
  } else {
    activeTierNumber = 4;
    nextMilestoneAmount = null;
    amountNeededForNext = 0;
    bannerCopy = `🏆 Maximum Bumper Rewards Unlocked! (Milano Collection + Free Delivery)`;
  }

  // Calculate percentage along the 0 -> 499 -> 1199 -> 1999 -> 2599 track
  let progressPercent = 0;
  if (subtotal <= 0) {
    progressPercent = 0;
  } else if (subtotal < REWARD_TIERS.TIER_1_FREE_DELIVERY) {
    // 0% to 25%
    progressPercent = Math.min(24, Math.round((subtotal / REWARD_TIERS.TIER_1_FREE_DELIVERY) * 25));
  } else if (subtotal < REWARD_TIERS.TIER_2_MELODY_CHOCOLATE) {
    // 25% to 50%
    const span = REWARD_TIERS.TIER_2_MELODY_CHOCOLATE - REWARD_TIERS.TIER_1_FREE_DELIVERY;
    const progressInSpan = subtotal - REWARD_TIERS.TIER_1_FREE_DELIVERY;
    progressPercent = 25 + Math.min(24, Math.round((progressInSpan / span) * 25));
  } else if (subtotal < REWARD_TIERS.TIER_3_PARLE_OCCASIONS) {
    // 50% to 75%
    const span = REWARD_TIERS.TIER_3_PARLE_OCCASIONS - REWARD_TIERS.TIER_2_MELODY_CHOCOLATE;
    const progressInSpan = subtotal - REWARD_TIERS.TIER_2_MELODY_CHOCOLATE;
    progressPercent = 50 + Math.min(24, Math.round((progressInSpan / span) * 25));
  } else if (subtotal < REWARD_TIERS.TIER_4_MILANO_COLLECTION) {
    // 75% to 100%
    const span = REWARD_TIERS.TIER_4_MILANO_COLLECTION - REWARD_TIERS.TIER_3_PARLE_OCCASIONS;
    const progressInSpan = subtotal - REWARD_TIERS.TIER_3_PARLE_OCCASIONS;
    progressPercent = 75 + Math.min(24, Math.round((progressInSpan / span) * 25));
  } else {
    progressPercent = 100;
  }

  return {
    itemsCount: totalItemsCount,
    subtotal,
    subtotalOriginalMRP,
    totalSavings,
    isFreeDelivery,
    deliveryCharge,
    totalPayable,
    unlockedGifts,
    activeTierNumber,
    nextMilestoneAmount,
    amountNeededForNext,
    bannerCopy,
    progressPercent,
  };
}
