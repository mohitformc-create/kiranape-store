/**
 * Kiranape Tiered Bumper Rewards & Mathematical Delivery Fee Engine
 * Enforces strict typing, numeric casting, and synchronized calculations
 * across Cart, Checkout, Database order creation, and Print Slip.
 */

import { CartItem } from '../types';
import { evaluateCoupon } from './coupons';

export const STANDARD_DELIVERY_FEE = 29; // ₹29 standard delivery charge (FREE above ₹499)
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
    imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'free-gift-tier-3-parle',
    name: 'Parle Assorted Occasions Pack',
    pack: 'Occasions Box',
    mrp: 150,
    price: 0,
    badge: 'FREE GIFT',
    icon: '🍪',
    tierNumber: 3,
    minSubtotal: REWARD_TIERS.TIER_3_PARLE_OCCASIONS,
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&auto=format&fit=crop&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&auto=format&fit=crop&q=80',
  },
];

export interface CartCalculationOptions {
  deliveryFee?: number;
  freeThreshold?: number;
  deliveryMode?: 'delivery' | 'pickup';
  couponCode?: string | null;
}

export interface CartCalculationResult {
  itemsCount: number;
  subtotal: number;
  subtotalOriginalMRP: number;
  productDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  couponMessage: string | null;
  totalSavings: number;
  isFreeDelivery: boolean;
  deliveryCharge: number;
  subTotalWithDelivery: number;
  totalPayable: number;
  unlockedGifts: FreeGiftReward[];
  activeGift: FreeGiftReward | null;
  activeTierNumber: number; // 0 (none), 1 (free delivery), 2 (melody only), 3 (parle only), 4 (milano only)
  nextMilestoneAmount: number | null;
  amountNeededForNext: number;
  bannerCopy: string;
  progressPercent: number; // 0 - 100 for visual track
}

/**
 * Calculates cart finances strictly casting all prices and quantities using Number()
 * Supports both legacy positional arguments and modern options object.
 */
export function calculateCartFinancials(
  cartItems: CartItem[],
  customDeliveryFeeOrOptions: number | CartCalculationOptions = STANDARD_DELIVERY_FEE,
  customFreeThreshold: number = FREE_DELIVERY_THRESHOLD
): CartCalculationResult {
  const options: CartCalculationOptions =
    typeof customDeliveryFeeOrOptions === 'number'
      ? {
          deliveryFee: customDeliveryFeeOrOptions,
          freeThreshold: customFreeThreshold,
        }
      : customDeliveryFeeOrOptions;

  const deliveryFeeBase =
    options.deliveryFee !== undefined && Number(options.deliveryFee) >= 0
      ? Number(options.deliveryFee)
      : STANDARD_DELIVERY_FEE;
  const freeThresholdBase =
    options.freeThreshold !== undefined && Number(options.freeThreshold) > 0
      ? Number(options.freeThreshold)
      : FREE_DELIVERY_THRESHOLD;
  const deliveryMode = options.deliveryMode || 'delivery';

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
    subtotalOriginalMRP += Math.max(itemMRP, itemPrice) * qty;
  }

  // Round to 2 decimal places and cast strictly to Number to avoid float anomalies
  subtotal = Math.round(Number(subtotal) * 100) / 100;
  subtotalOriginalMRP = Math.round(Number(subtotalOriginalMRP) * 100) / 100;

  const productDiscount = Math.max(0, Math.round((subtotalOriginalMRP - subtotal) * 100) / 100);

  // Delivery Rules: FREE above ₹499 OR when Store Pickup is chosen; otherwise ₹29
  const isFreeDelivery = deliveryMode === 'pickup' || subtotal >= freeThresholdBase;
  const deliveryCharge = subtotal <= 0 ? 0 : isFreeDelivery ? 0 : deliveryFeeBase;
  const subTotalWithDelivery = Math.round((subtotal + deliveryCharge) * 100) / 100;

  // Coupon evaluation
  let appliedCouponCode: string | null = null;
  let couponDiscount = 0;
  let couponMessage: string | null = null;
  if (options.couponCode && options.couponCode.trim()) {
    const evalResult = evaluateCoupon(options.couponCode, subtotal);
    if (evalResult.valid) {
      appliedCouponCode = evalResult.code;
      couponDiscount = evalResult.discount;
      couponMessage = evalResult.message;
    } else {
      couponMessage = evalResult.message;
    }
  }

  const totalSavings = Math.round((productDiscount + couponDiscount) * 100) / 100;
  const totalPayable = Math.max(
    0,
    Math.round((subTotalWithDelivery - couponDiscount) * 100) / 100
  );

  // Single ₹499 Free Delivery milestone (no multi-tier free gifts)
  const activeTierNumber = isFreeDelivery ? 1 : 0;
  const unlockedGifts: FreeGiftReward[] = [];
  const activeGift: FreeGiftReward | null = null;
  const nextMilestoneAmount: number | null =
    subtotal < freeThresholdBase ? freeThresholdBase : null;
  const amountNeededForNext =
    subtotal < freeThresholdBase
      ? Math.max(0, Math.round((freeThresholdBase - subtotal) * 100) / 100)
      : 0;
  const bannerCopy =
    subtotal < freeThresholdBase
      ? `🚚 बैढ़न में ₹499 से ऊपर के ऑर्डर पर FREE डिलीवरी! बस ₹${Math.ceil(freeThresholdBase - subtotal)} का सामान और जोड़ें`
      : `🎉 बधाई हो! बैढ़न में ₹499 से ऊपर के ऑर्डर पर FREE डिलीवरी अनलॉक हो गई है!`;
  const progressPercent =
    subtotal <= 0
      ? 0
      : Math.min(100, Math.round((subtotal / freeThresholdBase) * 100));

  return {
    itemsCount: totalItemsCount,
    subtotal,
    subtotalOriginalMRP,
    productDiscount,
    couponCode: appliedCouponCode,
    couponDiscount,
    couponMessage,
    totalSavings,
    isFreeDelivery,
    deliveryCharge,
    subTotalWithDelivery,
    totalPayable,
    unlockedGifts,
    activeGift,
    activeTierNumber,
    nextMilestoneAmount,
    amountNeededForNext,
    bannerCopy,
    progressPercent,
  };
}
