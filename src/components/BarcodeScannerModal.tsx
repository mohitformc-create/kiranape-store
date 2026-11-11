import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Zap, ZapOff, RefreshCw, Barcode, CheckCircle, Search, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string, matchedProduct?: Product | null) => void;
  mode?: 'search' | 'bind';
  productToBind?: Product | null;
  catalogProducts?: Product[];
}

// Play pleasant confirmation beep using Web Audio API
const playScanSuccessSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6 note

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (err) {
    // Ignore audio autoplay restrictions
  }
};

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
  mode = 'search',
  productToBind,
  catalogProducts = [],
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);

  // Look up product in catalog by barcode or SKU
  const findProductByBarcode = (code: string): Product | null => {
    const clean = code.trim().toLowerCase();
    if (!clean) return null;
    return (
      catalogProducts.find((p) => {
        const pBarcode = (p.barcode || '').trim().toLowerCase();
        const pSku = ((p as any).sku || '').trim().toLowerCase();
        const pId = (p.id || '').trim().toLowerCase();
        return pBarcode === clean || pSku === clean || pId === clean;
      }) || null
    );
  };

  const handleScanSuccess = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code || isScanning === false) return;

    // Trigger haptics and audio feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch {}
    }
    playScanSuccessSound();

    setScannedCode(code);
    setIsScanning(false);

    // Stop camera video stream
    stopCamera();

    const matched = findProductByBarcode(code);
    setMatchedProduct(matched);

    // Delay slightly to show celebratory scan confirmation
    setTimeout(() => {
      onBarcodeDetected(code, matched);
      onClose();
    }, 1100);
  };

  const startCamera = async () => {
    setErrorMessage(null);
    setScannedCode(null);
    setMatchedProduct(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Check torch support
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities && 'torch' in capabilities) {
          setTorchSupported(true);
        }

        // 1. Try native high-speed hardware BarcodeDetector first
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: [
                'ean_13',
                'ean_8',
                'upc_a',
                'upc_e',
                'code_128',
                'code_39',
                'qr_code',
              ],
            });

            let activeNative = true;
            const detectLoop = async () => {
              if (!activeNative || !videoRef.current || videoRef.current.readyState < 2) {
                if (activeNative) requestAnimationFrame(detectLoop);
                return;
              }
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  activeNative = false;
                  handleScanSuccess(barcodes[0].rawValue);
                  return;
                }
              } catch (err) {
                // Ignore transient frame detect errors
              }
              if (activeNative) {
                requestAnimationFrame(detectLoop);
              }
            };
            requestAnimationFrame(detectLoop);
            return;
          } catch (nativeErr) {
            console.info('[Scanner] Native BarcodeDetector fallback to ZXing:', nativeErr);
          }
        }

        // 2. Fallback to ZXing MultiFormat Reader
        const codeReader = new BrowserMultiFormatReader();
        zxingReaderRef.current = codeReader;

        try {
          const controls = await (codeReader as any).decodeFromVideoElement(
            videoRef.current,
            (result: any) => {
              if (result) {
                try {
                  controls?.stop();
                } catch {}
                handleScanSuccess(result.getText());
              }
            }
          );
          controlsRef.current = controls;
        } catch (zxingErr) {
          console.warn('[Scanner] ZXing start decode warning:', zxingErr);
        }
      }
    } catch (err: any) {
      console.warn('Barcode camera access error:', err);
      setHasCameraPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera in browser settings to scan barcodes.'
          : err.message || 'Unable to start camera scanner.'
      );
    }
  };

  const stopCamera = () => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch {}
      controlsRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        (zxingReaderRef.current as any).reset?.();
      } catch {}
      zxingReaderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchEnabled(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextTorch = !torchEnabled;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchEnabled(nextTorch);
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  const switchCameraFacing = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-stone-900 text-white rounded-3xl shadow-2xl border border-stone-700/80 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-sm sm:text-base text-white">
                {mode === 'bind' ? 'Bind Product Barcode / SKU' : 'Scan Package Barcode'}
              </h3>
              <p className="text-[11px] text-amber-300 font-medium">
                {mode === 'bind'
                  ? productToBind ? `Product: ${productToBind.name}` : 'Scan product FMCG code'
                  : 'Point camera at any grocery pack to search'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Section */}
        <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          {/* Camera Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Clean Scanning Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="relative w-full max-w-[260px] aspect-[4/3] rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
              {/* Corner Brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-amber-400 rounded-tl-xl -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-amber-400 rounded-tr-xl -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-amber-400 rounded-bl-xl -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-amber-400 rounded-br-xl -mb-1 -mr-1" />

              {/* Animated Laser Scanning Line */}
              {isScanning && (
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-bounce" />
              )}
            </div>
          </div>

          {/* Success Overlay on Detection */}
          {scannedCode && (
            <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-200 z-20">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/50">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h4 className="font-heading font-black text-lg text-white">Barcode Scanned!</h4>
              <p className="font-mono text-sm font-bold text-amber-300 mt-1 bg-black/40 px-3 py-1 rounded-lg border border-amber-400/30">
                {scannedCode}
              </p>
              {matchedProduct ? (
                <div className="mt-3 p-2.5 bg-white/10 rounded-xl border border-white/20 text-xs text-emerald-200">
                  <p className="font-bold text-white text-sm">{matchedProduct.name}</p>
                  <p className="text-amber-300 font-semibold mt-0.5">₹{matchedProduct.finalPrice} • {matchedProduct.unit}</p>
                </div>
              ) : (
                mode === 'bind' && (
                  <p className="text-xs text-emerald-200 mt-2">
                    Binding code to {productToBind?.name || 'Product'}...
                  </p>
                )
              )}
            </div>
          )}

          {/* Error / Permission Denied Notice */}
          {errorMessage && (
            <div className="absolute inset-0 bg-stone-950/95 flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <p className="text-xs text-stone-300 max-w-xs">{errorMessage}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Camera Controls Overlay (Torch & Flip) */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3 z-10">
            {torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                  torchEnabled ? 'bg-amber-400 text-stone-950 shadow-lg shadow-amber-400/50' : 'bg-black/60 text-white hover:bg-black/80'
                }`}
                title={torchEnabled ? 'Turn off flashlight' : 'Turn on flashlight'}
              >
                {torchEnabled ? <Zap className="w-4 h-4 fill-stone-950" /> : <ZapOff className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={switchCameraFacing}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer"
              title="Flip camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Manual Barcode / SKU Entry Fallback */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium">
            <span>Or enter barcode manually:</span>
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
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                placeholder="e.g. 8901030383921"
                className="w-full pl-3 pr-3 py-2 bg-stone-800 text-white border border-stone-700 rounded-xl font-mono text-xs focus:outline-hidden focus:border-amber-400 focus:bg-stone-850"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCodeInput.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-heading font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{mode === 'bind' ? 'Bind SKU' : 'Lookup'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
