import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  Package,
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
  Flashlight,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import {
  fetchProductByBarcode,
  playBarcodeBeep,
  ScannedProductData,
  mapToKiranaCategory,
} from '../services/barcodeService';
import { insertProductToSupabase } from '../services/supabaseClient';
import { GROCERY_CATEGORIES } from '../data/initialProducts';
import { getValidImageUrl, getCategoryFallbackSvg } from '../utils/productImageUtils';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded?: (product: Product) => void;
  existingProducts?: Product[];
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onProductAdded,
  existingProducts = [],
}: BarcodeScannerModalProps) {
  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Lookup state
  const [isFetching, setIsFetching] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [scannedProduct, setScannedProduct] = useState<ScannedProductData | null>(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null);

  // Continuous Scan Mode & Auto-Save
  const [continuousMode, setContinuousMode] = useState(false);
  const [autoSaveCountdown, setAutoSaveCountdown] = useState<number | null>(null);
  const [sessionAddedCount, setSessionAddedCount] = useState<number>(0);
  const [lastSavedNotice, setLastSavedNotice] = useState<string | null>(null);

  // Edit / Review fields
  const [reviewName, setReviewName] = useState('');
  const [reviewBrand, setReviewBrand] = useState('');
  const [reviewUnit, setReviewUnit] = useState('1 piece');
  const [reviewCategory, setReviewCategory] = useState<string>('Packaged Foods');
  const [reviewMrp, setReviewMrp] = useState<string>('');
  const [reviewSellingPrice, setReviewSellingPrice] = useState<string>('');
  const [reviewImageUrl, setReviewImageUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Manual barcode entry tab
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);
  const autoSaveTimerRef = useRef<any>(null);

  // Reset and stop camera when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      isHandlingScanRef.current = false;
      setScannerError(null);
      setScannedProduct(null);
      setNotFoundBarcode(null);
      setAutoSaveCountdown(null);
      // Small timeout to allow DOM element to render
      const timer = setTimeout(() => {
        if (activeTab === 'camera') {
          startScanner();
        }
      }, 350);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
      clearAutoSaveTimer();
    }
  }, [isOpen, activeTab]);

  const clearAutoSaveTimer = () => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    setAutoSaveCountdown(null);
  };

  const startScanner = async () => {
    try {
      setScannerError(null);
      const readerEl = document.getElementById('kiranape-barcode-reader');
      if (!readerEl) return;

      // Clean existing instance
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          await html5QrCodeRef.current.clear();
        } catch {
          // ignore cleanup err
        }
      }

      // Configure supported barcode formats: EAN-13, EAN-8, UPC, Code 128, QR Code
      const qrCode = new Html5Qrcode('kiranape-barcode-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.33,
      };

      await qrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleBarcodeDecoded(decodedText);
        },
        () => {
          // Frame scan error / no code in view - ignore to avoid spamming
        }
      );

      setIsScanning(true);
      setHasCameraPermission(true);
    } catch (err: any) {
      console.warn('Failed starting barcode scanner:', err);
      setIsScanning(false);
      setHasCameraPermission(false);
      setScannerError(
        err?.message ||
          'Camera access not available. Please grant camera permission or use manual barcode entry.'
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        html5QrCodeRef.current = null;
        setIsScanning(false);
      }
    }
  };

  // Toggle flashlight / torch
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const nextTorch = !torchOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.warn('Torch not supported on this device:', err);
    }
  };

  // Process decoded barcode
  const handleBarcodeDecoded = async (barcode: string) => {
    const clean = barcode.trim().replace(/[^0-9a-zA-Z]/g, '');
    if (!clean || isHandlingScanRef.current) return;

    isHandlingScanRef.current = true;
    setScannedBarcode(clean);

    if (soundEnabled) {
      playBarcodeBeep('success');
    }

    // Stop scanner camera view to freeze on scanned item
    await stopScanner();

    // Check if item already exists in current local inventory
    const existing = existingProducts.find(
      (p) => p.barcode === clean || (p.description && p.description.includes(clean))
    );

    if (existing) {
      setReviewName(existing.name);
      setReviewBrand('');
      setReviewUnit(existing.unit || '1 piece');
      setReviewCategory(existing.category || 'Packaged Foods');
      setReviewMrp(String(existing.originalPrice || ''));
      setReviewSellingPrice(String(existing.finalPrice || existing.originalPrice || ''));
      setReviewImageUrl(existing.imageUrl || '');
      setScannedProduct({
        barcode: clean,
        name: existing.name,
        brand: '',
        unit: existing.unit,
        category: existing.category,
        imageUrl: existing.imageUrl,
        originalPrice: existing.originalPrice,
        finalPrice: existing.finalPrice,
        discountPercent: existing.discountPercent,
        source: 'manual',
      });
      isHandlingScanRef.current = false;
      return;
    }

    // Fetch from Open Food Facts API
    setIsFetching(true);
    try {
      const productData = await fetchProductByBarcode(clean);
      if (productData) {
        setScannedProduct(productData);
        setNotFoundBarcode(null);
        setReviewName(productData.name);
        setReviewBrand(productData.brand || '');
        setReviewUnit(productData.unit || '1 piece');
        setReviewCategory(productData.category || 'Packaged Foods');
        setReviewMrp(productData.originalPrice > 0 ? String(productData.originalPrice) : '');
        setReviewSellingPrice(productData.finalPrice > 0 ? String(productData.finalPrice) : '');
        setReviewImageUrl(productData.imageUrl || '');

        // If continuous mode with Auto-Save is enabled, start quick 2s countdown
        if (continuousMode && productData.finalPrice > 0) {
          setAutoSaveCountdown(2);
          let count = 2;
          autoSaveTimerRef.current = setInterval(() => {
            count -= 1;
            setAutoSaveCountdown(count);
            if (count <= 0) {
              clearAutoSaveTimer();
              handleSaveProduct(productData, true);
            }
          }, 1000);
        }
      } else {
        // Not found in Open Food Facts database
        if (soundEnabled) {
          playBarcodeBeep('warning');
        }
        setScannedProduct(null);
        setNotFoundBarcode(clean);
        setReviewName('');
        setReviewBrand('');
        setReviewUnit('1 piece');
        setReviewCategory('Packaged Foods');
        setReviewMrp('');
        setReviewSellingPrice('');
        setReviewImageUrl('');
      }
    } catch (err) {
      console.warn('Error fetching barcode data:', err);
      setNotFoundBarcode(clean);
    } finally {
      setIsFetching(false);
      isHandlingScanRef.current = false;
    }
  };

  // Manual Barcode Lookup
  const handleManualLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualBarcodeInput.trim()) return;
    handleBarcodeDecoded(manualBarcodeInput.trim());
  };

  // Save product to inventory and Supabase database
  const handleSaveProduct = async (
    overrideData?: Partial<ScannedProductData>,
    autoResumeScanner = false
  ) => {
    clearAutoSaveTimer();
    const barcode = scannedBarcode || notFoundBarcode || manualBarcodeInput.trim();
    const name = reviewName.trim() || overrideData?.name || `Product (${barcode})`;
    const unit = reviewUnit.trim() || '1 piece';
    const category = reviewCategory || 'Packaged Foods';

    const mrp = Number(reviewMrp || overrideData?.originalPrice || reviewSellingPrice || 0);
    let sellPrice = Number(reviewSellingPrice || overrideData?.finalPrice || mrp || 0);
    if (sellPrice <= 0 && mrp > 0) {
      sellPrice = mrp;
    }

    const discountPercent =
      mrp > sellPrice && mrp > 0 ? Math.round(((mrp - sellPrice) / mrp) * 100) : 0;

    const imageUrl =
      reviewImageUrl.trim() ||
      overrideData?.imageUrl ||
      getValidImageUrl('', category, name, unit, sellPrice);

    setIsSaving(true);

    try {
      const newProduct: Product = {
        id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        category,
        unit,
        originalPrice: mrp > 0 ? mrp : sellPrice,
        discountPercent,
        finalPrice: sellPrice > 0 ? sellPrice : mrp,
        imageUrl,
        isAvailable: true,
        stock: 50,
        stockCount: 50,
        barcode,
        updatedAt: Date.now(),
      };

      // 1. Add to local App state & storage
      if (onProductAdded) {
        onProductAdded(newProduct);
      }

      // 2. Direct Sync to Supabase 'products' table
      const res = await insertProductToSupabase(newProduct);
      if (res.success) {
        console.log('[Barcode] Successfully synced to Supabase:', res.data?.id);
      } else {
        console.warn('[Barcode] Supabase sync returned notice:', res.error);
      }

      setSessionAddedCount((prev) => prev + 1);
      setLastSavedNotice(`✓ "${name}" (₹${sellPrice}) Catalog & Supabase mein add ho gaya!`);

      if (soundEnabled) {
        playBarcodeBeep('success');
      }

      // Reset review state
      setScannedProduct(null);
      setNotFoundBarcode(null);
      setScannedBarcode('');
      setManualBarcodeInput('');

      if (continuousMode || autoResumeScanner) {
        // Resume camera for next item
        setActiveTab('camera');
        setTimeout(() => {
          isHandlingScanRef.current = false;
          startScanner();
        }, 500);
      } else {
        // Done with single item, give dukandar option to scan next or close
        setActiveTab('camera');
        setTimeout(() => {
          isHandlingScanRef.current = false;
          startScanner();
        }, 600);
      }
    } catch (err: any) {
      console.warn('Error saving scanned product:', err);
      alert('Product save karte waqt error aaya: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Resume camera scanning
  const handleScanNext = () => {
    clearAutoSaveTimer();
    setScannedProduct(null);
    setNotFoundBarcode(null);
    setScannedBarcode('');
    setActiveTab('camera');
    isHandlingScanRef.current = false;
    setTimeout(() => {
      startScanner();
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-stone-950 border-b border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-heading font-black text-white">
                  Smart Barcode Scanner
                </h3>
                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 fill-current" /> POS High-Speed
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                EAN-13, UPC, Code 128 & QR Codes auto-decode to Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                soundEnabled
                  ? 'bg-stone-800 border-stone-700 text-stone-200 hover:text-white'
                  : 'bg-stone-900 border-stone-800 text-stone-500 hover:text-stone-300'
              }`}
              title={soundEnabled ? 'Scanner Beep ON' : 'Scanner Beep Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Controls: Tabs & Continuous Mode Switch */}
        <div className="px-5 py-2.5 bg-stone-950/60 border-b border-stone-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                clearAutoSaveTimer();
                setScannedProduct(null);
                setNotFoundBarcode(null);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'camera'
                  ? 'bg-emerald-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera View</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                stopScanner();
                clearAutoSaveTimer();
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-emerald-500 text-stone-950 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Manual Number</span>
            </button>
          </div>

          {/* Continuous Scan Mode Toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none px-2.5 py-1 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 transition-colors">
            <input
              type="checkbox"
              checked={continuousMode}
              onChange={(e) => setContinuousMode(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
            <span className="text-[11px] font-bold text-stone-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Continuous Scan (Fast POS)
            </span>
          </label>
        </div>

        {/* Live Status / Session Counter Banner */}
        {(sessionAddedCount > 0 || lastSavedNotice) && (
          <div className="px-5 py-1.5 bg-emerald-950/40 border-b border-emerald-900/30 text-emerald-300 text-xs flex items-center justify-between">
            <span className="truncate">{lastSavedNotice || 'Items added directly to Supabase'}</span>
            <span className="font-mono font-bold bg-emerald-900/50 text-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
              {sessionAddedCount} added
            </span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Active View: Live Camera Scanner */}
          {activeTab === 'camera' && !scannedProduct && !notFoundBarcode && (
            <div className="flex flex-col items-center">
              {/* Camera Container */}
              <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black border-2 border-stone-800 shadow-inner flex flex-col items-center justify-center min-h-[260px]">
                {/* HTML5 QR Code Mount Element */}
                <div id="kiranape-barcode-reader" className="w-full h-full" />

                {/* Scanning Aim Visual Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="relative w-64 h-36 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center overflow-hidden">
                      {/* Laser scanning beam line */}
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-bounce opacity-90 shadow-[0_0_8px_#ef4444]" />

                      {/* Corner Target Markers */}
                      <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-300" />
                      <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-300" />
                      <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-300" />
                      <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-300" />

                      <span className="text-[10px] font-mono text-emerald-300/80 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                        Align Barcode Here
                      </span>
                    </div>

                    {/* Bottom hint */}
                    <p className="mt-3 text-[11px] font-medium text-stone-300 bg-black/70 px-3 py-1 rounded-full backdrop-blur-xs">
                      Hold packet 10-15 cm away under light
                    </p>
                  </div>
                )}

                {/* Torch / Flashlight Button Overlay */}
                {isScanning && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`absolute bottom-3 right-3 p-2.5 rounded-full border shadow-lg backdrop-blur-md transition-all cursor-pointer ${
                      torchOn
                        ? 'bg-amber-400 text-stone-950 border-amber-300'
                        : 'bg-stone-900/80 text-stone-300 border-stone-700 hover:text-white'
                    }`}
                    title="Toggle Camera Flashlight"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}

                {/* Error / Permission Denied State */}
                {scannerError && (
                  <div className="p-4 text-center text-stone-300 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs text-amber-200">{scannerError}</p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={startScanner}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('manual')}
                        className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Enter Manually
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Barcode Test Hints */}
              <div className="mt-3 flex items-center gap-2 text-stone-400 text-[11px]">
                <span>Sample Kirana Barcodes:</span>
                <button
                  type="button"
                  onClick={() => handleBarcodeDecoded('8901058863673')}
                  className="underline hover:text-emerald-400 cursor-pointer"
                >
                  Maggi Noodles
                </button>
                •
                <button
                  type="button"
                  onClick={() => handleBarcodeDecoded('8901030010173')}
                  className="underline hover:text-emerald-400 cursor-pointer"
                >
                  Tata Salt
                </button>
              </div>
            </div>
          )}

          {/* Manual Input Tab */}
          {activeTab === 'manual' && !scannedProduct && !notFoundBarcode && (
            <div className="max-w-md mx-auto space-y-4 py-2">
              <form onSubmit={handleManualLookup} className="space-y-3">
                <label className="block text-xs font-bold text-stone-300">
                  Barcode Number (EAN-13 / UPC / 8-14 digits):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={manualBarcodeInput}
                    onChange={(e) => setManualBarcodeInput(e.target.value)}
                    placeholder="e.g. 8901058863673"
                    className="flex-1 bg-stone-800 border border-stone-700 text-white rounded-xl px-3.5 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isFetching || !manualBarcodeInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-stone-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {isFetching ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Fetch Details</span>
                  </button>
                </div>
              </form>

              {/* Popular Instant Test Barcodes for Dukandar */}
              <div className="p-3 bg-stone-950/60 rounded-2xl border border-stone-800/80 space-y-2">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  Test With Common Kirana Barcodes:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setManualBarcodeInput('8901058863673');
                      handleBarcodeDecoded('8901058863673');
                    }}
                    className="p-2 text-left bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-stone-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-emerald-400">Maggi 2-Min Noodles</div>
                    <div className="text-[10px] text-stone-500 font-mono">8901058863673</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualBarcodeInput('8901030010173');
                      handleBarcodeDecoded('8901030010173');
                    }}
                    className="p-2 text-left bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-stone-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-emerald-400">Tata Salt (1 kg)</div>
                    <div className="text-[10px] text-stone-500 font-mono">8901030010173</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualBarcodeInput('8901030010210');
                      handleBarcodeDecoded('8901030010210');
                    }}
                    className="p-2 text-left bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-stone-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-emerald-400">Tata Tea Gold</div>
                    <div className="text-[10px] text-stone-500 font-mono">8901030010210</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualBarcodeInput('8901491101837');
                      handleBarcodeDecoded('8901491101837');
                    }}
                    className="p-2 text-left bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl text-stone-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <div className="font-bold text-emerald-400">Kurkure Masala Munch</div>
                    <div className="text-[10px] text-stone-500 font-mono">8901491101837</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isFetching && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-spin border border-emerald-500/40">
                <RefreshCw className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-stone-200">
                Open Food Facts database se product details fetch ho rahi hain...
              </p>
              <p className="text-xs font-mono text-stone-400">Barcode: {scannedBarcode}</p>
            </div>
          )}

          {/* State 1: Product Found via Barcode - Review & Quick Save Card */}
          {scannedProduct && !isFetching && (
            <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              {/* Product Header / Preview */}
              <div className="flex gap-4 items-start">
                {/* Packshot Image with Fallback */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-2 flex items-center justify-center flex-shrink-0 border border-stone-700 shadow-md overflow-hidden relative">
                  <img
                    src={reviewImageUrl || getValidImageUrl('', reviewCategory, reviewName, reviewUnit)}
                    alt={reviewName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getCategoryFallbackSvg(reviewCategory);
                    }}
                  />
                  <div className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                    Verified
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full">
                      Barcode: {scannedProduct.barcode}
                    </span>
                    {scannedProduct.brand && (
                      <span className="text-[10px] font-bold text-stone-400 bg-stone-900 px-2 py-0.5 rounded-full border border-stone-800">
                        {scannedProduct.brand}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-heading font-black text-white leading-tight">
                    {reviewName || 'Product Title'}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <span className="font-medium bg-stone-900 px-2 py-0.5 rounded border border-stone-800 text-stone-300">
                      {reviewUnit}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-medium">{reviewCategory}</span>
                  </div>

                  {/* Auto-save countdown pill if active */}
                  {autoSaveCountdown !== null && (
                    <div className="mt-2 flex items-center gap-2 text-xs bg-amber-950/60 border border-amber-600/50 text-amber-300 px-2.5 py-1 rounded-xl">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>Continuous Mode: Auto-saving in {autoSaveCountdown}s...</span>
                      <button
                        type="button"
                        onClick={clearAutoSaveTimer}
                        className="ml-auto underline text-[11px] font-bold text-amber-200 cursor-pointer"
                      >
                        Edit Price
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Fields: Selling Price, MRP, Unit & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-800/80">
                {/* Selling Price (Crucial for Dukandar) */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">
                    Selling Price (₹ Customer Rate) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-emerald-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={reviewSellingPrice}
                      onChange={(e) => {
                        clearAutoSaveTimer();
                        setReviewSellingPrice(e.target.value);
                      }}
                      placeholder="e.g. 89"
                      className="w-full bg-stone-900 border-2 border-emerald-500/80 text-white rounded-xl pl-7 pr-3 py-2 text-base font-black focus:outline-none focus:border-emerald-400 shadow-inner"
                      autoFocus
                    />
                  </div>
                </div>

                {/* MRP (Original Price) */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">
                    MRP / Original Price (₹ Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-bold text-stone-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={reviewMrp}
                      onChange={(e) => {
                        clearAutoSaveTimer();
                        setReviewMrp(e.target.value);
                      }}
                      placeholder="e.g. 100"
                      className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:border-stone-500"
                    />
                  </div>
                </div>

                {/* Unit / Net Weight */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">
                    Pack / Weight (Unit)
                  </label>
                  <input
                    type="text"
                    value={reviewUnit}
                    onChange={(e) => {
                      clearAutoSaveTimer();
                      setReviewUnit(e.target.value);
                    }}
                    placeholder="e.g. 500 g / 1 kg"
                    className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-stone-500"
                  />
                </div>

                {/* Store Category */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">Category</label>
                  <select
                    value={reviewCategory}
                    onChange={(e) => {
                      clearAutoSaveTimer();
                      setReviewCategory(e.target.value);
                    }}
                    className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-stone-500 cursor-pointer"
                  >
                    {GROCERY_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product Name Title Editor */}
              <div>
                <label className="block text-[11px] font-bold text-stone-300 mb-1">
                  Product Name (Edit if needed)
                </label>
                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => {
                    clearAutoSaveTimer();
                    setReviewName(e.target.value);
                  }}
                  className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-stone-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveProduct()}
                  disabled={isSaving}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 disabled:opacity-50 text-stone-950 font-heading font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                  ) : (
                    <Zap className="w-4 h-4 fill-current text-stone-950" />
                  )}
                  <span>
                    {isSaving
                      ? 'Saving to Supabase...'
                      : `Save to Catalog (₹${reviewSellingPrice || reviewMrp || '0'})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleScanNext}
                  className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>Skip / Scan Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* State 2: Rare Item - Fallback Manual Entry (Barcode auto-filled) */}
          {notFoundBarcode && !isFetching && (
            <div className="bg-stone-950 border border-amber-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-heading font-black text-white">
                    Rare / Local Item Detected
                  </h4>
                  <p className="text-xs text-stone-400">
                    Yeh item global database mein nahi mila, par barcode save kar liya gaya hai:{' '}
                    <span className="font-mono text-amber-300 font-bold">{notFoundBarcode}</span>.
                    Kripya naam aur rate daal kar save karein.
                  </p>
                </div>
              </div>

              {/* Quick Entry Form */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-stone-300 mb-1">
                    Product Title / Samaan Ka Naam *
                  </label>
                  <input
                    type="text"
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="e.g. Local Masala Bhujia / Khula Chawal"
                    className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 mb-1">
                      Selling Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-emerald-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={reviewSellingPrice}
                        onChange={(e) => setReviewSellingPrice(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 mb-1">
                      MRP (₹ Optional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-stone-400">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={reviewMrp}
                        onChange={(e) => setReviewMrp(e.target.value)}
                        placeholder="e.g. 60"
                        className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:border-stone-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 mb-1">
                      Unit / Quantity
                    </label>
                    <input
                      type="text"
                      value={reviewUnit}
                      onChange={(e) => setReviewUnit(e.target.value)}
                      placeholder="e.g. 250 g, 1 kg"
                      className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-stone-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 mb-1">
                      Category
                    </label>
                    <select
                      value={reviewCategory}
                      onChange={(e) => setReviewCategory(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-stone-500"
                    >
                      {GROCERY_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveProduct()}
                    disabled={isSaving || !reviewName.trim()}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 disabled:opacity-50 text-stone-950 font-heading font-black text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    ) : (
                      <Zap className="w-4 h-4 fill-current text-stone-950" />
                    )}
                    <span>Save to Catalog & Supabase</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleScanNext}
                    className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel / Scan Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-stone-950 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Open Food Facts API Live & Supabase Sync Ready</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white font-semibold cursor-pointer"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
