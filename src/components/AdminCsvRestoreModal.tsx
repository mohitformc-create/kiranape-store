import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  X,
  Database,
  ArrowRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { Product } from '../types';
import {
  CORE_196_PRODUCTS,
  generateMohitKiranapeCsvText,
  parseMohitKiranapeCsv,
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

  // Process raw text through strict parser
  const handleProcessCsvText = (text: string, name: string, size?: number) => {
    setParseError(null);
    setSuccessNotice(null);
    try {
      const res = parseMohitKiranapeCsv(text);
      if (res.error) {
        setParseError(res.error);
        setParsedProducts(null);
        return;
      }
      if (res.products.length === 0) {
        setParseError('No valid product rows found in CSV file.');
        setParsedProducts(null);
        return;
      }

      setParsedProducts(res.products);
      setFileName(name);
      if (size) {
        setFileSize((size / 1024).toFixed(1) + ' KB');
      } else {
        setFileSize('Ready');
      }
    } catch (err: any) {
      console.error('Error parsing CSV:', err);
      setParseError(err?.message || 'Invalid CSV format.');
      setParsedProducts(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleProcessCsvText(text, file.name, file.size);
      }
    };
    reader.readAsText(file);
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
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          handleProcessCsvText(text, file.name, file.size);
        }
      };
      reader.readAsText(file);
    }
  };

  // Preload verified core 196 catalog immediately
  const handlePreloadDefault196 = () => {
    setParsedProducts(CORE_196_PRODUCTS);
    setFileName('mohitkiranape.csv (Pre-bundled Verified Core Catalog)');
    setFileSize('196 Core Products');
    setParseError(null);
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
    if (!parsedProducts || parsedProducts.length === 0) return;

    setIsProcessing(true);
    setParseError(null);
    setProgress({ current: 0, total: parsedProducts.length });

    try {
      const res = await batchUpsertProductsToFirestore(parsedProducts, 100, (current, total) => {
        setProgress({ current, total });
      });

      onCatalogRestored(parsedProducts);
      setSuccessNotice(`Catalog restored successfully! ${res.count} products are now live across all 11 categories in store.`);

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
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base sm:text-lg text-white">
                CSV Ingestion & Catalog Restoration Engine
              </h3>
              <p className="text-xs text-emerald-200 font-medium">
                Strict mohitkiranape.csv schema parser with 100-doc Firestore batching
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

          {/* Dedicated Drag & Drop Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
                : parsedProducts
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-stone-300 hover:border-emerald-500 bg-stone-50/60 hover:bg-emerald-50/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-stone-200 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-7 h-7" />
            </div>

            <h4 className="font-heading font-black text-stone-900 text-sm sm:text-base">
              {parsedProducts ? fileName : 'Drop `mohitkiranape.csv` here or Tap to Choose File'}
            </h4>
            <p className="text-xs text-stone-500 max-w-md mx-auto mt-1 leading-relaxed">
              Accepts RFC-4180 CSV with headers: <code className="font-mono text-[11px] text-emerald-800 bg-emerald-100/60 px-1 py-0.5 rounded">id, name, hindiName, category, mrp, sellingPrice, unit, inStock, stockCount, imageUrl</code>
            </p>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
                {parsedProducts ? `${parsedProducts.length} Products Verified` : 'Select from Phone / Desktop'}
              </span>
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

          {/* Parsed Category Breakdown & Summary */}
          {parsedProducts && (
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Parsed & Sanitized Catalog Summary:</span>
                </span>
                <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {parsedProducts.length} Items Ready
                </span>
              </div>

              {categoryCounts && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                  {Object.entries(categoryCounts).map(([cat, count]) => (
                    <span
                      key={cat}
                      className="text-[10px] font-semibold bg-white border border-stone-200 text-stone-700 px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      <span>{cat}:</span>
                      <strong className="text-emerald-700">{count}</strong>
                    </span>
                  ))}
                </div>
              )}

              {/* First 5 Preview Items */}
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
                <div className="px-3 py-1.5 bg-stone-100 text-[11px] font-bold text-stone-600 flex justify-between">
                  <span>Sample Products Preview (First 5):</span>
                  <span>Retaining Supabase CDN URLs</span>
                </div>
                <div className="divide-y divide-stone-100 text-xs">
                  {parsedProducts.slice(0, 5).map((p, idx) => (
                    <div key={p.id || idx} className="p-2.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-200 overflow-hidden flex items-center justify-center p-0.5 flex-shrink-0">
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
                        <p className="font-bold text-stone-900 truncate text-[11px]">{p.name}</p>
                        <p className="text-[10px] text-stone-400 truncate">{p.hindiName || p.category} • {p.unit}</p>
                      </div>
                      <div className="text-right text-[11px]">
                        <span className="font-heading font-black text-emerald-700">₹{p.finalPrice}</span>
                        {p.originalPrice > p.finalPrice && (
                          <span className="line-through text-stone-400 ml-1">₹{p.originalPrice}</span>
                        )}
                        <span className="block text-[9px] text-stone-500 font-semibold">{p.stockCount} in stock</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
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
            disabled={!parsedProducts || isProcessing}
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
                <span>Restore & Ingest {parsedProducts?.length || 0} Products to Store</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
