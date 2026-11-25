import { CartItem } from '../types';

export interface StoreCoupon {
  code: string;
  title: string;
  description: string;
  minOrder: number;
  type: 'flat' | 'percent';
  value: number;
  maxDiscount?: number;
  tag: string;
}

export const STORE_COUPONS: StoreCoupon[] = [
  {
    code: 'FIRSTORDER',
    title: 'Flat 5% OFF',
    description:
      'Welcome offer — Flat 5% instant savings on grocery orders above ₹499, excluding edible oil',
    minOrder: 499,
    type: 'percent',
    value: 5,
    tag: 'NEW USER',
  },
  {
    code: 'KIRANA50',
    title: 'Flat ₹50 OFF',
    description:
      'Get flat ₹50 instant discount on grocery orders above ₹699, excluding edible oil',
    minOrder: 699,
    type: 'flat',
    value: 50,
    tag: 'POPULAR',
  },
  {
    code: 'SAVE25',
    title: 'Flat ₹25 OFF',
    description:
      'Instant ₹25 off on daily essentials orders above ₹799, excluding edible oil',
    minOrder: 799,
    type: 'flat',
    value: 25,
    tag: 'DAILY DEAL',
  },
  {
    code: 'MEGA100',
    title: 'Flat ₹100 OFF',
    description:
      'Monthly ration saver — Flat ₹100 off on orders above ₹1,499, excluding edible oil',
    minOrder: 1499,
    type: 'flat',
    value: 100,
    tag: 'BEST VALUE',
  },
];

// Hair, body, massage, baby & cosmetic oils are NOT edible oils and remain coupon-eligible
const NON_EDIBLE_OIL_NAME_REGEX =
  /\b(hair\s*oil|almond\s*oil|badam\s*rogan|coconut\s*hair|mustard\s*hair|body\s*oil|baby\s*oil|massage\s*oil|face\s*oil|essential\s*oil|bio\s*oil|chameli\s*oil|jasmine\s*oil|kesh\s*king|kesh\s*kanti|navratna|dabur\s*amla|bajaj\s*almond|nihar|indulekha|parachute\s*advansed|shikakai|bhringraj|pooja\s*oil|puja\s*oil|diya\s*oil|lamp\s*oil|hair)\b/i;

const NON_EDIBLE_OIL_CATEGORY_REGEX =
  /\b(hair|personal\s*care|beauty|cosmetic|skin|bath|body|baby|soap|shampoo|grooming|pooja|puja)\b/i;

// Edible / cooking oil identifiers (using word boundaries to avoid false positives like "toilet", "foil", "pastel")
const EDIBLE_OIL_CATEGORY_REGEX = /(?:^|[\s&/\-,(])(oils?|edible\s*oils?|cooking\s*oils?)(?:$|[\s&/\-,.)])|तेल/i;

const EDIBLE_OIL_NAME_REGEX =
  /(?:^|[\s&/\-,(])(oil|oils|mustard|refined|soyabean|soybean|sunflower|rice\s*bran|ricebran|groundnut|sarson|sarso|tel|kachchi\s*ghani|kachi\s*ghani|palmolein|cottonseed|canola|olive\s*oil|til\s*oil|sesame\s*oil|vanaspati)(?:$|[\s&/\-,.)])|(तेल|सरसों|रिफाइंड|सोयाबीन|मूंगफली\s*तेल)/i;

/**
 * Determines whether a cart product is an edible/cooking oil (excluded from coupon eligibility).
 * Hair oils, almond oils, body oils, and personal care oils are explicitly NOT excluded.
 */
export function isEdibleOilItem(
  item: { name?: string | null; category?: string | null } | null | undefined
): boolean {
  if (!item) return false;
  const name = String(item.name || '').trim();
  const category = String(item.category || '').trim();

  // 1. Exclude hair/body/personal care oils first
  if (NON_EDIBLE_OIL_NAME_REGEX.test(name)) {
    return false;
  }
  if (NON_EDIBLE_OIL_CATEGORY_REGEX.test(category)) {
    return false;
  }

  // 2. Match edible oil category or cooking oil product name keywords
  if (EDIBLE_OIL_CATEGORY_REGEX.test(category)) {
    return true;
  }
  if (EDIBLE_OIL_NAME_REGEX.test(name)) {
    return true;
  }

  return false;
}

export interface CouponEligibilitySummary {
  totalCartValue: number;
  eligibleNonOilTotal: number;
  edibleOilTotal: number;
  hasEdibleOil: boolean;
  edibleOilItemCount: number;
}

/**
 * Splits a cart into coupon-eligible non-oil total vs excluded edible oil total.
 */
export function calculateCouponEligibility(cartItems: CartItem[]): CouponEligibilitySummary {
  let totalCartValue = 0;
  let eligibleNonOilTotal = 0;
  let edibleOilTotal = 0;
  let edibleOilItemCount = 0;

  for (const item of cartItems) {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    const unitPrice = Number(
      item.selectedVariant ? item.selectedVariant.price : item.product?.finalPrice ?? 0
    );
    const lineTotal = unitPrice * qty;
    totalCartValue += lineTotal;

    if (isEdibleOilItem(item.product)) {
      edibleOilTotal += lineTotal;
      edibleOilItemCount += qty;
    } else {
      eligibleNonOilTotal += lineTotal;
    }
  }

  totalCartValue = Math.round(totalCartValue * 100) / 100;
  eligibleNonOilTotal = Math.round(eligibleNonOilTotal * 100) / 100;
  edibleOilTotal = Math.round(edibleOilTotal * 100) / 100;

  return {
    totalCartValue,
    eligibleNonOilTotal,
    edibleOilTotal,
    hasEdibleOil: edibleOilTotal > 0,
    edibleOilItemCount,
  };
}

export interface CouponEvaluation {
  valid: boolean;
  code: string;
  discount: number;
  coupon?: StoreCoupon;
  message: string;
  shortfall?: number;
  eligibleNonOilTotal: number;
  edibleOilTotal: number;
  blockedDueToOilExclusion?: boolean;
}

export function buildOilExclusionCouponMessage(minAmount: number): string {
  return `ℹ️ कूपन ऑफर्स केवल अन्य किराना सामान पर लागू हैं (खाने के तेल / Edible Oil को छोड़कर कम से कम ₹${minAmount} का सामान जोड़ें)।`;
}

export function evaluateCoupon(
  rawCode: string | null | undefined,
  eligibleNonOilTotal: number,
  options?: {
    totalCartValue?: number;
    edibleOilTotal?: number;
  }
): CouponEvaluation {
  const cleanEligible = Math.max(0, Number(eligibleNonOilTotal) || 0);
  const cleanEdibleOil = Math.max(0, Number(options?.edibleOilTotal) || 0);
  const code = (rawCode || '').trim().toUpperCase();

  if (!code) {
    return {
      valid: false,
      code: '',
      discount: 0,
      message: 'Enter a coupon code',
      eligibleNonOilTotal: cleanEligible,
      edibleOilTotal: cleanEdibleOil,
    };
  }

  const matched = STORE_COUPONS.find((c) => c.code === code);
  if (!matched) {
    return {
      valid: false,
      code,
      discount: 0,
      message: `Coupon "${code}" is not valid. Try FIRSTORDER, KIRANA50, SAVE25 or MEGA100.`,
      eligibleNonOilTotal: cleanEligible,
      edibleOilTotal: cleanEdibleOil,
    };
  }

  if (cleanEligible < matched.minOrder) {
    const shortfall = Math.ceil(matched.minOrder - cleanEligible);
    const totalVal = Number(options?.totalCartValue ?? cleanEligible + cleanEdibleOil);
    const blockedDueToOilExclusion =
      cleanEdibleOil > 0 && (cleanEligible === 0 || totalVal >= matched.minOrder);

    return {
      valid: false,
      code: matched.code,
      discount: 0,
      coupon: matched,
      shortfall,
      eligibleNonOilTotal: cleanEligible,
      edibleOilTotal: cleanEdibleOil,
      blockedDueToOilExclusion,
      message: buildOilExclusionCouponMessage(matched.minOrder),
    };
  }

  let discount = 0;
  if (matched.type === 'flat') {
    discount = matched.value;
  } else {
    // Strictly calculated on eligibleNonOilTotal (never on edible oil value)
    discount = Math.round((cleanEligible * matched.value) / 100);
    if (matched.maxDiscount !== undefined) {
      discount = Math.min(discount, matched.maxDiscount);
    }
  }

  discount = Math.min(discount, cleanEligible);

  return {
    valid: true,
    code: matched.code,
    discount,
    coupon: matched,
    eligibleNonOilTotal: cleanEligible,
    edibleOilTotal: cleanEdibleOil,
    message: `${matched.code} applied — You save ₹${discount}!`,
  };
}

export function evaluateCouponForCart(
  rawCode: string | null | undefined,
  cartItems: CartItem[]
): CouponEvaluation {
  const eligibility = calculateCouponEligibility(cartItems);
  return evaluateCoupon(rawCode, eligibility.eligibleNonOilTotal, {
    totalCartValue: eligibility.totalCartValue,
    edibleOilTotal: eligibility.edibleOilTotal,
  });
}
