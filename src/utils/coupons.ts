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
    code: 'KIRANA50',
    title: 'Flat ₹50 OFF',
    description: 'Get flat ₹50 instant discount on grocery orders above ₹699',
    minOrder: 699,
    type: 'flat',
    value: 50,
    tag: 'POPULAR',
  },
  {
    code: 'FIRSTORDER',
    title: '10% OFF (Up to ₹75)',
    description: 'Welcome offer — 10% instant savings on orders above ₹299',
    minOrder: 299,
    type: 'percent',
    value: 10,
    maxDiscount: 75,
    tag: 'NEW USER',
  },
  {
    code: 'SAVE25',
    title: 'Flat ₹25 OFF',
    description: 'Instant ₹25 off on daily essentials orders above ₹399',
    minOrder: 399,
    type: 'flat',
    value: 25,
    tag: 'DAILY DEAL',
  },
  {
    code: 'MEGA100',
    title: 'Flat ₹100 OFF',
    description: 'Monthly ration saver — ₹100 off on orders above ₹1,499',
    minOrder: 1499,
    type: 'flat',
    value: 100,
    tag: 'BEST VALUE',
  },
];

export interface CouponEvaluation {
  valid: boolean;
  code: string;
  discount: number;
  coupon?: StoreCoupon;
  message: string;
  shortfall?: number;
}

export function evaluateCoupon(
  rawCode: string | null | undefined,
  subtotal: number
): CouponEvaluation {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return { valid: false, code: '', discount: 0, message: 'Enter a coupon code' };
  }

  const matched = STORE_COUPONS.find((c) => c.code === code);
  if (!matched) {
    return {
      valid: false,
      code,
      discount: 0,
      message: `Coupon "${code}" is not valid. Try KIRANA50 or FIRSTORDER.`,
    };
  }

  const cleanSubtotal = Math.max(0, Number(subtotal) || 0);
  if (cleanSubtotal < matched.minOrder) {
    const shortfall = Math.ceil(matched.minOrder - cleanSubtotal);
    return {
      valid: false,
      code: matched.code,
      discount: 0,
      coupon: matched,
      shortfall,
      message: `Add ₹${shortfall} more to apply ${matched.code} (min. order ₹${matched.minOrder})`,
    };
  }

  let discount = 0;
  if (matched.type === 'flat') {
    discount = matched.value;
  } else {
    discount = Math.round((cleanSubtotal * matched.value) / 100);
    if (matched.maxDiscount !== undefined) {
      discount = Math.min(discount, matched.maxDiscount);
    }
  }

  discount = Math.min(discount, cleanSubtotal);

  return {
    valid: true,
    code: matched.code,
    discount,
    coupon: matched,
    message: `${matched.code} applied — You save ₹${discount}!`,
  };
}
