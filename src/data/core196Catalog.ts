import { Product } from '../types';
import CORE_196_JSON from './core196Catalog.json';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

export const CORE_196_PRODUCTS: Product[] = CORE_196_JSON as Product[];

/**
 * Escapes an individual cell value according to RFC-4180
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Generates exact CSV text for mohitkiranape.csv with schema:
 * id,name,hindiName,category,mrp,sellingPrice,unit,inStock,stockCount,imageUrl
 */
export function generateMohitKiranapeCsvText(products: Product[] = CORE_196_PRODUCTS): string {
  const headers = [
    'id',
    'name',
    'hindiName',
    'category',
    'mrp',
    'sellingPrice',
    'unit',
    'inStock',
    'stockCount',
    'imageUrl',
  ];

  const rows = products.map((item) => {
    const mrp = Number(item.originalPrice) || Number(item.finalPrice) || 0;
    const sellingPrice = Number(item.finalPrice) || mrp;
    const inStock = item.isAvailable !== false ? 'true' : 'false';
    const stockCount = item.stockCount ?? item.stock ?? 50;

    return [
      escapeCsvCell(item.id),
      escapeCsvCell(item.name || ''),
      escapeCsvCell(item.hindiName || ''),
      escapeCsvCell(item.category || ''),
      escapeCsvCell(mrp),
      escapeCsvCell(sellingPrice),
      escapeCsvCell(item.unit || '1 pc'),
      escapeCsvCell(inStock),
      escapeCsvCell(stockCount),
      escapeCsvCell(item.imageUrl || ''),
    ].join(',');
  });

  return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
}

/**
 * Robust RFC-4180 CSV parser handling quotes, multiline content, and commas
 */
export function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '').trim();
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Strict parser for mohitkiranape.csv with:
 * id,name,hindiName,category,mrp,sellingPrice,unit,inStock,stockCount,imageUrl
 */
export function parseMohitKiranapeCsv(text: string): {
  products: Product[];
  error?: string;
  rawCount: number;
} {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { products: [], error: 'CSV file contains no product rows.', rawCount: 0 };
  }

  const rawHeaders = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const colMap: Record<string, number> = {};
  rawHeaders.forEach((header, index) => {
    if (header === 'id') colMap.id = index;
    if (header === 'name' || header === 'itemname' || header === 'productname') colMap.name = index;
    if (header === 'hindiname' || header === 'hindi') colMap.hindiName = index;
    if (header === 'category' || header === 'dept') colMap.category = index;
    if (header === 'mrp' || header === 'originalprice' || header === 'price_mrp') colMap.mrp = index;
    if (header === 'sellingprice' || header === 'finalprice' || header === 'price' || header === 'rate') colMap.sellingPrice = index;
    if (header === 'unit' || header === 'packsize' || header === 'weight') colMap.unit = index;
    if (header === 'instock' || header === 'available' || header === 'isavailable') colMap.inStock = index;
    if (header === 'stockcount' || header === 'stock' || header === 'qty') colMap.stockCount = index;
    if (header === 'imageurl' || header === 'image' || header === 'photo') colMap.imageUrl = index;
  });

  if (colMap.name === undefined) {
    return { products: [], error: 'CSV must contain a "name" column.', rawCount: rows.length - 1 };
  }

  const products: Product[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = colMap.name !== undefined ? row[colMap.name]?.trim() : '';
    if (!name) continue;

    const rawId = colMap.id !== undefined ? row[colMap.id]?.trim() : '';
    const hindiName = colMap.hindiName !== undefined ? row[colMap.hindiName]?.trim() : '';
    const category = (colMap.category !== undefined && row[colMap.category]?.trim()) || 'Household Essentials';
    
    // Strict numeric casting
    const parsedMrp = colMap.mrp !== undefined ? parseFloat(row[colMap.mrp]) : NaN;
    const parsedSelling = colMap.sellingPrice !== undefined ? parseFloat(row[colMap.sellingPrice]) : NaN;
    
    const mrp = Number.isFinite(parsedMrp) && parsedMrp > 0 ? parsedMrp : (Number.isFinite(parsedSelling) ? parsedSelling : 0);
    const sellingPrice = Number.isFinite(parsedSelling) && parsedSelling > 0 ? parsedSelling : mrp;
    
    const unit = (colMap.unit !== undefined && row[colMap.unit]?.trim()) || '1 pc';
    
    // Default inStock to boolean true unless strictly false / 0 / outofstock
    const rawInStock = colMap.inStock !== undefined ? row[colMap.inStock]?.trim().toLowerCase() : 'true';
    const isAvailable = !(rawInStock === 'false' || rawInStock === '0' || rawInStock === 'no' || rawInStock === 'outofstock');
    
    // Preserve integer stockCount (default 50)
    const parsedStock = colMap.stockCount !== undefined ? parseInt(row[colMap.stockCount], 10) : NaN;
    const stockCount = Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 50;

    // Retain exact Supabase CDN imageUrl provided in CSV without altering
    const rawImageUrl = colMap.imageUrl !== undefined ? row[colMap.imageUrl]?.trim() : '';
    const imageUrl = rawImageUrl || getCategoryFallbackSvg(category, name);

    const discountPercent = mrp > sellingPrice && mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
    const generatedId = rawId || `prod_${Date.now()}_${i}`;

    const isStationery =
      category.toLowerCase().includes('copies') ||
      category.toLowerCase().includes('pens') ||
      category.toLowerCase().includes('craft') ||
      category.toLowerCase().includes('stationery');

    products.push({
      id: generatedId,
      name,
      hindiName: hindiName || undefined,
      category,
      department: isStationery ? 'stationery' : 'grocery',
      originalPrice: mrp,
      finalPrice: sellingPrice,
      discountPercent,
      unit,
      isAvailable,
      stockCount,
      stock: stockCount,
      imageUrl,
      updatedAt: Date.now(),
    });
  }

  return { products, rawCount: rows.length - 1 };
}
