/**
 * Universal Bilingual Grocery Search Engine
 * Supports seamless Hindi (Devanagari), Romanized Hinglish, and English matching
 * across all products in inventory dynamically.
 */

import { Product } from '../types';

/**
 * Normalized token mapping dictionary.
 * Each entry is an array of synonymous terms across:
 * English, Hindi (Devanagari), and Romanized Hinglish variations.
 */
export const GROCERY_SYNONYM_GROUPS: string[][] = [
  // Grains / Atta / Flours
  ['wheat', 'gehu', 'gehun', 'गेहूं', 'गेहू', 'आटा', 'atta', 'flour', 'chakki atta', 'chakki'],
  ['maida', 'refined flour', 'मैदा', 'all purpose flour'],
  ['sooji', 'suji', 'rava', 'सूजी', 'रवा', 'semolina'],
  ['besan', 'gram flour', 'बेसन', 'chana flour'],
  ['rice', 'chawal', 'chaaval', 'चावल', 'basmati', 'बासमती', 'arwa', 'sela', 'poha', 'पोहा', 'chiwda', 'chuda', 'flaked rice', 'puffed rice', 'murmura', 'laiya', 'लाई', 'मुरमुरा'],
  ['dalia', 'daliya', 'दलिया', 'broken wheat'],
  ['oats', 'ओट्स', 'quaker oats', 'rolled oats'],

  // Sweeteners & Sugar
  ['sugar', 'cheeni', 'chini', 'चीनी', 'shakar', 'shakkar', 'शक्कर', 'boora', 'bura', 'बूरा', 'mishri', 'मिश्री'],
  ['jaggery', 'gud', 'gur', 'गुड़', 'गुड'],
  ['honey', 'madhu', 'shehad', 'शहद'],

  // Pulses & Dals
  ['dal', 'daal', 'dahl', 'दाल', 'pulse', 'pulses', 'lentil', 'lentils'],
  ['toor', 'arhar', 'toor dal', 'arhar dal', 'तुअर', 'अरहर', 'तुवर'],
  ['moong', 'mung', 'moong dal', 'मूंग', 'मूंग दाल', 'dhuli moong', 'chhilka moong'],
  ['chana', 'chana dal', 'चना', 'चना दाल', 'kala chana', 'black chana', 'chickpeas', 'roasted chana', 'bhuna chana'],
  ['urad', 'urad dal', 'उडद', 'उड़द', 'उरद', 'dhuli urad', 'urad kali'],
  ['masoor', 'masur', 'masoor dal', 'मसूर', 'लाल मसूर', 'malka'],
  ['rajma', 'rajmah', 'राजमा', 'kidney beans'],
  ['chhole', 'chhole chana', 'kabuli', 'kabuli chana', 'काबुली चना', 'छोले', 'safed chana'],
  ['matar', 'safed matar', 'white peas', 'मटर', 'hari matar', 'green peas'],
  ['lobia', 'lopia', 'लोबिया', 'black eyed peas', 'chawli'],
  ['soyabean', 'soya chunks', 'soya', 'सोयाबीन', 'सोया बड़ी', 'nutrela', 'mealmaker'],

  // Oils & Ghee
  ['oil', 'tel', 'तेल', 'edible oil', 'cooking oil'],
  ['mustard', 'mustard oil', 'sarso', 'sarson', 'सरसों', 'सरसो तेल', 'kachi ghani', 'kachhi ghani'],
  ['refined', 'refined oil', 'रिफाइंड', 'रिफाइंड तेल', 'vegetable oil'],
  ['soyabean oil', 'soya oil', 'सोया तेल', 'fortune soya'],
  ['sunflower', 'sunflower oil', 'सूरजमुखी तेल'],
  ['groundnut', 'groundnut oil', 'moongfali tel', 'मूंगफली तेल', 'peanut oil'],
  ['vanaspati', 'dalda', 'वनस्पति', 'डालडा'],
  ['ghee', 'desi ghee', 'cow ghee', 'घी', 'देसी घी', 'pure ghee', 'amul ghee'],

  // Spices & Condiments
  ['masala', 'masale', 'मसाले', 'मसाला', 'spices', 'spice'],
  ['turmeric', 'haldi', 'हल्दी'],
  ['chilli', 'chili', 'mirch', 'mirchi', 'मिर्च', 'लाल मिर्च', 'lal mirch', 'red chilli', 'hari mirch', 'green chilli', 'kashmiri mirch', 'degi mirch'],
  ['coriander', 'dhaniya', 'dhania', 'धनिया', 'dhaniya powder', 'coriander powder'],
  ['cumin', 'jeera', 'jira', 'जीरा', 'jeera powder'],
  ['mustard seeds', 'sarson beej', 'rai', 'raai', 'राई', 'सरसों दाना'],
  ['fennel', 'saunf', 'sonf', 'सौंफ'],
  ['fenugreek', 'methi', 'मेथी', 'methi dana', 'kasuri methi', 'कस्तूरी मेथी', 'कस्तूरी'],
  ['carom', 'carom seeds', 'ajwain', 'ajvain', 'अजवाइन'],
  ['black pepper', 'kali mirch', 'काली मिर्च', 'peppercorn'],
  ['cardamom', 'elaichi', 'elaychi', 'इलायची', 'hari elaichi', 'badi elaichi', 'black cardamom'],
  ['clove', 'cloves', 'laung', 'lavang', 'लौंग'],
  ['bay leaf', 'tejpatta', 'tej patta', 'तेजपत्ता'],
  ['cinnamon', 'dalchini', 'दालचीनी'],
  ['nutmeg', 'jaiphal', 'jayphal', 'जायफल'],
  ['mace', 'javitri', 'जावित्री'],
  ['garam masala', 'गरम मसाला', 'sabji masala', 'kitchen king', 'meat masala', 'chicken masala', 'paneer masala', 'chhole masala', 'chaat masala', 'chat masala'],
  ['hing', 'heeng', 'asafoetida', 'हींग'],
  ['amchur', 'aamchur', 'mango powder', 'आमचूर'],
  ['dry ginger', 'sonth', 'saunth', 'सोंठ', 'adrak', 'ginger', 'अदरक'],
  ['garlic', 'lahsun', 'lahsan', 'लहसुन'],
  ['onion', 'pyaz', 'pyaaz', 'प्याज़', 'प्याज'],
  ['potato', 'aloo', 'alu', 'आलू'],
  ['tomato', 'tamatar', 'टमाटर'],

  // Salt
  ['salt', 'namak', 'नमक', 'tata salt'],
  ['sendha namak', 'rock salt', 'सेंधा नमक', 'vrat namak'],
  ['black salt', 'kala namak', 'काला नमक'],

  // Tea, Coffee & Beverages
  ['tea', 'chai', 'chay', 'चाय', 'tea leaves', 'chai patti', 'चाय पत्ती', 'tata tea', 'taj mahal', 'red label', 'wagh bakri'],
  ['green tea', 'ग्रीन टी', 'tulsi tea'],
  ['coffee', 'kafi', 'कॉफ़ी', 'कॉफी', 'nescafe', 'bru'],
  ['bournvita', 'horlicks', 'complan', 'boost', 'health drink', 'malt'],
  ['glucose', 'glucon-d', 'glucond', 'ग्लूकोज'],
  ['syrup', 'squash', 'roohafza', 'rooh afza', 'sharbat', 'शरबत'],
  ['cold drink', 'soft drink', 'soda', 'pepsi', 'coke', 'thums up', 'sprite', 'fanta', 'maaza', 'frooti'],

  // Dairy & Bakery
  ['milk', 'doodh', 'दूध', 'amul doodh', 'toned milk', 'cow milk'],
  ['curd', 'dahi', 'दही', 'yogurt'],
  ['paneer', 'cottage cheese', 'पनीर'],
  ['butter', 'makkhan', 'makhan', 'मक्खन', 'amul butter'],
  ['cheese', 'चीज', 'चीज़'],
  ['bread', 'ब्रेड', 'pav', 'पाव', 'bun', 'बन'],
  ['toast', 'rusk', 'टोस्ट', 'रस', 'रस्क', 'suji rusk', 'elaichi rusk'],

  // Dry Fruits & Nuts
  ['dry fruits', 'dryfruit', 'मेवे', 'मेवा'],
  ['cashew', 'kaju', 'काजू'],
  ['almond', 'badam', 'बादाम'],
  ['raisin', 'raisins', 'kishmish', 'kismis', 'किशमिश'],
  ['pistachio', 'pista', 'पिस्ता'],
  ['walnut', 'akhrot', 'अखरोट'],
  ['fox nut', 'fox nuts', 'makhana', 'makhaana', 'मखाना'],
  ['fig', 'anjeer', 'अंजीर'],
  ['dates', 'khajur', 'khajoor', 'खजूर'],
  ['coconut', 'nariyal', 'नारियल', 'gari', 'gola', 'desiccated coconut'],

  // Snacks, Biscuits & Namkeen
  ['biscuit', 'biscuits', 'biskut', 'बिस्कुट', 'cookie', 'cookies', 'parle-g', 'parleg', 'good day', 'monaco', 'krackjack', 'mariegold', 'marie', 'bourbon', 'oreo', '50-50'],
  ['namkeen', 'नमकीन', 'bhujia', 'bhuja', 'भुजिया', 'sev', 'सेव', 'aloo bhujia', 'bikaneri bhujia', 'mixture', 'chivda', 'murukku'],
  ['chips', 'वेफर्स', 'wafers', 'lays', 'kurkure', 'crax', 'tedhe medhe', 'puff'],
  ['papad', 'पापड़', 'papadum', 'moong papad', 'urad papad', 'chana papad', 'appalam'],
  ['noodles', 'maggi', 'मैगी', 'yippee', 'chowmein', 'pasta', 'पास्ता', 'macaroni', 'vermicelli', 'sewai', 'sevai', 'सेवई'],
  ['sauce', 'ketchup', 'सॉस', 'chilli sauce', 'soya sauce', 'vinegar', 'sirka'],
  ['pickle', 'achaar', 'achar', 'अचार', 'aam achar', 'nimbu achar', 'mirch achar'],
  ['jam', 'kissan jam', 'fruit jam', 'जैम'],

  // Household & Cleaning Essentials
  ['soap', 'sabun', 'साबुन', 'bathing soap', 'lux', 'dettol', 'lifebuoy', 'dove', 'pears'],
  ['detergent', 'surf', 'washing powder', 'सर्फ़', 'सर्फ', 'detergent powder', 'ghadi', 'wheel', 'tide', 'surf excel', 'aerial'],
  ['dishwash', 'bartan bar', 'vim', 'vim bar', 'dishwash liquid', 'exo', ' बर्तन साबुन'],
  ['cleaner', 'floor cleaner', 'lizol', 'phenyl', 'phenyle', 'फिनाइल'],
  ['toilet cleaner', 'harpic', 'हारपिक'],
  ['mosquito', 'machhar', 'मच्छर', 'all out', 'good knight', 'coil', 'fast card', 'mortein'],
  ['incense', 'agarbatti', 'dhoop', 'अगरबत्ती', 'धूप', 'puja', 'pooja', 'कपूर', 'kapoor', 'camphor'],
  ['matchbox', 'matches', 'maachis', 'machis', 'माचिस'],

  // Personal Care & Hygiene
  ['toothpaste', 'paste', 'tooth paste', 'टूथपेस्ट', 'colgate', 'pepsodent', 'closeup', 'sensodyne', 'dabur red', 'dant kanti'],
  ['toothbrush', 'brush', 'टूथब्रश'],
  ['shampoo', 'शैम्पू', 'hair wash', 'clinic plus', 'head & shoulders', 'sunsilk', 'dove shampoo'],
  ['hair oil', 'tel', 'sar tel', 'baal tel', 'बाल तेल', 'bajaj almond', 'parachute', 'coconut oil', 'nariyal tel', 'dabur amla', 'navratna', 'thanda tel'],
  ['cream', 'lotion', 'fair & lovely', 'glow & lovely', 'vaseline', 'cold cream', 'boroplus', 'talcum powder', 'powder', 'ponds', 'navratna powder', 'derma cool'],
];

/**
 * Common brand keywords that should instantly match catalog products
 */
export const POPULAR_BRANDS: string[] = [
  'fortune', 'tata', 'aashirvaad', 'parle', 'britannia', 'amul', 'mdh',
  'everest', 'catch', 'haldiram', 'bikaji', 'patanjali', 'dabur', 'itc',
  'sunfeast', 'surf excel', 'tide', 'ghadi', 'vim', 'dettol', 'lifebuoy',
  'lux', 'dove', 'colgate', 'clinic plus', 'parachute', 'bajaj', 'navratna',
  'maggi', 'nestle', 'bru', 'red label', 'taj mahal', 'lizol', 'harpic',
  'saffola', 'gemini', 'dhara', 'mithas', 'madhur'
];

/**
 * Builds an inverted fast-lookup index of normalized terms to expanded synonyms
 */
const INVERTED_SYNONYM_INDEX: Map<string, Set<string>> = new Map();

// Initialize the index
GROCERY_SYNONYM_GROUPS.forEach((group) => {
  const normalizedGroup = group.map((term) => normalizeSearchString(term));
  normalizedGroup.forEach((term) => {
    if (!term) return;
    if (!INVERTED_SYNONYM_INDEX.has(term)) {
      INVERTED_SYNONYM_INDEX.set(term, new Set());
    }
    const currentSet = INVERTED_SYNONYM_INDEX.get(term)!;
    normalizedGroup.forEach((syn) => currentSet.add(syn));
  });
});

/**
 * Normalizes text: trims, lowercases, removes diacritics / special characters
 */
export function normalizeSearchString(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Expand a user search query into its synonym terms (Hindi, Hinglish, English)
 */
export function expandSearchQuery(query: string): string[] {
  const clean = normalizeSearchString(query);
  if (!clean) return [];

  const expansionSet = new Set<string>();
  expansionSet.add(clean);

  // 1. Direct query lookup
  if (INVERTED_SYNONYM_INDEX.has(clean)) {
    INVERTED_SYNONYM_INDEX.get(clean)!.forEach((t) => expansionSet.add(t));
  }

  // 2. Word by word decomposition for multi-word queries (e.g. "sarso tel", "kala namak", "chana dal")
  const tokens = clean.split(' ').filter(Boolean);
  for (const token of tokens) {
    if (token.length >= 2) {
      expansionSet.add(token);
      if (INVERTED_SYNONYM_INDEX.has(token)) {
        INVERTED_SYNONYM_INDEX.get(token)!.forEach((t) => expansionSet.add(t));
      } else {
        // Partial key search in dictionary (e.g. "cheen" matching "cheeni", "nam" matching "namak")
        for (const [key, synSet] of INVERTED_SYNONYM_INDEX.entries()) {
          if (key.startsWith(token) || (token.length >= 3 && key.includes(token))) {
            synSet.forEach((t) => expansionSet.add(t));
          }
        }
      }
    }
  }

  return Array.from(expansionSet);
}

/**
 * Evaluates whether a product matches a search query using universal bilingual logic.
 * Checks English title, Hindi title, category, description, and brand metadata.
 */
export function matchesUniversalSearch(product: Product, query: string): boolean {
  const normalizedQuery = normalizeSearchString(query);
  if (!normalizedQuery) return true;

  // Build a consolidated product searchable string
  const prodName = normalizeSearchString(product.name);
  const prodHindi = normalizeSearchString(product.hindiName);
  const prodCat = normalizeSearchString(product.category);
  const prodDesc = normalizeSearchString(product.description);
  const prodUnit = normalizeSearchString(product.unit);

  const productCorpus = `${prodName} ${prodHindi} ${prodCat} ${prodDesc} ${prodUnit}`;

  // 1. Fast Direct Substring Match (handles "oil", "fortune", "1kg", "sugar", "चीनी", etc.)
  if (productCorpus.includes(normalizedQuery)) {
    return true;
  }

  // 2. Tokenized Multi-word match: If all words in query appear in corpus
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const allTokensDirectMatch = queryTokens.every((token) => productCorpus.includes(token));
  if (allTokensDirectMatch) {
    return true;
  }

  // 3. Synonym Matrix Expansion Match
  const expandedSynonyms = expandSearchQuery(normalizedQuery);
  for (const syn of expandedSynonyms) {
    if (syn.length >= 2 && productCorpus.includes(syn)) {
      return true;
    }
  }

  // 4. Word-by-word tokenized synonym check:
  // e.g., query "kala namak" -> ["kala", "namak"] matches product containing "black salt" or "सेंधा नमक"
  if (queryTokens.length > 1) {
    let matchedTokenCount = 0;
    for (const qTok of queryTokens) {
      const tokSyns = expandSearchQuery(qTok);
      const tokenMatched = tokSyns.some((s) => s.length >= 2 && productCorpus.includes(s));
      if (tokenMatched) {
        matchedTokenCount++;
      }
    }
    if (matchedTokenCount >= queryTokens.length) {
      return true;
    }
  }

  return false;
}

/**
 * Filter an entire product inventory with the universal bilingual search engine
 * and optionally category constraint.
 */
export function filterProductsUniversally(
  products: Product[],
  searchQuery: string,
  selectedCategory: string = 'All'
): Product[] {
  const trimmed = searchQuery.trim();
  const hasCategoryFilter = selectedCategory && selectedCategory !== 'All';

  if (!trimmed && !hasCategoryFilter) {
    return products;
  }

  return products.filter((product) => {
    // 1. Category check
    if (hasCategoryFilter && product.category !== selectedCategory) {
      return false;
    }

    // 2. If no query, category matched
    if (!trimmed) {
      return true;
    }

    // 3. Universal bilingual text match
    return matchesUniversalSearch(product, trimmed);
  });
}
