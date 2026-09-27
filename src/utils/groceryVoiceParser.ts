/**
 * Smart Hindi & Hinglish Grocery Item Voice Parser
 * Converts continuous voice dictation streams into clean, structured grocery items.
 */

export interface ParsedGroceryItem {
  id: string;
  raw: string;
  quantity?: string;
  unit?: string;
  itemName: string;
  formatted: string;
}

// Hindi number mappings
const HINDI_NUMBER_WORDS: Record<string, string> = {
  'ek': '1',
  'aik': '1',
  'one': '1',
  'do': '2',
  'two': '2',
  'teen': '3',
  'tin': '3',
  'three': '3',
  'char': '4',
  'chaar': '4',
  'four': '4',
  'panch': '5',
  'paanch': '5',
  'five': '5',
  'chhe': '6',
  'che': '6',
  'six': '6',
  'saat': '7',
  'sat': '7',
  'seven': '7',
  'aath': '8',
  'ath': '8',
  'eight': '8',
  'nau': '9',
  'no': '9',
  'nine': '9',
  'das': '10',
  'ten': '10',
  'gyarah': '11',
  'barah': '12',
  'aadha': '½',
  'adha': '½',
  'half': '½',
  'dedh': '1.5',
  'dhai': '2.5',
};

// Grocery unit keywords
const UNIT_KEYWORDS = [
  'packet',
  'packets',
  'pkt',
  'pkts',
  'pouch',
  'pouches',
  'kilo',
  'kg',
  'kgs',
  'kilogram',
  'kilograms',
  'gram',
  'grams',
  'gm',
  'gms',
  'litre',
  'litres',
  'liter',
  'liters',
  'ltr',
  'ltrs',
  'l',
  'ml',
  'bottle',
  'bottles',
  'botal',
  'dabba',
  'box',
  'boxes',
  'piece',
  'pieces',
  'pc',
  'pcs',
  'nag',
  'bora',
  'bori',
  'bag',
  'bags',
];

/**
 * Split continuous speech into individual item phrases based on:
 * - Natural grocery conjunctions ("aur", "and", "tatha", "sath me", "phir")
 * - Punctuation (commas, periods, line breaks)
 * - Boundaries where a new quantity appears after an item
 */
export function splitVoiceIntoItemPhrases(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize delimiters to standard pipe
  let normalized = rawText
    .replace(/[,\n।\.\?!;]+/g, ' | ')
    .replace(/\b(?:aur|tatha|and|sath\s+me|saath\s+mein|phir|or|bhi)\b/gi, ' | ');

  // Split on pipe
  let chunks = normalized
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  // Secondary pass: Detect consecutive items joined without conjunctions
  // e.g. "1 kilo cheeni 2 packet namak" -> split before "2 packet"
  const finalPhrases: string[] = [];
  const numUnitPattern = new RegExp(
    `(\\s+)(?:\\d+|${Object.keys(HINDI_NUMBER_WORDS).join('|')})\\s+(?:${UNIT_KEYWORDS.join('|')})\\b`,
    'i'
  );

  chunks.forEach((chunk) => {
    // If chunk contains multiple quantity+unit patterns, split them
    let remaining = chunk;
    let match = remaining.search(numUnitPattern);

    while (match > 2) {
      const part = remaining.substring(0, match).trim();
      if (part.length > 1) finalPhrases.push(part);
      remaining = remaining.substring(match).trim();
      match = remaining.search(numUnitPattern);
    }
    if (remaining.trim().length > 1) {
      finalPhrases.push(remaining.trim());
    }
  });

  return finalPhrases;
}

/**
 * Capitalize first letters for clean grocery receipt display
 */
function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

/**
 * Parse an individual grocery phrase into quantity, unit, and item name
 * Examples:
 * - "2 packet Tata namak" -> quantity: "2", unit: "packet", itemName: "Tata Namak"
 * - "1 kilo chana dal" -> quantity: "1", unit: "kilo", itemName: "Chana Dal"
 * - "Fortune tel 1 litre" -> quantity: "1", unit: "litre", itemName: "Fortune Tel"
 * - "aadha kilo cheeni" -> quantity: "½", unit: "kilo", itemName: "Cheeni"
 * - "Maggi do packet" -> quantity: "2", unit: "packet", itemName: "Maggi"
 */
export function parseSingleGroceryItem(phrase: string): ParsedGroceryItem {
  const cleaned = phrase.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ');

  let extractedQuantity: string | undefined;
  let extractedUnit: string | undefined;
  const remainingWords: string[] = [];

  // Helper to convert word to digit if it's a number
  const getNumberValue = (word: string): string | null => {
    const lower = word.toLowerCase();
    if (/^\d+(\.\d+)?$/.test(word)) return word;
    if (HINDI_NUMBER_WORDS[lower]) return HINDI_NUMBER_WORDS[lower];
    return null;
  };

  const isUnitWord = (word: string): string | null => {
    const lower = word.toLowerCase();
    return UNIT_KEYWORDS.includes(lower) ? lower : null;
  };

  let i = 0;
  while (i < words.length) {
    const current = words[i];
    const next = words[i + 1];

    const numVal = getNumberValue(current);
    const unitVal = next ? isUnitWord(next) : null;

    if (numVal && unitVal && !extractedQuantity && !extractedUnit) {
      // Pattern: [Number] [Unit] (e.g. "2" "packet", "ek" "kilo")
      extractedQuantity = numVal;
      extractedUnit = unitVal;
      i += 2;
      continue;
    }

    if (numVal && !extractedQuantity) {
      // Just a number without immediate unit (could be "do Maggi" or followed by unit later)
      extractedQuantity = numVal;
      i += 1;
      continue;
    }

    const currentUnit = isUnitWord(current);
    if (currentUnit && !extractedUnit) {
      extractedUnit = currentUnit;
      i += 1;
      continue;
    }

    // Regular item name word
    remainingWords.push(current);
    i += 1;
  }

  let itemName = remainingWords.join(' ').trim();
  if (!itemName) {
    // If all words were consumed by numbers/units, use cleaned
    itemName = cleaned;
  }

  // Format clean item title
  itemName = titleCase(itemName);

  let formatted = '';
  if (extractedQuantity && extractedUnit) {
    formatted = `${extractedQuantity} ${extractedUnit} ${itemName}`;
  } else if (extractedQuantity) {
    formatted = `${extractedQuantity} ${itemName}`;
  } else if (extractedUnit) {
    formatted = `${itemName} (${extractedUnit})`;
  } else {
    formatted = itemName;
  }

  return {
    id: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    raw: cleaned,
    quantity: extractedQuantity,
    unit: extractedUnit,
    itemName,
    formatted,
  };
}

/**
 * Parse an entire voice text stream into clean, unique grocery items
 */
export function parseVoiceStreamToItems(rawText: string): ParsedGroceryItem[] {
  const phrases = splitVoiceIntoItemPhrases(rawText);
  const items: ParsedGroceryItem[] = [];
  const seenNames = new Set<string>();

  phrases.forEach((phrase) => {
    const parsed = parseSingleGroceryItem(phrase);
    if (parsed.itemName && !seenNames.has(parsed.formatted.toLowerCase())) {
      seenNames.add(parsed.formatted.toLowerCase());
      items.push(parsed);
    }
  });

  return items;
}
