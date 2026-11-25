import React from 'react';
import { Truck, CheckCircle2 } from 'lucide-react';
import { FREE_DELIVERY_THRESHOLD } from '../utils/rewardsEngine';

interface CartBumperProgressBarProps {
  currentSubtotal: number;
  className?: string;
  onExploreMore?: () => void;
}

/**
 * Single-milestone ₹499 Free Delivery Progress Bar for बैढ़न (Waidhan).
 */
export const CartBumperProgressBar: React.FC<CartBumperProgressBarProps> = ({
  currentSubtotal,
  className = '',
}) => {
  const subtotal = Math.max(0, Number(currentSubtotal) || 0);
  const isUnlocked = subtotal >= FREE_DELIVERY_THRESHOLD;
  const remaining = Math.max(0, Math.ceil(FREE_DELIVERY_THRESHOLD - subtotal));
  const progressPercent = isUnlocked
    ? 100
    : Math.min(100, Math.max(0, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100)));

  return (
    <div
      className={`rounded-2xl border p-3.5 transition-all duration-300 ${
        isUnlocked
          ? 'bg-emerald-50 border-emerald-300'
          : 'bg-emerald-50/50 border-emerald-200/90'
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2.5 mb-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
              isUnlocked
                ? 'bg-[#0c831f] text-white shadow-2xs'
                : 'bg-emerald-100 text-[#0c831f]'
            }`}
          >
            {isUnlocked ? (
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Truck className="w-4 h-4" />
            )}
          </div>

          <p className="text-xs sm:text-[13px] font-bold text-stone-900 leading-snug">
            {isUnlocked
              ? '🎉 बधाई हो! बैढ़न में ₹499 से ऊपर के ऑर्डर पर FREE डिलीवरी अनलॉक हो गई है!'
              : `🚚 बैढ़न में ₹499 से ऊपर के ऑर्डर पर FREE डिलीवरी! बस ₹${remaining} का सामान और जोड़ें`}
          </p>
        </div>

        <span className="text-xs font-mono font-black text-emerald-900 whitespace-nowrap bg-white px-2 py-0.5 rounded-lg border border-emerald-200 flex-shrink-0 tabular-nums">
          ₹{Math.round(subtotal)} / ₹{FREE_DELIVERY_THRESHOLD}
        </span>
      </div>

      {/* Single Clean Green/Emerald Progress Bar */}
      <div className="w-full bg-emerald-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isUnlocked ? 'bg-[#0c831f]' : 'bg-emerald-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
