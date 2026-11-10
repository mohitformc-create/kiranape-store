import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  ShoppingBag,
  TrendingUp,
  Percent,
  Plus,
  CheckCircle,
  Eye,
  EyeOff,
  Filter,
  Search,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Product } from '../types';
import {
  VISHAL_MART_REPOSITORY,
  MartItem,
  ProfitRuleConfig,
  DEFAULT_PROFIT_RULE,
  calculateMartSellingPrice,
  isMartItemInStore,
} from '../data/hypermarketCatalog';
import { batchUpsertProductsToFirestore, batchToggleMartProductsStock } from '../services/firebase';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface AdminHypermarketManagerProps {
  products: Product[];
  onRefreshProducts: (products: Product[]) => void;
}

export const AdminHypermarketManager: React.FC<AdminHypermarketManagerProps> = ({
  products,
  onRefreshProducts,
}) => {
  // Profit margin controller state
  const [profitRule, setProfitRule] = useState<ProfitRuleConfig>(DEFAULT_PROFIT_RULE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'already_in_store'>('all');

  // Operation state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ processed: number; total: number } | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isTogglingStock, setIsTogglingStock] = useState(false);

  // Available categories in mart repository
  const categories = useMemo(() => {
    const set = new Set<string>();
    VISHAL_MART_REPOSITORY.forEach((item) => set.add(item.category));
    return ['All', ...Array.from(set)];
  }, []);

  // Filter repository items
  const filteredItems = useMemo(() => {
    return VISHAL_MART_REPOSITORY.filter((item) => {
      const inStore = isMartItemInStore(item, products);
      if (statusFilter === 'new' && inStore) return false;
      if (statusFilter === 'already_in_store' && !inStore) return false;
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.productName.toLowerCase().includes(q);
        const matchHindi = item.hindiName.toLowerCase().includes(q);
        const matchBrand = item.brand.toLowerCase().includes(q);
        return matchName || matchHindi || matchBrand;
      }

      return true;
    });
  }, [products, statusFilter, categoryFilter, searchQuery]);

  // Count items already present vs new opportunities
  const stats = useMemo(() => {
    let alreadyCount = 0;
    VISHAL_MART_REPOSITORY.forEach((item) => {
      if (isMartItemInStore(item, products)) alreadyCount++;
    });
    const newCount = VISHAL_MART_REPOSITORY.length - alreadyCount;
    return { alreadyCount, newCount, totalCount: VISHAL_MART_REPOSITORY.length };
  }, [products]);

  // Select all visible new items
  const handleSelectAllNew = () => {
    const next = new Set(selectedIds);
    filteredItems.forEach((item) => {
      if (!isMartItemInStore(item, products)) {
        next.add(item.id);
      }
    });
    setSelectedIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleToggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // 1-Click Sync Selected Items to Store via Firestore batch (chunks of 100)
  const handleSyncSelectedToStore = async () => {
    if (selectedIds.size === 0) return;

    setIsSyncing(true);
    setSyncNotice(null);
    setSyncProgress({ processed: 0, total: selectedIds.size });

    try {
      const itemsToSync: Product[] = [];

      VISHAL_MART_REPOSITORY.forEach((martItem) => {
        if (!selectedIds.has(martItem.id)) return;

        const { sellingPrice, discountPercent } = calculateMartSellingPrice(
          martItem.martBasePrice,
          martItem.mrp,
          profitRule
        );

        itemsToSync.push({
          id: martItem.id,
          name: martItem.productName,
          hindiName: martItem.hindiName,
          category: martItem.category,
          department: 'grocery',
          unit: martItem.unit,
          originalPrice: martItem.mrp,
          finalPrice: sellingPrice,
          discountPercent,
          imageUrl: martItem.cleanImageUrl,
          isAvailable: true,
          stockCount: 30,
          stock: 30,
          martBasePrice: martItem.martBasePrice,
          isMartItem: true,
          description: `Hypermarket staple: ${martItem.packSize} pack sourced locally from wholesale / Vishal Mart.`,
          updatedAt: Date.now(),
        });
      });

      const res = await batchUpsertProductsToFirestore(itemsToSync, 100, (p, t) => {
        setSyncProgress({ processed: p, total: t });
      });

      // Update state
      const existingMap = new Map(products.map((p) => [p.id, p]));
      itemsToSync.forEach((item) => existingMap.set(item.id, item));
      const merged = Array.from(existingMap.values());
      onRefreshProducts(merged);

      setSyncNotice(`Successfully added ${res.count} Vishal Mega Mart products to store catalog!`);
      setSelectedIds(new Set());
      setTimeout(() => setSyncNotice(null), 6000);
    } catch (err: any) {
      console.error('Error syncing mart products:', err);
      alert('Error syncing mart items: ' + (err?.message || 'Failed'));
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Global Toggle: Mark All Mart Items Available / Out of Stock
  const handleToggleMartAvailability = async (inStock: boolean) => {
    setIsTogglingStock(true);
    setSyncNotice(null);
    try {
      const updatedCount = await batchToggleMartProductsStock(inStock);
      // Refresh local state
      const nextList = products.map((p) =>
        p.isMartItem || p.id.startsWith('vmart-') ? { ...p, isAvailable: inStock } : p
      );
      onRefreshProducts(nextList);

      setSyncNotice(
        `Marked ${updatedCount} Vishal Mart products ${inStock ? 'IN STOCK' : 'OUT OF STOCK'} successfully.`
      );
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err: any) {
      console.error('Error toggling mart stock:', err);
      alert('Error toggling mart stock: ' + (err?.message || 'Failed'));
    } finally {
      setIsTogglingStock(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hero Banner & Arbitrage Sourcing Overview */}
      <div className="bg-gradient-to-br from-indigo-950 via-purple-950 to-stone-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Vishal Mega Mart & Wholesale Hyperlocal Arbitrage</span>
            </div>
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-white tracking-tight">
              AI Hypermarket Catalog Manager
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
              Source 150+ high-demand wholesale staples, 5L family oil jars, detergent combo buckets, and confectionery gift packs with automated profit margin calculations.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-md">
            <div className="text-center p-2">
              <span className="block text-xl sm:text-2xl font-heading font-black text-amber-400">
                {stats.totalCount}
              </span>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wider">
                Mart Catalog
              </span>
            </div>
            <div className="text-center p-2 border-x border-white/10">
              <span className="block text-xl sm:text-2xl font-heading font-black text-emerald-400">
                {stats.alreadyCount}
              </span>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wider">
                Live In Store
              </span>
            </div>
            <div className="text-center p-2">
              <span className="block text-xl sm:text-2xl font-heading font-black text-sky-400">
                {stats.newCount}
              </span>
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-wider">
                Available to Add
              </span>
            </div>
          </div>
        </div>

        {/* Global Stock Controller Strip */}
        <div className="mt-6 pt-5 border-t border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-stone-200">Global Mart Inventory Controller:</span>
            <span className="text-stone-400 text-[11px]">
              Toggle all sourced wholesale items across the customer app in 1 tap
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTogglingStock || stats.alreadyCount === 0}
              onClick={() => handleToggleMartAvailability(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Mark All Mart Items In Stock</span>
            </button>
            <button
              type="button"
              disabled={isTogglingStock || stats.alreadyCount === 0}
              onClick={() => handleToggleMartAvailability(false)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Mark All Mart Items Out of Stock</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Profit Margin Controller Card */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-heading font-black text-stone-900 text-base sm:text-lg flex items-center gap-2">
                <span>Auto-Profit Margin & Pricing Rule Controller</span>
                <span className="text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                  Real-Time Engine
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Customer selling price automatically calculated over Mart purchase cost, strictly capped at printed MRP.
              </p>
            </div>
          </div>

          {/* Profit Mode Selector */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-2xl border border-stone-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setProfitRule({ mode: 'percentage', value: 10 })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                profitRule.mode === 'percentage'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Percentage (%) Margin
            </button>
            <button
              type="button"
              onClick={() => setProfitRule({ mode: 'flat', value: 20 })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                profitRule.mode === 'flat'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Flat Profit (₹)
            </button>
          </div>
        </div>

        {/* Profit Slider / Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80">
          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span>
                {profitRule.mode === 'percentage'
                  ? `Percentage Markup over Mart Cost: +${profitRule.value}%`
                  : `Flat Markup over Mart Cost: +₹${profitRule.value}`}
              </span>
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                Rule: Price = Mart Cost + {profitRule.mode === 'percentage' ? `${profitRule.value}%` : `₹${profitRule.value}`} (Capped at MRP)
              </span>
            </div>

            <input
              type="range"
              min={profitRule.mode === 'percentage' ? 5 : 5}
              max={profitRule.mode === 'percentage' ? 30 : 100}
              step={profitRule.mode === 'percentage' ? 1 : 5}
              value={profitRule.value}
              onChange={(e) =>
                setProfitRule({ ...profitRule, value: parseInt(e.target.value) || 0 })
              }
              className="w-full accent-emerald-600 cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-stone-500">
              <span>{profitRule.mode === 'percentage' ? '5% (Budget)' : '₹5'}</span>
              <span>{profitRule.mode === 'percentage' ? '12% (Recommended)' : '₹20 (Standard)'}</span>
              <span>{profitRule.mode === 'percentage' ? '30% (High Margin)' : '₹100'}</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 justify-end">
            {(profitRule.mode === 'percentage' ? [8, 10, 12, 15] : [10, 15, 20, 30]).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setProfitRule({ ...profitRule, value: val })}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors ${
                  profitRule.value === val
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                }`}
              >
                {profitRule.mode === 'percentage' ? `+${val}%` : `+₹${val}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sync Status Notice */}
      {syncNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Filters & Action Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand, item name, oil, ghee, detergent..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 focus:bg-white border border-stone-200 rounded-xl font-medium focus:border-indigo-600 focus:outline-hidden transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 font-bold text-stone-800 focus:outline-hidden"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('new')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'new' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Not in Store
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('already_in_store')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'already_in_store' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                In Store
              </button>
            </div>
          </div>
        </div>

        {/* Selection Controller Strip */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAllNew}
              className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Select All New ({filteredItems.filter((i) => !isMartItemInStore(i, products)).length})
            </button>
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleDeselectAll}
                className="px-2.5 py-1 text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
              >
                Deselect All
              </button>
            )}
            <span className="text-stone-500 font-medium">
              Selected: <strong className="text-stone-900">{selectedIds.size} items</strong>
            </span>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            disabled={isSyncing || selectedIds.size === 0}
            onClick={handleSyncSelectedToStore}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-heading font-black rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>
                  {syncProgress
                    ? `Syncing ${syncProgress.processed}/${syncProgress.total} via Firestore Batch...`
                    : 'Syncing to Store...'}
                </span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Selected ({selectedIds.size}) to Store</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Mart Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        {filteredItems.map((item) => {
          const inStore = isMartItemInStore(item, products);
          const isSelected = selectedIds.has(item.id);
          const { sellingPrice, discountPercent, profitAmount } = calculateMartSellingPrice(
            item.martBasePrice,
            item.mrp,
            profitRule
          );

          return (
            <div
              key={item.id}
              onClick={() => !inStore && handleToggleItem(item.id)}
              className={`rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${
                inStore
                  ? 'bg-stone-50/70 border-stone-200/80 opacity-75'
                  : isSelected
                  ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm cursor-pointer'
                  : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs cursor-pointer'
              }`}
            >
              <div>
                {/* Header Row: Checkbox + Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {!inStore ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                      />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </span>
                    )}
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                      {item.brand}
                    </span>
                  </div>

                  {inStore ? (
                    <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      Already in Store
                    </span>
                  ) : item.badge ? (
                    <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      {item.badge}
                    </span>
                  ) : null}
                </div>

                {/* Image + Title */}
                <div className="flex gap-3 my-1">
                  <div className="w-16 h-16 rounded-xl bg-white border border-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                    <img
                      src={item.cleanImageUrl || getCategoryFallbackSvg(item.category, item.productName)}
                      alt={item.productName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getCategoryFallbackSvg(item.category, item.productName);
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-heading font-extrabold text-xs text-stone-900 line-clamp-2 leading-tight">
                      {item.productName}
                    </h4>
                    <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                      {item.hindiName}
                    </p>
                    <span className="inline-block text-[10px] font-semibold text-stone-500 mt-0.5">
                      Pack: {item.packSize}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing & Profit Strip */}
              <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">Mart Cost:</span>
                  <span className="font-mono font-bold text-stone-700">₹{item.martBasePrice}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">Printed MRP:</span>
                  <span className="line-through text-stone-400 font-mono">₹{item.mrp}</span>
                </div>

                <div className="flex items-center justify-between bg-emerald-50/80 p-1.5 rounded-xl border border-emerald-200/80">
                  <span className="font-bold text-emerald-900 text-[11px]">Selling Price:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-black text-sm text-emerald-700">
                      ₹{sellingPrice}
                    </span>
                    {discountPercent > 0 && (
                      <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-stone-500 px-1">
                  <span>Estimated Profit:</span>
                  <span className="font-bold text-emerald-700">
                    +₹{profitAmount} ({Math.round((profitAmount / item.martBasePrice) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
