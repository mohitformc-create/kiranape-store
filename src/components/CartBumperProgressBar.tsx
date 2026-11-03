import React from 'react';
import { Gift, Truck, Sparkles, Check, ChevronRight } from 'lucide-react';

interface CartBumperProgressBarProps {
  currentSubtotal: number;
  className?: string;
  onExploreMore?: () => void;
}

export const CartBumperProgressBar: React.FC<CartBumperProgressBarProps> = ({
  currentSubtotal,
  className = '',
  onExploreMore,
}) => {
  const TIER_1_THRESHOLD = 999;
  const TIER_2_THRESHOLD = 1999;

  const isTier1Unlocked = currentSubtotal >= TIER_1_THRESHOLD;
  const isTier2Unlocked = currentSubtotal >= TIER_2_THRESHOLD;

  const remainingForTier1 = Math.max(0, TIER_1_THRESHOLD - currentSubtotal);
  const remainingForTier2 = Math.max(0, TIER_2_THRESHOLD - currentSubtotal);

  // Calculate percentage along the 0 -> 999 -> 1999 track
  let progressPercent = 0;
  if (currentSubtotal <= 0) {
    progressPercent = 0;
  } else if (currentSubtotal <= TIER_1_THRESHOLD) {
    // 0 to 50%
    progressPercent = Math.min(50, Math.round((currentSubtotal / TIER_1_THRESHOLD) * 50));
  } else if (currentSubtotal < TIER_2_THRESHOLD) {
    // 50% to 100%
    const extra = currentSubtotal - TIER_1_THRESHOLD;
    const range = TIER_2_THRESHOLD - TIER_1_THRESHOLD;
    progressPercent = Math.min(99, 50 + Math.round((extra / range) * 50));
  } else {
    progressPercent = 100;
  }

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-all ${
        isTier2Unlocked
          ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-emerald-300'
          : isTier1Unlocked
          ? 'bg-gradient-to-r from-amber-50/90 to-emerald-50/90 border-amber-300'
          : 'bg-gradient-to-r from-amber-50/70 via-yellow-50/60 to-white border-amber-200'
      } ${className}`}
    >
      {/* Header Badge & Message */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
              isTier2Unlocked
                ? 'bg-emerald-600 text-white shadow-xs'
                : isTier1Unlocked
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-200 text-amber-900'
            }`}
          >
            {isTier2Unlocked ? (
              <Sparkles className="w-4 h-4 fill-white" />
            ) : (
              <Gift className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/30 text-amber-950 border border-amber-300/60">
                🎁 Waidhan Bumper Offer
              </span>
              {isTier2Unlocked && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white animate-pulse">
                  Mega Reward Unlocked
                </span>
              )}
            </div>

            <p className="text-xs sm:text-[13px] font-bold text-stone-900 mt-1 leading-snug">
              {!isTier1Unlocked && (
                <>
                  Add <span className="text-emerald-700 font-extrabold font-mono">₹{remainingForTier1}</span> more to get{' '}
                  <strong className="text-amber-900 font-black">FREE Phenyl + Free Delivery!</strong>
                </>
              )}
              {isTier1Unlocked && !isTier2Unlocked && (
                <>
                  <span className="text-emerald-700 font-black">🎉 FREE Phenyl Unlocked!</span> Add{' '}
                  <span className="text-emerald-700 font-extrabold font-mono">₹{remainingForTier2}</span> more for{' '}
                  <strong className="text-amber-900 font-black">+ Wonder Harpic Free!</strong>
                </>
              )}
              {isTier2Unlocked && (
                <span className="text-emerald-800 font-black">
                  🎉 BUMPER UNLOCKED: FREE Phenyl + Wonder Harpic + Free Delivery!
                </span>
              )}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-black text-stone-800 whitespace-nowrap bg-white px-2 py-1 rounded-lg border border-stone-200 shadow-2xs">
          ₹{currentSubtotal}
        </span>
      </div>

      {/* Visual Multi-Milestone Track */}
      <div className="relative pt-1 pb-1">
        {/* Track Background */}
        <div className="w-full bg-stone-200/80 rounded-full h-2.5 overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isTier2Unlocked
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-400'
                : isTier1Unlocked
                ? 'bg-gradient-to-r from-emerald-500 to-amber-500'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Milestone Indicator Badges */}
        <div className="flex items-center justify-between text-[10px] font-bold mt-2">
          {/* Milestone 1: ₹999 */}
          <div
            className={`flex items-center gap-1 transition-colors ${
              isTier1Unlocked ? 'text-emerald-800 font-black' : 'text-stone-600'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                isTier1Unlocked
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-300 text-stone-700'
              }`}
            >
              {isTier1Unlocked ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '1'}
            </span>
            <span>₹999: Free Phenyl + Delivery</span>
          </div>

          {/* Milestone 2: ₹1999 */}
          <div
            className={`flex items-center gap-1 transition-colors ${
              isTier2Unlocked ? 'text-emerald-800 font-black' : 'text-stone-600'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                isTier2Unlocked
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-300 text-stone-700'
              }`}
            >
              {isTier2Unlocked ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '2'}
            </span>
            <span>₹1999: + Harpic</span>
          </div>
        </div>
      </div>
    </div>
  );
};
