import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, ScanBarcode, RefreshCw, Keyboard, AlertCircle } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { playPosScanBeep } from '../utils/posReceiptUtils';

interface PosBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const PosBarcodeScannerModal: React.FC<PosBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const [statusMessage, setStatusMessage] = useState<string>('कैमरा शुरू हो रहा है...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [engineLabel, setEngineLabel] = useState<string>('Initializing');
  const [manualCode, setManualCode] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const triggerDetected = (rawCode: string) => {
    const clean = rawCode.trim();
    if (!clean) return;
    const now = Date.now();
    if (
      lastScannedRef.current.code === clean &&
      now - lastScannedRef.current.time < 1600
    ) {
      return;
    }
    lastScannedRef.current = { code: clean, time: now };
    playPosScanBeep();
    onBarcodeDetected(clean);
  };

  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setCameraError(null);
    setStatusMessage('कैमरा शुरू हो रहा है...');

    const stopAll = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (zxingControlsRef.current) {
        try {
          zxingControlsRef.current.stop();
        } catch {}
        zxingControlsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const startScanner = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('इस ब्राउज़र में कैमरा एक्सेस उपलब्ध नहीं है। नीचे मैन्युअल बारकोड दर्ज करें।');
        return;
      }

      // 1. Prefer native BarcodeDetector API when supported (fastest on Android Chrome / Edge)
      const NativeBarcodeDetector = (window as any).BarcodeDetector;
      if (typeof NativeBarcodeDetector === 'function') {
        try {
          const detector = new NativeBarcodeDetector({
            formats: [
              'ean_13',
              'ean_8',
              'upc_a',
              'upc_e',
              'code_128',
              'code_39',
              'itf',
              'qr_code',
            ],
          });

          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });

          if (isCancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }

          setEngineLabel('Fast Native Scanner');
          setStatusMessage('प्रोडक्ट के बारकोड को बॉक्स के अंदर रखें');

          let busy = false;
          const scanLoop = async () => {
            if (isCancelled) return;
            if (
              !busy &&
              videoRef.current &&
              videoRef.current.readyState >= 2 &&
              videoRef.current.videoWidth > 0
            ) {
              busy = true;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (Array.isArray(barcodes) && barcodes.length > 0 && barcodes[0]?.rawValue) {
                  triggerDetected(String(barcodes[0].rawValue));
                }
              } catch {
                // Ignore transient frame errors
              } finally {
                busy = false;
              }
            }
            rafRef.current = requestAnimationFrame(scanLoop);
          };

          rafRef.current = requestAnimationFrame(scanLoop);
          return;
        } catch (nativeErr) {
          console.warn('[POS Scanner] Native BarcodeDetector fallback to ZXing:', nativeErr);
        }
      }

      // 2. Fallback to @zxing/browser for iOS Safari / Firefox / Desktop browsers
      try {
        setEngineLabel('ZXing Universal Scanner');
        const reader = new BrowserMultiFormatReader();
        const videoEl = videoRef.current;
        if (!videoEl) return;

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
            },
            audio: false,
          },
          videoEl,
          (result) => {
            if (isCancelled) return;
            if (result) {
              const text = result.getText();
              if (text) {
                triggerDetected(text);
              }
            }
          }
        );

        if (isCancelled) {
          controls.stop();
          return;
        }

        zxingControlsRef.current = controls;
        setStatusMessage('प्रोडक्ट के बारकोड को बॉक्स के अंदर रखें');
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[POS Scanner] Camera error:', err);
          setCameraError(
            err?.name === 'NotAllowedError'
              ? 'कैमरा अनुमति (Camera Permission) अस्वीकार कर दी गई। कृपया ब्राउज़र सेटिंग में कैमरा चालू करें या नीचे मैन्युअल बारकोड डालें।'
              : 'कैमरा शुरू नहीं हो सका। आप नीचे मैन्युअल बारकोड या USB स्कैनर का उपयोग कर सकते हैं।'
          );
        }
      }
    };

    startScanner();

    return () => {
      isCancelled = true;
      stopAll();
    };
  }, [isOpen, retryCount]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    triggerDetected(manualCode.trim());
    setManualCode('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="POS Barcode Scanner"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 text-white px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-sm leading-tight">
                Camera Barcode Scanner
              </h3>
              <p className="text-[11px] text-stone-400">{engineLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
            aria-label="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="p-4 space-y-4">
          <div className="relative w-full aspect-[4/3] bg-stone-950 rounded-xl overflow-hidden border border-stone-800 flex items-center justify-center">
            {cameraError ? (
              <div className="p-5 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-stone-200 leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />
                {/* Framing Reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-[78%] h-[42%] rounded-xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] relative">
                    <div className="absolute inset-x-3 top-1/2 h-0.5 bg-rose-500/90 -translate-y-1/2" />
                  </div>
                </div>
                <div className="absolute bottom-2.5 inset-x-3 bg-stone-950/80 text-white text-[11px] font-semibold text-center py-1.5 px-3 rounded-lg">
                  <Camera className="w-3.5 h-3.5 inline-block mr-1.5 text-emerald-400" />
                  {statusMessage}
                </div>
              </>
            )}
          </div>

          {/* Manual / USB Barcode Gun Entry */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <label
              htmlFor="pos-manual-barcode-input"
              className="text-xs font-bold text-stone-700 flex items-center gap-1.5"
            >
              <Keyboard className="w-3.5 h-3.5 text-stone-500" />
              <span>Manual Barcode / USB Scanner Entry</span>
            </label>
            <div className="flex gap-2">
              <input
                id="pos-manual-barcode-input"
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 8901058851427"
                className="flex-1 px-3 py-2 text-xs font-mono font-bold bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                Use Code
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
