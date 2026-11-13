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
  Image as ImageIcon,
  ShieldCheck,
  X,
  PlusCircle,
  ArrowUpDown,
} from 'lucide-react';
import { Product } from '../types';
import { batchUpsertProductsToFirestore } from '../services/firebase';
import { saveBulkProductsToCentralInventory } from '../services/orderApiService';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface AdminExcelUploaderProps {
  products: Product[];
  onCatalogUpdated: (updatedProducts: Product[]) => void;
}

interface ParsedExcelRow {
  rowIndex: number;
  action: 'update' | 'add';
  product: Product;
  matchedExistingName?: string;
  imagePreservedFromStore: boolean;
}

type PreviewFilter = 'all' | 'update' | 'add';

const normalizeHeaderKey = (key: string): string =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeName = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeWeight = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '');

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
  const [previewRows, setPreviewRows] = useState<ParsedExcelRow[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('all');
  const [previewSearch, setPreviewSearch] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ current: number; total: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.text === text ? null : curr));
    }, 6000);
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

  // Export live store inventory to Excel (.xlsx) for easy bulk editing
  const handleExportCurrentStoreExcel = () => {
    const exportRows = products.map((p) => ({
      id: p.id,
      'Item Name': p.name,
      Weight: p.unit || '1 Pc',
      MRP: p.originalPrice || p.finalPrice || 0,
      'Selling Price': p.finalPrice || p.originalPrice || 0,
      Category: p.category || 'General Kirana',
      'Image URL': p.imageUrl || '',
      inStock: p.isAvailable !== false ? 'true' : 'false',
      stockCount: p.stockCount ?? p.stock ?? 50,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    worksheet['!cols'] = [
      { wch: 22 },
      { wch: 36 },
      { wch: 14 },
      { wch: 10 },
      { wch: 14 },
      { wch: 22 },
      { wch: 42 },
      { wch: 10 },
      { wch: 12 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Store Catalog');
    XLSX.writeFile(workbook, `kiranape_store_catalog_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', `${products.length} आइटम्स की Excel शीट डाउनलोड हो गई!`);
  };

  // Smart matching & row normalization
  const processParsedRows = (rawRows: Record<string, unknown>[], file: File) => {
    if (!rawRows || rawRows.length === 0) {
      setParseError('अपलोड की गई फाइल में कोई डेटा पंक्ति (row) नहीं मिली।');
      setPreviewRows(null);
      return;
    }

    // Build fast lookup maps from existing store products
    const byId = new Map<string, Product>();
    const byNameWeight = new Map<string, Product>();
    const byNameOnly = new Map<string, Product | 'ambiguous'>();

    for (const prod of products) {
      if (prod.id) byId.set(prod.id.trim(), prod);
      const nName = normalizeName(prod.name || '');
      const nWeight = normalizeWeight(prod.unit || '');
      if (nName) {
        byNameWeight.set(`${nName}::${nWeight}`, prod);
        if (!byNameOnly.has(nName)) {
          byNameOnly.set(nName, prod);
        } else {
          byNameOnly.set(nName, 'ambiguous');
        }
      }
    }

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

      // Match against existing store product
      const nName = normalizeName(itemName);
      const nWeight = normalizeWeight(rowWeight);

      let existingMatch: Product | undefined;
      if (rowId && byId.has(rowId)) {
        existingMatch = byId.get(rowId);
      } else if (nWeight && byNameWeight.has(`${nName}::${nWeight}`)) {
        existingMatch = byNameWeight.get(`${nName}::${nWeight}`);
      } else if (!nWeight) {
        const candidate = byNameOnly.get(nName);
        if (candidate && candidate !== 'ambiguous') {
          existingMatch = candidate;
        }
      }

      // Compute MRP and Selling Price cleanly
      const baseExistingMrp = existingMatch?.originalPrice || existingMatch?.finalPrice || 0;
      const baseExistingSp = existingMatch?.finalPrice || baseExistingMrp;

      let mrp = rawMrp > 0 ? rawMrp : rawSellingPrice > 0 ? rawSellingPrice : baseExistingMrp;
      let sellingPrice = rawSellingPrice > 0 ? rawSellingPrice : rawMrp > 0 ? rawMrp : baseExistingSp;

      if (mrp < sellingPrice) {
        mrp = sellingPrice;
      }

      const discountPercent =
        mrp > sellingPrice && mrp > 0
          ? Math.round(((mrp - sellingPrice) / mrp) * 100)
          : 0;

      if (existingMatch) {
        // UPDATE EXISTING: Only overwrite imageUrl if Excel cell is non-empty!
        const hasNewImageUrl = rowImageUrl.length > 0;
        const resolvedImageUrl = hasNewImageUrl ? rowImageUrl : existingMatch.imageUrl || '';
        const resolvedUnit = rowWeight || existingMatch.unit || '1 Pc';
        const resolvedCategory = rowCategory || existingMatch.category || 'General Kirana';
        const resolvedInStock =
          rawInStock !== ''
            ? rawInStock.toLowerCase() !== 'false' && rawInStock !== '0'
            : existingMatch.isAvailable !== false;
        const resolvedStockCount =
          rawStockCount > 0
            ? Math.round(rawStockCount)
            : existingMatch.stockCount ?? existingMatch.stock ?? 50;

        const updatedProduct: Product = {
          ...existingMatch,
          name: itemName,
          hindiName: rowHindiName || existingMatch.hindiName || '',
          category: resolvedCategory,
          unit: resolvedUnit,
          originalPrice: mrp,
          finalPrice: sellingPrice,
          discountPercent,
          imageUrl: resolvedImageUrl,
          isAvailable: resolvedInStock,
          stockCount: resolvedStockCount,
          stock: resolvedStockCount,
          updatedAt: now,
        };

        mappedRows.push({
          rowIndex: index + 1,
          action: 'update',
          product: updatedProduct,
          matchedExistingName: existingMatch.name,
          imagePreservedFromStore: !hasNewImageUrl && Boolean(existingMatch.imageUrl),
        });
      } else {
        // ADD NEW PRODUCT
        const resolvedUnit = rowWeight || '1 Pc';
        const resolvedCategory = rowCategory || 'General Kirana';
        const resolvedInStock =
          rawInStock !== ''
            ? rawInStock.toLowerCase() !== 'false' && rawInStock !== '0'
            : true;
        const resolvedStockCount = rawStockCount > 0 ? Math.round(rawStockCount) : 50;

        const newProduct: Product = {
          id: rowId || `excel_${now}_${index}`,
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
          imagePreservedFromStore: false,
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
  };

  const handleParseFile = async (file: File) => {
    setParseError(null);
    const lowerName = file.name.toLowerCase();

    try {
      if (lowerName.endsWith('.csv')) {
        Papa.parse<Record<string, unknown>>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processParsedRows(results.data || [], file);
          },
          error: (err) => {
            setParseError(err?.message || 'CSV फाइल पढ़ने में त्रुटि हुई।');
            setPreviewRows(null);
          },
        });
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
        processParsedRows(jsonRows, file);
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
    setSaveProgress({ current: 0, total: previewRows.length });

    try {
      const productsToUpsert = previewRows.map((r) => r.product);
      const result = await batchUpsertProductsToFirestore(
        productsToUpsert,
        100,
        (current, total) => setSaveProgress({ current, total })
      );

      // Sync central inventory quietly in background
      saveBulkProductsToCentralInventory(productsToUpsert).catch(() => {});

      onCatalogUpdated(result.mergedProducts);
      showToast(
        'success',
        `सफलतापूर्वक अपडेट हुआ! ${updateCount} आइटम अपडेट किए गए और ${newCount} नए आइटम स्टोर में जोड़े गए।`
      );
      setPreviewRows(null);
      setFileName(null);
      setFileSize(null);
    } catch (err: any) {
      console.error('Batch save error:', err);
      showToast(
        'error',
        err?.message || 'Firestore में सेव करने में समस्या आई। कृपया पुनः प्रयास करें।'
      );
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  const updateCount = useMemo(
    () => (previewRows ? previewRows.filter((r) => r.action === 'update').length : 0),
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
              अपनी `.xlsx`, `.xls` या `.csv` फाइल अपलोड करें — पुराने आइटम्स का रेट/MRP अपडेट होगा (मौजूदा Supabase फोटो सुरक्षित रहेगी) और नए आइटम अपने-आप जुड़ जाएंगे।
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
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-[0.98] text-stone-800 border border-stone-300 text-xs sm:text-sm font-heading font-bold transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowUpDown className="w-4 h-4 text-stone-600 shrink-0" />
              <span>वर्तमान स्टोर डेटा (.xlsx)</span>
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
            <strong className="text-stone-900">Image URL</strong> (खाली होने पर पुरानी फोटो सुरक्षित रहेगी)
          </span>
        </div>

        {/* Tap-Friendly Mobile Upload Dropzone with Direct Overlay File Input */}
        <div
          id="excel-uploader-dropzone"
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative overflow-hidden cursor-pointer select-none block w-full rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
            dragActive
              ? 'border-emerald-600 bg-emerald-50/80 scale-[0.995]'
              : 'border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/70'
          }`}
        >
          <input
            id="excel-file-picker"
            ref={fileInputRef}
            type="file"
            accept="*/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            onChange={handleFileChange}
          />

          <div className="flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="font-heading font-black text-stone-900 text-base sm:text-lg">
                {fileName ? `चयनित फाइल: ${fileName} (${fileSize})` : 'Excel (.xlsx / .xls) या CSV फाइल चुनें'}
              </p>
              <p className="text-xs sm:text-sm text-stone-600">
                मोबाइल से सीधे फाइल मैनेजर खोलने के लिए यहाँ टैप करें या फाइल ड्रैग करें
              </p>
            </div>

            <span className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-heading font-extrabold shadow-xs whitespace-nowrap">
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <span>{fileName ? 'दूसरी फाइल चुनें' : 'फाइल चुनें (Browse Files)'}</span>
            </span>
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
                  {previewRows.length} आइटम मिले: {updateCount} अपडेट होंगे, {newCount} नए जुड़ेंगे
                </span>
                {skippedCount > 0 && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md tabular-nums">
                    {skippedCount} खाली पंक्तियाँ छोड़ी गईं
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>मौजूदा उत्पादों की Supabase फोटो सुरक्षित रहेगी जब तक Excel में नया Image URL न दिया गया हो।</span>
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
                      सेव हो रहा है ({saveProgress?.current ?? 0}/{saveProgress?.total ?? previewRows.length})...
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>✅ कन्फर्म और स्टोर में अपडेट करें</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Saving Progress Bar */}
          {isSaving && saveProgress && (
            <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-200">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 mb-1.5 tabular-nums">
                <span>Firebase Firestore में बैच अपलोड जारी है...</span>
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
                onClick={() => setPreviewFilter('update')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap tabular-nums ${
                  previewFilter === 'update'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                }`}
              >
                अपडेट होंगे ({updateCount})
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
                    <tr key={`${p.id}_${row.rowIndex}`} className="hover:bg-stone-50/80">
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
                          {row.imagePreservedFromStore && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                              <ImageIcon className="w-3 h-3" />
                              पुरानी फोटो सुरक्षित
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
                        {row.action === 'update' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold">
                            <RefreshCw className="w-3 h-3" />
                            <span>अपडेट</span>
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
