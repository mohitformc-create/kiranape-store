/**
 * Pricing and Deduplication Rules for Kiranape Express
 */
import { Product } from '../types';

/**
 * Smart Retail Pricing Rule:
 * Automatically sets Selling Price strictly lower than MRP:
 * - MRP <= ₹50: ₹2 to ₹4 off
 * - ₹51 to ₹250: ₹5 to ₹10 off
 * - > ₹250: ₹15 to ₹30 off
 * Always keeps selling rate comfortably above Net Landed Rate (NRate).
 */
export function calculateSmartSellingPrice(mrp: number, nrate: number): number {
  if (mrp <= 0) return 0;

  let discount = 0;
  if (mrp <= 50) {
    // ₹2-₹4 off
    discount = Math.min(Math.max(2, Math.round(mrp * 0.08)), 4);
    if (mrp <= 10) discount = 1;
  } else if (mrp <= 250) {
    // ₹5-₹10 off
    discount = Math.min(Math.max(5, Math.round(mrp * 0.07)), 10);
  } else {
    // ₹15-₹30 off
    discount = Math.min(Math.max(15, Math.round(mrp * 0.06)), 30);
  }

  let sellingPrice = mrp - discount;

  // Guarantee that selling rate is comfortably above NRate (landed cost with GST)
  if (nrate > 0 && sellingPrice <= nrate) {
    const minSafePrice = Math.ceil(nrate * 1.04); // At least 4% markup
    if (minSafePrice < mrp) {
      sellingPrice = minSafePrice;
    } else {
      sellingPrice = Math.max(nrate, mrp - 1);
    }
  }

  // Strict rule: Selling price MUST be strictly lower than MRP
  if (sellingPrice >= mrp && mrp > 1) {
    sellingPrice = mrp - 1;
  }

  return Math.max(1, Math.round(sellingPrice));
}

/**
 * Deduplication matching: Check if an incoming bill item matches an existing store product
 */
export function matchExistingProduct(
  itemName: string,
  packSize: string,
  existingProducts: Product[]
): Product | null {
  if (!itemName || !existingProducts || existingProducts.length === 0) return null;

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanName = normalize(itemName);
  const cleanPack = normalize(packSize);

  // 1. Exact or high-confidence title match
  for (const prod of existingProducts) {
    const prodClean = normalize(prod.name);
    if (cleanName === prodClean) {
      return prod;
    }
    // Substring match with matching unit
    if (
      (cleanName.includes(prodClean) || prodClean.includes(cleanName)) &&
      (cleanPack ? normalize(prod.unit).includes(cleanPack) || cleanPack.includes(normalize(prod.unit)) : true)
    ) {
      return prod;
    }
  }

  // 2. Token overlap match (e.g. "Aashirvaad Chakki Atta 5kg" matches "Aashirvaad Shudh Chakki Atta")
  const tokens = cleanName.split(' ').filter((t) => t.length > 2);
  let bestMatch: Product | null = null;
  let maxMatchedTokens = 0;

  for (const prod of existingProducts) {
    const prodClean = normalize(prod.name);
    let matched = 0;
    for (const token of tokens) {
      if (prodClean.includes(token)) {
        matched++;
      }
    }
    if (matched >= 2 && matched > maxMatchedTokens) {
      maxMatchedTokens = matched;
      bestMatch = prod;
    }
  }

  return bestMatch;
}
