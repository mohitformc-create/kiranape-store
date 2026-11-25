import React from 'react';
import { Truck, CheckCircle2, Store, MapPin } from 'lucide-react';
import { FREE_DELIVERY_THRESHOLD, STANDARD_DELIVERY_FEE } from '../utils/rewardsEngine';
import { DeliveryZone } from '../services/deliveryZonesService';

interface CartBumperProgressBarProps {
  currentSubtotal: number;
  deliveryZone?: DeliveryZone | null;
  deliveryMode?: 'delivery' | 'pickup';
  className?: string;
  onExploreMore?: () => void;
}

/**
 * Dynamic Area-Aware Delivery Progress Bar & Info Banner:
 * - Store Pickup: shows FREE ₹0 pickup confirmation
 * - Areas with a Free Delivery threshold (e.g., बैढ़न / कॉलेज मोड़ at ₹499): shows green progress bar
 * - Other areas without a free delivery threshold (e.g., माजन मोड़, विंध्यनगर, जयंत): shows clean area delivery charge badge
 */
export const CartBumperProgressBar: React.FC<CartBumperProgressBarProps> = ({
  currentSubtotal,
  deliveryZone,
  deliveryMode = 'delivery',
  className = '',
}) => {
  const subtotal = Math.max(0, Number(currentSubtotal) || 0);
  const areaName = deliveryZone?.name || 'बैढ़न (Waidhan)';
  const baseCharge =
    deliveryZone !== undefined && deliveryZone !== null
      ? Math.max(0, Number(deliveryZone.baseCharge) || 0)
      : STANDARD_DELIVERY_FEE;
  const freeThreshold =
    deliveryZone !== undefined && deliveryZone !== null
      ? deliveryZone.freeDeliveryAbove && deliveryZone.freeDeliveryAbove > 0
        ? Number(deliveryZone.freeDeliveryAbove)
        : null
      : FREE_DELIVERY_THRESHOLD;

  // 1. Store Pickup mode => always FREE (₹0)
  if (deliveryMode === 'pickup') {
    return (
      <div
        className={`rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 transition-all duration-200 ${className}`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-[#0c831f] text-white flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <p className="text-xs sm:text-[13px] font-bold text-stone-900 leading-snug">
              🏪 Store Pickup चुना गया है — डिलीवरी चार्ज ₹0 (FREE)!
            </p>
          </div>
          <span className="text-xs font-mono font-black text-[#0c831f] bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0 tabular-nums">
            ₹0 FREE
          </span>
        </div>
      </div>
    );
  }

  // 2. Areas WITHOUT a free delivery threshold (e.g., माजन मोड़, ढोंटी, विंध्यनगर, जयंत, etc.)
  if (freeThreshold === null) {
    return (
      <div
        className={`rounded-2xl border border-stone-200 bg-white p-3.5 transition-all duration-200 ${className}`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-[13px] font-bold text-stone-900 leading-snug">
                🚚 {areaName} डिलीवरी चार्ज: ₹{baseCharge}
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                Store Pickup चुनने पर डिलीवरी चार्ज ₹0 (FREE) रहेगा
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-black text-stone-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0 tabular-nums">
            ₹{baseCharge}
          </span>
        </div>
      </div>
    );
  }

  // 3. Areas WITH a free delivery threshold (e.g., बैढ़न (Waidhan) & कॉलेज मोड़ (College Mod) at ₹499)
  const isUnlocked = subtotal >= freeThreshold;
  const remaining = Math.max(0, Math.ceil(freeThreshold - subtotal));
  const progressPercent = isUnlocked
    ? 100
    : Math.min(100, Math.max(0, Math.round((subtotal / freeThreshold) * 100)));

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
              ? `🎉 बधाई हो! ${areaName} में ₹${freeThreshold} से ऊपर के ऑर्डर पर FREE डिलीवरी अनलॉक हो गई है!`
              : `🚚 ${areaName} में ₹${freeThreshold} से ऊपर के ऑर्डर पर FREE डिलीवरी! बस ₹${remaining} का सामान और जोड़ें`}
          </p>
        </div>

        <span className="text-xs font-mono font-black text-emerald-900 whitespace-nowrap bg-white px-2 py-0.5 rounded-lg border border-emerald-200 flex-shrink-0 tabular-nums">
          ₹{Math.round(subtotal)} / ₹{freeThreshold}
        </span>
      </div>

      {/* Clean Green/Emerald Progress Bar */}
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
