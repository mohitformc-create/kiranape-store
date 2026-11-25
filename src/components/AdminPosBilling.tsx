import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Receipt,
  Search,
  ScanBarcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  MessageCircle,
  RotateCcw,
  Download,
  Copy,
  Check,
  History,
  X,
  User,
  Phone,
  IndianRupee,
  Save,
  PackagePlus,
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { matchesUniversalSearch } from '../utils/universalSearch';
import {
  PosBillItem,
  PosBillRecord,
  PosPaymentMode,
  PosSavedBarcodeProduct,
  POS_STORE_HEADER,
  formatBillNumber,
  getCurrentBillCounter,
  advanceBillCounterFromBillNo,
  getSavedBarcodeMap,
  saveBarcodeMapping,
  getRecentPosBills,
  savePosBillRecord,
  formatPosDate,
  formatPosTime,
  calculatePosTotals,
  numberToIndianWords,
  playPosScanBeep,
  generatePosWhatsAppReceiptText,
  getPosWhatsAppShareUrl,
  downloadPosReceiptImage,
} from '../utils/posReceiptUtils';
import { PosBarcodeScannerModal } from './PosBarcodeScannerModal';

interface AdminPosBillingProps {
  products: Product[];
  storeSettings?: StoreSettings;
  onSavedNotice?: (message: string) => void;
}

export const AdminPosBilling: React.FC<AdminPosBillingProps> = ({
  products,
  onSavedNotice,
}) => {
  // Bill header / meta state
  const [billNo, setBillNo] = useState<string>(() => formatBillNumber(getCurrentBillCounter()));
  const [liveNow, setLiveNow] = useState<Date>(() => new Date());
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PosPaymentMode>('Cash');
  const [extraDiscount, setExtraDiscount] = useState<string>('');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  // Bill line items
  const [items, setItems] = useState<PosBillItem[]>([]);

  // Catalog search state
  const [catalogQuery, setCatalogQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Quick Manual Entry state
  const [manualName, setManualName] = useState<string>('');
  const [manualQty, setManualQty] = useState<string>('1');
  const [manualMrp, setManualMrp] = useState<string>('');
  const [manualRate, setManualRate] = useState<string>('');
  const manualNameInputRef = useRef<HTMLInputElement | null>(null);

  // Barcode scanner & unknown barcode registration state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [barcodeMap, setBarcodeMap] = useState<Record<string, PosSavedBarcodeProduct>>(() =>
    getSavedBarcodeMap()
  );
  const [pendingUnknownBarcode, setPendingUnknownBarcode] = useState<{
    barcode: string;
    name: string;
    mrp: string;
    rate: string;
    linkSearch: string;
  } | null>(null);

  // Recent Bills & UX feedback
  const [recentBills, setRecentBills] = useState<PosBillRecord[]>(() => getRecentPosBills());
  const [showRecentBills, setShowRecentBills] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [inlineToast, setInlineToast] = useState<string | null>(null);

  // Live clock tick every 30s so receipt date/time stays current
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setInlineToast(msg);
    onSavedNotice?.(msg);
    setTimeout(() => {
      setInlineToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Filtered catalog autocomplete matches
  const catalogMatches = useMemo(() => {
    const q = catalogQuery.trim();
    if (!q) return [];
    const lower = q.toLowerCase();
    return products
      .filter((p) => {
        if (matchesUniversalSearch(p, q)) return true;
        if (String(p.id).toLowerCase().includes(lower)) return true;
        return false;
      })
      .slice(0, 10);
  }, [products, catalogQuery]);

  // Helper to add or increment item in bill
  const addItemToBill = (newItem: {
    productId?: string;
    barcode?: string;
    name: string;
    qty?: number;
    mrp: number;
    rate: number;
  }) => {
    const cleanName = newItem.name.trim();
    if (!cleanName) return;

    const addQty = Math.max(0.01, Number(newItem.qty) || 1);
    const rate = Math.max(0, Number(newItem.rate) || 0);
    const mrp = Math.max(rate, Number(newItem.mrp) || rate);

    setItems((prev) => {
      const existingIdx = prev.findIndex((row) => {
        if (newItem.productId && row.productId === newItem.productId) return true;
        if (newItem.barcode && row.barcode === newItem.barcode) return true;
        return (
          row.name.trim().toLowerCase() === cleanName.toLowerCase() &&
          Number(row.rate) === rate &&
          Number(row.mrp) === mrp
        );
      });

      if (existingIdx >= 0) {
        return prev.map((row, i) =>
          i === existingIdx
            ? { ...row, qty: Math.round((row.qty + addQty) * 100) / 100 }
            : row
        );
      }

      return [
        ...prev,
        {
          id: `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          productId: newItem.productId,
          barcode: newItem.barcode,
          name: cleanName,
          qty: addQty,
          mrp,
          rate,
        },
      ];
    });
  };

  // Add product from Supabase catalog search
  const handleSelectCatalogProduct = (product: Product) => {
    const displayName = product.unit
      ? `${product.name} (${product.unit})`
      : product.name;
    const rate = Number(product.finalPrice) || 0;
    const mrp = Math.max(rate, Number(product.originalPrice) || rate);

    addItemToBill({
      productId: product.id,
      name: displayName,
      qty: 1,
      mrp,
      rate,
    });
    playPosScanBeep();
    setCatalogQuery('');
    setIsSearchFocused(false);
    showToast(`✅ "${product.name}" बिल में जोड़ा गया`);
  };

  // Handle Barcode Detection (from camera or manual/USB input)
  const handleBarcodeDetected = (rawBarcode: string) => {
    const code = rawBarcode.trim();
    if (!code) return;

    setIsScannerOpen(false);

    // 1. Check saved local barcode memory
    const saved = barcodeMap[code];
    if (saved) {
      addItemToBill({
        productId: saved.productId,
        barcode: code,
        name: saved.name,
        qty: 1,
        mrp: saved.mrp,
        rate: saved.rate,
      });
      showToast(`📷 बारकोड मिल गया: ${saved.name} (+1)`);
      return;
    }

    // 2. Check existing catalog product ID or name matching barcode
    const catalogHit = products.find(
      (p) =>
        String(p.id).trim().toLowerCase() === code.toLowerCase() ||
        p.name.toLowerCase().includes(code.toLowerCase())
    );
    if (catalogHit) {
      const displayName = catalogHit.unit
        ? `${catalogHit.name} (${catalogHit.unit})`
        : catalogHit.name;
      const rate = Number(catalogHit.finalPrice) || 0;
      const mrp = Math.max(rate, Number(catalogHit.originalPrice) || rate);
      const updatedMap = saveBarcodeMapping({
        barcode: code,
        productId: catalogHit.id,
        name: displayName,
        mrp,
        rate,
      });
      setBarcodeMap(updatedMap);
      addItemToBill({
        productId: catalogHit.id,
        barcode: code,
        name: displayName,
        qty: 1,
        mrp,
        rate,
      });
      showToast(`📷 कैटलॉग से जुड़ा: ${catalogHit.name} (+1)`);
      return;
    }

    // 3. Unknown barcode -> prompt shopkeeper once to register & remember
    setPendingUnknownBarcode({
      barcode: code,
      name: '',
      mrp: '',
      rate: '',
      linkSearch: '',
    });
  };

  // Save unknown barcode entry & add to bill
  const handleSaveUnknownBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUnknownBarcode) return;
    const name = pendingUnknownBarcode.name.trim();
    const rate = Number(pendingUnknownBarcode.rate) || 0;
    const mrp = Math.max(rate, Number(pendingUnknownBarcode.mrp) || rate);
    if (!name || rate <= 0) return;

    const updatedMap = saveBarcodeMapping({
      barcode: pendingUnknownBarcode.barcode,
      name,
      mrp,
      rate,
    });
    setBarcodeMap(updatedMap);
    addItemToBill({
      barcode: pendingUnknownBarcode.barcode,
      name,
      qty: 1,
      mrp,
      rate,
    });
    showToast(`💾 बारकोड ${pendingUnknownBarcode.barcode} सेव हुआ और बिल में जुड़ा!`);
    setPendingUnknownBarcode(null);
  };

  // Link unknown barcode to an existing catalog product
  const handleLinkUnknownBarcodeToProduct = (product: Product) => {
    if (!pendingUnknownBarcode) return;
    const displayName = product.unit ? `${product.name} (${product.unit})` : product.name;
    const rate = Number(product.finalPrice) || 0;
    const mrp = Math.max(rate, Number(product.originalPrice) || rate);

    const updatedMap = saveBarcodeMapping({
      barcode: pendingUnknownBarcode.barcode,
      productId: product.id,
      name: displayName,
      mrp,
      rate,
    });
    setBarcodeMap(updatedMap);
    addItemToBill({
      productId: product.id,
      barcode: pendingUnknownBarcode.barcode,
      name: displayName,
      qty: 1,
      mrp,
      rate,
    });
    showToast(`🔗 बारकोड ${pendingUnknownBarcode.barcode} → "${product.name}" से लिंक हुआ!`);
    setPendingUnknownBarcode(null);
  };

  // Quick manual item add handler
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = manualName.trim();
    const qty = Math.max(0.01, Number(manualQty) || 1);
    const rate = Math.max(0, Number(manualRate) || 0);
    const mrp = Math.max(rate, Number(manualMrp) || rate);

    if (!cleanName || rate <= 0) return;

    addItemToBill({
      name: cleanName,
      qty,
      mrp,
      rate,
    });

    setManualName('');
    setManualQty('1');
    setManualMrp('');
    setManualRate('');
    manualNameInputRef.current?.focus();
  };

  // Line item editing handlers
  const updateItemField = (id: string, field: 'qty' | 'mrp' | 'rate' | 'name', rawValue: string) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'name') return { ...row, name: rawValue };
        const num = Math.max(0, Number(rawValue) || 0);
        if (field === 'qty') return { ...row, qty: num };
        if (field === 'mrp') return { ...row, mrp: num };
        if (field === 'rate') {
          return { ...row, rate: num, mrp: Math.max(row.mrp, num) };
        }
        return row;
      })
    );
  };

  const stepItemQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((row) =>
          row.id === id
            ? { ...row, qty: Math.round((row.qty + delta) * 100) / 100 }
            : row
        )
        .filter((row) => row.qty > 0)
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((row) => row.id !== id));
  };

  // Bill totals calculation
  const totals = useMemo(
    () => calculatePosTotals(items, Number(extraDiscount) || 0),
    [items, extraDiscount]
  );

  const dateStr = formatPosDate(liveNow);
  const timeStr = formatPosTime(liveNow);

  const currentBillRecord: PosBillRecord = useMemo(
    () => ({
      billNo: billNo.trim() || formatBillNumber(getCurrentBillCounter()),
      dateStr,
      timeStr,
      createdAtIso: liveNow.toISOString(),
      customerName: customerName.trim() || 'CASH',
      customerPhone: customerPhone.trim(),
      paymentMode,
      extraDiscount: totals.extraDiscount,
      items,
      mrpTotal: totals.mrpTotal,
      subTotal: totals.subTotal,
      itemSavings: totals.itemSavings,
      totalSavings: totals.totalSavings,
      grandTotal: totals.grandTotal,
      totalQty: totals.totalQty,
    }),
    [billNo, dateStr, timeStr, liveNow, customerName, customerPhone, paymentMode, totals, items]
  );

  const persistCurrentBillToHistory = () => {
    if (items.length === 0) return;
    const updated = savePosBillRecord(currentBillRecord);
    setRecentBills(updated);
  };

  const handlePrintReceipt = () => {
    if (items.length === 0) {
      showToast('⚠️ प्रिंट करने से पहले कम से कम 1 आइटम जोड़ें');
      return;
    }
    persistCurrentBillToHistory();
    window.print();
  };

  const handleDownloadPng = () => {
    if (items.length === 0) {
      showToast('⚠️ बिल डाउनलोड करने से पहले आइटम जोड़ें');
      return;
    }
    persistCurrentBillToHistory();
    downloadPosReceiptImage(currentBillRecord);
    showToast(`🖼️ ${currentBillRecord.billNo} रसीद PNG डाउनलोड हो गई!`);
  };

  const handleCopyReceiptText = () => {
    if (items.length === 0) return;
    navigator.clipboard?.writeText(generatePosWhatsAppReceiptText(currentBillRecord));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleStartNewBill = () => {
    if (items.length > 0) {
      persistCurrentBillToHistory();
      const nextSeq = advanceBillCounterFromBillNo(billNo);
      setBillNo(formatBillNumber(nextSeq));
    }
    setItems([]);
    setCustomerName('');
    setCustomerPhone('');
    setExtraDiscount('');
    setPaymentMode('Cash');
    setLiveNow(new Date());
    setPendingUnknownBarcode(null);
    showToast('🧾 नया काउंटर बिल तैयार है!');
  };

  const handleLoadRecentBill = (record: PosBillRecord) => {
    setBillNo(record.billNo);
    setCustomerName(record.customerName === 'CASH' ? '' : record.customerName);
    setCustomerPhone(record.customerPhone || '');
    setPaymentMode(record.paymentMode);
    setExtraDiscount(record.extraDiscount > 0 ? String(record.extraDiscount) : '');
    setItems(record.items);
    setShowRecentBills(false);
    showToast(`📂 बिल ${record.billNo} लोड हो गया (Reprint / Share के लिए तैयार)`);
  };

  const unknownBarcodeCatalogMatches = useMemo(() => {
    if (!pendingUnknownBarcode || !pendingUnknownBarcode.linkSearch.trim()) return [];
    return products
      .filter((p) => matchesUniversalSearch(p, pendingUnknownBarcode.linkSearch))
      .slice(0, 5);
  }, [products, pendingUnknownBarcode]);

  const whatsappShareUrl = useMemo(
    () => getPosWhatsAppShareUrl(currentBillRecord),
    [currentBillRecord]
  );

  const amountInWords = useMemo(
    () => numberToIndianWords(totals.grandTotal),
    [totals.grandTotal]
  );

  return (
    <div className="space-y-5">
      {/* Dedicated Thermal Printer CSS (58mm / 80mm / A4 clean output) */}
      <style>{`
        @media print {
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
          html, body {
            width: ${paperWidth} !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #pos-thermal-receipt-sheet,
          #pos-thermal-receipt-sheet * {
            visibility: visible !important;
          }
          #pos-thermal-receipt-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth} !important;
            max-width: ${paperWidth} !important;
            margin: 0 !important;
            padding: ${paperWidth === '58mm' ? '3mm 2mm' : '4mm 3mm'} !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: ${paperWidth === '58mm' ? '9.5px' : '11px'} !important;
            line-height: 1.25 !important;
          }
          .pos-no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top POS Workspace Control Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 pos-no-print">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-black text-base sm:text-lg text-stone-900 leading-tight">
              काउंटर बिलिंग (Counter POS & Thermal Receipt)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
              {billNo} · {dateStr} · {timeStr} · {Object.keys(barcodeMap).length} Saved Barcodes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Mode Segmented Control */}
          <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200">
            {(['Cash', 'UPI'] as PosPaymentMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  paymentMode === mode
                    ? 'bg-stone-900 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {mode === 'Cash' ? '💵 Cash' : '📱 UPI'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowRecentBills((v) => !v)}
            className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Recent Bills ({recentBills.length})</span>
          </button>

          <button
            type="button"
            onClick={handleStartNewBill}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Bill</span>
          </button>
        </div>
      </div>

      {/* Inline Toast Feedback */}
      {inlineToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between pos-no-print">
          <span>{inlineToast}</span>
          <button
            type="button"
            onClick={() => setInlineToast(null)}
            className="p-1 text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Recent Bills Drawer Panel */}
      {showRecentBills && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3 pos-no-print">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-stone-900">
              Recent Counter Bills ({recentBills.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowRecentBills(false)}
              className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {recentBills.length === 0 ? (
            <p className="text-xs text-stone-500 py-3">
              अभी तक कोई काउंटर बिल सेव नहीं हुआ है। प्रिंट या शेयर करने पर बिल यहाँ दिखेंगे।
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
              {recentBills.map((rec) => (
                <button
                  key={rec.billNo}
                  type="button"
                  onClick={() => handleLoadRecentBill(rec)}
                  className="text-left p-3 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 tabular-nums">
                    <span className="font-mono">{rec.billNo}</span>
                    <span className="text-emerald-700">₹{rec.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-[11px] text-stone-600 truncate">
                    {rec.customerName || 'CASH'} {rec.customerPhone ? `· ${rec.customerPhone}` : ''}
                  </div>
                  <div className="text-[11px] text-stone-400 tabular-nums">
                    {rec.dateStr} · {rec.timeStr} · {rec.items.length} items · {rec.paymentMode}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main 2-Column POS Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ============================================================
            LEFT COLUMN (7 cols): FAST BILLING DESK
        ============================================================ */}
        <div className="lg:col-span-7 space-y-4 pos-no-print">
          {/* 1. Customer & Bill Controls Strip */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
            <h3 className="font-heading font-bold text-xs text-stone-500 uppercase tracking-wider">
              Customer & Bill Details
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Bill No.
                </label>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="CASH"
                    className="w-full pl-8 pr-2.5 py-2 text-xs font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Mobile No. (WhatsApp)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 14))}
                    placeholder="10-digit mobile"
                    className="w-full pl-8 pr-2.5 py-2 text-xs font-mono font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Extra Bill Disc. (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={extraDiscount}
                    onChange={(e) => setExtraDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-2.5 py-2 text-xs font-mono font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. Search Store Catalog + Camera Barcode Scanner */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading font-bold text-xs text-stone-500 uppercase tracking-wider">
                1. Search Catalog ({products.length} Items) or Scan Barcode
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Catalog Search Autocomplete */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="pos-catalog-search-input"
                  type="text"
                  value={catalogQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 180)}
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && catalogQuery.trim()) {
                      e.preventDefault();
                      const q = catalogQuery.trim();
                      // Support USB barcode scanner typing directly into search box
                      if (/^\d{6,14}$/.test(q)) {
                        handleBarcodeDetected(q);
                        setCatalogQuery('');
                        return;
                      }
                      if (catalogMatches.length > 0) {
                        handleSelectCatalogProduct(catalogMatches[0]);
                      }
                    }
                  }}
                  placeholder="आइटम खोजें (e.g. Atta, Maggi, Tata Salt, Oil) या बारकोड स्कैन करें..."
                  className="w-full min-h-[44px] pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 focus:outline-none"
                />
                {catalogQuery && (
                  <button
                    type="button"
                    onClick={() => setCatalogQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                {/* Autocomplete Dropdown */}
                {isSearchFocused && catalogQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-stone-200 shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-stone-100">
                    {catalogMatches.length === 0 ? (
                      <div className="p-3.5 text-xs text-stone-500 flex items-center justify-between gap-2">
                        <span>"{catalogQuery}" कैटलॉग में नहीं मिला।</span>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setManualName(catalogQuery.trim());
                            setCatalogQuery('');
                            manualNameInputRef.current?.focus();
                          }}
                          className="text-emerald-700 font-bold hover:underline cursor-pointer whitespace-nowrap"
                        >
                          + Manual Add करें
                        </button>
                      </div>
                    ) : (
                      catalogMatches.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectCatalogProduct(prod);
                          }}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-emerald-50/70 transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-stone-900 truncate">
                              {prod.name}
                            </div>
                            <div className="text-[11px] text-stone-500 truncate">
                              {prod.unit || '1 Pack'} · {prod.category}
                            </div>
                          </div>
                          <div className="text-right shrink-0 tabular-nums">
                            <div className="text-xs font-black text-emerald-700">
                              ₹{Number(prod.finalPrice).toFixed(0)}
                            </div>
                            {Number(prod.originalPrice) > Number(prod.finalPrice) && (
                              <div className="text-[10px] text-stone-400 line-through">
                                MRP ₹{Number(prod.originalPrice).toFixed(0)}
                              </div>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Camera Barcode Scanner Button */}
              <button
                id="pos-open-barcode-scanner-btn"
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-heading font-bold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
              >
                <ScanBarcode className="w-4 h-4 text-emerald-400" />
                <span>📷 Scan Barcode</span>
              </button>
            </div>

            {/* Unknown Barcode Registration Card (One-time save & remember) */}
            {pendingUnknownBarcode && (
              <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <PackagePlus className="w-4 h-4 text-amber-700" />
                      <span>नया बारकोड मिला: {pendingUnknownBarcode.barcode}</span>
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      इसे एक बार सेव कर दें या स्टोर कैटलॉग आइटम से लिंक करें — अगली बार स्कैन करते ही अपने आप जुड़ जाएगा।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingUnknownBarcode(null)}
                    className="p-1 text-amber-800 hover:bg-amber-100 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Option A: Link to Existing Catalog Product */}
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={pendingUnknownBarcode.linkSearch}
                    onChange={(e) =>
                      setPendingUnknownBarcode((prev) =>
                        prev ? { ...prev, linkSearch: e.target.value } : null
                      )
                    }
                    placeholder="कैटलॉग के किसी प्रोडक्ट से लिंक करने के लिए नाम लिखें..."
                    className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                  {unknownBarcodeCatalogMatches.length > 0 && (
                    <div className="bg-white border border-amber-200 rounded-lg divide-y divide-stone-100 overflow-hidden">
                      {unknownBarcodeCatalogMatches.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleLinkUnknownBarcodeToProduct(p)}
                          className="w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-bold text-stone-900 truncate">
                            {p.name} ({p.unit})
                          </span>
                          <span className="font-mono font-bold text-emerald-700 shrink-0 ml-2">
                            Link · ₹{p.finalPrice}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Option B: Enter Name/MRP/Rate once */}
                <form
                  onSubmit={handleSaveUnknownBarcode}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-2 border-t border-amber-200/80"
                >
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold text-amber-900 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={pendingUnknownBarcode.name}
                      onChange={(e) =>
                        setPendingUnknownBarcode((prev) =>
                          prev ? { ...prev, name: e.target.value } : null
                        )
                      }
                      placeholder="e.g. Parle-G 800g"
                      className="w-full px-2.5 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-amber-900 mb-1">
                      M.R.P (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={pendingUnknownBarcode.mrp}
                      onChange={(e) =>
                        setPendingUnknownBarcode((prev) =>
                          prev ? { ...prev, mrp: e.target.value } : null
                        )
                      }
                      placeholder="MRP"
                      className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-amber-900 mb-1">
                      Rate (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.5"
                      step="0.5"
                      value={pendingUnknownBarcode.rate}
                      onChange={(e) =>
                        setPendingUnknownBarcode((prev) =>
                          prev ? { ...prev, rate: e.target.value } : null
                        )
                      }
                      placeholder="Rate"
                      className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Add</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* 3. Quick Manual Item Entry (Unlisted / Loose Items) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2.5">
            <h3 className="font-heading font-bold text-xs text-stone-500 uppercase tracking-wider">
              2. Quick Manual Item Entry (Loose Sugar, Dal, Unlisted Items)
            </h3>
            <form
              onSubmit={handleAddManualItem}
              className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end"
            >
              <div className="col-span-2 sm:col-span-5">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Item Name
                </label>
                <input
                  ref={manualNameInputRef}
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Loose Sugar / Arhar Dal 1kg"
                  className="w-full px-3 py-2 text-xs font-semibold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={manualQty}
                  onChange={(e) => setManualQty(e.target.value)}
                  placeholder="1"
                  className="w-full px-2.5 py-2 text-xs font-mono font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  MRP (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={manualMrp}
                  onChange={(e) => setManualMrp(e.target.value)}
                  placeholder="MRP"
                  className="w-full px-2.5 py-2 text-xs font-mono font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Rate (₹)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="any"
                  value={manualRate}
                  onChange={(e) => setManualRate(e.target.value)}
                  placeholder="Rate"
                  className="w-full px-2.5 py-2 text-xs font-mono font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="col-span-1 sm:col-span-1">
                <button
                  type="submit"
                  disabled={!manualName.trim() || !(Number(manualRate) > 0)}
                  className="w-full min-h-[36px] py-2 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                  title="Add item to bill"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>

          {/* 4. Editable Current Bill Table */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm text-stone-900">
                Bill Items ({items.length})
              </h3>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Receipt className="w-10 h-10 text-stone-300 mx-auto" />
                <p className="text-sm font-bold text-stone-700">बिल अभी खाली है</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  ऊपर कैटलॉग से आइटम खोजें, कैमरा बारकोड स्कैन करें, या लूज़/अन्य आइटम मैन्युअल जोड़ें।
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse tabular-nums">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold text-stone-500 uppercase">
                      <th className="py-2.5 px-3 w-10">SN</th>
                      <th className="py-2.5 px-2">Item Description</th>
                      <th className="py-2.5 px-2 text-center w-28">Qty</th>
                      <th className="py-2.5 px-2 text-right w-20">MRP</th>
                      <th className="py-2.5 px-2 text-right w-20">Rate</th>
                      <th className="py-2.5 px-2 text-right w-20">Bnf.</th>
                      <th className="py-2.5 px-3 text-right w-24">Amount</th>
                      <th className="py-2.5 px-2 w-9" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {items.map((row, idx) => {
                      const effectiveMrp = Math.max(row.rate, row.mrp);
                      const lineAmount = Math.round(row.qty * row.rate * 100) / 100;
                      const lineBenefit = Math.max(
                        0,
                        Math.round((effectiveMrp - row.rate) * row.qty * 100) / 100
                      );
                      return (
                        <tr key={row.id} className="hover:bg-stone-50/70">
                          <td className="py-2 px-3 font-mono font-bold text-stone-400">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => updateItemField(row.id, 'name', e.target.value)}
                              className="w-full min-w-[130px] bg-transparent font-bold text-stone-900 focus:bg-white focus:border focus:border-emerald-500 rounded px-1 py-0.5 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => stepItemQty(row.id, -1)}
                                className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={row.qty}
                                onChange={(e) => updateItemField(row.id, 'qty', e.target.value)}
                                className="w-11 text-center font-mono font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded py-0.5 focus:outline-none focus:border-emerald-600"
                              />
                              <button
                                type="button"
                                onClick={() => stepItemQty(row.id, 1)}
                                className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.mrp}
                              onChange={(e) => updateItemField(row.id, 'mrp', e.target.value)}
                              className="w-16 text-right font-mono text-stone-500 bg-stone-50 border border-stone-200 rounded px-1.5 py-0.5 focus:bg-white focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.rate}
                              onChange={(e) => updateItemField(row.id, 'rate', e.target.value)}
                              className="w-16 text-right font-mono font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded px-1.5 py-0.5 focus:bg-white focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-700">
                            {lineBenefit > 0 ? `₹${lineBenefit.toFixed(0)}` : '0'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-stone-950">
                            ₹{lineAmount.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeItem(row.id)}
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              aria-label={`Remove ${row.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quick Summary Footer Strip */}
            <div className="bg-stone-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 tabular-nums">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">Item Qty</span>
                  <span className="font-mono font-bold">
                    {items.length} / {totals.totalQty}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">MRP Total</span>
                  <span className="font-mono font-bold">₹{totals.mrpTotal.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-emerald-400 block text-[10px]">Total Savings</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ₹{totals.totalSavings.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-stone-400 block text-[10px] uppercase tracking-wider">
                  G. TOTAL ({paymentMode})
                </span>
                <span className="font-mono font-black text-xl text-white">
                  ₹{totals.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN (5 cols): SUPERMARKET THERMAL RECEIPT PREVIEW
        ============================================================ */}
        <div className="lg:col-span-5 space-y-3">
          {/* Paper Width Switch & Quick Utility Bar */}
          <div className="bg-white rounded-2xl border border-stone-200 p-3 flex items-center justify-between gap-2 pos-no-print">
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  paperWidth === '80mm'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                80mm Roll
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  paperWidth === '58mm'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                58mm Roll
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyReceiptText}
                disabled={items.length === 0}
                className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedText ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedText ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={items.length === 0}
                className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-40 text-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Download Thermal Receipt PNG Image"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PNG</span>
              </button>
            </div>
          </div>

          {/* Primary Print & WhatsApp Share CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pos-no-print">
            <button
              id="pos-print-receipt-btn"
              type="button"
              onClick={handlePrintReceipt}
              disabled={items.length === 0}
              className="min-h-[44px] px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs sm:text-sm font-heading font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors whitespace-nowrap"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>🖨️ Print Receipt</span>
            </button>

            <a
              id="pos-whatsapp-share-btn"
              href={items.length > 0 ? whatsappShareUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (items.length === 0) {
                  e.preventDefault();
                  showToast('⚠️ WhatsApp पर शेयर करने से पहले आइटम जोड़ें');
                  return;
                }
                persistCurrentBillToHistory();
              }}
              className={`min-h-[44px] px-4 py-3 rounded-xl text-white text-xs sm:text-sm font-heading font-black flex items-center justify-center gap-2 shadow-sm transition-colors whitespace-nowrap ${
                items.length === 0
                  ? 'bg-emerald-700/40 pointer-events-none'
                  : 'bg-[#0c831f] hover:bg-[#0a731b] cursor-pointer'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>📲 Share Bill on WhatsApp</span>
            </a>
          </div>

          {/* Live Authentic Indian Supermarket Thermal Receipt Preview */}
          <div className="bg-stone-200/70 rounded-2xl p-3 sm:p-4 flex justify-center border border-stone-300/80">
            <div
              id="pos-thermal-receipt-sheet"
              className={`bg-white text-black font-mono shadow-lg border border-stone-300 transition-all ${
                paperWidth === '58mm'
                  ? 'w-[280px] px-3 py-4 text-[10px]'
                  : 'w-full max-w-[380px] px-4 py-5 text-[11px]'
              } leading-snug tabular-nums`}
            >
              {/* Store Header */}
              <div className="text-center pb-2.5 border-b border-dashed border-stone-800">
                <div className="text-xl font-black tracking-[0.12em] leading-none">
                  {POS_STORE_HEADER.title}
                </div>
                <div className="text-[10px] font-bold mt-1.5 leading-tight">
                  {POS_STORE_HEADER.address}
                </div>
                <div className="text-[10px] font-bold mt-0.5">
                  Ph: {POS_STORE_HEADER.phone}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest mt-1.5 text-stone-700">
                  *** RETAIL CASH / COUNTER BILL ***
                </div>
              </div>

              {/* Meta Row */}
              <div className="py-2 border-b border-dashed border-stone-800 space-y-1 text-[10.5px]">
                <div className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-bold">Customer:</span>{' '}
                    {customerName.trim() || 'CASH'}
                  </span>
                  <span className="shrink-0">
                    <span className="font-bold">Bill No:</span> {billNo}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="truncate">
                    <span className="font-bold">Mobile:</span>{' '}
                    {customerPhone.trim() || '-'}
                  </span>
                  <span className="shrink-0">
                    <span className="font-bold">Date:</span> {dateStr}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>
                    <span className="font-bold">Pay Mode:</span> {paymentMode}
                  </span>
                  <span>
                    <span className="font-bold">Time:</span> {timeStr}
                  </span>
                </div>
              </div>

              {/* Item Table Header */}
              <table className="w-full border-collapse my-1.5">
                <thead>
                  <tr className="border-b border-dashed border-stone-800 text-[9.5px] font-bold">
                    <th className="py-1 text-left w-5">SN</th>
                    <th className="py-1 text-left">Description</th>
                    <th className="py-1 text-right">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">M.R.P</th>
                    <th className="py-1 text-right">Bnf.</th>
                    <th className="py-1 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-stone-300">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-stone-400 italic">
                        Add items to preview live bill
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const effectiveMrp = Math.max(item.rate, item.mrp);
                      const amount = Math.round(item.qty * item.rate * 100) / 100;
                      const bnfAmt = Math.max(
                        0,
                        Math.round((effectiveMrp - item.rate) * item.qty * 100) / 100
                      );
                      return (
                        <tr key={item.id} className="align-top text-[10px]">
                          <td className="py-1 pr-0.5 font-bold">{idx + 1}</td>
                          <td className="py-1 pr-1 font-semibold break-words max-w-[115px]">
                            {item.name}
                          </td>
                          <td className="py-1 pl-0.5 text-right whitespace-nowrap">
                            {item.qty}
                          </td>
                          <td className="py-1 pl-1 text-right whitespace-nowrap">
                            {item.rate.toFixed(0)}
                          </td>
                          <td className="py-1 pl-1 text-right whitespace-nowrap text-stone-700">
                            {effectiveMrp.toFixed(0)}
                          </td>
                          <td className="py-1 pl-1 text-right whitespace-nowrap">
                            {bnfAmt > 0 ? bnfAmt.toFixed(0) : '0'}
                          </td>
                          <td className="py-1 pl-1 text-right font-bold whitespace-nowrap">
                            {amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Footer Totals */}
              <div className="pt-2 border-t border-dashed border-stone-800 space-y-1 text-[10.5px]">
                <div className="flex justify-between">
                  <span>Item Qty: {items.length} / {totals.totalQty}</span>
                  <span>MRP Total: ₹{totals.mrpTotal.toFixed(2)}</span>
                </div>

                {totals.extraDiscount > 0 && (
                  <div className="flex justify-between">
                    <span>Extra Bill Discount:</span>
                    <span>-₹{totals.extraDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold">
                  <span>Total Benefit (Bnf. Amt):</span>
                  <span>₹{totals.totalSavings.toFixed(2)}</span>
                </div>
              </div>

              {/* Bold Grand Total */}
              <div className="my-2 py-2 border-y-2 border-dashed border-stone-900 flex justify-between items-baseline">
                <span className="text-sm font-black tracking-wide">G. TOTAL</span>
                <span className="text-lg font-black">₹{totals.grandTotal.toFixed(2)}</span>
              </div>

              {/* Amount in Words */}
              <div className="text-[10px] font-bold pb-2 border-b border-dashed border-stone-800">
                {amountInWords}
              </div>

              {/* Total Savings Highlight Box (High Contrast Black/White for Thermal Print) */}
              {totals.totalSavings > 0 && (
                <div className="my-2 py-1 px-2 border border-stone-900 text-center text-[10.5px] font-black">
                  ★ YOU SAVED ₹{totals.totalSavings.toFixed(2)} ON THIS BILL ★
                </div>
              )}

              {/* Shop Terms & Conditions */}
              <div className="pt-1.5 text-center space-y-1 text-[9.5px] text-stone-800">
                <div className="font-bold uppercase tracking-wider text-[9px]">
                  Terms & Conditions
                </div>
                {POS_STORE_HEADER.terms.map((term, i) => (
                  <div key={i}>{term}</div>
                ))}
                <div className="pt-1.5 font-black text-[10.5px] tracking-wide">
                  THANK YOU! VISIT AGAIN — {POS_STORE_HEADER.title}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      <PosBarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onBarcodeDetected={handleBarcodeDetected}
      />
    </div>
  );
};
