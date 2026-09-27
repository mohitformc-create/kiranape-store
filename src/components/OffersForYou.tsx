import React, { useState } from 'react';
import { Sparkles, Check, Truck, Gift, Copy } from 'lucide-react';
import { StoreSettings } from '../types';

interface OffersForYouProps {
  storeSettings: StoreSettings;
  onExploreCategory?: (categoryName: string) => void;
}

export const OffersForYou: React.FC<OffersForYouProps> = ({
  storeSettings,
  onExploreCategory,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const minFreeDelivery = storeSettings.minOrderForFreeDelivery || 199;

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText?.(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  return (
    <section className="mb-4 sm:mb-5 select-none" aria-label="Offers For You">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-amber-400 text-stone-950 flex items-center justify-center text-xs font-black shadow-2xs">
            🎁
          </div>
          <h3 className="font-heading font-black text-stone-900 text-sm sm:text-base tracking-tight">
            Offers For You
          </h3>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          2 Live Perks
        </span>
      </div>

      {/* Dual Promotional Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
        {/* Card 1: FLAT ₹50 OFF */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-200/90 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-2xs text-lg font-black">
                ₹50
              </div>
              <div>
                <span className="bg-orange-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  FLAT ₹50 OFF
                </span>
                <h4 className="font-heading font-black text-stone-950 text-sm sm:text-base leading-tight mt-1">
                  Enjoy FLAT ₹50 OFF
                </h4>
                <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                  Use coupon code on first order at Waidhan store
                </p>
              </div>
            </div>

            {/* Copy code button */}
            <button
              type="button"
              onClick={() => handleCopyCode('KIRANA50')}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shadow-2xs ${
                copiedCode === 'KIRANA50'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-950 hover:bg-stone-800 text-amber-300'
              }`}
              title="Copy Coupon Code"
            >
              {copiedCode === 'KIRANA50' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>KIRANA50</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: FREE Delivery above ₹199 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-200/90 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                <Truck className="w-5 h-5 stroke-[2.25]" />
              </div>
              <div>
                <span className="bg-emerald-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                  ZERO SURGE FEE
                </span>
                <h4 className="font-heading font-black text-stone-950 text-sm sm:text-base leading-tight mt-1">
                  FREE Delivery above ₹{minFreeDelivery}
                </h4>
                <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                  ⚡ 10-15 minute doorstep drop across Waidhan
                </p>
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-extrabold px-2.5 py-1.5 rounded-xl shadow-2xs">
              <Sparkles className="w-3 h-3 text-emerald-700" />
              <span>Auto-Applied</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
