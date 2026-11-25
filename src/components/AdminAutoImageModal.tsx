import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Wand2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  ClipboardPaste,
  FolderOpen,
  Sparkles,
  ShieldCheck,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Product } from '../types';
import { supabase } from '../services/supabaseClient';
import { batchUpsertProductsToFirestore } from '../services/firebase';
import { BlinkitProductPlaceholder } from './BlinkitProductPlaceholder';
import {
  buildGoogleStudioSearchUrl,
  extractClipboardImageOrUrl,
  hasRealDisplayImage,
  hasSupabaseStorageImage,
  savePermanentImageToSupabaseProduct,
  uploadStudioImageToSupabase,
} from '../utils/studioImageUpload';

interface AdminAutoImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCatalogUpdated: (updatedProducts: Product[], summaryMessage?: string) => void;
}

interface StudioCatalogItem {
  key: string;
  supabaseId?: string;
  storeProductId?: string;
  name: string;
  hindiName?: string;
  category: string;
  unit: string;
  price: number;
  originalPrice: number;
  imageUrl: string;
}

const normalizeNameKey = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeWeightKey = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '');

export const AdminAutoImageModal: React.FC<AdminAutoImageModalProps> = ({
  isOpen,
  onClose,
  products,
  onCatalogUpdated,
}) => {
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [supabaseSafeCount, setSupabaseSafeCount] = useState(0);
  const [externalBadCount, setExternalBadCount] = useState(0);
  const [pendingItems, setPendingItems] = useState<StudioCatalogItem[]>([]);

  // Cleanup action state
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState<{ done: number; total: number } | null>(null);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Studio uploader filters & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Per-item upload states
  const [pasteInputs, setPasteInputs] = useState<Record<string, string>>({});
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>({});
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [completedItemsMap, setCompletedItemsMap] = useState<Record<string, string>>({});

  const latestProductsRef = useRef<Product[]>(products);
  latestProductsRef.current = products;

  const showModalToast = (type: 'success' | 'error', text: string) => {
    setActionToast({ type, text });
    setTimeout(() => {
      setActionToast((prev) => (prev?.text === text ? null : prev));
    }, 6500);
  };

  const scanStoreCatalogImages = async () => {
    setIsLoadingCatalog(true);
    setLoadError(null);
    try {
      const storeById = new Map<string, Product>();
      const storeByNameWeight = new Map<string, Product>();
      for (const p of latestProductsRef.current) {
        if (p.id) storeById.set(p.id.trim(), p);
        const nw = `${normalizeNameKey(p.name)}::${normalizeWeightKey(p.unit || '1 Pc')}`;
        if (!storeByNameWeight.has(nw)) {
          storeByNameWeight.set(nw, p);
        }
      }

      const supabaseRows: any[] = [];
      const pageSize = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, category, unit, price, original_price, image_url')
          .range(from, from + pageSize - 1);

        if (error) {
          throw new Error(`Supabase से प्रोडक्ट्स लोड करने में त्रुटि: ${error.message}`);
        }
        if (!data || data.length === 0) break;
        supabaseRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      let safeSupa = 0;
      let badExternal = 0;
      const itemsNeedingStudio: StudioCatalogItem[] = [];
      const seenKeys = new Set<string>();

      for (const row of supabaseRows) {
        const sbId = String(row.id || '').trim();
        const name = String(row.name || '').trim();
        if (!name) continue;
        const unit = String(row.unit || '1 Pc').trim() || '1 Pc';
        const nwKey = `${normalizeNameKey(name)}::${normalizeWeightKey(unit)}`;
        const matchedStore = storeById.get(sbId) || storeByNameWeight.get(nwKey);
        const rawUrl = String(row.image_url || '').trim();

        if (sbId) seenKeys.add(sbId);
        seenKeys.add(nwKey);

        if (hasSupabaseStorageImage(rawUrl)) {
          safeSupa += 1;
          continue;
        }

        if (rawUrl !== '') {
          badExternal += 1;
        }

        itemsNeedingStudio.push({
          key: sbId || nwKey,
          supabaseId: sbId || undefined,
          storeProductId: matchedStore?.id,
          name,
          hindiName: matchedStore?.hindiName || '',
          category: String(row.category || matchedStore?.category || 'General Grocery'),
          unit,
          price: Number(row.price || row.original_price || matchedStore?.finalPrice || 0),
          originalPrice: Number(row.original_price || row.price || matchedStore?.originalPrice || 0),
          imageUrl: rawUrl,
        });
      }

      // Include any store-state items that are not in Supabase yet and do not have a supabase.co/storage image
      for (const p of latestProductsRef.current) {
        const pId = (p.id || '').trim();
        const nwKey = `${normalizeNameKey(p.name)}::${normalizeWeightKey(p.unit || '1 Pc')}`;
        if ((pId && seenKeys.has(pId)) || seenKeys.has(nwKey)) continue;

        seenKeys.add(nwKey);
        const rawUrl = String(p.imageUrl || '').trim();
        if (hasSupabaseStorageImage(rawUrl)) {
          safeSupa += 1;
          continue;
        }

        if (rawUrl !== '' && hasRealDisplayImage(rawUrl)) {
          badExternal += 1;
        }

        itemsNeedingStudio.push({
          key: pId || nwKey,
          storeProductId: pId,
          name: p.name,
          hindiName: p.hindiName || '',
          category: p.category || 'General Grocery',
          unit: p.unit || '1 Pc',
          price: Number(p.finalPrice || p.originalPrice || 0),
          originalPrice: Number(p.originalPrice || p.finalPrice || 0),
          imageUrl: rawUrl,
        });
      }

      setSupabaseSafeCount(safeSupa);
      setExternalBadCount(badExternal);
      setPendingItems(itemsNeedingStudio);
    } catch (err: any) {
      console.error('Studio image scan error:', err);
      setLoadError(err?.message || 'प्रोडक्ट सूची लोड करने में समस्या आई।');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCompletedItemsMap({});
      setItemErrors({});
      setPasteInputs({});
      setCurrentPage(1);
      void scanStoreCatalogImages();
    }
  }, [isOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, statusFilter]);

  /**
   * 1. Instant Cleanup of All Bad/External Auto-Fetched Images
   * Preserves 100% of original supabase.co/storage images untouched.
   */
  const handleCleanLiveStore = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    setCleanProgress(null);
    setActionToast(null);

    try {
      // Fetch all rows from Supabase to find every non-supabase.co/storage image_url
      const rowsToClearIds: string[] = [];
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('id, image_url')
          .range(from, from + pageSize - 1);

        if (error) {
          throw new Error(`Supabase पढ़ने में त्रुटि: ${error.message}`);
        }
        if (!data || data.length === 0) break;

        for (const row of data) {
          const url = String(row.image_url || '').trim();
          // ONLY clear rows that have a non-empty image_url NOT containing supabase.co/storage
          if (url !== '' && !hasSupabaseStorageImage(url)) {
            rowsToClearIds.push(String(row.id));
          }
        }

        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Clear Supabase rows in safe batches of 30 IDs
      const BATCH_SIZE = 30;
      if (rowsToClearIds.length > 0) {
        setCleanProgress({ done: 0, total: rowsToClearIds.length });
        for (let i = 0; i < rowsToClearIds.length; i += BATCH_SIZE) {
          const chunk = rowsToClearIds.slice(i, i + BATCH_SIZE);
          const { error: updErr } = await supabase
            .from('products')
            .update({ image_url: '' })
            .in('id', chunk);

          if (updErr) {
            throw new Error(`बैच क्लीनअप त्रुटि: ${updErr.message}`);
          }

          setCleanProgress({
            done: Math.min(i + chunk.length, rowsToClearIds.length),
            total: rowsToClearIds.length,
          });
        }
      }

      // Also clean any non-supabase.co/storage imageUrl in live store & Firestore without touching supabase.co/storage items
      const modifiedForFirestore: Product[] = [];
      const cleanedCatalog = latestProductsRef.current.map((prod) => {
        const currentUrl = String(prod.imageUrl || '').trim();
        if (hasSupabaseStorageImage(currentUrl)) {
          return prod; // 100% untouched
        }
        if (currentUrl !== '') {
          const updatedProd: Product = {
            ...prod,
            imageUrl: '',
            updatedAt: Date.now(),
          };
          modifiedForFirestore.push(updatedProd);
          return updatedProd;
        }
        return prod;
      });

      if (modifiedForFirestore.length > 0) {
        await batchUpsertProductsToFirestore(modifiedForFirestore, 100).catch((err) => {
          console.warn('Firestore cleanup sync warning:', err);
        });
      }

      // Update modal local items & counts immediately
      setExternalBadCount(0);
      setPendingItems((prev) => prev.map((it) => ({ ...it, imageUrl: '' })));

      const toastText = '✅ सभी बाहरी/खराब फोटो हटा दी गईं, स्टोर साफ़ हो गया है!';
      showModalToast('success', toastText);
      onCatalogUpdated(cleanedCatalog, toastText);
    } catch (err: any) {
      console.error('Clean Live Store error:', err);
      showModalToast('error', err?.message || 'फोटो हटाने में समस्या आई, कृपया पुनः प्रयास करें।');
    } finally {
      setIsCleaning(false);
      setCleanProgress(null);
    }
  };

  /**
   * 3b. Compress & upload pasted image / pasted URL / gallery file to Supabase Storage `product-images`
   * and save the permanent URL to `products` table + Firestore + live store state.
   */
  const handleStudioSourceUpload = async (
    item: StudioCatalogItem,
    source: File | Blob | string
  ) => {
    const key = item.key;
    setUploadingKeys((prev) => ({ ...prev, [key]: true }));
    setItemErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const permanentUrl = await uploadStudioImageToSupabase(source, item.name);

      const dbResult = await savePermanentImageToSupabaseProduct({
        supabaseId: item.supabaseId,
        productId: item.storeProductId,
        name: item.name,
        category: item.category,
        unit: item.unit,
        price: item.price,
        originalPrice: item.originalPrice,
        permanentUrl,
      });

      if (!dbResult.saved) {
        throw new Error(dbResult.error || 'Supabase products टेबल में URL सेव नहीं हो सका।');
      }

      // Update live store state & Firestore
      const nwTarget = `${normalizeNameKey(item.name)}::${normalizeWeightKey(item.unit)}`;
      const updatedForFirestore: Product[] = [];
      let matchedInCatalog = false;

      const nextCatalog = latestProductsRef.current.map((prod) => {
        const nw = `${normalizeNameKey(prod.name)}::${normalizeWeightKey(prod.unit || '1 Pc')}`;
        const isMatch =
          (item.storeProductId && prod.id === item.storeProductId) ||
          (item.supabaseId && prod.id === item.supabaseId) ||
          nw === nwTarget;

        if (isMatch) {
          matchedInCatalog = true;
          const updatedProd: Product = {
            ...prod,
            imageUrl: permanentUrl,
            updatedAt: Date.now(),
          };
          updatedForFirestore.push(updatedProd);
          return updatedProd;
        }
        return prod;
      });

      if (!matchedInCatalog) {
        const newProd: Product = {
          id: dbResult.supabaseId || item.supabaseId || item.storeProductId || `prod_${Date.now()}`,
          name: item.name,
          hindiName: item.hindiName || item.name,
          category: item.category,
          department: 'grocery',
          unit: item.unit,
          originalPrice: item.originalPrice || item.price,
          finalPrice: item.price || item.originalPrice,
          discountPercent: 0,
          imageUrl: permanentUrl,
          isAvailable: true,
          stock: 50,
          updatedAt: Date.now(),
        };
        nextCatalog.unshift(newProd);
        updatedForFirestore.push(newProd);
      }

      if (updatedForFirestore.length > 0) {
        await batchUpsertProductsToFirestore(updatedForFirestore, 20).catch((e) => {
          console.warn('Firestore studio image sync warning:', e);
        });
      }

      onCatalogUpdated(nextCatalog);

      // Mark item Done & update counters
      setCompletedItemsMap((prev) => ({ ...prev, [key]: permanentUrl }));
      setPendingItems((prev) =>
        prev.map((it) =>
          it.key === key
            ? {
                ...it,
                supabaseId: dbResult.supabaseId || it.supabaseId,
                imageUrl: permanentUrl,
              }
            : it
        )
      );
      setSupabaseSafeCount((c) => c + 1);
      setPasteInputs((prev) => ({ ...prev, [key]: '' }));
    } catch (err: any) {
      console.error('Studio upload error:', err);
      setItemErrors((prev) => ({
        ...prev,
        [key]: err?.message || 'फोटो अपलोड नहीं हो सकी।',
      }));
    } finally {
      setUploadingKeys((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handlePasteInBox = async (
    e: React.ClipboardEvent<HTMLInputElement>,
    item: StudioCatalogItem
  ) => {
    const extracted = extractClipboardImageOrUrl(e.clipboardData);
    if (!extracted) return;
    e.preventDefault();
    if (typeof extracted === 'string') {
      setPasteInputs((prev) => ({ ...prev, [item.key]: extracted }));
    }
    await handleStudioSourceUpload(item, extracted);
  };

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const item of pendingItems) {
      if (item.category) set.add(item.category);
    }
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [pendingItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pendingItems.filter((item) => {
      const isDone = Boolean(completedItemsMap[item.key]);
      if (statusFilter === 'pending' && isDone) return false;
      if (statusFilter === 'done' && !isDone) return false;

      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.hindiName && item.hindiName.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        item.unit.toLowerCase().includes(q)
      );
    });
  }, [pendingItems, searchQuery, selectedCategory, statusFilter, completedItemsMap]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, safePage]);

  const doneCount = Object.keys(completedItemsMap).length;
  const remainingPendingCount = Math.max(0, pendingItems.length - doneCount);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-image-modal-title"
    >
      <div className="bg-stone-50 rounded-3xl border border-stone-300 shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-stone-900 text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-stone-950 flex items-center justify-center shadow-sm shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="studio-image-modal-title"
                className="font-heading font-black text-base sm:text-lg leading-tight truncate"
              >
                Blinkit / Amazon स्टूडियो फोटो और क्लीनअप मैनेजर
              </h3>
              <p className="text-[11px] text-stone-300 mt-0.5 line-clamp-1">
                बाहरी/खराब ऑटो फोटो साफ़ करें — असली Supabase Storage फोटो ({supabaseSafeCount}) 100% सुरक्षित रहेंगी
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-auto-image-modal-btn"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close Studio Image Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Action Toast */}
          {actionToast && (
            <div
              className={`rounded-2xl px-4 py-3 border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-xs ${
                actionToast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionToast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{actionToast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionToast(null)}
                className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. Prominent Top Cleanup Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold tabular-nums">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{supabaseSafeCount} असली Supabase फोटो सुरक्षित</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
                      externalBadCount > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-stone-100 border-stone-200 text-stone-700'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{externalBadCount} बाहरी/खराब ऑटो फोटो</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-950">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{remainingPendingCount} को स्टूडियो फोटो चाहिए</span>
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  क्लीनअप केवल Open Food Facts / Wikimedia / बाहरी लिंक हटाता है — <strong>supabase.co/storage</strong> वाली किसी भी फोटो को नहीं छुएगा।
                </p>
              </div>

              <button
                type="button"
                id="clean-live-store-images-btn"
                onClick={handleCleanLiveStore}
                disabled={isCleaning || isLoadingCatalog}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs sm:text-sm font-heading font-black shadow-sm transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isCleaning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>
                      साफ़ हो रहा है
                      {cleanProgress ? ` (${cleanProgress.done}/${cleanProgress.total})` : '...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span>🧹 सभी गलत/ऑटो फोटो तुरंत हटाएँ (Clean Live Store)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Fast Studio Photo Uploader List */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-heading font-black text-stone-900 text-sm sm:text-base">
                  📸 Blinkit / Amazon Studio Photo Uploader ({filteredItems.length} आइटम्स)
                </h4>
                <p className="text-[11px] text-stone-500">
                  &quot;🔍 फ्रेश पैक फोटो खोजें&quot; से साफ पैक फोटो कॉपी करें और बॉक्स में Ctrl+V पेस्ट करें या गैलरी से चुनें — फोटो अपने आप कंप्रेस होकर Supabase Storage में सेव हो जाएगी।
                </p>
              </div>

              {doneCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black tabular-nums shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>आज अपलोड: {doneCount} Done</span>
                </span>
              )}
            </div>

            {/* Search & Category Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="आइटम नाम, हिंदी नाम, ब्रांड या वजन खोजें..."
                  className="w-full min-h-[42px] pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <Filter className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="min-h-[42px] pl-8 pr-7 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:bg-white focus:border-emerald-600 focus:outline-hidden cursor-pointer"
                    aria-label="Filter by Category"
                  >
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'All' ? 'सभी कैटेगरी' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-[11px] font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      statusFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('pending')}
                    className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      statusFilter === 'pending' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('done')}
                    className={`px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      statusFilter === 'done' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-stone-600'
                    }`}
                  >
                    Done ({doneCount})
                  </button>
                </div>
              </div>
            </div>

            {/* Catalog Loading / Error / Empty / List */}
            {isLoadingCatalog ? (
              <div className="flex items-center justify-center gap-3 py-10 text-sm font-bold text-stone-700">
                <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
                <span>Supabase और स्टोर डेटाबेस स्कैन हो रहा है...</span>
              </div>
            ) : loadError ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-center justify-between gap-3 text-rose-900 text-xs font-bold">
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={scanStoreCatalogImages}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white cursor-pointer"
                >
                  पुनः लोड करें
                </button>
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-heading font-extrabold text-stone-900 text-sm">
                  {pendingItems.length === 0
                    ? 'बधाई हो! सभी प्रोडक्ट्स में असली Supabase Storage फोटो मौजूद हैं।'
                    : 'इस खोज या फ़िल्टर में कोई आइटम नहीं मिला।'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {paginatedItems.map((item) => {
                  const uploadedUrl = completedItemsMap[item.key];
                  const isDone = Boolean(uploadedUrl);
                  const isUploading = Boolean(uploadingKeys[item.key]);
                  const errMsg = itemErrors[item.key];
                  const pasteVal = pasteInputs[item.key] || '';
                  const googleSearchUrl = buildGoogleStudioSearchUrl(item.name, item.unit);

                  return (
                    <div
                      key={item.key}
                      className={`rounded-2xl border p-3 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-300'
                          : 'bg-stone-50/70 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {/* Left: Preview Thumbnail + Product Details */}
                      <div className="flex items-center gap-3 min-w-0 lg:w-[36%]">
                        <div className="w-14 h-14 rounded-xl bg-white border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          {uploadedUrl ? (
                            <img
                              src={uploadedUrl}
                              alt={item.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <BlinkitProductPlaceholder
                              name={item.name}
                              category={item.category}
                              weight={item.unit}
                              compact
                            />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-heading font-extrabold text-xs sm:text-sm text-stone-900 line-clamp-1">
                              {item.name}
                            </span>
                            {isDone && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black shrink-0">
                                ✅ Done
                              </span>
                            )}
                          </div>
                          {item.hindiName && (
                            <div className="text-[11px] text-stone-500 line-clamp-1">
                              {item.hindiName}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-stone-600 font-semibold mt-0.5 tabular-nums">
                            <span className="px-1.5 py-0.2 rounded bg-white border border-stone-200 text-stone-800">
                              {item.unit}
                            </span>
                            <span className="truncate">{item.category}</span>
                            {item.price > 0 && <span>· ₹{item.price}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Search + Paste/URL + Gallery Upload Controls */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                        {/* a) Google Images Search Button */}
                        <a
                          href={googleSearchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[40px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 text-stone-900 border border-stone-300 hover:border-amber-400 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                        >
                          <Search className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>🔍 फ्रेश पैक फोटो खोजें</span>
                          <ExternalLink className="w-3 h-3 text-stone-400 shrink-0" />
                        </a>

                        {/* b) Instant Clipboard Image / Link Paste Box */}
                        <div className="relative flex-1 min-w-[190px] flex items-center gap-1.5">
                          <div className="relative flex-1">
                            <ClipboardPaste className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={pasteVal}
                              disabled={isUploading}
                              onChange={(e) =>
                                setPasteInputs((prev) => ({
                                  ...prev,
                                  [item.key]: e.target.value,
                                }))
                              }
                              onPaste={(e) => void handlePasteInBox(e, item)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && pasteVal.trim()) {
                                  e.preventDefault();
                                  void handleStudioSourceUpload(item, pasteVal.trim());
                                }
                              }}
                              placeholder="📋 फोटो / लिंक पेस्ट करें (Ctrl+V)"
                              className="w-full min-h-[40px] pl-8 pr-2.5 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-hidden disabled:opacity-60"
                            />
                          </div>
                          {pasteVal.trim() && !isUploading && (
                            <button
                              type="button"
                              onClick={() => void handleStudioSourceUpload(item, pasteVal.trim())}
                              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0"
                            >
                              सेव
                            </button>
                          )}
                        </div>

                        {/* c) Gallery / File Picker with Direct Overlay Input */}
                        <div className="relative overflow-hidden rounded-xl cursor-pointer shrink-0">
                          <button
                            type="button"
                            disabled={isUploading}
                            className={`min-h-[40px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                              isUploading
                                ? 'bg-stone-200 text-stone-600'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                                <span>अपलोड हो रहा...</span>
                              </>
                            ) : (
                              <>
                                <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                                <span>📁 गैलरी से चुनें</span>
                              </>
                            )}
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (file) {
                                void handleStudioSourceUpload(item, file);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            aria-label={`Choose photo for ${item.name}`}
                          />
                        </div>
                      </div>

                      {errMsg && (
                        <div className="w-full lg:hidden text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                          {errMsg}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Desktop per-item error display for any visible item */}
            {paginatedItems.some((it) => itemErrors[it.key]) && (
              <div className="hidden lg:block space-y-1.5 pt-1">
                {paginatedItems
                  .filter((it) => itemErrors[it.key])
                  .map((it) => (
                    <div
                      key={`err-${it.key}`}
                      className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        <strong>{it.name}:</strong> {itemErrors[it.key]}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-stone-700 tabular-nums">
                <span>
                  Showing {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(safePage * ITEMS_PER_PAGE, filteredItems.length)} of{' '}
                  {filteredItems.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 disabled:opacity-40 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>
                  <span>
                    Page {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 disabled:opacity-40 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
