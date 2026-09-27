import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 1200,
}) => {
  const [isFading, setIsFading] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    // Timer to begin smooth fade-out
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, durationMs);

    // Timer to unmount from DOM after fade-out transition completes
    const removeTimer = setTimeout(() => {
      setIsMounted(false);
      onFinish?.();
    }, durationMs + 450);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [durationMs, onFinish]);

  if (!isMounted) return null;

  return (
    <div
      id="kiranape-splash-screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between p-6 select-none bg-white text-stone-900 transition-opacity duration-400 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#ffffff' }}
      aria-hidden={isFading}
    >
      {/* Top Subtle Pill */}
      <div className="pt-8 sm:pt-12 flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-700">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="text-[11px] sm:text-xs uppercase tracking-widest font-extrabold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Waidhan & Singrauli Fast Delivery
        </span>
      </div>

      {/* Main Center Brand Hero */}
      <div className="flex flex-col items-center text-center max-w-sm px-4 my-auto animate-in zoom-in-95 duration-500">
        {/* Centered BrandLogo with smooth entry and pulsating animation */}
        <div className="mb-6 p-4 rounded-3xl bg-stone-50 border border-stone-200/80 shadow-xl flex items-center justify-center animate-in zoom-in-90 duration-500">
          <BrandLogo className="h-16 w-auto" variant="badge" />
        </div>

        {/* Brand Title */}
        <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-stone-950">
          Kiranape <span className="text-emerald-700">Express</span>
        </h1>

        {/* Official Subtitle Required: Kiranape Express - Singrauli Ki Apni Dukan */}
        <p className="mt-2 font-heading font-extrabold text-sm sm:text-base text-stone-700">
          Kiranape Express - Singrauli Ki Apni Dukan
        </p>

        {/* Delivery Slot Pill */}
        <div className="mt-5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>🚚 Shuddh Samaan, Bharosemand Delivery</span>
        </div>
      </div>

      {/* Bottom Subtle Indicator */}
      <div className="pb-8 sm:pb-12 flex flex-col items-center gap-1.5 opacity-80">
        <span className="text-[11px] text-stone-500 font-semibold">
          100% Shudh Rashan • Cash on Delivery Available
        </span>
      </div>
    </div>
  );
};
