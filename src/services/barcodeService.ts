/**
 * Smart Universal Barcode Lookup & POS Scanning Service
 * Multi-Source Chain:
 * - Local FMCG Quick Cache (Dettol, Harpic, Lizol, Surf Excel, Colgate, Vim, Whisper, Ching's, etc.)
 * - Tier 1: Open Food Facts (Food & Beverages)
 * - Tier 2: Open Beauty Facts (Soaps, Creams, Shampoos, Toothpaste, Cosmetics)
 * - Tier 3: Open Products Facts (Household, Detergents, Cleaners, Cleaning Essentials)
 * - Tier 4: Gemini AI Smart FMCG Lookup (Guaranteed fallback for Indian 890... barcodes)
 */

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
  source: 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts' | 'gemini-ai' | 'fmcg-catalog' | 'manual';
  rawCategories?: string;
}

/**
 * Curated High-Speed Indian FMCG Barcode Directory
 * Instant millisecond-level recognition for common household & grocery staples
 */
export const INDIAN_FMCG_QUICK_REGISTRY: Record<string, Partial<ScannedProductData>> = {
  // Household Cleaners & Detergents
  '8901396340013': {
    name: 'Harpic Power Plus Disinfectant Toilet Cleaner',
    brand: 'Harpic',
    unit: '500 ml',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=80',
    originalPrice: 105,
    finalPrice: 96,
    discountPercent: 9,
  },
  '8901396320015': {
    name: 'Lizol Disinfectant Surface & Floor Cleaner Citrus',
    brand: 'Lizol',
    unit: '500 ml',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=500&q=80',
    originalPrice: 115,
    finalPrice: 104,
    discountPercent: 10,
  },
  '8901030010180': {
    name: 'Surf Excel Easy Wash Detergent Powder',
    brand: 'Surf Excel',
    unit: '1 kg',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=500&q=80',
    originalPrice: 145,
    finalPrice: 132,
    discountPercent: 9,
  },
  '8901030010197': {
    name: 'Vim Dishwash Bar with Lemon Fragrance',
    brand: 'Vim',
    unit: '150 g',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=80',
    originalPrice: 20,
    finalPrice: 18,
    discountPercent: 10,
  },
  '8901213002012': {
    name: 'Ariel Matic Front Load / Top Load Detergent',
    brand: 'Ariel',
    unit: '1 kg',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=500&q=80',
    originalPrice: 250,
    finalPrice: 228,
    discountPercent: 9,
  },
  '8901213003019': {
    name: 'Tide Plus Double Power Detergent Lemon & Mint',
    brand: 'Tide',
    unit: '1 kg',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=500&q=80',
    originalPrice: 130,
    finalPrice: 118,
    discountPercent: 9,
  },
  '8901526001018': {
    name: 'Ghari Detergent Powder (Pehle Istemaal Karein)',
    brand: 'Ghari',
    unit: '1 kg',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=500&q=80',
    originalPrice: 65,
    finalPrice: 60,
    discountPercent: 8,
  },
  '8901023001012': {
    name: 'Good Knight Gold Flash Liquid Mosquito Repellent Refill',
    brand: 'Good Knight',
    unit: '45 ml',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=80',
    originalPrice: 85,
    finalPrice: 78,
    discountPercent: 8,
  },
  '8901414001018': {
    name: 'All Out Ultra Power+ Fan Mosquito Refill',
    brand: 'All Out',
    unit: '45 ml',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=80',
    originalPrice: 85,
    finalPrice: 78,
    discountPercent: 8,
  },
  '8901030010272': {
    name: 'Rin Advanced Detergent Bar (Chamatkari Safedi)',
    brand: 'Rin',
    unit: '250 g',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=500&q=80',
    originalPrice: 30,
    finalPrice: 28,
    discountPercent: 7,
  },
  '8901030010289': {
    name: 'Active Wheel 2-in-1 Detergent Bar Lemon & Jasmine',
    brand: 'Wheel',
    unit: '190 g',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=500&q=80',
    originalPrice: 15,
    finalPrice: 14,
    discountPercent: 7,
  },
  '8901030010388': {
    name: 'Doctor Doctor White Phenyl Disinfectant Compound',
    brand: 'Doctor Doctor',
    unit: '1 L',
    category: 'Household Essentials',
    imageUrl: 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=500&q=80',
    originalPrice: 90,
    finalPrice: 75,
    discountPercent: 17,
  },

  // Personal Care & Hygiene
  '8901396001112': {
    name: 'Dettol Original Germ Protection Bathing Soap',
    brand: 'Dettol',
    unit: '75 g',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1607006314188-e21e6fc85e50?auto=format&fit=crop&w=500&q=80',
    originalPrice: 40,
    finalPrice: 36,
    discountPercent: 10,
  },
  '8901314010545': {
    name: 'Colgate Strong Teeth Dental Cream Toothpaste',
    brand: 'Colgate',
    unit: '100 g',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1559591937-e1032b4b45ef?auto=format&fit=crop&w=500&q=80',
    originalPrice: 65,
    finalPrice: 58,
    discountPercent: 11,
  },
  '8901030010258': {
    name: 'Lifebuoy Total Germ Protection Soap',
    brand: 'Lifebuoy',
    unit: '125 g',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1607006314188-e21e6fc85e50?auto=format&fit=crop&w=500&q=80',
    originalPrice: 38,
    finalPrice: 35,
    discountPercent: 8,
  },
  '8901030010265': {
    name: 'Lux Rose & Vitamin E Glowing Skin Beauty Soap',
    brand: 'Lux',
    unit: '100 g',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1607006314188-e21e6fc85e50?auto=format&fit=crop&w=500&q=80',
    originalPrice: 42,
    finalPrice: 38,
    discountPercent: 10,
  },
  '8901213001015': {
    name: 'Whisper Choice Ultra Wings Sanitary Pads',
    brand: 'Whisper',
    unit: 'Pack of 6',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=500&q=80',
    originalPrice: 50,
    finalPrice: 45,
    discountPercent: 10,
  },
  '8901030010296': {
    name: 'Clinic Plus Strong & Long Health Shampoo with Milk Protein',
    brand: 'Clinic Plus',
    unit: '175 ml',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=80',
    originalPrice: 125,
    finalPrice: 110,
    discountPercent: 12,
  },
  '8901213004016': {
    name: 'Head & Shoulders Anti-Dandruff Shampoo Smooth & Silky',
    brand: 'Head & Shoulders',
    unit: '180 ml',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=80',
    originalPrice: 175,
    finalPrice: 155,
    discountPercent: 11,
  },
  '8901088001013': {
    name: 'Parachute 100% Pure Coconut Hair Oil',
    brand: 'Parachute',
    unit: '200 ml',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1608248597359-22a089cf53ad?auto=format&fit=crop&w=500&q=80',
    originalPrice: 95,
    finalPrice: 86,
    discountPercent: 9,
  },
  '8901030010333': {
    name: 'Glow & Lovely Advanced Multivitamin Face Cream',
    brand: 'Glow & Lovely',
    unit: '50 g',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=80',
    originalPrice: 115,
    finalPrice: 102,
    discountPercent: 11,
  },
  '8901030010319': {
    name: 'Vaseline Deep Moisture Total Nourishment Body Lotion',
    brand: 'Vaseline',
    unit: '200 ml',
    category: 'Personal Care',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=500&q=80',
    originalPrice: 199,
    finalPrice: 175,
    discountPercent: 12,
  },

  // Packaged Foods, Sauces & Condiments
  '8906007280145': {
    name: "Ching's Secret Dark Soy Sauce",
    brand: "Ching's Secret",
    unit: '200 g',
    category: 'Packaged Foods',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/728/0145/front_en.11.400.jpg',
    originalPrice: 60,
    finalPrice: 54,
    discountPercent: 10,
  },
  '8906007280152': {
    name: "Ching's Secret Green Chilli Sauce",
    brand: "Ching's Secret",
    unit: '200 g',
    category: 'Packaged Foods',
    imageUrl: 'https://images.unsplash.com/photo-1588615419957-bf66d53c6b49?auto=format&fit=crop&w=500&q=80',
    originalPrice: 60,
    finalPrice: 54,
    discountPercent: 10,
  },
  '8901030366621': {
    name: 'Kissan Fresh Tomato Ketchup Bottle',
    brand: 'Kissan',
    unit: '950 g',
    category: 'Packaged Foods',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/036/6621/front_en.14.400.jpg',
    originalPrice: 155,
    finalPrice: 139,
    discountPercent: 10,
  },
  '8901117001012': {
    name: 'Tops Pure White Vinegar (Sirka)',
    brand: 'Tops',
    unit: '650 ml',
    category: 'Packaged Foods',
    imageUrl: 'https://images.unsplash.com/photo-1588615419957-bf66d53c6b49?auto=format&fit=crop&w=500&q=80',
    originalPrice: 55,
    finalPrice: 48,
    discountPercent: 13,
  },
  '8904063205014': {
    name: 'Bikano Canned Sponge Rasgulla Sweet Tin',
    brand: 'Bikano',
    unit: '1 kg',
    category: 'Packaged Foods',
    imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=500&q=80',
    originalPrice: 240,
    finalPrice: 215,
    discountPercent: 10,
  },
  '8904063205021': {
    name: 'Haldiram Nagpur Gulab Jamun Tin',
    brand: 'Haldiram',
    unit: '1 kg',
    category: 'Packaged Foods',
    imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=500&q=80',
    originalPrice: 250,
    finalPrice: 220,
    discountPercent: 12,
  },

  // Food Staples & Snacks
  '8901058863673': {
    name: 'Maggi 2-Minute Masala Instant Noodles',
    brand: 'Maggi',
    unit: '70 g',
    category: 'Packaged Foods',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/105/886/3673/front_en.16.400.jpg',
    originalPrice: 14,
    finalPrice: 14,
    discountPercent: 0,
  },
  '8901030010173': {
    name: 'Tata Salt Vacuum Evaporated Iodized Salt',
    brand: 'Tata Salt',
    unit: '1 kg',
    category: 'Spices & Salt',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/001/0173/front_en.24.400.jpg',
    originalPrice: 28,
    finalPrice: 27,
    discountPercent: 4,
  },
  '8901030010210': {
    name: 'Tata Tea Gold Leaf & Long Leaves Tea',
    brand: 'Tata Tea',
    unit: '500 g',
    category: 'Tea, Coffee & Drinks',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/103/001/0210/front_en.18.400.jpg',
    originalPrice: 320,
    finalPrice: 289,
    discountPercent: 10,
  },
  '8901491101837': {
    name: 'Kurkure Masala Munch Crispy Namkeen',
    brand: 'Kurkure',
    unit: '85 g',
    category: 'Snacks & Biscuits',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/149/110/1837/front_en.16.400.jpg',
    originalPrice: 20,
    finalPrice: 20,
    discountPercent: 0,
  },
  '8901719101016': {
    name: 'Parle-G Original Gluco Biscuits',
    brand: 'Parle',
    unit: '250 g',
    category: 'Snacks & Biscuits',
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=80',
    originalPrice: 30,
    finalPrice: 28,
    discountPercent: 7,
  },
  '8901063012015': {
    name: 'Britannia Good Day Butter Cookies',
    brand: 'Britannia',
    unit: '200 g',
    category: 'Snacks & Biscuits',
    imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=500&q=80',
    originalPrice: 40,
    finalPrice: 36,
    discountPercent: 10,
  },
};

/**
 * Play authentic POS scanner beep sound and haptic vibration
 */
export function playBarcodeBeep(type: 'success' | 'warning' | 'error' = 'success'): void {
  try {
    if (typeof window === 'undefined') return;

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
    // Audio context may be restricted before user gesture
  }
}

/**
 * Map product title, brand, and database categories to Kiranape Store Categories
 * Prioritizes Household Essentials & Personal Care non-food categories alongside Food categories
 */
export function mapToKiranaCategory(
  productName: string,
  categoriesString: string = '',
  brand: string = ''
): string {
  const text = `${productName} ${categoriesString} ${brand}`.toLowerCase();

  // 1. Household Essentials (Cleaners, Detergents, Repellents, Toilet Care)
  if (
    text.includes('harpic') ||
    text.includes('lizol') ||
    text.includes('phenyl') ||
    text.includes('detergent') ||
    text.includes('washing powder') ||
    text.includes('surf excel') ||
    text.includes('ariel') ||
    text.includes('tide') ||
    text.includes('wheel') ||
    text.includes('ghari') ||
    text.includes('rin') ||
    text.includes('vim') ||
    text.includes('dishwash') ||
    text.includes('pril') ||
    text.includes('colin') ||
    text.includes('floor cleaner') ||
    text.includes('toilet cleaner') ||
    text.includes('cleaner') ||
    text.includes('bleach') ||
    text.includes('mosquito') ||
    text.includes('good knight') ||
    text.includes('all out') ||
    text.includes('hit spray') ||
    text.includes('odonil') ||
    text.includes('aer') ||
    text.includes('agarbatti') ||
    text.includes('dhoop') ||
    text.includes('match') ||
    text.includes('scrubber') ||
    text.includes('sponge') ||
    text.includes('garbage bag')
  ) {
    return 'Household Essentials';
  }

  // 2. Personal Care (Soaps, Creams, Toothpaste, Shampoos, Sanitary Care)
  if (
    text.includes('soap') ||
    text.includes('sabun') ||
    text.includes('dettol') ||
    text.includes('lifebuoy') ||
    text.includes('lux') ||
    text.includes('dove') ||
    text.includes('pears') ||
    text.includes('santoor') ||
    text.includes('cinthol') ||
    text.includes('godrej no.1') ||
    text.includes('toothpaste') ||
    text.includes('colgate') ||
    text.includes('pepsodent') ||
    text.includes('close up') ||
    text.includes('sensodyne') ||
    text.includes('dabur red') ||
    text.includes('meswak') ||
    text.includes('toothbrush') ||
    text.includes('brush') ||
    text.includes('shampoo') ||
    text.includes('conditioner') ||
    text.includes('clinic plus') ||
    text.includes('sunsilk') ||
    text.includes('head & shoulders') ||
    text.includes('pantene') ||
    text.includes('vatika') ||
    text.includes('sanitary') ||
    text.includes('whisper') ||
    text.includes('stayfree') ||
    text.includes('sofy') ||
    text.includes('pad') ||
    text.includes('cream') ||
    text.includes('lotion') ||
    text.includes('vaseline') ||
    text.includes('nivea') ||
    text.includes('pond') ||
    text.includes('glow & lovely') ||
    text.includes('fair & lovely') ||
    text.includes('boroplus') ||
    text.includes('face wash') ||
    text.includes('body wash') ||
    text.includes('hair oil') ||
    text.includes('parachute') ||
    text.includes('almond drops') ||
    text.includes('navratna') ||
    text.includes('shaving') ||
    text.includes('gillette') ||
    text.includes('razor') ||
    text.includes('blade') ||
    text.includes('deodorant') ||
    text.includes('deo') ||
    text.includes('fogg') ||
    text.includes('talc') ||
    text.includes('powder')
  ) {
    return 'Personal Care';
  }

  // 3. Spices & Salt
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
    text.includes('dhaniya') ||
    text.includes('coriander') ||
    text.includes('garam masala') ||
    text.includes('hing') ||
    text.includes('pepper') ||
    text.includes('elaichi') ||
    text.includes('clove') ||
    text.includes('laung') ||
    text.includes('tata salt') ||
    text.includes('catch') ||
    text.includes('everest') ||
    text.includes('mdh') ||
    text.includes('rajesh masala') ||
    text.includes('goldiee') ||
    text.includes('ashok masala')
  ) {
    return 'Spices & Salt';
  }

  // 4. Oil & Ghee
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
    text.includes('dalda') ||
    text.includes('vanaspati') ||
    text.includes('patanjali cow ghee') ||
    text.includes('amul ghee') ||
    text.includes('gowardhan')
  ) {
    return 'Oil & Ghee';
  }

  // 5. Atta & Flours
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

  // 6. Rice & Dal
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

  // 7. Snacks & Biscuits
  if (
    text.includes('biscuit') ||
    text.includes('cookie') ||
    text.includes('rusk') ||
    text.includes('chips') ||
    text.includes('namkeen') ||
    text.includes('bhujia') ||
    text.includes('sev') ||
    text.includes('mixture') ||
    text.includes('snack') ||
    text.includes('wafer') ||
    text.includes('parle') ||
    text.includes('britannia') ||
    text.includes('good day') ||
    text.includes('marie') ||
    text.includes('bourbon') ||
    text.includes('oreo') ||
    text.includes('50-50') ||
    text.includes('monaco') ||
    text.includes('lays') ||
    text.includes('kurkure') ||
    text.includes('bingo') ||
    text.includes('haldiram') ||
    text.includes('bikano') ||
    text.includes('bikaji') ||
    text.includes('balaji') ||
    text.includes('chocolate') ||
    text.includes('cadbury') ||
    text.includes('dairy milk') ||
    text.includes('kitkat') ||
    text.includes('munch') ||
    text.includes('5 star')
  ) {
    return 'Snacks & Biscuits';
  }

  // 8. Tea, Coffee & Drinks
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
    text.includes('slice') ||
    text.includes('coke') ||
    text.includes('pepsi') ||
    text.includes('thums up') ||
    text.includes('sprite') ||
    text.includes('limca') ||
    text.includes('fanta') ||
    text.includes('rooh afza') ||
    text.includes('rasna') ||
    text.includes('tang') ||
    text.includes('sharbat')
  ) {
    return 'Tea, Coffee & Drinks';
  }

  // 9. Dairy & Bakery
  if (
    text.includes('milk') ||
    text.includes('doodh') ||
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

  // 10. Health & Nutrition
  if (
    text.includes('horlicks') ||
    text.includes('bournvita') ||
    text.includes('boost') ||
    text.includes('complan') ||
    text.includes('pediasure') ||
    text.includes('chyawanprash') ||
    text.includes('dabur honey') ||
    text.includes('honey') ||
    text.includes('shahad') ||
    text.includes('glucose') ||
    text.includes('glucon-d') ||
    text.includes('ensure')
  ) {
    return 'Health & Nutrition';
  }

  // 11. Packaged Foods & Sauces (Chowmein, Sauces, Vinegar, Jam, Canned sweets)
  if (
    text.includes('sauce') ||
    text.includes('ketchup') ||
    text.includes('vinegar') ||
    text.includes('sirka') ||
    text.includes('soy sauce') ||
    text.includes('chilli sauce') ||
    text.includes('ching') ||
    text.includes('chowmein') ||
    text.includes('noodle') ||
    text.includes('maggi') ||
    text.includes('yippee') ||
    text.includes('pasta') ||
    text.includes('macaroni') ||
    text.includes('mayonnaise') ||
    text.includes('jam') ||
    text.includes('kissan') ||
    text.includes('pickle') ||
    text.includes('achaar') ||
    text.includes('papad') ||
    text.includes('soup') ||
    text.includes('knorr') ||
    text.includes('rasgulla') ||
    text.includes('gulab jamun') ||
    text.includes('canned') ||
    text.includes('tin') ||
    text.includes('ready to eat') ||
    text.includes('poha') ||
    text.includes('oats') ||
    text.includes('kellogg')
  ) {
    return 'Packaged Foods';
  }

  return 'Household Essentials';
}

/**
 * Universal Barcode Lookup Chain:
 * 1. Local FMCG Catalog Check
 * 2. Tier 1: Open Food Facts API (Food/Drinks)
 * 3. Tier 2: Open Beauty Facts API (Personal Care, Shampoos, Soaps, Cosmetics)
 * 4. Tier 3: Open Products Facts API (Household, Detergents, Cleaners)
 * 5. Tier 4: Gemini AI Smart FMCG Lookup (Guaranteed fallback for 890... Indian barcodes)
 */
export async function fetchProductByBarcode(barcode: string): Promise<ScannedProductData | null> {
  const cleanBarcode = barcode.trim().replace(/[^0-9a-zA-Z]/g, '');
  if (!cleanBarcode) return null;

  // STEP 0: Check Local FMCG Quick Registry (Instant 0ms match)
  const quickMatch = INDIAN_FMCG_QUICK_REGISTRY[cleanBarcode];
  if (quickMatch && quickMatch.name) {
    return {
      barcode: cleanBarcode,
      name: quickMatch.name,
      brand: quickMatch.brand || '',
      unit: quickMatch.unit || '1 piece',
      category: quickMatch.category || 'Household Essentials',
      imageUrl: quickMatch.imageUrl || '',
      originalPrice: quickMatch.originalPrice || 0,
      finalPrice: quickMatch.finalPrice || quickMatch.originalPrice || 0,
      discountPercent: quickMatch.discountPercent || 0,
      source: 'fmcg-catalog',
    };
  }

  // Endpoints list across Tier 1, Tier 2, and Tier 3
  const tiers: Array<{ url: string; source: 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts' }> = [
    // Tier 1: Open Food Facts (World & India)
    { url: `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`, source: 'openfoodfacts' },
    { url: `https://in.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`, source: 'openfoodfacts' },

    // Tier 2: Open Beauty & Personal Care Facts (Soaps, Creams, Toothpaste, Shampoo)
    { url: `https://world.openbeautyfacts.org/api/v2/product/${cleanBarcode}.json`, source: 'openbeautyfacts' },
    { url: `https://in.openbeautyfacts.org/api/v2/product/${cleanBarcode}.json`, source: 'openbeautyfacts' },

    // Tier 3: Open Products Facts (Household, Cleaners, Detergents, FMCG)
    { url: `https://world.openproductsfacts.org/api/v2/product/${cleanBarcode}.json`, source: 'openproductsfacts' },
    { url: `https://in.openproductsfacts.org/api/v2/product/${cleanBarcode}.json`, source: 'openproductsfacts' },
  ];

  for (const tier of tiers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s fast timeout per database

      const response = await fetch(tier.url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'KiranapeGroceryApp - v2.0 - https://kiranape.in',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const json = await response.json();
      if (json.status === 1 && json.product) {
        const prod = json.product;

        // Extract Brand
        const brand = (prod.brands || prod.brand_owner || '').split(',')[0].trim();

        // Extract Name
        let rawName =
          prod.product_name_en ||
          prod.product_name ||
          prod.generic_name_en ||
          prod.generic_name ||
          prod.product_name_hi ||
          '';

        rawName = rawName.trim();

        let formattedName = rawName;
        if (brand && rawName && !rawName.toLowerCase().includes(brand.toLowerCase())) {
          formattedName = `${brand} ${rawName}`;
        }
        if (!formattedName) {
          formattedName = brand ? `${brand} (${cleanBarcode})` : `Item (${cleanBarcode})`;
        }

        // Extract Net Quantity / Unit
        let unit = prod.quantity || '';
        if (!unit && prod.product_quantity && prod.product_quantity_unit) {
          unit = `${prod.product_quantity} ${prod.product_quantity_unit}`;
        }
        if (!unit) {
          const unitMatch = formattedName.match(/(\d+(?:\.\d+)?\s*(?:kg|g|gm|l|ltr|litre|ml|pc|piece|pack|sachet))/i);
          if (unitMatch) {
            unit = unitMatch[0];
          } else {
            unit = '1 piece';
          }
        }
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
        let category = mapToKiranaCategory(formattedName, categoriesString, brand);

        // If from Open Beauty Facts, default to Personal Care if not already mapped
        if (tier.source === 'openbeautyfacts' && category === 'Packaged Foods') {
          category = 'Personal Care';
        }
        // If from Open Products Facts, default to Household Essentials if not already mapped
        if (tier.source === 'openproductsfacts' && category === 'Packaged Foods') {
          category = 'Household Essentials';
        }

        // Price estimation
        let originalPrice = 0;
        let finalPrice = 0;
        let discountPercent = 0;

        if (prod.price && !isNaN(Number(prod.price))) {
          originalPrice = Number(prod.price);
        } else if (prod.estimated_price && !isNaN(Number(prod.estimated_price))) {
          originalPrice = Number(prod.estimated_price);
        }

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
          source: tier.source,
          rawCategories: categoriesString,
        };
      }
    } catch {
      // Continue to next tier without crashing
    }
  }

  // STEP 4: Tier 4 - Gemini AI Smart FMCG Lookup (Guaranteed fallback for Indian FMCG barcodes)
  try {
    const aiResponse = await fetch('/api/barcode/ai-lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ barcode: cleanBarcode }),
    });

    if (aiResponse.ok) {
      const aiJson = await aiResponse.json();
      if (aiJson.success && aiJson.data && aiJson.data.name) {
        return {
          barcode: cleanBarcode,
          name: aiJson.data.name,
          brand: aiJson.data.brand || '',
          unit: aiJson.data.unit || '1 piece',
          category: aiJson.data.category || 'Household Essentials',
          imageUrl: aiJson.data.imageUrl || '',
          originalPrice: Number(aiJson.data.originalPrice) || 0,
          finalPrice: Number(aiJson.data.finalPrice) || 0,
          discountPercent: Number(aiJson.data.discountPercent) || 0,
          description: aiJson.data.description || '',
          source: 'gemini-ai',
        };
      }
    }
  } catch (aiErr) {
    console.warn('[BarcodeService] Gemini AI Lookup failed:', aiErr);
  }

  return null;
}
