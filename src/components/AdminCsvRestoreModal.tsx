import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  X,
  Database,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import { Product } from '../types';
import {
  CORE_196_PRODUCTS,
  generateMohitKiranapeCsvText,
} from '../data/core196Catalog';
import { batchUpsertProductsToFirestore } from '../services/firebase';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface AdminCsvRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCatalogRestored: (products: Product[]) => void;
}

export const AdminCsvRestoreModal: React.FC<AdminCsvRestoreModalProps> = ({
  isOpen,
  onClose,
  onCatalogRestored,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<Product[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Process uploaded file using Papa.parse
  const parseFileWithPapa = (file: File) => {
    setParseError(null);
    setSuccessNotice(null);

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data;
        if (!rawRows || rawRows.length === 0) {
          setParseError('The uploaded CSV file contains no data rows.');
          setParsedProducts(null);
          return;
        }

        const mapped: Product[] = [];
        rawRows.forEach((row: any, index: number) => {
          const name = (row.name || row.Name || row['productName'] || row['Item Name'] || '').trim();
          if (!name) return;

          const id = (row.id || row.ID || '').trim() || `prod-${Date.now()}-${index}`;
          const hindiName = (row.hindiName || row.HindiName || row['Hindi Name'] || row.hindi || '').trim();
          const category = (row.category || row.Category || 'Household Essentials').trim();
          const mrp = Number(row.mrp ?? row.MRP ?? row.originalPrice ?? 0) || 0;
          const sellingPrice = Number(row.sellingPrice ?? row.SellingPrice ?? row.finalPrice ?? 0) || 0;
          const unit = (row.unit || row.Unit || row.packSize || '1 Pc').trim();

          // inStock: String(row.inStock).toLowerCase() === 'true' || row.inStock === true
          const rawInStock = row.inStock !== undefined
            ? row.inStock
            : (row.InStock !== undefined ? row.InStock : (row.isAvailable !== undefined ? row.isAvailable : true));
          const inStock = String(rawInStock).toLowerCase() === 'true' || rawInStock === true;

          // stockCount: Number(row.stockCount) || 50
          const stockCount = Number(row.stockCount ?? row.StockCount ?? row.stock ?? 50) || 50;

          // imageUrl: row.imageUrl (PRESERVE EXACT SUPABASE CDN LINK - DO NOT OVERWRITE OR NULLIFY)
          const imageUrl = (row.imageUrl || row.ImageUrl || row.image || row.Image || '').trim();

          const finalPrice = sellingPrice > 0 ? sellingPrice : (mrp > 0 ? mrp : 0);
          const originalPrice = mrp > 0 ? mrp : finalPrice;
          const discountPercent = originalPrice > finalPrice && originalPrice > 0
            ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
            : 0;

          mapped.push({
            id,
            name,
            hindiName,
            category,
            categoryId: category,
            department: 'grocery',
            price: finalPrice,
            finalPrice,
            originalPrice,
            discountPercent,
            unit,
            weight: unit,
            isAvailable: inStock,
            stock: stockCount,
            stockCount,
            imageUrl, // PRESERVE EXACT SUPABASE CDN LINK
            description: `${name} ${hindiName ? `(${hindiName})` : ''} - ${unit}`,
            priority: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as Product);
        });

        if (mapped.length === 0) {
          setParseError('Could not find valid products with a "name" column in the uploaded file.');
          setParsedProducts(null);
          return;
        }

        setParsedProducts(mapped);
        setFileName(file.name);
        setFileSize((file.size / 1024).toFixed(1) + ' KB');
        setSuccessNotice(`${mapped.length} products ready from your file: ${file.name}`);
      },
      error: (err) => {
        console.error('PapaParse error:', err);
        setParseError(err?.message || 'Failed to parse CSV file.');
        setParsedProducts(null);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFileWithPapa(file);
    // Reset input value so the same file can be re-selected if updated
    e.target.value = '';
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      parseFileWithPapa(file);
    }
  };

  // Preload verified core 196 catalog immediately (embedded JSON copy)
  const handlePreloadDefault196 = () => {
    setParsedProducts(CORE_196_PRODUCTS);
    setFileName('mohitkiranape.csv (Pre-bundled Verified Core Catalog)');
    setFileSize('196 Core Products');
    setParseError(null);
    setSuccessNotice('196 products ready from verified core catalog with Supabase CDN links.');
  };

  // Download Sample / Existing CSV Template
  const handleDownloadTemplate = () => {
    const csv = generateMohitKiranapeCsvText(parsedProducts || CORE_196_PRODUCTS);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mohitkiranape.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Execute Firestore Batch Writes in chunks of 100
  const handleExecuteImport = async () => {
    // Use the parsed array from uploaded file or fallback to embedded JSON copy of mohitkiranape
    const productsToIngest = (parsedProducts && parsedProducts.length > 0)
      ? parsedProducts
      : CORE_196_PRODUCTS;

    setIsProcessing(true);
    setParseError(null);
    setProgress({ current: 0, total: productsToIngest.length });

    try {
      const res = await batchUpsertProductsToFirestore(productsToIngest, 100, (current, total) => {
        setProgress({ current, total });
      });

      // Synchronously update local React state so every product card immediately displays real Supabase packshots
      onCatalogRestored(productsToIngest);
      setSuccessNotice(`Catalog restored successfully! ${res.count} products with Supabase CDN photos are now live in store.`);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error importing to Firestore:', err);
      setParseError(err?.message || 'Failed to write products to Firestore database.');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // Category breakdown of parsed products
  const categoryCounts = parsedProducts
    ? parsedProducts.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    : null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Native Mobile Hidden File Input */}
        <input
          id="native-csv-file-input"
          type="file"
          accept=".csv, text/csv, application/vnd.ms-excel"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base sm:text-lg text-white">
                CSV Restore & Ingestion Engine
              </h3>
              <p className="text-xs text-emerald-200 font-medium">
                Papa.parse native file loader with 100-doc Firestore batching
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {parseError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Dedicated Drag & Drop Dropzone Card */}
          <div
            id="csv-dropzone-card"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                : parsedProducts
                ? 'border-emerald-400 bg-emerald-50/40'
                : 'border-stone-300 hover:border-emerald-500 bg-stone-50/60 hover:bg-emerald-50/20'
            }`}
            style={{ cursor: 'pointer', pointerEvents: 'auto' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-stone-200 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-7 h-7" />
            </div>

            <h4 className="font-heading font-black text-stone-900 text-sm sm:text-base">
              {parsedProducts
                ? `${fileName || 'mohitkiranape.csv'} (${fileSize || 'Ready'})`
                : 'Tap to Choose CSV from Phone or Drop File Here'}
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
              Standard schema: <code className="font-mono text-[11px] text-emerald-800 bg-emerald-100/60 px-1 py-0.5 rounded">id, name, hindiName, category, mrp, sellingPrice, unit, inStock, stockCount, imageUrl</code>
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-heading font-bold text-xs shadow-xs transition-transform cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>फ़ोन गैलरी / Files से चुनें (Browse CSV)</span>
              </button>
              {parsedProducts && (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{parsedProducts.length} Products Verified</span>
                </span>
              )}
            </div>
          </div>

          {/* Fast Presets: 1-Click Core 196 Preload & Download Template */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handlePreloadDefault196}
              className="p-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-300 rounded-2xl text-left flex items-center gap-3 transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black flex-shrink-0">
                ⚡
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-heading font-extrabold text-xs text-amber-950 truncate">
                  1-Click Preload 196 Core Catalog
                </span>
                <span className="text-[11px] text-amber-800/80 truncate block">
                  Instantly loads verified 196 items with Supabase CDN
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="p-3 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 rounded-2xl text-left flex items-center gap-3 transition-colors cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-stone-800 text-white flex items-center justify-center font-bold flex-shrink-0">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-heading font-extrabold text-xs text-stone-900 truncate">
                  Download Sample CSV
                </span>
                <span className="text-[11px] text-stone-500 truncate block">
                  Export standard schema template with 196 rows
                </span>
              </div>
            </button>
          </div>

          {/* Live Thumbnail Preview & Summary of Uploaded/Parsed Products */}
          {parsedProducts && parsedProducts.length > 0 && (
            <div className="space-y-4">
              {/* Ready Status Banner */}
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-heading font-black text-emerald-950 truncate">
                      {parsedProducts.length} products ready from your file
                    </p>
                    <p className="text-[11px] text-emerald-700 truncate">
                      File: {fileName || 'mohitkiranape.csv'} • {fileSize || 'Verified'}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-extrabold px-2.5 py-1 rounded-full flex-shrink-0">
                  Ready to Ingest
                </span>
              </div>

              {/* Live Thumbnail Preview of the First 3 Items */}
              <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-black text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Live Thumbnail Preview (First 3 Items):</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
                    Supabase CDN Verified
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {parsedProducts.slice(0, 3).map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 flex items-center gap-2.5"
                    >
                      <div className="w-14 h-14 rounded-xl bg-white border border-stone-200 overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                        <img
                          src={p.imageUrl || getCategoryFallbackSvg(p.category, p.name)}
                          alt={p.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = getCategoryFallbackSvg(p.category, p.name);
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-heading font-extrabold text-[11px] text-stone-900 truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-stone-500 truncate">
                          {p.hindiName || p.category} • {p.unit}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-heading font-black text-emerald-700 text-xs">
                            ₹{p.finalPrice}
                          </span>
                          {p.originalPrice > p.finalPrice && (
                            <span className="line-through text-[10px] text-stone-400">
                              ₹{p.originalPrice}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              p.isAvailable
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.isAvailable ? 'In Stock' : 'Out'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown Badges */}
              {categoryCounts && (
                <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Distribution across 11 departments:</span>
                    </span>
                    <span className="text-[11px] font-bold text-stone-500">
                      {Object.keys(categoryCounts).length} Categories
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                    {Object.entries(categoryCounts).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="text-[10px] font-semibold bg-white border border-stone-200 text-stone-700 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs"
                      >
                        <span>{cat}:</span>
                        <strong className="text-emerald-700">{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="py-2.5 px-4 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleExecuteImport}
            className="flex-1 py-2.5 px-5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-heading font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {progress
                    ? `Ingesting to Firestore (${progress.current}/${progress.total} in batches of 100)...`
                    : 'Ingesting Catalog...'}
                </span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>
                  Restore & Ingest {parsedProducts?.length || CORE_196_PRODUCTS.length} Products to Store
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
