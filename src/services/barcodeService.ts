/**
 * Smart Barcode Lookup & POS Scanning Service
 * Integrated with Open Food Facts API & Indian Kirana Category Heuristics
 */

import { GROCERY_CATEGORIES } from '../data/initialProducts';

export interface ScannedProductData {
  barcode: string;
  name: string;
  hindiName?: string;
  brand?: string;
  unit: string;
  category: string;
  imageUrl: string;
  originalPrice: number;
  finalPrice: number;
  discountPercent: number;
  description?: string;
  source: 'openfoodfacts' | 'manual';
  rawCategories?: string;
}

/**
 * Play authentic POS scanner beep sound and haptic vibration
 */
export function playBarcodeBeep(type: 'success' | 'warning' | 'error' = 'success'): void {
  try {
    if (typeof window === 'undefined') return;

    // Haptic vibration on mobile
    if (navigator.vibrate) {
      if (type === 'success') {
        navigator.vibrate(60);
      } else if (type === 'warning') {
        navigator.vibrate([40, 40, 40]);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Crisp grocery checkout beep: 1800Hz -> 2200Hz
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Audio context may be restricted before user interaction
  }
}

/**
 * Map Open Food Facts categories or product name to Kiranape Store Categories
 */
export function mapToKiranaCategory(
  productName: string,
  categoriesString: string = '',
  brand: string = ''
): string {
  const text = `${productName} ${categoriesString} ${brand}`.toLowerCase();

  // Spices & Salt
  if (
    text.includes('masala') ||
    text.includes('spice') ||
    text.includes('salt') ||
    text.includes('namak') ||
    text.includes('haldi') ||
    text.includes('turmeric') ||
    text.includes('chilli') ||
    text.includes('mirch') ||
    text.includes('jeera') ||
    text.includes('cumin') ||
    text.includes('coriander') ||
    text.includes('dhaniya') ||
    text.includes('pepper') ||
    text.includes('clove') ||
    text.includes('elaichi') ||
    text.includes('cardamom') ||
    text.includes('garam masala') ||
    text.includes('tata salt') ||
    text.includes('catch') ||
    text.includes('everest') ||
    text.includes('mdh')
  ) {
    return 'Spices & Salt';
  }

  // Oil & Ghee
  if (
    text.includes('oil') ||
    text.includes('ghee') ||
    text.includes('mustard') ||
    text.includes('sarson') ||
    text.includes('refined') ||
    text.includes('soyabean') ||
    text.includes('sunflower') ||
    text.includes('fortune') ||
    text.includes('dhara') ||
    text.includes('saffola') ||
    text.includes('gemini') ||
    text.includes('patanjali cow ghee') ||
    text.includes('amul ghee')
  ) {
    return 'Oil & Ghee';
  }

  // Atta & Flours
  if (
    text.includes('atta') ||
    text.includes('flour') ||
    text.includes('maida') ||
    text.includes('suji') ||
    text.includes('sooji') ||
    text.includes('rava') ||
    text.includes('besan') ||
    text.includes('wheat') ||
    text.includes('aashirvaad') ||
    text.includes('pillsbury') ||
    text.includes('chakki')
  ) {
    return 'Atta & Flours';
  }

  // Rice & Dal
  if (
    text.includes('rice') ||
    text.includes('chawal') ||
    text.includes('dal') ||
    text.includes('pulse') ||
    text.includes('lentil') ||
    text.includes('moong') ||
    text.includes('toor') ||
    text.includes('arhar') ||
    text.includes('urad') ||
    text.includes('chana') ||
    text.includes('kabuli') ||
    text.includes('rajma') ||
    text.includes('basmati') ||
    text.includes('daawat') ||
    text.includes('india gate') ||
    text.includes('kohinoor')
  ) {
    return 'Rice & Dal';
  }

  // Snacks & Biscuits
  if (
    text.includes('biscuit') ||
    text.includes('cookie') ||
    text.includes('rusk') ||
    text.includes('chips') ||
    text.includes('namkeen') ||
    text.includes('bhujia') ||
    text.includes('snack') ||
    text.includes('wafer') ||
    text.includes('parle') ||
    text.includes('britannia') ||
    text.includes('oreo') ||
    text.includes('lays') ||
    text.includes('kurkure') ||
    text.includes('bingo') ||
    text.includes('haldiram') ||
    text.includes('bikano') ||
    text.includes('balaji') ||
    text.includes('chocolate') ||
    text.includes('cadbury') ||
    text.includes('dairy milk') ||
    text.includes('kitkat')
  ) {
    return 'Snacks & Biscuits';
  }

  // Tea, Coffee & Drinks
  if (
    text.includes('tea') ||
    text.includes('chai') ||
    text.includes('coffee') ||
    text.includes('nescafe') ||
    text.includes('bru') ||
    text.includes('red label') ||
    text.includes('taj mahal') ||
    text.includes('tata tea') ||
    text.includes('wagh bakri') ||
    text.includes('juice') ||
    text.includes('drink') ||
    text.includes('beverage') ||
    text.includes('frooti') ||
    text.includes('maaza') ||
    text.includes('coke') ||
    text.includes('pepsi') ||
    text.includes('thums up') ||
    text.includes('sprite') ||
    text.includes('rooh afza')
  ) {
    return 'Tea, Coffee & Drinks';
  }

  // Dairy & Bakery
  if (
    text.includes('milk') ||
    text.includes('butter') ||
    text.includes('cheese') ||
    text.includes('paneer') ||
    text.includes('dahi') ||
    text.includes('curd') ||
    text.includes('bread') ||
    text.includes('toast') ||
    text.includes('amul') ||
    text.includes('mother dairy')
  ) {
    return 'Dairy & Bakery';
  }

  // Personal Care
  if (
    text.includes('soap') ||
    text.includes('shampoo') ||
    text.includes('conditioner') ||
    text.includes('toothpaste') ||
    text.includes('brush') ||
    text.includes('colgate') ||
    text.includes('pepsodent') ||
    text.includes('close up') ||
    text.includes('dettol') ||
    text.includes('lifebuoy') ||
    text.includes('dove') ||
    text.includes('lux') ||
    text.includes('face wash') ||
    text.includes('creme') ||
    text.includes('cream') ||
    text.includes('lotion') ||
    text.includes('hair oil') ||
    text.includes('parachute')
  ) {
    return 'Personal Care';
  }

  // Household Essentials
  if (
    text.includes('detergent') ||
    text.includes('washing') ||
    text.includes('surf') ||
    text.includes('ariel') ||
    text.includes('tide') ||
    text.includes('wheel') ||
    text.includes('ghari') ||
    text.includes('rin') ||
    text.includes('dishwash') ||
    text.includes('vim') ||
    text.includes('pril') ||
    text.includes('cleaner') ||
    text.includes('harpic') ||
    text.includes('lizol') ||
    text.includes('agarbatti') ||
    text.includes('match') ||
    text.includes('mosquito') ||
    text.includes('good knight') ||
    text.includes('all out')
  ) {
    return 'Household Essentials';
  }

  // Health & Nutrition
  if (
    text.includes('horlicks') ||
    text.includes('bournvita') ||
    text.includes('boost') ||
    text.includes('complan') ||
    text.includes('pediasure') ||
    text.includes('chyawanprash') ||
    text.includes('dabur') ||
    text.includes('honey') ||
    text.includes('shahad') ||
    text.includes('glucose') ||
    text.includes('glucon')
  ) {
    return 'Health & Nutrition';
  }

  // Packaged Foods (Noodles, pasta, sauce, ready to eat)
  if (
    text.includes('noodle') ||
    text.includes('maggi') ||
    text.includes('yippee') ||
    text.includes('pasta') ||
    text.includes('macaroni') ||
    text.includes('sauce') ||
    text.includes('ketchup') ||
    text.includes('kissan') ||
    text.includes('soup') ||
    text.includes('knorr') ||
    text.includes('pickle') ||
    text.includes('achaar') ||
    text.includes('jam') ||
    text.includes('mayonnaise') ||
    text.includes('spread') ||
    text.includes('poha') ||
    text.includes('oats') ||
    text.includes('kellogg')
  ) {
    return 'Packaged Foods';
  }

  // Default fallback
  return 'Packaged Foods';
}

/**
 * Fetch product details from Open Food Facts API by barcode
 */
export async function fetchProductByBarcode(barcode: string): Promise<ScannedProductData | null> {
  const cleanBarcode = barcode.trim().replace(/[^0-9a-zA-Z]/g, '');
  if (!cleanBarcode) return null;

  const endpoints = [
    `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
    `https://in.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KiranapeGroceryApp - v2.0 - https://kiranape.in',
        },
      });

      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      if (json.status === 1 && json.product) {
        const prod = json.product;

        // Extract Brand
        const brand = (prod.brands || prod.brand_owner || '').split(',')[0].trim();

        // Extract Product Name
        let rawName =
          prod.product_name_en ||
          prod.product_name ||
          prod.generic_name_en ||
          prod.generic_name ||
          prod.product_name_hi ||
          '';

        rawName = rawName.trim();

        // If brand is not in name, prepend brand for clarity (e.g. "Maggi 2-Minute Noodles")
        let formattedName = rawName;
        if (brand && rawName && !rawName.toLowerCase().includes(brand.toLowerCase())) {
          formattedName = `${brand} ${rawName}`;
        }
        if (!formattedName) {
          formattedName = brand ? `${brand} Item (${cleanBarcode})` : `Kirana Product (${cleanBarcode})`;
        }

        // Extract Net Quantity / Unit
        let unit = prod.quantity || '';
        if (!unit && prod.product_quantity && prod.product_quantity_unit) {
          unit = `${prod.product_quantity} ${prod.product_quantity_unit}`;
        }
        if (!unit) {
          // Look for unit inside name like "500g", "1 kg", "70 g", "1 L"
          const unitMatch = formattedName.match(/(\d+(?:\.\d+)?\s*(?:kg|g|gm|l|ltr|litre|ml|pc|piece|pack|sachet))/i);
          if (unitMatch) {
            unit = unitMatch[0];
          } else {
            unit = '1 piece';
          }
        }

        // Clean Unit format (e.g. "500 g" instead of "500g")
        unit = unit.replace(/(\d+)([a-zA-Z]+)/, '$1 $2').trim();

        // Extract Image
        const imageUrl =
          prod.image_front_url ||
          prod.image_url ||
          prod.selected_images?.front?.display?.en ||
          prod.selected_images?.front?.display?.hi ||
          prod.image_front_small_url ||
          '';

        // Extract Category
        const categoriesString = prod.categories || (prod.categories_tags ? prod.categories_tags.join(', ') : '');
        const category = mapToKiranaCategory(formattedName, categoriesString, brand);

        // Price parsing if available in OFF or default estimate
        let originalPrice = 0;
        let finalPrice = 0;
        let discountPercent = 0;

        if (prod.price && !isNaN(Number(prod.price))) {
          originalPrice = Number(prod.price);
        } else if (prod.estimated_price && !isNaN(Number(prod.estimated_price))) {
          originalPrice = Number(prod.estimated_price);
        }

        // If originalPrice exists, set 5-10% discount for kirana retail edge
        if (originalPrice > 0) {
          discountPercent = 8;
          finalPrice = Math.round(originalPrice * (1 - discountPercent / 100));
        }

        return {
          barcode: cleanBarcode,
          name: formattedName,
          brand,
          unit,
          category,
          imageUrl,
          originalPrice,
          finalPrice,
          discountPercent,
          source: 'openfoodfacts',
          rawCategories: categoriesString,
        };
      }
    } catch (err) {
      console.warn(`[BarcodeService] Error fetching from ${url}:`, err);
    }
  }

  return null;
}
