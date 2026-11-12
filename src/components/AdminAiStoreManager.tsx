import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  Trash2,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Check,
  AlertTriangle,
  Package,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Search,
  Filter,
  CheckCircle,
  X,
  Clock,
  History,
  Lock,
  Zap,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { Product, AiManagerLog } from '../types';
import { batchUpsertProductsToFirestore, purgeAllFirestoreProducts, deleteProductFromFirestore } from '../services/firebase';
import { clearAllProductsFromCentralServer, saveBulkProductsToCentralInventory } from '../services/orderApiService';
import { resetCatalogToCleanSlate, saveProducts } from '../services/storageService';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface AdminAiStoreManagerProps {
  products: Product[];
  onRefreshProducts?: (products: Product[]) => void;
  onOpenQuickEdit: (product: Product) => void;
  onOpenAddModal: () => void;
  onDeleteProduct: (id: string) => void;
  isFirebaseConnected?: boolean;
}

const CATEGORY_OPTIONS = [
  'All',
  'Atta & Flours',
  'Rice & Dal',
  'Oil & Ghee',
  'Spices & Salt',
  'Snacks & Biscuits',
  'Tea, Coffee & Drinks',
  'Personal Care',
  'Household Essentials',
  'Packaged Foods',
  'Dairy & Bakery',
];

const LOCAL_STORAGE_LOGS_KEY = 'kiranape_ai_manager_logs';

export const AdminAiStoreManager: React.FC<AdminAiStoreManagerProps> = ({
  products,
  onRefreshProducts,
  onOpenQuickEdit,
  onOpenAddModal,
  onDeleteProduct,
  isFirebaseConnected = false,
}) => {
  // Sync state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [targetCount, setTargetCount] = useState<number>(18);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Clean Slate Modal state
  const [showCleanSlateModal, setShowCleanSlateModal] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);

  // Table search & filter
  const [tableSearch, setTableSearch] = useState<string>('');
  const [tableCategory, setTableCategory] = useState<string>('All');
  const [tableProtectionFilter, setTableProtectionFilter] = useState<'all' | 'protected' | 'ai'>('all');

  // Activity Logs
  const [logs, setLogs] = useState<AiManagerLog[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [logFilter, setLogFilter] = useState<'all' | 'added' | 'updated' | 'skipped' | 'cleared'>('all');

  // Save logs to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
      } catch (err) {
        console.warn('Failed to save AI manager logs to localStorage:', err);
      }
    }
  }, [logs]);

  // Derived metrics
  const totalProducts = products.length;
  const protectedProductsCount = useMemo(
    () => products.filter((p) => p.isManualOverride || p.protectedFromAiSync).length,
    [products]
  );
  const aiProductsCount = useMemo(
    () => products.filter((p) => p.aiGenerated && !p.isManualOverride && !p.protectedFromAiSync).length,
    [products]
  );
  const categoriesPresent = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return cats.size;
  }, [products]);

  // Push new log entry
  const appendLogs = (newEntries: AiManagerLog[]) => {
    setLogs((prev) => [...newEntries, ...prev].slice(0, 100));
  };

  const clearAllLogs = () => {
    setLogs([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_LOGS_KEY);
    }
  };

  // Trigger Autonomous AI Catalog Generation
  const handleAutoGenerateAndSync = async () => {
    setIsSyncing(true);
    setSyncStatusText('Connecting to Gemini 3.8 Flash & reading Indian Kirana market margins...');
    setNotification(null);

    try {
      setSyncStatusText('Fetching authentic FMCG items and applying smart category margins...');
      const response = await fetch('/api/ai/store-manager/generate-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          targetCount,
          existingCatalog: products,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.products)) {
        throw new Error(data.error || 'Failed to generate catalog from AI engine');
      }

      setSyncStatusText(`Syncing ${data.products.length} products to Firestore & Local storage...`);

      // 1. Update in-memory & local storage
      saveProducts(data.products);

      // 2. Sync to Central Server
      try {
        await saveBulkProductsToCentralInventory(data.products);
      } catch (centralErr) {
        console.warn('Central server sync note:', centralErr);
      }

      // 3. Batch write to Firestore (with chunking)
      try {
        await batchUpsertProductsToFirestore(data.products, 100);
      } catch (firestoreErr) {
        console.warn('Firestore batch write note:', firestoreErr);
      }

      // 4. Update parent state
      if (onRefreshProducts) {
        onRefreshProducts(data.products);
      }

      // 5. Append returned activity logs
      if (Array.isArray(data.logs) && data.logs.length > 0) {
        appendLogs(data.logs);
      }

      setNotification({
        type: 'success',
        message: `✓ AI Store Manager Synced! +${data.addedCount} Added, ${data.updatedCount} Updated, 🛡️ ${data.skippedCount} Protected items preserved.`,
      });
    } catch (err: any) {
      console.error('Error during AI store manager sync:', err);
      setNotification({
        type: 'error',
        message: `Sync Error: ${err?.message || 'Failed to auto-generate catalog. Please try again.'}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncStatusText('');
    }
  };

  // Toggle Merchant Protection on an individual item
  const handleToggleProtection = async (product: Product) => {
    const isCurrentlyProtected = product.isManualOverride || product.protectedFromAiSync;
    const newProtectedState = !isCurrentlyProtected;

    const updatedProduct: Product = {
      ...product,
      isManualOverride: newProtectedState,
      protectedFromAiSync: newProtectedState,
      lastManuallyEditedAt: newProtectedState ? Date.now() : product.lastManuallyEditedAt,
      updatedAt: Date.now(),
    };

    const updatedCatalog = products.map((p) => (p.id === product.id ? updatedProduct : p));

    // Save locally
    saveProducts(updatedCatalog);

    // Save to Firestore
    try {
      await batchUpsertProductsToFirestore([updatedProduct]);
    } catch (err) {
      console.warn('Firestore protection toggle note:', err);
    }

    if (onRefreshProducts) {
      onRefreshProducts(updatedCatalog);
    }

    const now = Date.now();
    const timeFormatted = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    appendLogs([
      {
        id: `log_protect_${now}`,
        timestamp: now,
        timeFormatted,
        type: newProtectedState ? 'skipped' : 'updated',
        productName: product.name,
        category: product.category,
        mrp: product.originalPrice,
        sellingPrice: product.finalPrice,
        reason: newProtectedState
          ? 'Merchant manually enabled protection (locked against AI sync)'
          : 'Merchant removed protection (AI sync enabled)',
      },
    ]);
  };

  // Perform Complete Clean Slate Purge
  const handleExecuteCleanSlate = async () => {
    setIsPurging(true);
    try {
      // 1. Purge Firestore collection
      try {
        await purgeAllFirestoreProducts();
      } catch (err) {
        console.warn('Firestore purge error:', err);
      }

      // 2. Clear Central Server
      try {
        await clearAllProductsFromCentralServer();
      } catch (err) {
        console.warn('Central server purge error:', err);
      }

      // 3. Clear Local Storage, Cache and IndexedDB
      resetCatalogToCleanSlate();

      // 4. Update UI parent
      if (onRefreshProducts) {
        onRefreshProducts([]);
      }

      const now = Date.now();
      const timeFormatted = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      appendLogs([
        {
          id: `log_clear_${now}`,
          timestamp: now,
          timeFormatted,
          type: 'cleared',
          productName: 'All Catalog Products',
          category: 'Entire Store',
          reason: 'Merchant performed 100% Clean Slate Purge. Store catalog reset to 0 items.',
        },
      ]);

      setShowCleanSlateModal(false);
      setNotification({
        type: 'info',
        message: '🗑️ Clean slate successful: All catalog products have been purged. You can now auto-generate fresh items or add your own products!',
      });
    } catch (err: any) {
      console.error('Error during clean slate:', err);
      setNotification({
        type: 'error',
        message: `Failed to reset clean slate: ${err?.message}`,
      });
    } finally {
      setIsPurging(false);
    }
  };

  // Filtered live products for table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (tableSearch.trim()) {
        const query = tableSearch.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesHindi = p.hindiName && p.hindiName.includes(query);
        const matchesCat = p.category.toLowerCase().includes(query);
        if (!matchesName && !matchesHindi && !matchesCat) return false;
      }
      // Category
      if (tableCategory !== 'All' && p.category !== tableCategory) {
        return false;
      }
      // Protection Filter
      if (tableProtectionFilter === 'protected') {
        return p.isManualOverride || p.protectedFromAiSync;
      }
      if (tableProtectionFilter === 'ai') {
        return p.aiGenerated && !p.isManualOverride && !p.protectedFromAiSync;
      }
      return true;
    });
  }, [products, tableSearch, tableCategory, tableProtectionFilter]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return logs;
    return logs.filter((l) => l.type === logFilter);
  }, [logs, logFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between shadow-md animate-in slide-in-from-top-2 text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
              : notification.type === 'error'
              ? 'bg-rose-50 border border-rose-300 text-rose-950'
              : 'bg-amber-50 border border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 text-stone-500 hover:text-stone-900 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Header & Status Banner */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-950 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Autonomous Store Manager • Gemini 3.8 Flash
              </span>
              {isFirebaseConnected && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Firestore Connected
                </span>
              )}
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>🤖 AI Store Manager & Smart Pricing</span>
            </h2>
            <p className="text-sm text-stone-300 max-w-2xl leading-relaxed">
              Auto-generates fast-moving Indian Kirana products with realistic, category-calibrated retail margins
              (no flat discounts). Merchant manual price edits are permanently protected from automated overwrite.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAutoGenerateAndSync}
              disabled={isSyncing}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 text-white font-heading font-black text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300" />
              )}
              <span>{isSyncing ? 'Auto-Syncing Catalog...' : '⚡ Auto-Generate & Sync Store Catalog'}</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="px-4 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 hover:text-white font-bold text-sm border border-stone-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Add Product Manually</span>
            </button>

            <button
              onClick={() => setShowCleanSlateModal(true)}
              className="px-3.5 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-sm transition-all flex items-center gap-2 cursor-pointer"
              title="Reset catalog to empty clean slate"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Clean Slate</span>
            </button>
          </div>
        </div>

        {/* Sync Progress Status Text */}
        {isSyncing && syncStatusText && (
          <div className="mt-4 pt-4 border-t border-stone-800/80 flex items-center gap-3 text-xs text-amber-300 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>{syncStatusText}</span>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-stone-800">
          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Live Products</div>
            <div className="text-2xl font-black text-white mt-1">{totalProducts}</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Active in customer store</div>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-900/40 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <span>🤖 AI Managed</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">{aiProductsCount}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Auto-synced & smart priced</div>
          </div>

          <div className="bg-amber-950/40 border border-amber-900/40 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Protected Custom Prices</span>
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">{protectedProductsCount}</div>
            <div className="text-[10px] text-amber-500/80 mt-0.5">Locked from AI overwrite</div>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Categories Live</div>
            <div className="text-2xl font-black text-white mt-1">{categoriesPresent}</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Indian kirana aisles</div>
          </div>
        </div>
      </div>

      {/* Smart Market Pricing Margin Strategy Breakdown */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              ₹
            </div>
            <div>
              <h3 className="font-heading font-black text-sm text-stone-900">
                Kirana Retail Margin Matrix (No Flat 5% Discount)
              </h3>
              <p className="text-xs text-stone-500">
                AI calculates realistic selling prices based on actual FMCG wholesale-to-retail economics in India.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
            Realistic FMCG Margins
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
          <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80">
            <div className="text-[11px] font-extrabold text-stone-900">🌾 Staples & Flours</div>
            <div className="text-xs font-black text-emerald-700 mt-1">2% – 5% Margin</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Atta, Sugar, Cooking Oils, Ghee</div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80">
            <div className="text-[11px] font-extrabold text-stone-900">🍚 Rice, Dal & Tea</div>
            <div className="text-xs font-black text-emerald-700 mt-1">6% – 12% Margin</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Basmati, Toor Dal, Red Label</div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80">
            <div className="text-[11px] font-extrabold text-stone-900">🍪 Snacks & Drinks</div>
            <div className="text-xs font-black text-emerald-700 mt-1">8% – 15% Margin</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Parle-G, Maggi, Kurkure, Frooti</div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80">
            <div className="text-[11px] font-extrabold text-stone-900">🧼 Personal Care</div>
            <div className="text-xs font-black text-emerald-700 mt-1">10% – 20% Margin</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Dettol, Colgate, Lifebuoy</div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80">
            <div className="text-[11px] font-extrabold text-stone-900">🧹 Household Cleaning</div>
            <div className="text-xs font-black text-emerald-700 mt-1">12% – 25% Margin</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Surf Excel, Vim, Harpic</div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/80">
            <div className="text-[11px] font-extrabold text-stone-900">🌶️ Spices & Salt</div>
            <div className="text-xs font-black text-emerald-700 mt-1">5% – 12% Margin</div>
            <div className="text-[10px] text-stone-500 mt-0.5">Everest, MDH, Tata Salt</div>
          </div>
        </div>
      </div>

      {/* Sync Control Card: Scope and Category selection */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-black text-base text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Catalog Auto-Sync Generator</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Select a category or sync all Indian Kirana staples in one tap.
            </p>
          </div>

          {/* Sync Trigger button */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 font-bold bg-stone-100 px-3 py-1.5 rounded-xl">
              <span>Target:</span>
              <select
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="bg-transparent font-black text-stone-900 outline-none cursor-pointer"
              >
                <option value={12}>12 products</option>
                <option value={18}>18 products</option>
                <option value={24}>24 products</option>
                <option value={32}>32 products</option>
              </select>
            </div>

            <button
              onClick={handleAutoGenerateAndSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Sync Now</span>
            </button>
          </div>
        </div>

        {/* Category Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat === 'All' ? '🌟 All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* AI Activity Log & Notifications Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-base text-stone-900 flex items-center gap-2">
                <span>AI Manager Activity Log & Audit Trail</span>
                <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  {logs.length} events
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Real-time timestamps of newly listed, smart-price updated, and merchant-protected items.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-[11px] font-bold">
              {(['all', 'added', 'updated', 'skipped', 'cleared'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setLogFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                    logFilter === filter ? 'bg-white text-stone-900 shadow-2xs font-extrabold' : 'text-stone-500'
                  }`}
                >
                  {filter === 'skipped' ? 'Protected' : filter}
                </button>
              ))}
            </div>

            {logs.length > 0 && (
              <button
                onClick={clearAllLogs}
                className="text-[11px] text-stone-400 hover:text-stone-700 px-2 py-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                title="Clear activity log history"
              >
                Clear Log
              </button>
            )}
          </div>
        </div>

        {/* Log Entries List */}
        {filteredLogs.length === 0 ? (
          <div className="bg-stone-50 rounded-2xl p-6 text-center text-xs text-stone-400 space-y-1 border border-stone-200/60">
            <Clock className="w-6 h-6 mx-auto text-stone-300 mb-1" />
            <p className="font-bold">No activity logs recorded yet</p>
            <p className="text-[11px] text-stone-400">
              Trigger "Auto-Generate & Sync Store Catalog" above to see the AI log real-time actions.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className={`p-3 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                  entry.type === 'added'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : entry.type === 'updated'
                    ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                    : entry.type === 'skipped'
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-rose-50/70 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black mt-0.5 ${
                      entry.type === 'added'
                        ? 'bg-emerald-600 text-white'
                        : entry.type === 'updated'
                        ? 'bg-sky-600 text-white'
                        : entry.type === 'skipped'
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {entry.type === 'added' ? '＋' : entry.type === 'updated' ? '↻' : entry.type === 'skipped' ? '🛡️' : '✕'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-black text-xs text-stone-900">
                        {entry.productName}
                      </span>
                      <span className="text-[10px] font-bold text-stone-500 bg-white/80 px-1.5 py-0.2 rounded-md border border-stone-200">
                        {entry.category}
                      </span>
                      {entry.discountPercent !== undefined && entry.discountPercent > 0 && (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                          {entry.discountPercent}% off
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      {entry.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between text-right text-[11px] flex-shrink-0">
                  {entry.mrp && entry.sellingPrice ? (
                    <div className="font-mono font-bold text-stone-900">
                      <span className="line-through text-stone-400 mr-1.5">MRP ₹{entry.mrp}</span>
                      <span className="text-emerald-700 font-black">₹{entry.sellingPrice}</span>
                    </div>
                  ) : null}
                  <span className="text-[10px] text-stone-400">{entry.timeFormatted}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Store Products Table with Manual Overrides */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading font-black text-base text-stone-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <span>Store Product Inventory ({products.length})</span>
            </h3>
            <p className="text-xs text-stone-500">
              Edit pricing, toggle stock, or protect items from AI sync. Edit or Add any item to set permanent manual protection.
            </p>
          </div>

          {/* Search & Protection Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] sm:min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-emerald-500"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={tableCategory}
              onChange={(e) => setTableCategory(e.target.value)}
              className="bg-stone-50 border border-stone-200 text-xs font-bold text-stone-700 py-1.5 px-3 rounded-xl outline-none cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Aisles' : c}
                </option>
              ))}
            </select>

            <select
              value={tableProtectionFilter}
              onChange={(e) => setTableProtectionFilter(e.target.value as any)}
              className="bg-stone-50 border border-stone-200 text-xs font-bold text-stone-700 py-1.5 px-3 rounded-xl outline-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="protected">🛡️ Protected (Manual)</option>
              <option value="ai">🤖 AI Managed</option>
            </select>
          </div>
        </div>

        {/* Empty State */}
        {products.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl border-2 border-dashed border-stone-200 space-y-3 bg-stone-50/50">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-xl">
              📦
            </div>
            <div className="space-y-1">
              <h4 className="font-heading font-black text-sm text-stone-800">
                Catalog is Clean Slate Empty
              </h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                No products currently listed. Click "Auto-Generate & Sync Store Catalog" above to let AI populate your catalog, or add items manually.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleAutoGenerateAndSync}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                ⚡ Auto-Generate Store Catalog
              </button>
              <button
                onClick={onOpenAddModal}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Add First Product Manually
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">
            No products match the selected filters ("{tableSearch}").
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3.5">Product</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Unit / Pack</th>
                  <th className="py-3 px-3 text-right">MRP</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">Margin / Off</th>
                  <th className="py-3 px-3 text-center">AI Sync Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.map((p) => {
                  const mrp = Number(p.originalPrice) || Number(p.finalPrice) || 0;
                  const selling = Number(p.finalPrice) || mrp;
                  const discount = mrp > selling && mrp > 0 ? Math.round(((mrp - selling) / mrp) * 100) : 0;
                  const isProtected = p.isManualOverride || p.protectedFromAiSync;

                  return (
                    <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Product Thumbnail & Name */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <img
                            src={p.imageUrl || getCategoryFallbackSvg(p.category)}
                            alt={p.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getCategoryFallbackSvg(p.category);
                            }}
                            className="w-10 h-10 rounded-xl object-contain bg-stone-50 border border-stone-200 flex-shrink-0 p-0.5"
                          />
                          <div className="min-w-0">
                            <div className="font-heading font-black text-stone-900 truncate">
                              {p.name}
                            </div>
                            {p.hindiName && (
                              <div className="text-[10px] text-stone-500 truncate">
                                {p.hindiName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3 text-stone-600 whitespace-nowrap">
                        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          {p.category}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-3 text-stone-600 font-medium whitespace-nowrap">
                        {p.unit || '1 pc'}
                      </td>

                      {/* MRP */}
                      <td className="py-2.5 px-3 text-right font-mono text-stone-400 line-through whitespace-nowrap">
                        ₹{mrp}
                      </td>

                      {/* Selling Price */}
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 whitespace-nowrap text-sm">
                        ₹{selling}
                      </td>

                      {/* Margin / Discount */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {discount > 0 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                            {discount}% off
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">At MRP</span>
                        )}
                      </td>

                      {/* Protection Status Badge */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {isProtected ? (
                          <span
                            onClick={() => handleToggleProtection(p)}
                            className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition-colors shadow-2xs"
                            title="Click to remove protection and allow AI sync"
                          >
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>Protected (Manual)</span>
                          </span>
                        ) : (
                          <span
                            onClick={() => handleToggleProtection(p)}
                            className="inline-flex items-center gap-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors"
                            title="Click to lock price and protect from AI overwrite"
                          >
                            <span>🤖 AI Managed</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Edit */}
                          <button
                            onClick={() => onOpenQuickEdit(p)}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-700 border border-stone-200 transition-colors cursor-pointer"
                            title="Edit price, unit, image & protect"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Item */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete "${p.name}" from store catalog?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-50 text-stone-400 hover:text-rose-600 border border-stone-200 transition-colors cursor-pointer"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Clean Slate Confirmation Modal */}
      {showCleanSlateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-heading font-black text-lg text-stone-900">
                Confirm Clean Slate Reset
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                This will permanently delete all {products.length} products from the Firestore database, central server inventory, and browser local storage.
              </p>
              <p className="text-xs font-bold text-rose-700 pt-1">
                Your store catalog will be 100% empty (0 items). You can auto-generate fresh items anytime with the AI Store Manager.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowCleanSlateModal(false)}
                disabled={isPurging}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCleanSlate}
                disabled={isPurging}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPurging ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{isPurging ? 'Purging...' : 'Yes, Wipe All Products'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
