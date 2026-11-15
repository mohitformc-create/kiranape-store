import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Product } from '../types';
import { supabase } from '../services/supabaseClient';

export interface StoreExcelRow {
  'Item Name': string;
  MRP: number;
  'Selling Price': number;
  Weight: string;
  Category: string;
  'Image URL': string;
}

const MAX_EXCEL_CELL_LENGTH = 32000;
const MAX_IMAGE_URL_LENGTH = 500;

const normalizeNameKey = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeWeightKey = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '');

const truncateExcelCell = (value: string, maxLen: number = MAX_EXCEL_CELL_LENGTH): string => {
  const str = String(value ?? '').trim();
  return str.length > maxLen ? str.slice(0, maxLen) : str;
};

const sanitizeImageUrlForExcel = (url: string): string => {
  const clean = String(url ?? '').trim();
  if (!clean) return '';
  if (/^data:/i.test(clean) || clean.length > MAX_IMAGE_URL_LENGTH) {
    return '';
  }
  return truncateExcelCell(clean, MAX_IMAGE_URL_LENGTH);
};

const triggerCsvDownload = (rows: StoreExcelRow[], fileName: string): void => {
  const csv = Papa.unparse(rows, {
    columns: ['Item Name', 'MRP', 'Selling Price', 'Weight', 'Category', 'Image URL'],
  });
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

async function collectStoreExportRows(storeProducts: Product[] = []): Promise<StoreExcelRow[]> {
  const combinedRows: StoreExcelRow[] = [];
  const seenIds = new Set<string>();
  const seenNameWeights = new Set<string>();

  const registerRow = (
    id: string | undefined,
    name: string,
    mrpVal: number,
    sellingPriceVal: number,
    weight: string,
    category: string,
    imageUrl: string
  ) => {
    const cleanName = truncateExcelCell(name || '');
    if (!cleanName) return;

    const cleanWeight = truncateExcelCell(weight || '') || '1 Pc';
    const nwKey = `${normalizeNameKey(cleanName)}::${normalizeWeightKey(cleanWeight)}`;
    const cleanId = id ? id.trim() : '';

    if ((cleanId && seenIds.has(cleanId)) || seenNameWeights.has(nwKey)) {
      return;
    }

    if (cleanId) seenIds.add(cleanId);
    seenNameWeights.add(nwKey);

    const mrp = Number.isFinite(mrpVal) && mrpVal > 0 ? mrpVal : Number(sellingPriceVal) || 0;
    const sellingPrice =
      Number.isFinite(sellingPriceVal) && sellingPriceVal > 0 ? sellingPriceVal : mrp;

    combinedRows.push({
      'Item Name': cleanName,
      MRP: mrp,
      'Selling Price': sellingPrice,
      Weight: cleanWeight,
      Category: truncateExcelCell(category || '') || 'General Kirana',
      'Image URL': sanitizeImageUrlForExcel(imageUrl),
    });
  };

  // 1. Fetch all products from Supabase 'products' table (paginated)
  try {
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, unit, original_price, price, category, image_url')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) {
        console.warn('[Excel Export] Supabase fetch warning:', error.message);
        break;
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        const sellPrice = Number(item.price ?? 0);
        const origPrice = Number(item.original_price ?? item.price ?? 0);
        registerRow(
          item.id ? String(item.id) : undefined,
          String(item.name || ''),
          origPrice,
          sellPrice,
          String(item.unit || '1 Pc'),
          String(item.category || 'General Kirana'),
          String(item.image_url || '')
        );
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }
  } catch (err) {
    console.warn('[Excel Export] Supabase fetch exception, falling back to store state:', err);
  }

  // 2. Include any products from live store state not already in Supabase rows
  for (const p of storeProducts) {
    registerRow(
      p.id,
      p.name,
      Number(p.originalPrice || p.finalPrice || 0),
      Number(p.finalPrice || p.originalPrice || 0),
      p.unit || '1 Pc',
      p.category || 'General Kirana',
      p.imageUrl || ''
    );
  }

  return combinedRows;
}

export async function exportAllStoreProductsToCsv(
  storeProducts: Product[] = []
): Promise<{ count: number; fileName: string; format: 'csv' }> {
  const combinedRows = await collectStoreExportRows(storeProducts);
  const fileName = `kiranape_all_products_${new Date().toISOString().slice(0, 10)}.csv`;
  triggerCsvDownload(combinedRows, fileName);
  return { count: combinedRows.length, fileName, format: 'csv' };
}

export async function exportAllStoreProductsToExcel(
  storeProducts: Product[] = []
): Promise<{ count: number; fileName: string; format: 'xlsx' | 'csv' }> {
  const combinedRows = await collectStoreExportRows(storeProducts);
  const dateStamp = new Date().toISOString().slice(0, 10);

  try {
    const safeRows: StoreExcelRow[] = combinedRows.map((row) => ({
      'Item Name': truncateExcelCell(row['Item Name']),
      MRP: row.MRP,
      'Selling Price': row['Selling Price'],
      Weight: truncateExcelCell(row.Weight),
      Category: truncateExcelCell(row.Category),
      'Image URL': sanitizeImageUrlForExcel(row['Image URL']),
    }));

    const worksheet = XLSX.utils.json_to_sheet(safeRows, {
      header: ['Item Name', 'MRP', 'Selling Price', 'Weight', 'Category', 'Image URL'],
    });

    worksheet['!cols'] = [
      { wch: 36 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 22 },
      { wch: 46 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Store Products');

    const fileName = `kiranape_all_products_${dateStamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { count: safeRows.length, fileName, format: 'xlsx' };
  } catch (xlsxErr) {
    console.warn('[Excel Export] XLSX write failed, falling back to CSV:', xlsxErr);
    const csvFileName = `kiranape_all_products_${dateStamp}.csv`;
    triggerCsvDownload(combinedRows, csvFileName);
    return { count: combinedRows.length, fileName: csvFileName, format: 'csv' };
  }
}
