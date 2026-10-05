/**
 * Voice Inventory Speech Parser for Kirana Store Operations
 * Parses spoken Hindi, Hinglish, and English inventory updates:
 * Example: "च्यवनप्राश 1 किलो एमआरपी 590 सेलिंग प्राइस 480"
 * Output: { name: "च्यवनप्राश", unit: "1 kg", mrp: 590, sellingPrice: 480, category: "Health & Wellness", emoji: "🍯" }
 */

export interface ParsedVoiceItem {
  rawTranscript: string;
  name: string;
  hindiName?: string;
  unit: string;
  mrp: number;
  sellingPrice: number;
  discountPercent: number;
  category: string;
  suggestedEmoji: string;
  confidence: number;
}

// Common grocery emojis for quick visual tagging
export const GROCERY_EMOJI_PALETTE = [
  { emoji: '🍯', label: 'Honey / Health' },
  { emoji: '🌿', label: 'Herbal / Ayurvedic' },
  { emoji: '🌾', label: 'Atta / Grains / Dal' },
  { emoji: '🍚', label: 'Rice / Chawal' },
  { emoji: '🫒', label: 'Cooking Oil / Tel' },
  { emoji: '🧈', label: 'Ghee / Butter' },
  { emoji: '🥛', label: 'Milk / Dairy' },
  { emoji: '🍞', label: 'Bread / Bakery' },
  { emoji: '🧂', label: 'Spices / Salt' },
  { emoji: '🍪', label: 'Biscuits / Cookies' },
  { emoji: '🍫', label: 'Chocolates' },
  { emoji: '🍜', label: 'Maggi / Noodles' },
  { emoji: '☕', label: 'Tea / Coffee' },
  { emoji: '🧃', label: 'Juice / Drinks' },
  { emoji: '🧼', label: 'Soap / Detergent' },
  { emoji: '🧴', label: 'Shampoo / Cream' },
  { emoji: '🪥', label: 'Toothpaste / Oral' },
  { emoji: '🥫', label: 'Canned Food / Jars' },
  { emoji: '🥜', label: 'Dry Fruits / Nuts' },
  { emoji: '🕯️', label: 'Puja / Agarbatti' },
  { emoji: '📓', label: 'Notebook / Register' },
  { emoji: '🖊️', label: 'Pen / Pencil' },
  { emoji: '🎨', label: 'Art / Craft / Glue' },
  { emoji: '📎', label: 'Office Stationery / Tape' },
  { emoji: '📦', label: 'General Grocery' },
];

/**
 * Converts Devanagari numerals to standard Arabic digits
 */
export function normalizeHindiDigits(str: string): string {
  const devanagariDigits: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  };
  return str.replace(/[०-९]/g, (ch) => devanagariDigits[ch] || ch);
}

/**
 * Converts common Hindi word numbers to digits
 */
export function normalizeHindiWordNumbers(str: string): string {
  return str
    .replace(/\bएक\b/gi, '1')
    .replace(/\bदो\b/gi, '2')
    .replace(/\bतीन\b/gi, '3')
    .replace(/\bचार\b/gi, '4')
    .replace(/\bपाँच\b|\bपांच\b/gi, '5')
    .replace(/\bछह\b|\bछे\b/gi, '6')
    .replace(/\bसात\b/gi, '7')
    .replace(/\bआठ\b/gi, '8')
    .replace(/\bनौ\b/gi, '9')
    .replace(/\bदस\b/gi, '10')
    .replace(/\bबीस\b/gi, '20')
    .replace(/\bपचास\b/gi, '50')
    .replace(/\bसौ\b/gi, '100')
    .replace(/\bडेढ़\b/gi, '1.5')
    .replace(/\bढाई\b/gi, '2.5')
    .replace(/\bआधा\b/gi, '0.5');
}

/**
 * Detects unit and standardizes to friendly format ('1 kg', '500 g', '1 Litre', '1 pc')
 */
export function extractUnit(text: string): { unit: string; matchedText: string } {
  // Common weight patterns:
  // e.g. 1 किलो, 500 ग्राम, 1 लीटर, 250gm, 1kg, 2L, 4 पीस, 1 पैकेट
  const patterns: Array<{ regex: RegExp; formatter: (num: string) => string }> = [
    {
      regex: /(\d+(?:\.\d+)?)\s*(?:किलो|किग्रा|किलोग्राम|kilo|kilogram|kg|केजी)/i,
      formatter: (num) => `${num} kg`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*(?:ग्राम|gm|gms|g|gram|grams)/i,
      formatter: (num) => `${num} g`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*(?:लीटर|लिटर|liter|litre|l|ltr)/i,
      formatter: (num) => `${num} Litre`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*(?:मिली|एमएल|ml|milliliter)/i,
      formatter: (num) => `${num} ml`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*(?:पीस|पीसी|piece|pieces|pc|pcs|नग)/i,
      formatter: (num) => `${num} pc`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*(?:पैकेट|पैकेट|pkt|packet|packets)/i,
      formatter: (num) => `${num} pkt`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*(?:डिब्बा|box|boxes|केन|can)/i,
      formatter: (num) => `${num} box`,
    },
  ];

  for (const { regex, formatter } of patterns) {
    const match = text.match(regex);
    if (match) {
      return {
        unit: formatter(match[1]),
        matchedText: match[0],
      };
    }
  }

  return { unit: '1 pc', matchedText: '' };
}

/**
 * Extracts MRP and Selling Price from transcript
 */
export function extractPrices(text: string): { mrp: number; sellingPrice: number; strippedText: string } {
  let cleaned = text;
  let mrp = 0;
  let sellingPrice = 0;

  // 1. Explicit MRP Patterns
  // "एमआरपी 590", "MRP: 590", "प्रिंट रेट 590", "प्रिंट 590"
  const mrpRegex = /(?:एमआरपी|एम\s*आर\s*पी|mrp|m\.r\.p|प्रिंट\s*रेट|प्रिंट|print\s*rate)[:\s]*([0-9]+(?:\.[0-9]+)?)/i;
  const mrpMatch = cleaned.match(mrpRegex);
  if (mrpMatch) {
    mrp = Math.round(parseFloat(mrpMatch[1]));
    cleaned = cleaned.replace(mrpMatch[0], ' ');
  }

  // 2. Explicit Selling Price Patterns
  // "सेलिंग प्राइस 480", "सेलिंग 480", "रेट 480", "बेचना है 480", "में देना है 480", "दाम 480"
  const spRegex = /(?:सेलिंग\s*प्राइस|सेलिंग|selling\s*price|selling|रेट|rate|बेचना\s*है|में\s*देना\s*है|देना\s*है|दाम|daam|में\s*बिकेगा|बिकेगा)[:\s]*([0-9]+(?:\.[0-9]+)?)/i;
  const spMatch = cleaned.match(spRegex);
  if (spMatch) {
    sellingPrice = Math.round(parseFloat(spMatch[1]));
    cleaned = cleaned.replace(spMatch[0], ' ');
  }

  // 3. Fallback: If only one price was found or two bare numbers remain (e.g. "590 का 480" or "590 480")
  if (mrp === 0 || sellingPrice === 0) {
    const remainingNumbers = [...cleaned.matchAll(/\b([0-9]{2,5})\b/g)].map((m) => parseInt(m[1], 10));
    if (remainingNumbers.length >= 2) {
      if (mrp === 0 && sellingPrice === 0) {
        // Higher is usually MRP, lower is Selling Price
        const [n1, n2] = remainingNumbers;
        mrp = Math.max(n1, n2);
        sellingPrice = Math.min(n1, n2);
      } else if (mrp === 0) {
        mrp = Math.max(...remainingNumbers);
      } else if (sellingPrice === 0) {
        sellingPrice = Math.min(...remainingNumbers);
      }
    } else if (remainingNumbers.length === 1) {
      const num = remainingNumbers[0];
      if (mrp === 0 && sellingPrice === 0) {
        mrp = num;
        sellingPrice = Math.round(num * 0.9); // 10% auto discount default
      } else if (mrp === 0) {
        mrp = Math.round(sellingPrice * 1.15);
      } else if (sellingPrice === 0) {
        sellingPrice = Math.min(mrp, num);
      }
    }
  }

  // Ensure logical sanity: Selling price should not exceed MRP
  if (sellingPrice > mrp && mrp > 0) {
    // Swap if spoken in reverse order
    const temp = mrp;
    mrp = sellingPrice;
    sellingPrice = temp;
  }

  if (mrp > 0 && sellingPrice === 0) {
    sellingPrice = Math.round(mrp * 0.9);
  }

  return { mrp, sellingPrice, strippedText: cleaned };
}

/**
 * Predicts category & emoji based on product keywords
 */
export function detectCategoryAndEmoji(productName: string): { category: string; emoji: string } {
  const lower = productName.toLowerCase();

  // Stationery: Copies & Registers (रजिस्टर / कॉपियां)
  if (/रजिस्टर|register|कॉपी|copy|कॉपियां|notebook|classmate|नोटबुक|रफ|rough|डायरी|diary|प्रैक्टिकल|practical/i.test(lower)) {
    return { category: 'Copies & Registers', emoji: '📓' };
  }

  // Stationery: Pens, Pencils & Geometry (पेन / पेंसिल / बॉक्स)
  if (/पेन|pen|पेंसिल|pencil|बॉल\s*पेन|जेल\s*पेन|ball\s*pen|gel\s*pen|reynolds|hauser|apsara|अप्सरा|natraj|नटराज|रबर|इरेज़र|eraser|कटर|शार्पनर|sharpener|ज्योमेट्री|geometry|कम्पास|compass|scale|स्केल/i.test(lower)) {
    return { category: 'Pens, Pencils & Geometry', emoji: '🖊️' };
  }

  // Stationery: Art, Craft & Fevicol (गोंद / चार्ट / क्राफ्ट)
  if (/फेविकोल|fevicol|गोंद|glue|क्राफ्ट|craft|चार्ट|chart|क्रेयॉन|crayon|ड्राइंग|कला|fevikwik|फेवीक्विक|sketch|स्केच|कलर|color\s*paper|origami|ओरिगेमी/i.test(lower)) {
    return { category: 'Art, Craft & Fevicol', emoji: '🎨' };
  }

  // Stationery: Office & Daily Stationery (टेप / कैंची / स्टेपलर / लिफाफे)
  if (/टेप|tape|सेलो|cello|कैंची|scissor|स्टेपलर|stapler|पिन|pin|लिफाफा|लिफाफे|lifafa|envelope|a4|rim|रिम|copier|कागज|paper|sticky\s*notes|स्टिकर|नोट्स|फाइल|folder/i.test(lower)) {
    return { category: 'Office & Daily Stationery', emoji: '📎' };
  }

  // Health & Ayurvedic
  if (/च्यवनप्राश|chyawanprash|डाबर|dabur|हनी|शहद|honey|गिलोय|giloy|त्रिफला|triphala|ashwagandha|अश्वगंधा|zandu|झंडू|baidyanath|बैद्यनाथ|ग्लूकोज|glucose/i.test(lower)) {
    return { category: 'Health & Wellness', emoji: '🍯' };
  }

  // Oil & Ghee
  if (/तेल|tel|oil|घी|ghee|रिफाइंड|refined|सरसों|sarso|mustard|फॉर्च्यून|fortune|सफोला|saffola|धारा|dhara|soya|सोयाबीन|कनोला/i.test(lower)) {
    return { category: 'Oil & Ghee', emoji: lower.includes('घी') || lower.includes('ghee') ? '🧈' : '🫒' };
  }

  // Atta & Flours
  if (/आटा|atta|flour|मैदा|maida|सूजी|sooji|rava|रवा|बेसन|besan|आशीर्वाद|aashirvaad|chakki|चक्की/i.test(lower)) {
    return { category: 'Atta & Flours', emoji: '🌾' };
  }

  // Rice & Dal
  if (/दाल|dal|चावल|chawal|rice|अरहर|toor|tuvar|मूंग|moong|चना|chana|राजमा|rajma|छोले|chole|उड़द|urad|बासमती|basmati|इंडिया\s*गेट|india\s*gate/i.test(lower)) {
    return { category: 'Rice & Dal', emoji: '🍚' };
  }

  // Spices & Salt
  if (/नमक|namak|salt|हल्दी|haldi|turmeric|मिर्च|mirch|chilli|धनिया|dhaniya|coriander|जीरा|jeera|cumin|हींग|hing|मसाला|masala|गरम\s*मसाला|टाटा\s*नमक/i.test(lower)) {
    return { category: 'Spices & Salt', emoji: '🧂' };
  }

  // Snacks & Biscuits
  if (/बिस्कुट|biscuit|बिस्किट|नमकीन|namkeen|भुजिया|bhujia|मैगी|maggi|नूडल्स|noodles|चिप्स|chips|कुरकुरे|kurkure|पास्ता|pasta|रस्क|toast|चॉकलेट|chocolate|parle|पारले|ब्रिटानिया|britannia/i.test(lower)) {
    return { category: 'Snacks & Biscuits', emoji: lower.includes('मैगी') || lower.includes('maggi') ? '🍜' : '🍪' };
  }

  // Dairy & Bakery
  if (/दूध|milk|अमुल|amul|दही|dahi|curd|पनीर|paneer|मक्खन|butter|ब्रेड|bread|पाव|bun|मलाई|cream/i.test(lower)) {
    return { category: 'Dairy & Bakery', emoji: lower.includes('ब्रेड') ? '🍞' : '🥛' };
  }

  // Tea & Coffee
  if (/चाय|chai|tea|कॉफ़ी|coffee|नेस्कैफे|nescafe|टाटा\s*टी|tata\s*tea|हॉर्लिक्स|horlicks|बॉर्नविटा|bournvita|कोल्ड\s*ड्रिंक|पेप्सी|pepsi|माझा|maaza|फ्रूटी|frooti/i.test(lower)) {
    return { category: 'Tea, Coffee & Drinks', emoji: '☕' };
  }

  // Cleaning & Household
  if (/सर्फ|surf|डिटर्जेंट|detergent|विम|vim|बार|bar|हारपिक|harpic|फिनाइल|phenyl|झाड़ू|pocha|एरियल|ariel|टाइड|tide|wheel|rin/i.test(lower)) {
    return { category: 'Cleaning & Household', emoji: '🧼' };
  }

  // Personal Care
  if (/साबुन|soap|शैम्पू|shampoo|टूथपेस्ट|toothpaste|कोलगेट|colgate|क्लोज\s*अप|क्रीम|cream|फेस\s*वॉश|डिटॉल|dettol|लाइफबॉय|lifebuoy|dove|ponds/i.test(lower)) {
    return { category: 'Personal Care', emoji: '🧴' };
  }

  // Puja Needs
  if (/अगरबत्ती|agarbatti|धूप|dhoop|कपूर|kapoor|हवन|रोली|मौली|दीया|माचिस|matchbox/i.test(lower)) {
    return { category: 'Puja Needs', emoji: '🕯️' };
  }

  // Dry Fruits
  if (/काजू|kaju|बादाम|badam|किशमिश|kishmish|अखरोट|walnut|पिस्ता|pista|मखाना|makhana|dates/i.test(lower)) {
    return { category: 'Dry Fruits & Nuts', emoji: '🥜' };
  }

  return { category: 'General Grocery', emoji: '📦' };
}

/**
 * Primary Speech Parser
 * Parses natural Hindi/English phrases into structured inventory product
 */
export function parseVoiceInventorySpeech(rawTranscript: string): ParsedVoiceItem {
  if (!rawTranscript || !rawTranscript.trim()) {
    return {
      rawTranscript: '',
      name: '',
      unit: '1 pc',
      mrp: 0,
      sellingPrice: 0,
      discountPercent: 0,
      category: 'General Grocery',
      suggestedEmoji: '📦',
      confidence: 0,
    };
  }

  // 1. Normalize numbers and Devanagari numerals
  let processed = normalizeHindiDigits(rawTranscript.trim());
  processed = normalizeHindiWordNumbers(processed);

  // 2. Extract unit & weight
  const { unit, matchedText: unitMatched } = extractUnit(processed);
  let withoutUnit = processed;
  if (unitMatched) {
    withoutUnit = withoutUnit.replace(unitMatched, ' ');
  }

  // 3. Extract MRP and Selling Price
  const { mrp, sellingPrice, strippedText } = extractPrices(withoutUnit);

  // 4. Extract Product Name
  // Remove filler keywords, punctuation, and extra spaces
  let name = strippedText
    .replace(/[₹$,:;!?।]/g, ' ')
    .replace(/\b(?:रुपये|रुपया|रु|rs|rupees|का|की|के|है|में|को|वाला|वाली|पैकेट|packet|piece)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If name is too short or empty, provide a clean fallback
  if (!name || name.length < 2) {
    name = rawTranscript.split(/\s+/)[0] || 'नया किराना सामान (New Product)';
  } else {
    // Capitalize first letter of each word for clean presentation
    name = name
      .split(' ')
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');
  }

  // 5. Detect Category and Suggested Emoji
  const { category, emoji } = detectCategoryAndEmoji(name);

  // 6. Compute Discount Percentage
  let discountPercent = 0;
  if (mrp > 0 && sellingPrice > 0 && mrp > sellingPrice) {
    discountPercent = Math.round(((mrp - sellingPrice) / mrp) * 100);
  }

  return {
    rawTranscript,
    name,
    hindiName: /[\u0900-\u097F]/.test(name) ? name : undefined,
    unit,
    mrp: mrp || 100,
    sellingPrice: sellingPrice || 90,
    discountPercent,
    category,
    suggestedEmoji: emoji,
    confidence: mrp > 0 && sellingPrice > 0 ? 0.95 : 0.7,
  };
}

/**
 * Creates a clean SVG data URL representing a chosen emoji with rounded background
 */
export function createEmojiSvgDataUrl(emoji: string, bgColor: string = '#FEF3C7'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="22" fill="${bgColor}" />
  <text x="50" y="65" font-size="52" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji">${emoji}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
