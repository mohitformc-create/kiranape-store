import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  ShieldCheck,
  X,
  PlusCircle,
} from 'lucide-react';
import { Product } from '../types';
import { batchUpsertProductsToFirestore } from '../services/firebase';
import { saveBulkProductsToCentralInventory } from '../services/orderApiService';
import { supabase } from '../services/supabaseClient';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';
import { exportAllStoreProductsToExcel } from '../utils/excelExportUtils';

interface AdminExcelUploaderProps {
  products: Product[];
  onCatalogUpdated: (updatedProducts: Product[]) => void;
}

interface ParsedExcelRow {
  rowIndex: number;
  action: 'skip' | 'add';
  product: Product;
  matchedExistingName?: string;
  matchedSource?: 'supabase' | 'store' | 'duplicate_in_file';
}

type PreviewFilter = 'all' | 'add' | 'skip';

const normalizeHeaderKey = (key: string): string =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeWeight = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const buildMatchKeysForExisting = (name: string, unit: string): string[] => {
  const nName = normalizeName(name || '');
  if (!nName) return [];
  const nWeight = normalizeWeight(unit || '');
  if (!nWeight) {
    return [`${nName}::`, `${nName}::1pc`, `${nName}::1piece`];
  }
  if (nWeight === '1pc' || nWeight === '1piece') {
    return [`${nName}::${nWeight}`, `${nName}::`, `${nName}::1pc`, `${nName}::1piece`];
  }
  return [`${nName}::${nWeight}`];
};

const buildMatchKeysForRow = (name: string, rawWeight: string, resolvedUnit: string): string[] => {
  const nName = normalizeName(name || '');
  if (!nName) return [];
  const nWeight = normalizeWeight(resolvedUnit || '');
  if (!rawWeight.trim()) {
    return [`${nName}::${nWeight}`, `${nName}::`, `${nName}::1pc`, `${nName}::1piece`];
  }
  if (nWeight === '1pc' || nWeight === '1piece') {
    return [`${nName}::${nWeight}`, `${nName}::`, `${nName}::1pc`, `${nName}::1piece`];
  }
  return [`${nName}::${nWeight}`];
};

const parseNumericPrice = (val: unknown): number => {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const cleaned = String(val ?? '')
    .replace(/[₹,]/g, '')
    .replace(/\b(rs\.?|inr)\b/gi, '')
    .trim();
  if (!cleaned) return 0;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
};

const extractField = (
  normalizedRow: Record<string, unknown>,
  aliases: string[]
): string => {
  for (const alias of aliases) {
    const val = normalizedRow[alias];
    if (val !== undefined && val !== null) {
      const str = String(val).trim();
      if (str !== '') return str;
    }
  }
  return '';
};

const extractRawField = (
  normalizedRow: Record<string, unknown>,
  aliases: string[]
): unknown => {
  for (const alias of aliases) {
    const val = normalizedRow[alias];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return val;
    }
  }
  return '';
};

export const AdminExcelUploader: React.FC<AdminExcelUploaderProps> = ({
  products,
  onCatalogUpdated,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedExcelRow[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');
  const [previewSearch, setPreviewSearch] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.text === text ? null : curr));
    }, 8000);
  };

  // Download a ready-to-use .xlsx template with exact supported columns
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'Item Name': 'Aashirvaad Shudh Chakki Atta',
        Weight: '5 kg',
        MRP: 245,
        'Selling Price': 225,
        Category: 'Atta & Flours',
        'Image URL': '',
      },
      {
        'Item Name': 'Fortune Kachi Ghani Mustard Oil',
        Weight: '1 Litre',
        MRP: 165,
        'Selling Price': 148,
        Category: 'Oil & Ghee',
        'Image URL': '',
      },
      {
        'Item Name': 'Tata Salt Iodized',
        Weight: '1 kg',
        MRP: 28,
        'Selling Price': '',
        Category: 'Spices & Salt',
        'Image URL': '',
      },
      {
        'Item Name': 'Maggi 2-Minute Noodles Masala',
        Weight: '280g Pack',
        MRP: 60,
        'Selling Price': 55,
        Category: 'Snacks & Biscuits',
        'Image URL': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 34 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 22 },
      { wch: 36 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kirana Inventory');
    XLSX.writeFile(workbook, 'kiranape_sample_template.xlsx');
    showToast('success', 'Sample Excel Template (kiranape_sample_template.xlsx) डाउनलोड हो गया!');
  };

  // Export all live store & Supabase products to Excel (.xlsx)
  const handleExportCurrentStoreExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { count, format } = await exportAllStoreProductsToExcel(products);
      showToast(
        'success',
        `${count} स्टोर प्रोडक्ट्स की ${format === 'csv' ? 'CSV (.csv)' : 'Excel (.xlsx)'} फाइल डाउनलोड हो गई!`
      );
    } catch (err: any) {
      console.error('Excel export error:', err);
      showToast('error', err?.message || 'Excel डाउनलोड करने में समस्या आई।');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch live existing products from Supabase + store catalog for deduplication
  const fetchExistingProducts = async (): Promise<{
    byNameWeight: Map<string, { name: string; unit: string; source: 'supabase' | 'store' }>;
    existingIds: Set<string>;
  }> => {
    const byNameWeight = new Map<
      string,
      { name: string; unit: string; source: 'supabase' | 'store' }
    >();
    const existingIds = new Set<string>();

    // 1. Index existing products currently loaded in store catalog
    for (const prod of products) {
      if (prod.id) existingIds.add(prod.id.trim());
      const keys = buildMatchKeysForExisting(prod.name || '', prod.unit || '');
      for (const k of keys) {
        if (!byNameWeight.has(k)) {
          byNameWeight.set(k, {
            name: prod.name || '',
            unit: prod.unit || '',
            source: 'store',
          });
        }
      }
    }

    // 2. Fetch live products from Supabase 'products' table (paginated to cover full catalog)
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, unit')
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(`Supabase से मौजूदा आइटम्स जांचने में त्रुटि: ${error.message}`);
      }
      if (!data || data.length === 0) break;

      for (const row of data) {
        if (row.id) existingIds.add(String(row.id).trim());
        const keys = buildMatchKeysForExisting(String(row.name || ''), String(row.unit || ''));
        for (const k of keys) {
          byNameWeight.set(k, {
            name: String(row.name || ''),
            unit: String(row.unit || ''),
            source: 'supabase',
          });
        }
      }

      if (data.length < pageSize) break;
      from += pageSize;
    }

    return { byNameWeight, existingIds };
  };

  // Smart matching & row normalization (Never overwrite or duplicate existing items)
  const processParsedRows = async (rawRows: Record<string, unknown>[], file: File) => {
    if (!rawRows || rawRows.length === 0) {
      setParseError('अपलोड की गई फाइल में कोई डेटा पंक्ति (row) नहीं मिली।');
      setPreviewRows(null);
      return;
    }

    setIsCheckingSupabase(true);
    try {
      const { byNameWeight, existingIds } = await fetchExistingProducts();
      const seenInFile = new Map<string, string>();

      const mappedRows: ParsedExcelRow[] = [];
      let skipped = 0;
      const now = Date.now();

      rawRows.forEach((rawRow, index) => {
        const normRow: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rawRow)) {
          normRow[normalizeHeaderKey(k)] = v;
        }

        const itemName = extractField(normRow, [
          'itemname',
          'name',
          'productname',
          'product',
          'item',
          'title',
        ]);

        if (!itemName) {
          skipped += 1;
          return;
        }

        const rowId = extractField(normRow, ['id', 'productid', 'sku']);
        const rowWeight = extractField(normRow, [
          'weight',
          'unit',
          'size',
          'qty',
          'packsize',
          'wt',
          'pack',
        ]);
        const rawMrp = parseNumericPrice(
          extractRawField(normRow, [
            'mrp',
            'maxretailprice',
            'originalprice',
            'listprice',
            'price',
          ])
        );
        const rawSellingPrice = parseNumericPrice(
          extractRawField(normRow, [
            'sellingprice',
            'rate',
            'saleprice',
            'finalprice',
            'sp',
            'offerprice',
          ])
        );
        const rowImageUrl = extractField(normRow, [
          'imageurl',
          'image',
          'photo',
          'img',
          'photourl',
          'pic',
          'picture',
        ]);
        const rowCategory = extractField(normRow, [
          'category',
          'department',
          'cat',
          'group',
        ]);
        const rowHindiName = extractField(normRow, ['hindiname', 'hindi']);
        const rawInStock = extractField(normRow, ['instock', 'isavailable', 'available']);
        const rawStockCount = parseNumericPrice(
          extractRawField(normRow, ['stockcount', 'stock'])
        );

        const resolvedUnit = rowWeight || '1 Pc';
        const resolvedCategory = rowCategory || 'General Kirana';
        const resolvedInStock =
          rawInStock !== ''
            ? rawInStock.toLowerCase() !== 'false' && rawInStock !== '0'
            : true;
        const resolvedStockCount = rawStockCount > 0 ? Math.round(rawStockCount) : 50;

        let mrp = rawMrp > 0 ? rawMrp : rawSellingPrice > 0 ? rawSellingPrice : 0;
        let sellingPrice = rawSellingPrice > 0 ? rawSellingPrice : rawMrp > 0 ? rawMrp : 0;
        if (mrp < sellingPrice) {
          mrp = sellingPrice;
        }
        const discountPercent =
          mrp > sellingPrice && mrp > 0
            ? Math.round(((mrp - sellingPrice) / mrp) * 100)
            : 0;

        // Check case-insensitive item name + weight against Supabase & store DB
        const rowCheckKeys = buildMatchKeysForRow(itemName, rowWeight, resolvedUnit);
        let existingEntry: { name: string; unit: string; source: 'supabase' | 'store' } | undefined;
        for (const key of rowCheckKeys) {
          const found = byNameWeight.get(key);
          if (found) {
            existingEntry = found;
            break;
          }
        }

        let duplicateInFileName: string | undefined;
        if (!existingEntry) {
          for (const key of rowCheckKeys) {
            const found = seenInFile.get(key);
            if (found) {
              duplicateInFileName = found;
              break;
            }
          }
        }

        if (existingEntry || duplicateInFileName) {
          // EXISTING OR DUPLICATE ITEM: Skip completely (never overwrite or duplicate)
          mappedRows.push({
            rowIndex: index + 1,
            action: 'skip',
            product: {
              id: `skip_${now}_${index}`,
              name: itemName,
              hindiName: rowHindiName || '',
              category: resolvedCategory,
              department: 'grocery',
              unit: resolvedUnit,
              originalPrice: mrp,
              finalPrice: sellingPrice,
              discountPercent,
              imageUrl: rowImageUrl,
              isAvailable: resolvedInStock,
              stockCount: resolvedStockCount,
              stock: resolvedStockCount,
              updatedAt: now,
            },
            matchedExistingName: existingEntry?.name || duplicateInFileName,
            matchedSource: existingEntry ? existingEntry.source : 'duplicate_in_file',
          });
        } else {
          // BRAND-NEW PRODUCT: Assign non-colliding UUID & mark for insert
          const newId =
            rowId && UUID_REGEX.test(rowId) && !existingIds.has(rowId)
              ? rowId
              : generateUuid();
          existingIds.add(newId);
          for (const key of rowCheckKeys) {
            seenInFile.set(key, itemName);
          }

          const newProduct: Product = {
            id: newId,
            name: itemName,
            hindiName: rowHindiName || '',
            category: resolvedCategory,
            department: 'grocery',
            unit: resolvedUnit,
            originalPrice: mrp,
            finalPrice: sellingPrice,
            discountPercent,
            imageUrl: rowImageUrl,
            isAvailable: resolvedInStock,
            stockCount: resolvedStockCount,
            stock: resolvedStockCount,
            description: `${itemName} - ${resolvedUnit}`,
            updatedAt: now,
          };

          mappedRows.push({
            rowIndex: index + 1,
            action: 'add',
            product: newProduct,
          });
        }
      });

      if (mappedRows.length === 0) {
        setParseError(
          'फाइल में "Item Name" या "Name" कॉलम वाले मान्य उत्पाद नहीं मिले। कृपया Sample Excel Template देखें।'
        );
        setPreviewRows(null);
        return;
      }

      setParseError(null);
      setPreviewRows(mappedRows);
      setSkippedCount(skipped);
      setFileName(file.name);
      setFileSize(
        file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`
      );
      setPreviewFilter('all');
      setPreviewSearch('');
    } catch (err: any) {
      console.error('Supabase duplicate check error:', err);
      setParseError(err?.message || 'Supabase में मौजूदा आइटम्स जांचने में समस्या आई।');
      setPreviewRows(null);
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const handleParseFile = async (file: File) => {
    setParseError(null);
    const lowerName = file.name.toLowerCase();

    try {
      if (lowerName.endsWith('.csv')) {
        const rows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
          Papa.parse<Record<string, unknown>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data || []),
            error: (err) => reject(err),
          });
        });
        await processParsedRows(rows, file);
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setParseError('Excel फाइल में कोई शीट नहीं मिली।');
          return;
        }
        const sheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
        });
        await processParsedRows(jsonRows, file);
      } else {
        setParseError('कृपया केवल .xlsx, .xls या .csv फाइल ही चुनें।');
      }
    } catch (err: any) {
      console.error('Excel/CSV parse error:', err);
      setParseError(err?.message || 'फाइल पढ़ने में त्रुटि हुई। कृपया फाइल फॉर्मेट जांचें।');
      setPreviewRows(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    handleParseFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleParseFile(file);
  };

  const handleConfirmBatchSave = async () => {
    if (!previewRows || previewRows.length === 0 || isSaving) return;

    setIsSaving(true);

    try {
      // Re-verify against live Supabase products before inserting
      const { byNameWeight: liveExistingMap, existingIds } = await fetchExistingProducts();
      const seenBatchKeys = new Set<string>();

      const brandNewProducts: Product[] = [];
      let skippedExistingCount = 0;

      for (const row of previewRows) {
        if (row.action === 'skip') {
          skippedExistingCount += 1;
          continue;
        }

        const p = row.product;
        const checkKeys = buildMatchKeysForRow(p.name, p.unit, p.unit);
        const alreadyExists = checkKeys.some(
          (k) => liveExistingMap.has(k) || seenBatchKeys.has(k)
        );

        if (alreadyExists) {
          skippedExistingCount += 1;
          continue;
        }

        const safeId =
          p.id && UUID_REGEX.test(p.id) && !existingIds.has(p.id) ? p.id : generateUuid();
        existingIds.add(safeId);
        for (const k of checkKeys) {
          seenBatchKeys.add(k);
        }

        brandNewProducts.push({ ...p, id: safeId });
      }

      if (brandNewProducts.length === 0) {
        showToast(
          'success',
          `0 नए आइटम जोड़े गए, ${skippedExistingCount} पहले से मौजूद आइटम छोड़े गए।`
        );
        setPreviewRows(null);
        setFileName(null);
        setFileSize(null);
        return;
      }

      setSaveProgress({ current: 0, total: brandNewProducts.length });

      // 1. Insert ONLY brand-new products into Supabase 'products' table
      const BATCH_SIZE = 40;
      const insertedProducts: Product[] = [];

      for (let i = 0; i < brandNewProducts.length; i += BATCH_SIZE) {
        const chunk = brandNewProducts.slice(i, i + BATCH_SIZE);
        const supabasePayload = chunk.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category || 'General Grocery',
          unit: p.unit || '1 Pc',
          original_price: p.originalPrice > 0 ? p.originalPrice : p.finalPrice,
          price: p.finalPrice > 0 ? p.finalPrice : p.originalPrice,
          image_url: p.imageUrl || null,
          in_stock: p.isAvailable !== false,
        }));

        const { data: insertedRows, error: insertError } = await supabase
          .from('products')
          .insert(supabasePayload)
          .select();

        if (insertError) {
          throw new Error(`Supabase insert error: ${insertError.message}`);
        }

        chunk.forEach((p, idx) => {
          const sbRow = insertedRows?.[idx];
          insertedProducts.push(sbRow?.id ? { ...p, id: String(sbRow.id) } : p);
        });

        setSaveProgress({
          current: Math.min(i + chunk.length, brandNewProducts.length),
          total: brandNewProducts.length,
        });
      }

      // 2. Persist ONLY brand-new products to Firestore & local cache (never overwrites existing)
      const result = await batchUpsertProductsToFirestore(insertedProducts, 100);

      // 3. Sync new items to central inventory quietly in background
      saveBulkProductsToCentralInventory(insertedProducts).catch(() => {});

      onCatalogUpdated(result.mergedProducts);
      showToast(
        'success',
        `${insertedProducts.length} नए आइटम जोड़े गए, ${skippedExistingCount} पहले से मौजूद आइटम छोड़े गए।`
      );
      setPreviewRows(null);
      setFileName(null);
      setFileSize(null);
    } catch (err: any) {
      console.error('Batch save error:', err);
      showToast(
        'error',
        err?.message || 'डेटाबेस में नए आइटम सेव करने में समस्या आई। कृपया पुनः प्रयास करें।'
      );
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  const skipCount = useMemo(
    () => (previewRows ? previewRows.filter((r) => r.action === 'skip').length : 0),
    [previewRows]
  );

  const newCount = useMemo(
    () => (previewRows ? previewRows.filter((r) => r.action === 'add').length : 0),
    [previewRows]
  );

  const filteredPreviewRows = useMemo(() => {
    if (!previewRows) return [];
    const q = previewSearch.trim().toLowerCase();
    return previewRows.filter((row) => {
      if (previewFilter !== 'all' && row.action !== previewFilter) return false;
      if (!q) return true;
      return (
        row.product.name.toLowerCase().includes(q) ||
        row.product.category.toLowerCase().includes(q) ||
        row.product.unit.toLowerCase().includes(q)
      );
    });
  }, [previewRows, previewFilter, previewSearch]);

  return (
    <div className="space-y-5">
      {/* Global Success / Error Toast */}
      {toastMessage && (
        <div
          className={`rounded-2xl p-4 border shadow-sm flex items-center justify-between gap-3 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-bold">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1.5 rounded-lg hover:bg-black/5 cursor-pointer shrink-0"
            aria-label="Close message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Template Controls */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-black text-stone-900 text-lg sm:text-xl flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Excel / CSV Smart Inventory Uploader</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              अपनी `.xlsx`, `.xls` या `.csv` फाइल अपलोड करें — सिस्टम Supabase में पहले से मौजूद आइटम्स (नाम + वजन) को सुरक्षित रखेगा (कोई ओवरराइट या डुप्लीकेट नहीं होगा) और केवल बिल्कुल नए आइटम जोड़ेगा।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              id="excel-download-sample-template-btn"
              onClick={handleDownloadSampleTemplate}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-[0.98] text-amber-900 border border-amber-300 text-xs sm:text-sm font-heading font-extrabold transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-amber-700 shrink-0" />
              <span>📥 Sample Excel Template डाउनलोड करें</span>
            </button>

            <button
              type="button"
              id="excel-export-current-store-btn"
              onClick={handleExportCurrentStoreExcel}
              disabled={isExporting}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-emerald-900 border border-emerald-300 text-xs sm:text-sm font-heading font-extrabold transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin shrink-0" />
              ) : (
                <Download className="w-4 h-4 text-emerald-700 shrink-0" />
              )}
              <span>
                {isExporting
                  ? 'डाउनलोड हो रहा है...'
                  : '📥 सभी स्टोर प्रोडक्ट्स डाउनलोड करें (.xlsx)'}
              </span>
            </button>
          </div>
        </div>

        {/* Supported Columns Guide */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-700 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-bold text-stone-900">सपोर्टेड कॉलम:</span>
          <span>
            <strong className="text-emerald-800">Item Name</strong> (अनिवार्य)
          </span>
          <span>•</span>
          <span>
            <strong className="text-stone-900">MRP</strong> (अधिकतम मूल्य)
          </span>
          <span>•</span>
          <span>
            <strong className="text-stone-900">Selling Price</strong> (खाली होने पर MRP लागू होगा)
          </span>
          <span>•</span>
          <span>
            <strong className="text-stone-900">Weight</strong> (जैसे 1kg, 500g)
          </span>
          <span>•</span>
          <span>
            <strong className="text-stone-900">Category</strong> (वैकल्पिक)
          </span>
          <span>•</span>
          <span>
            <strong className="text-stone-900">Image URL</strong> (नए आइटम के लिए)
          </span>
        </div>

        {/* Tap-Friendly Mobile Upload Dropzone with Directly Visible File Input */}
        <div
          id="excel-uploader-dropzone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`w-full rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
            dragActive
              ? 'border-emerald-600 bg-emerald-50/80 scale-[0.995]'
              : 'border-emerald-400 bg-emerald-50/40'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              {isCheckingSupabase ? (
                <RefreshCw className="w-7 h-7 animate-spin" />
              ) : (
                <Upload className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <p className="font-heading font-black text-stone-900 text-base sm:text-lg">
                {isCheckingSupabase
                  ? 'Supabase में मौजूदा आइटम्स की जांच हो रही है...'
                  : fileName
                    ? `चयनित फाइल: ${fileName} (${fileSize})`
                    : 'Excel (.xlsx / .xls) या CSV फाइल चुनें'}
              </p>
              <p className="text-xs sm:text-sm text-stone-600">
                मोबाइल से सीधे फाइल चुनने के लिए नीचे हरे बटन पर टैप करें या फाइल यहाँ ड्रैग करें
              </p>
            </div>

            <div className="w-full max-w-md mx-auto pt-1">
              <input
                id="excel-file-picker"
                ref={fileInputRef}
                type="file"
                accept="*/*"
                onChange={handleFileChange}
                className="block w-full text-xs sm:text-sm text-stone-700 bg-white rounded-xl border border-emerald-200 p-1.5 shadow-2xs cursor-pointer file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-600 hover:file:bg-emerald-700 file:text-white file:font-bold file:cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Parse Error Banner */}
        {parseError && (
          <div className="rounded-xl bg-rose-50 border border-rose-300 p-3.5 flex items-start gap-2.5 text-rose-900 text-xs sm:text-sm font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}
      </div>

      {/* Pre-Upload Preview & Confirm Batch Save */}
      {previewRows && previewRows.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          {/* Preview Summary Header */}
          <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading font-black text-stone-900 text-base sm:text-lg tabular-nums">
                  {previewRows.length} आइटम मिले: {newCount} नए जुड़ेंगे, {skipCount} पहले से मौजूद (छोड़े जाएंगे)
                </span>
                {skippedCount > 0 && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md tabular-nums">
                    {skippedCount} खाली पंक्तियाँ छोड़ी गईं
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  पहले से मौजूद किसी भी उत्पाद का नाम, दाम या फोटो ओवरराइट नहीं होगा — केवल बिल्कुल नए आइटम ही जोड़े जाएंगे।
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPreviewRows(null);
                  setFileName(null);
                  setFileSize(null);
                }}
                disabled={isSaving}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs sm:text-sm font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                रद्द करें
              </button>

              <button
                type="button"
                id="excel-confirm-batch-save-btn"
                onClick={handleConfirmBatchSave}
                disabled={isSaving}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-heading font-black shadow-sm transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span className="tabular-nums">
                      सेव हो रहा है ({saveProgress?.current ?? 0}/{saveProgress?.total ?? newCount})...
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {newCount > 0
                        ? `✅ कन्फर्म करें (${newCount} नए आइटम जोड़ें)`
                        : '✅ कन्फर्म करें (0 नए आइटम)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Saving Progress Bar */}
          {isSaving && saveProgress && (
            <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1.5 tabular-nums">
                <span>Supabase व स्टोर डेटाबेस में नए आइटम जोड़े जा रहे हैं...</span>
                <span>
                  {saveProgress.current} / {saveProgress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-emerald-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all duration-200"
                  style={{
                    width: `${Math.round((saveProgress.current / Math.max(1, saveProgress.total)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div className="p-3.5 sm:px-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setPreviewFilter('all')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap tabular-nums ${
                  previewFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                सभी ({previewRows.length})
              </button>
              <button
                type="button"
                onClick={() => setPreviewFilter('add')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap tabular-nums ${
                  previewFilter === 'add'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                नए जुड़ेंगे ({newCount})
              </button>
              <button
                type="button"
                onClick={() => setPreviewFilter('skip')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap tabular-nums ${
                  previewFilter === 'skip'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                पहले से मौजूद / छोड़े गए ({skipCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={previewSearch}
                onChange={(e) => setPreviewSearch(e.target.value)}
                placeholder="प्रिव्यू में खोजें..."
                className="w-full min-h-[38px] pl-9 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-stone-100 sticky top-0 z-10 text-[11px] uppercase tracking-wide text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">फोटो</th>
                  <th className="py-2.5 px-3">आइटम का नाम</th>
                  <th className="py-2.5 px-3">वजन / पैक</th>
                  <th className="py-2.5 px-3">MRP</th>
                  <th className="py-2.5 px-3">बिक्री मूल्य</th>
                  <th className="py-2.5 px-3">स्थिति</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs sm:text-sm">
                {filteredPreviewRows.map((row) => {
                  const p = row.product;
                  const fallbackSvg = getCategoryFallbackSvg(p.category, p.name, p.unit, p.finalPrice);
                  return (
                    <tr
                      key={`${p.id}_${row.rowIndex}`}
                      className={row.action === 'skip' ? 'bg-stone-50/70 opacity-75' : 'hover:bg-stone-50/80'}
                    >
                      <td className="py-2.5 px-3 text-stone-400 font-mono text-xs tabular-nums">
                        {row.rowIndex}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="w-10 h-10 rounded-lg border border-stone-200 bg-white overflow-hidden flex items-center justify-center shrink-0">
                          <img
                            src={p.imageUrl || fallbackSvg}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = fallbackSvg;
                            }}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-stone-900 leading-snug">{p.name}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                          <span>{p.category}</span>
                          {row.action === 'skip' && row.matchedExistingName && (
                            <span className="text-amber-700 font-semibold">
                              •{' '}
                              {row.matchedSource === 'duplicate_in_file'
                                ? 'फाइल में दोहराया गया'
                                : 'Supabase/स्टोर में पहले से मौजूद'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-stone-700 font-medium">
                        {p.unit}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-stone-500 font-mono tabular-nums">
                        ₹{p.originalPrice}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-bold text-emerald-800 font-mono tabular-nums">
                          ₹{p.finalPrice}
                        </span>
                        {p.discountPercent > 0 && (
                          <span className="ml-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded tabular-nums">
                            {p.discountPercent}% OFF
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {row.action === 'skip' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                            <ShieldCheck className="w-3 h-3" />
                            <span>पहले से मौजूद (छोड़ा गया)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                            <PlusCircle className="w-3 h-3" />
                            <span>नया आइटम</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredPreviewRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500 text-xs">
                      खोज के अनुसार कोई आइटम नहीं मिला।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
