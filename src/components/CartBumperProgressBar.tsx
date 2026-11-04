import React from 'react';
import { Gift, Truck, Sparkles, Check, Trophy } from 'lucide-react';
import { REWARD_TIERS, calculateCartFinancials } from '../utils/rewardsEngine';

interface CartBumperProgressBarProps {
  currentSubtotal: number;
  className?: string;
  onExploreMore?: () => void;
}

export const CartBumperProgressBar: React.FC<CartBumperProgressBarProps> = ({
  currentSubtotal,
  className = '',
}) => {
  const subtotal = Number(currentSubtotal) || 0;
  const {
    activeTierNumber,
    bannerCopy,
    progressPercent,
  } = calculateCartFinancials([], undefined, undefined);

  // Recalculate directly with the provided subtotal
  const isTier1 = subtotal >= REWARD_TIERS.TIER_1_FREE_DELIVERY;
  const isTier2 = subtotal >= REWARD_TIERS.TIER_2_MELODY_CHOCOLATE;
  const isTier3 = subtotal >= REWARD_TIERS.TIER_3_PARLE_OCCASIONS;
  const isTier4 = subtotal >= REWARD_TIERS.TIER_4_MILANO_COLLECTION;

  // Exact Dynamic Banner Copy specified in specification
  let dynamicBanner = '';
  if (subtotal < REWARD_TIERS.TIER_1_FREE_DELIVERY) {
    dynamicBanner = `Add ₹${Math.round(REWARD_TIERS.TIER_1_FREE_DELIVERY - subtotal)} more to unlock FREE Delivery 🚚`;
  } else if (subtotal < REWARD_TIERS.TIER_2_MELODY_CHOCOLATE) {
    dynamicBanner = `🎉 FREE Delivery unlocked! Add ₹${Math.round(REWARD_TIERS.TIER_2_MELODY_CHOCOLATE - subtotal)} more for FREE Tiramisu Melody Chocolate 🍫`;
  } else if (subtotal < REWARD_TIERS.TIER_3_PARLE_OCCASIONS) {
    dynamicBanner = `🎁 Tiramisu Melody unlocked! Add ₹${Math.round(REWARD_TIERS.TIER_3_PARLE_OCCASIONS - subtotal)} more to upgrade to Parle Assorted Occasions Pack 🍪`;
  } else if (subtotal < REWARD_TIERS.TIER_4_MILANO_COLLECTION) {
    dynamicBanner = `🔥 Parle Occasions Pack unlocked! Add ₹${Math.round(REWARD_TIERS.TIER_4_MILANO_COLLECTION - subtotal)} more to upgrade to Hide & Seek Milano Collection ✨`;
  } else {
    dynamicBanner = `🏆 Top Bumper Gift Unlocked: Hide & Seek Milano Collection + FREE Delivery!`;
  }

  // Smooth progressive percentage along the 4 milestones
  let visualPercent = 0;
  if (subtotal <= 0) {
    visualPercent = 0;
  } else if (subtotal < REWARD_TIERS.TIER_1_FREE_DELIVERY) {
    visualPercent = Math.min(25, (subtotal / REWARD_TIERS.TIER_1_FREE_DELIVERY) * 25);
  } else if (subtotal < REWARD_TIERS.TIER_2_MELODY_CHOCOLATE) {
    const extra = subtotal - REWARD_TIERS.TIER_1_FREE_DELIVERY;
    const span = REWARD_TIERS.TIER_2_MELODY_CHOCOLATE - REWARD_TIERS.TIER_1_FREE_DELIVERY;
    visualPercent = 25 + Math.min(25, (extra / span) * 25);
  } else if (subtotal < REWARD_TIERS.TIER_3_PARLE_OCCASIONS) {
    const extra = subtotal - REWARD_TIERS.TIER_2_MELODY_CHOCOLATE;
    const span = REWARD_TIERS.TIER_3_PARLE_OCCASIONS - REWARD_TIERS.TIER_2_MELODY_CHOCOLATE;
    visualPercent = 50 + Math.min(25, (extra / span) * 25);
  } else if (subtotal < REWARD_TIERS.TIER_4_MILANO_COLLECTION) {
    const extra = subtotal - REWARD_TIERS.TIER_3_PARLE_OCCASIONS;
    const span = REWARD_TIERS.TIER_4_MILANO_COLLECTION - REWARD_TIERS.TIER_3_PARLE_OCCASIONS;
    visualPercent = 75 + Math.min(25, (extra / span) * 25);
  } else {
    visualPercent = 100;
  }

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-all duration-300 ${
        isTier4
          ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-emerald-300 shadow-emerald-900/5'
          : isTier3
          ? 'bg-gradient-to-r from-teal-50/90 to-emerald-50/90 border-teal-300'
          : isTier2
          ? 'bg-gradient-to-r from-emerald-50/90 to-amber-50/80 border-emerald-200'
          : isTier1
          ? 'bg-gradient-to-r from-emerald-50/70 via-teal-50/50 to-white border-emerald-200'
          : 'bg-gradient-to-r from-amber-50/70 via-stone-50 to-white border-amber-200/80'
      } ${className}`}
    >
      {/* Top Header Badge & Dynamic Message */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold flex-shrink-0 transition-transform active:scale-95 ${
              isTier4
                ? 'bg-gradient-to-br from-amber-500 to-emerald-600 text-white shadow-xs'
                : isTier3
                ? 'bg-emerald-600 text-white shadow-xs'
                : isTier2
                ? 'bg-teal-600 text-white shadow-xs'
                : isTier1
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isTier4 ? (
              <Trophy className="w-4 h-4 fill-amber-200 text-white" />
            ) : isTier1 ? (
              <Sparkles className="w-4 h-4 fill-white" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-900 border border-emerald-200/80">
                🎁 Bumper Milestone Rewards
              </span>
              {isTier4 ? (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 animate-pulse">
                  All Tiers Unlocked!
                </span>
              ) : isTier1 ? (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  Tier {isTier3 ? '3' : isTier2 ? '2' : '1'} Active
                </span>
              ) : null}
            </div>

            <p className="text-xs sm:text-[13px] font-bold text-stone-900 mt-1 leading-snug">
              {dynamicBanner}
            </p>
          </div>
        </div>

        {/* Current Subtotal Pill */}
        <span className="text-xs font-mono font-black text-stone-800 whitespace-nowrap bg-white px-2.5 py-1 rounded-xl border border-stone-200 shadow-2xs flex-shrink-0">
          ₹{subtotal}
        </span>
      </div>

      {/* Visual Multi-Milestone Track with exact gradient */}
      <div className="relative pt-1 pb-1">
        {/* Track Bar Background */}
        <div className="w-full bg-stone-200/80 rounded-full h-2.5 overflow-hidden relative shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-emerald-400 via-teal-500 to-green-600 shadow-xs"
            style={{ width: `${Math.min(100, Math.max(0, visualPercent))}%` }}
          />
        </div>

        {/* 4 Milestone Indicator Badges */}
        <div className="grid grid-cols-4 gap-1 text-[9px] sm:text-[10px] font-bold mt-2 pt-0.5 text-center">
          {/* Milestone 1: ₹499 */}
          <div
            className={`flex flex-col items-center transition-colors ${
              isTier1 ? 'text-emerald-800 font-black' : 'text-stone-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] mb-0.5 transition-all ${
                isTier1
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {isTier1 ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '1'}
            </span>
            <span className="truncate w-full">₹499: Free Del</span>
          </div>

          {/* Milestone 2: ₹1199 */}
          <div
            className={`flex flex-col items-center transition-colors ${
              isTier2 ? 'text-emerald-800 font-black' : 'text-stone-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] mb-0.5 transition-all ${
                isTier2
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {isTier2 ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '2'}
            </span>
            <span className="truncate w-full">₹1199: 🍫 Choc</span>
          </div>

          {/* Milestone 3: ₹1999 */}
          <div
            className={`flex flex-col items-center transition-colors ${
              isTier3 ? 'text-emerald-800 font-black' : 'text-stone-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] mb-0.5 transition-all ${
                isTier3
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {isTier3 ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '3'}
            </span>
            <span className="truncate w-full">₹1999: 🍪 Parle</span>
          </div>

          {/* Milestone 4: ₹2599 */}
          <div
            className={`flex flex-col items-center transition-colors ${
              isTier4 ? 'text-emerald-800 font-black' : 'text-stone-500'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] mb-0.5 transition-all ${
                isTier4
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {isTier4 ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '4'}
            </span>
            <span className="truncate w-full">₹2599: ✨ Milano</span>
          </div>
        </div>
      </div>
    </div>
  );
};
