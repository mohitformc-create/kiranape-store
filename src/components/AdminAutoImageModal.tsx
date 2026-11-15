import React, { useEffect, useRef, useState } from 'react';
import {
  Wand2,
  X,
  Play,
  Pause,
  Square,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { Product } from '../types';
import { supabase, isLocalOrRelativeImageUrl } from '../services/supabaseClient';
import { batchUpsertProductsToFirestore } from '../services/firebase';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface AdminAutoImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCatalogUpdated: (updatedProducts: Product[], summaryMessage?: string) => void;
}

interface MissingImageItem {
  key: string;
  supabaseId?: string;
  storeProductId?: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  storeProduct?: Product;
}

type MatchSource = 'openfoodfacts' | 'wikimedia' | 'svg';

interface ProcessedPreviewItem {
  key: string;
  name: string;
  cleanedQuery: string;
  imageUrl: string;
  source: MatchSource;
  savedToSupabase: boolean;
}

export function isMissingOrPlaceholderImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === '' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower.startsWith('data:image/svg+xml') ||
    lower.includes('placeholder') ||
    lower.includes('no-image') ||
    lower.includes('default-product') ||
    isLocalOrRelativeImageUrl(trimmed)
  ) {
    return true;
  }
  return false;
}

export function cleanProductNameForSearch(rawName: string): string {
  if (!rawName) return '';
  let cleaned = rawName
    .replace(/(?:mrp|rs\.?|inr|₹)?\s*\d+(?:\.\d+)?\s*\/-\s*/gi, ' ')
    .replace(/[₹]/g, ' ')
    .replace(/[([][^)\]]*[)\]]/g, ' ')
    .replace(
      /\b\d+(?:\.\d+)?\s*(?:kg|kgs|kilogram|kilograms|gm|gms|g|gram|grams|mg|ml|ltr|ltrs|litre|litres|liter|liters|l|pc|pcs|piece|pieces|pk|pkt|pack|packs|pouch|bottle|bottles|jar|jars|box|boxes|tin|tins|sachet|sachets|tablet|tablets|tabs|cap|caps|roll|rolls)\b/gi,
      ' '
    )
    .replace(/\b(?:pack\s*of\s*\d+|combo\s*of\s*\d+|\d+\s*x\s*\d+|\d+\s*in\s*1)\b/gi, ' ')
    .replace(/\b(?:pouch|jar|bottle|box|tin|pkt|pack|free|offer|special)\b/gi, ' ')
    .replace(/[/_*+|•,:;!?&]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(' ').filter((w) => w.length > 0);
  if (words.length > 5) {
    cleaned = words.slice(0, 5).join(' ');
  }

  return cleaned || rawName.trim();
}

async function fetchJsonWithTimeout(url: string, timeoutMs: number = 6500): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchOpenFoodFactsImage(query: string): Promise<string | null> {
  if (!query) return null;
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=3`;
  const data = await fetchJsonWithTimeout(url, 6500);
  const items = Array.isArray(data?.products) ? data.products : [];

  for (const prod of items) {
    const candidate = prod?.image_front_small_url || prod?.image_url;
    if (
      typeof candidate === 'string' &&
      /^https?:\/\//i.test(candidate.trim()) &&
      !isMissingOrPlaceholderImage(candidate)
    ) {
      return candidate.trim().replace(/^http:\/\//i, 'https://');
    }
  }
  return null;
}

async function searchWikimediaCommonsImage(query: string): Promise<string | null> {
  if (!query) return null;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    query
  )}&gsrnamespace=6&gsrlimit=2&prop=imageinfo&iiprop=url&iiurlwidth=400&format=json&origin=*`;
  const data = await fetchJsonWithTimeout(url, 6500);
  const pages = data?.query?.pages;
  if (!pages || typeof pages !== 'object') return null;

  for (const page of Object.values<any>(pages)) {
    const info = Array.isArray(page?.imageinfo) ? page.imageinfo[0] : null;
    if (!info) continue;
    const rawOriginal = typeof info.url === 'string' ? info.url.trim() : '';
    const rawThumb = typeof info.thumburl === 'string' ? info.thumburl.trim() : '';
    const candidate = rawThumb || rawOriginal;

    // Ensure the underlying file and thumbnail are .jpg / .jpeg / .png (skip .svg/.pdf/audio/video)
    const isRasterImage =
      /\.(jpe?g|png)(\?|$)/i.test(candidate) &&
      (!rawOriginal || /\.(jpe?g|png)(\?|$)/i.test(rawOriginal));

    if (isRasterImage && /^https?:\/\//i.test(candidate)) {
      return candidate.replace(/^http:\/\//i, 'https://');
    }
  }
  return null;
}

const normalizeNameKey = (v: string) => v.trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeWeightKey = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '');

export const AdminAutoImageModal: React.FC<AdminAutoImageModalProps> = ({
  isOpen,
  onClose,
  products,
  onCatalogUpdated,
}) => {
  const [isLoadingMissing, setIsLoadingMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missingItems, setMissingItems] = useState<MissingImageItem[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [stats, setStats] = useState({
    openfoodfacts: 0,
    wikimedia: 0,
    svg: 0,
    supabaseSaved: 0,
  });
  const [previews, setPreviews] = useState<ProcessedPreviewItem[]>([]);

  const isPausedRef = useRef(false);
  const isStoppedRef = useRef(false);
  const resumeResolverRef = useRef<(() => void) | null>(null);
  const latestProductsRef = useRef<Product[]>(products);
  latestProductsRef.current = products;

  const loadMissingImageProducts = async () => {
    setIsLoadingMissing(true);
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

      const missing: MissingImageItem[] = [];
      const seenKeys = new Set<string>();

      for (const row of supabaseRows) {
        const sbId = String(row.id || '').trim();
        const name = String(row.name || '').trim();
        if (!name) continue;
        const unit = String(row.unit || '1 Pc').trim() || '1 Pc';
        const nwKey = `${normalizeNameKey(name)}::${normalizeWeightKey(unit)}`;
        const matchedStore = storeById.get(sbId) || storeByNameWeight.get(nwKey);

        // NEVER overwrite existing valid product images
        if (!isMissingOrPlaceholderImage(row.image_url)) {
          if (sbId) seenKeys.add(sbId);
          seenKeys.add(nwKey);
          continue;
        }

        if (sbId) seenKeys.add(sbId);
        seenKeys.add(nwKey);

        missing.push({
          key: sbId || nwKey,
          supabaseId: sbId || undefined,
          storeProductId: matchedStore?.id,
          name,
          category: String(row.category || matchedStore?.category || 'General Kirana'),
          unit,
          price: Number(row.price || row.original_price || matchedStore?.finalPrice || 0),
          storeProduct: matchedStore,
        });
      }

      // Also include store-state products missing an image that weren't in Supabase yet
      for (const p of latestProductsRef.current) {
        const pId = (p.id || '').trim();
        const nwKey = `${normalizeNameKey(p.name)}::${normalizeWeightKey(p.unit || '1 Pc')}`;
        if ((pId && seenKeys.has(pId)) || seenKeys.has(nwKey)) continue;
        if (!isMissingOrPlaceholderImage(p.imageUrl)) continue;

        seenKeys.add(nwKey);
        missing.push({
          key: pId || nwKey,
          storeProductId: pId,
          name: p.name,
          category: p.category || 'General Kirana',
          unit: p.unit || '1 Pc',
          price: Number(p.finalPrice || p.originalPrice || 0),
          storeProduct: p,
        });
      }

      setMissingItems(missing);
      setTotalToProcess(missing.length);
    } catch (err: any) {
      console.error('Auto-image scan error:', err);
      setLoadError(err?.message || 'बिना फोटो वाले प्रोडक्ट्स की सूची लोड करने में समस्या आई।');
    } finally {
      setIsLoadingMissing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      isPausedRef.current = false;
      isStoppedRef.current = false;
      setIsRunning(false);
      setIsPaused(false);
      setIsCompleted(false);
      setProcessedCount(0);
      setStats({ openfoodfacts: 0, wikimedia: 0, svg: 0, supabaseSaved: 0 });
      setPreviews([]);
      void loadMissingImageProducts();
    } else {
      isStoppedRef.current = true;
      if (resumeResolverRef.current) {
        resumeResolverRef.current();
        resumeResolverRef.current = null;
      }
    }
  }, [isOpen]);

  const waitIfPaused = async () => {
    if (!isPausedRef.current) return;
    await new Promise<void>((resolve) => {
      resumeResolverRef.current = resolve;
    });
  };

  const handleTogglePause = () => {
    if (!isRunning) return;
    const nextPaused = !isPausedRef.current;
    isPausedRef.current = nextPaused;
    setIsPaused(nextPaused);
    if (!nextPaused && resumeResolverRef.current) {
      resumeResolverRef.current();
      resumeResolverRef.current = null;
    }
  };

  const handleStop = () => {
    isStoppedRef.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
    if (resumeResolverRef.current) {
      resumeResolverRef.current();
      resumeResolverRef.current = null;
    }
  };

  const handleStartAutoFetch = async () => {
    if (isRunning || missingItems.length === 0) return;

    const queue = [...missingItems];
    setIsRunning(true);
    setIsPaused(false);
    setIsCompleted(false);
    isPausedRef.current = false;
    isStoppedRef.current = false;
    setProcessedCount(0);
    setTotalToProcess(queue.length);
    setStats({ openfoodfacts: 0, wikimedia: 0, svg: 0, supabaseSaved: 0 });
    setPreviews([]);

    const BATCH_SIZE = 10;
    let workingCatalog = [...latestProductsRef.current];
    let totalDone = 0;
    let totalSaved = 0;

    try {
      for (let start = 0; start < queue.length; start += BATCH_SIZE) {
        if (isStoppedRef.current) break;
        await waitIfPaused();
        if (isStoppedRef.current) break;

        const batch = queue.slice(start, start + BATCH_SIZE);

        const batchResults = await Promise.all(
          batch.map(async (item) => {
            const cleanedQuery = cleanProductNameForSearch(item.name);

            let resolvedUrl = await searchOpenFoodFactsImage(cleanedQuery);
            let source: MatchSource = 'openfoodfacts';

            if (!resolvedUrl) {
              resolvedUrl = await searchWikimediaCommonsImage(cleanedQuery);
              source = 'wikimedia';
            }

            if (!resolvedUrl) {
              resolvedUrl = getCategoryFallbackSvg(
                item.category,
                item.name,
                item.unit,
                item.price
              );
              source = 'svg';
            }

            // Save directly into Supabase 'products' table when supabaseId exists
            let savedToSupabase = false;
            if (item.supabaseId) {
              try {
                const { error: sbErr } = await supabase
                  .from('products')
                  .update({ image_url: resolvedUrl })
                  .eq('id', item.supabaseId);
                if (!sbErr) {
                  savedToSupabase = true;
                }
              } catch {
                savedToSupabase = false;
              }
            }

            return {
              item,
              cleanedQuery,
              imageUrl: resolvedUrl,
              source,
              savedToSupabase,
            };
          })
        );

        // Update Firestore + live store state immediately for this batch of 10
        const storeUpdatesToPersist: Product[] = [];
        const updateByKey = new Map<string, string>();
        for (const r of batchResults) {
          if (r.item.storeProductId) {
            updateByKey.set(r.item.storeProductId, r.imageUrl);
          }
          if (r.item.supabaseId) {
            updateByKey.set(r.item.supabaseId, r.imageUrl);
          }
          const nw = `${normalizeNameKey(r.item.name)}::${normalizeWeightKey(r.item.unit)}`;
          updateByKey.set(nw, r.imageUrl);
        }

        workingCatalog = workingCatalog.map((prod) => {
          const nw = `${normalizeNameKey(prod.name)}::${normalizeWeightKey(prod.unit || '1 Pc')}`;
          const matchedNewUrl =
            updateByKey.get(prod.id) || updateByKey.get(nw);
          if (matchedNewUrl && isMissingOrPlaceholderImage(prod.imageUrl)) {
            const updatedProd: Product = {
              ...prod,
              imageUrl: matchedNewUrl,
              updatedAt: Date.now(),
            };
            storeUpdatesToPersist.push(updatedProd);
            return updatedProd;
          }
          return prod;
        });

        if (storeUpdatesToPersist.length > 0) {
          await batchUpsertProductsToFirestore(storeUpdatesToPersist, 50).catch((e) => {
            console.warn('Firestore image batch sync warning:', e);
          });
        }

        // Refresh live store state immediately after each batch
        onCatalogUpdated(workingCatalog);

        // Update counters & thumbnail previews
        let offAdd = 0;
        let wikiAdd = 0;
        let svgAdd = 0;
        let sbAdd = 0;

        const newPreviews: ProcessedPreviewItem[] = batchResults.map((r) => {
          if (r.source === 'openfoodfacts') offAdd += 1;
          else if (r.source === 'wikimedia') wikiAdd += 1;
          else svgAdd += 1;
          if (r.savedToSupabase) sbAdd += 1;

          return {
            key: r.item.key,
            name: r.item.name,
            cleanedQuery: r.cleanedQuery,
            imageUrl: r.imageUrl,
            source: r.source,
            savedToSupabase: r.savedToSupabase,
          };
        });

        totalDone += batchResults.length;
        totalSaved += sbAdd;

        setProcessedCount(totalDone);
        setStats((prev) => ({
          openfoodfacts: prev.openfoodfacts + offAdd,
          wikimedia: prev.wikimedia + wikiAdd,
          svg: prev.svg + svgAdd,
          supabaseSaved: prev.supabaseSaved + sbAdd,
        }));
        setPreviews((prev) => [...newPreviews.reverse(), ...prev].slice(0, 60));

        // Remove processed batch items from remaining missingItems count
        const processedKeys = new Set(batchResults.map((r) => r.item.key));
        setMissingItems((prev) => prev.filter((m) => !processedKeys.has(m.key)));

        // Brief pause between batches to respect public API rate limits
        if (!isStoppedRef.current && start + BATCH_SIZE < queue.length) {
          await new Promise((r) => setTimeout(r, 250));
        }
      }

      if (!isStoppedRef.current) {
        setIsCompleted(true);
        onCatalogUpdated(
          workingCatalog,
          `🪄 ऑटो-फोटो पूर्ण! ${totalDone} प्रोडक्ट्स की फोटो अपडेट हुई (${totalSaved} Supabase में सेव)।`
        );
      } else {
        onCatalogUpdated(
          workingCatalog,
          `ऑटो-फोटो रोका गया: अब तक ${totalDone} प्रोडक्ट्स की फोटो सेव हो चुकी हैं।`
        );
      }
    } finally {
      setIsRunning(false);
      setIsPaused(false);
    }
  };

  if (!isOpen) return null;

  const progressPercent =
    totalToProcess > 0 ? Math.min(100, Math.round((processedCount / totalToProcess) * 100)) : 0;

  return (
    <div
      className="fixed inset-0 z-[95] bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-image-modal-title"
    >
      <div className="bg-stone-50 rounded-3xl border border-stone-300 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="auto-image-modal-title"
                className="font-heading font-black text-base sm:text-lg leading-tight"
              >
                🪄 ऑटो-फोटो भरें (Auto-Fill Missing Images)
              </h3>
              <p className="text-[11px] text-stone-300 mt-0.5">
                केवल बिना फोटो वाले प्रोडक्ट्स के लिए — मौजूदा प्रोडक्ट फोटो बिल्कुल सुरक्षित रहेंगी
              </p>
            </div>
          </div>

          <button
            type="button"
            id="close-auto-image-modal-btn"
            onClick={() => {
              if (isRunning) handleStop();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close Auto Image Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Status / Missing Count Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
            {isLoadingMissing ? (
              <div className="flex items-center gap-3 text-sm font-bold text-stone-700 py-3">
                <RefreshCw className="w-5 h-5 text-violet-600 animate-spin shrink-0" />
                <span>Supabase और स्टोर डेटाबेस में बिना फोटो वाले प्रोडक्ट्स खोजे जा रहे हैं...</span>
              </div>
            ) : loadError ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-center justify-between gap-3 text-rose-900 text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{loadError}</span>
                </div>
                <button
                  type="button"
                  onClick={loadMissingImageProducts}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer shrink-0"
                >
                  पुनः प्रयास करें
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-50 border border-violet-200 text-violet-900 font-heading font-black text-sm sm:text-base tabular-nums">
                      <ImageIcon className="w-4 h-4 text-violet-600" />
                      {missingItems.length > 0
                        ? `${missingItems.length} प्रोडक्ट्स में फोटो नहीं है`
                        : isCompleted
                          ? 'सभी चयनित प्रोडक्ट्स की फोटो अपडेट हो गईं!'
                          : 'सभी प्रोडक्ट्स में फोटो मौजूद हैं! 🎉'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Open Food Facts → Wikimedia Commons → Category SVG पैक-बैज (10-10 के सुरक्षित बैच में)
                  </p>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!isRunning ? (
                    <button
                      type="button"
                      id="auto-image-start-btn"
                      onClick={handleStartAutoFetch}
                      disabled={missingItems.length === 0}
                      className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] text-white text-xs sm:text-sm font-heading font-black shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <Play className="w-4 h-4 fill-current shrink-0" />
                      <span>Start Auto-Fetch Images</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        id="auto-image-pause-btn"
                        onClick={handleTogglePause}
                        className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-heading font-bold border transition-all cursor-pointer whitespace-nowrap ${
                          isPaused
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {isPaused ? (
                          <>
                            <Play className="w-4 h-4 fill-current shrink-0" />
                            <span>Resume</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 shrink-0" />
                            <span>Pause</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        id="auto-image-stop-btn"
                        onClick={handleStop}
                        className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-heading font-bold transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span>Stop</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Live Progress Bar */}
            {(isRunning || processedCount > 0) && totalToProcess > 0 && (
              <div className="pt-2 border-t border-stone-100 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-stone-800 tabular-nums">
                  <span className="flex items-center gap-1.5">
                    {isRunning ? (
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-violet-600 ${
                          isPaused ? '' : 'animate-spin'
                        }`}
                      />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      {isPaused
                        ? 'रुका हुआ है (Paused)'
                        : isRunning
                          ? 'प्रोडक्ट फोटो खोजी व सेव की जा रही हैं...'
                          : isCompleted
                            ? 'प्रक्रिया पूर्ण हुई!'
                            : 'रोका गया'}
                    </span>
                  </span>
                  <span>
                    {processedCount} / {totalToProcess} ({progressPercent}%)
                  </span>
                </div>

                <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isCompleted
                        ? 'bg-emerald-600'
                        : isPaused
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-violet-600 to-indigo-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Source Counters */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold tabular-nums">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Open Food Facts: {stats.openfoodfacts}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
                    Wikimedia Commons: {stats.wikimedia}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                    Category SVG: {stats.svg}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 border border-stone-200">
                    Supabase Saved: {stats.supabaseSaved}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Preview Thumbnails Grid */}
          {previews.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-extrabold text-stone-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <span>लाइव फोटो प्रिव्यू (हाल ही में अपडेट किए गए)</span>
                </h4>
                <span className="text-[11px] text-stone-500 font-semibold">
                  Showing latest {previews.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {previews.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-stone-200 bg-stone-50/70 p-2 flex flex-col gap-1.5"
                  >
                    <div className="w-full aspect-square rounded-lg bg-white border border-stone-200 overflow-hidden flex items-center justify-center">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-[11px] font-bold text-stone-900 line-clamp-2 leading-snug">
                      {item.name}
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-auto">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          item.source === 'openfoodfacts'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.source === 'wikimedia'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.source === 'openfoodfacts'
                          ? 'OpenFoodFacts'
                          : item.source === 'wikimedia'
                            ? 'Wikimedia'
                            : 'SVG Badge'}
                      </span>
                      {item.savedToSupabase && (
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                          aria-label="Saved in Supabase"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
