import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Barcode,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { Product } from '../types';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected?: (barcode: string, matchedProduct?: Product | null) => void;
  onDetected?: (barcode: string, matchedProduct?: Product | null) => void;
  mode?: 'search' | 'bind';
  productToBind?: Product | null;
  catalogProducts?: Product[];
  products?: Product[];
}

const playScanSuccessSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // Ignore audio autoplay restrictions
  }
};

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
  onDetected,
  mode = 'search',
  productToBind,
  catalogProducts,
  products,
}) => {
  const activeCatalog = catalogProducts || products || [];
  const emitDetected = onBarcodeDetected || onDetected;

  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const objectUrlRef = useRef<string | null>(null);

  const cleanupPreviewUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupPreviewUrl();
      setCapturedPreviewUrl(null);
      setIsDecoding(false);
      setDecodeError(null);
      setScannedCode(null);
      setMatchedProduct(null);
      setManualCodeInput('');
    }
    return () => {
      cleanupPreviewUrl();
    };
  }, [isOpen]);

  const findProductByBarcode = (code: string): Product | null => {
    const clean = code.trim().toLowerCase();
    if (!clean) return null;
    return (
      activeCatalog.find((p) => {
        const pBarcode = (p.barcode || '').trim().toLowerCase();
        const pSku = (p.sku || '').trim().toLowerCase();
        const pId = (p.id || '').trim().toLowerCase();
        return pBarcode === clean || pSku === clean || pId === clean;
      }) || null
    );
  };

  const handleScanSuccess = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch {}
    }
    playScanSuccessSound();

    const matched = findProductByBarcode(code);
    setScannedCode(code);
    setMatchedProduct(matched);
    setDecodeError(null);
    setIsDecoding(false);

    setTimeout(() => {
      emitDetected?.(code, matched);
      onClose();
    }, 950);
  };

  const decodeRotatedCanvasVariants = async (
    reader: BrowserMultiFormatReader,
    imageUrl: string
  ): Promise<string | null> => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image load failed'));
      el.src = imageUrl;
    });

    // Try native BarcodeDetector first if available on this browser
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });
        const detected = await detector.detect(img);
        if (detected && detected.length > 0 && detected[0].rawValue) {
          return String(detected[0].rawValue);
        }
      } catch {
        // Fallback to ZXing canvas passes
      }
    }

    // Pass 1: Direct decodeFromImageUrl
    try {
      const directResult = await reader.decodeFromImageUrl(imageUrl);
      if (directResult?.getText()) {
        return directResult.getText();
      }
    } catch {
      // Try scaled / rotated canvas passes next
    }

    // Pass 2: Resized & 90-degree rotated canvas attempts (great for portrait phone shots)
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const w = Math.max(1, Math.round((img.naturalWidth || 640) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || 480) * scale));

    const angles = [0, 90, 270];
    for (const angle of angles) {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        if (angle === 90 || angle === 270) {
          canvas.width = h;
          canvas.height = w;
        } else {
          canvas.width = w;
          canvas.height = h;
        }

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        const result = reader.decodeFromCanvas(canvas);
        if (result?.getText()) {
          return result.getText();
        }
      } catch {
        // Continue trying next orientation
      }
    }

    return null;
  };

  const handleBarcodeImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) {
      e.target.value = '';
    }
    if (!file) return;

    cleanupPreviewUrl();
    const imgUrl = URL.createObjectURL(file);
    objectUrlRef.current = imgUrl;

    setCapturedPreviewUrl(imgUrl);
    setDecodeError(null);
    setScannedCode(null);
    setMatchedProduct(null);
    setIsDecoding(true);

    try {
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints);

      const decodedText = await decodeRotatedCanvasVariants(reader, imgUrl);
      if (decodedText) {
        handleScanSuccess(decodedText);
      } else {
        setIsDecoding(false);
        setDecodeError(
          'फोटो में बारकोड साफ नहीं पढ़ पाया। कृपया बारकोड के पास से साफ रोशनी में दोबारा फोटो खींचें या नीचे नंबर टाइप करें।'
        );
      }
    } catch (err) {
      console.warn('Barcode decode error:', err);
      setIsDecoding(false);
      setDecodeError(
        'फोटो से बारकोड नहीं मिल पाया। कृपया दोबारा साफ फोटो खींचें या नीचे बारकोड नंबर टाइप करें।'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-stone-900 text-white rounded-3xl shadow-2xl border border-stone-700/80 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black shrink-0">
              <Barcode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-extrabold text-sm sm:text-base text-white truncate">
                {mode === 'bind' ? 'Bind Product Barcode / SKU' : 'Scan Package Barcode / SKU'}
              </h3>
              <p className="text-[11px] text-amber-300 font-medium truncate">
                {mode === 'bind' && productToBind
                  ? `Product: ${productToBind.name}`
                  : 'Zero-Permission Native Camera • EAN-13 / UPC / SKU'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close barcode scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Native Camera Capture & Preview Zone (Zero Browser Permissions Needed) */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Preview or Scan Launch Box */}
          <div className="relative rounded-2xl bg-stone-950 border border-stone-800 overflow-hidden min-h-[210px] flex flex-col items-center justify-center p-4 text-center">
            {capturedPreviewUrl ? (
              <div className="w-full space-y-3">
                <div className="relative mx-auto max-h-52 rounded-xl overflow-hidden bg-black flex items-center justify-center border border-stone-700">
                  <img
                    src={capturedPreviewUrl}
                    alt="Captured packet barcode"
                    className="max-h-52 w-auto object-contain"
                  />

                  {isDecoding && (
                    <div className="absolute inset-0 bg-stone-950/75 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                      <span className="text-xs font-bold text-amber-200">
                        बारकोड पढ़ा जा रहा है...
                      </span>
                    </div>
                  )}

                  {scannedCode && (
                    <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-4 text-center">
                      <CheckCircle className="w-10 h-10 text-emerald-400 mb-2" />
                      <h4 className="font-heading font-black text-base text-white">
                        Barcode Scanned!
                      </h4>
                      <p className="font-mono text-sm font-bold text-amber-300 mt-1 bg-black/40 px-3 py-1 rounded-lg border border-amber-400/30">
                        {scannedCode}
                      </p>
                      {matchedProduct && (
                        <p className="text-xs text-emerald-200 font-bold mt-2">
                          {matchedProduct.name} • ₹{matchedProduct.finalPrice}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {decodeError && (
                  <div className="rounded-xl bg-rose-950/70 border border-rose-700/70 p-3 text-left flex items-start gap-2 text-xs text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{decodeError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 py-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <Barcode className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-heading font-black text-sm sm:text-base text-white">
                    पैकेट के बारकोड की फोटो खींचें
                  </p>
                  <p className="text-xs text-stone-400 max-w-xs mx-auto leading-relaxed">
                    नीचे बटन दबाते ही सीधे फोन का कैमरा खुलेगा (बिना किसी ब्राउज़र परमिशन एरर के)।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Primary Zero-Permission Native Camera Button + Secondary Gallery Button (Direct Overlay Inputs) */}
          <div className="space-y-2.5">
            <div className="relative overflow-hidden cursor-pointer rounded-2xl">
              <button
                type="button"
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-heading font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <Camera className="w-5 h-5 shrink-0" />
                <span>📷 पैकेट का बारकोड स्कैन करें</span>
              </button>
              <input
                id="native-barcode-cam"
                type="file"
                accept="image/*"
                capture="environment"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={handleBarcodeImageCapture}
              />
            </div>

            <div className="relative overflow-hidden cursor-pointer rounded-xl">
              <button
                type="button"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-[0.98] text-stone-200 font-heading font-bold text-xs border border-stone-700 transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
              >
                <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />
                <span>🖼️ गैलरी से बारकोड चुनें</span>
              </button>
              <input
                id="native-barcode-gal"
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={handleBarcodeImageCapture}
              />
            </div>
          </div>

          {/* Manual Barcode / SKU Entry Fallback */}
          <div className="pt-3 border-t border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium">
              <span>या बारकोड नंबर हाथ से लिखें:</span>
              <span>EAN-13 / Code-128 / SKU</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualCodeInput.trim()) {
                  handleScanSuccess(manualCodeInput.trim());
                }
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="उदा. 8901030383921"
                className="flex-1 min-h-[44px] px-3 py-2 bg-stone-800 text-white border border-stone-700 rounded-xl font-mono text-xs focus:outline-hidden focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={!manualCodeInput.trim()}
                className="min-h-[44px] px-4 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-stone-950 font-heading font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap"
              >
                <span>{mode === 'bind' ? 'Bind SKU' : 'Lookup'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
