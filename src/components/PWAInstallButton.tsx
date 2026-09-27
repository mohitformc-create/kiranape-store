import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'pill';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'pill',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running in standalone mode, hide
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 4000);
    }
  };

  if (justInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-xs font-semibold shadow-xs">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
        <span>Installed!</span>
      </div>
    );
  }

  // Chromium / Android / Desktop Install Flow
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className="bg-gradient-to-r from-emerald-800 to-green-900 text-white px-3 py-2 flex items-center justify-between text-xs sm:text-sm shadow-inner">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Install <strong>Kiranape</strong> on your mobile for fast 1-tap grocery orders!</span>
          </div>
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-900 font-bold px-3 py-1 rounded-lg text-xs transition cursor-pointer shrink-0 ml-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xs cursor-pointer ${className}`}
        title="Install Kiranape App on your device"
      >
        <Download className="w-3.5 h-3.5 text-emerald-200" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari Flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-800 hover:bg-stone-700 text-amber-300 transition-all border border-stone-700 cursor-pointer ${className}`}
          title="Install Kiranape on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 text-stone-800 relative animate-in fade-in zoom-in-95">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-sm overflow-hidden p-1">
                  <img
                    src="/icon-192.png"
                    alt="Kiranape"
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('pwa-192')) {
                        target.src = '/pwa-192x192.png';
                      }
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 leading-tight">Kiranape Express</h3>
                  <p className="text-xs text-stone-500">Kiranape Grocery App</p>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-stone-600 bg-stone-50 p-3.5 rounded-xl border border-stone-200/80">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <p>In Safari, tap the <strong>Share</strong> button (the box with an upward arrow) in the bottom toolbar.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <p>Scroll down and select <strong>Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <p>Tap <strong>Add</strong> in the top-right corner to enjoy instant 1-tap grocery shopping!</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 transition cursor-pointer shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
