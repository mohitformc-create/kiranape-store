import React, { useMemo, useState, useEffect } from 'react';
import { X, Truck, Store, Calendar, Clock, Check, ChevronRight, MapPin } from 'lucide-react';
import { STANDARD_DELIVERY_FEE, FREE_DELIVERY_THRESHOLD } from '../utils/rewardsEngine';
import { DeliveryZone } from '../services/deliveryZonesService';

export type DeliveryMode = 'delivery' | 'pickup';

export interface ConfirmedDeliverySlot {
  mode: DeliveryMode;
  slotId: string;
  slotLabel: string;
  dayLabel: string;
  windowLabel: string;
  isExpress: boolean;
}

interface DeliverySlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  initialMode?: DeliveryMode;
  initialSlotId?: string | null;
  storeAddress?: string;
  deliveryZone?: DeliveryZone | null;
  onConfirmSlot: (slot: ConfirmedDeliverySlot) => void;
}

interface TimeWindowDef {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
}

const TWO_HOUR_WINDOWS: TimeWindowDef[] = [
  { id: '07-09', label: '7am - 9am', startHour: 7, endHour: 9 },
  { id: '09-11', label: '9am - 11am', startHour: 9, endHour: 11 },
  { id: '11-13', label: '11am - 1pm', startHour: 11, endHour: 13 },
  { id: '13-15', label: '1pm - 3pm', startHour: 13, endHour: 15 },
  { id: '15-17', label: '3pm - 5pm', startHour: 15, endHour: 17 },
  { id: '17-19', label: '5pm - 7pm', startHour: 17, endHour: 19 },
  { id: '19-21', label: '7pm - 9pm', startHour: 19, endHour: 21 },
  { id: '21-23', label: '9pm - 11pm', startHour: 21, endHour: 23 },
];

function formatDateBadge(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export const DeliverySlotModal: React.FC<DeliverySlotModalProps> = ({
  isOpen,
  onClose,
  subtotal,
  initialMode = 'delivery',
  initialSlotId = null,
  deliveryZone,
  onConfirmSlot,
}) => {
  const [mode, setMode] = useState<DeliveryMode>(initialMode);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(
    initialSlotId && initialSlotId !== 'express' ? initialSlotId : null
  );
  const [now, setNow] = useState<Date>(() => new Date());

  // Refresh live local clock whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setNow(new Date());
      setMode(initialMode);
      if (initialSlotId === 'express') {
        setSelectedSlotId(null);
      }
    }
  }, [isOpen, initialMode, initialSlotId]);

  const { todayLabel, tomorrowLabel, todayUpcomingSlots, allTomorrowSlots } = useMemo(() => {
    const todayDate = new Date(now);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(todayDate.getDate() + 1);

    // Strict 2-hour advance lead-time filter:
    // Show a Today slot ONLY if slotStartHour >= currentTime + 2 full hours (120 minutes)
    const currentTotalMinutes = todayDate.getHours() * 60 + todayDate.getMinutes();
    const minLeadStartMinutes = currentTotalMinutes + 120;

    const upcomingToday = TWO_HOUR_WINDOWS.filter(
      (win) => win.startHour * 60 >= minLeadStartMinutes
    );

    return {
      todayLabel: `Today (${formatDateBadge(todayDate)})`,
      tomorrowLabel: `Tomorrow (${formatDateBadge(tomorrowDate)})`,
      todayUpcomingSlots: upcomingToday,
      allTomorrowSlots: TWO_HOUR_WINDOWS,
    };
  }, [now]);

  // Clear selection if a previously selected Today slot is no longer valid under 2-hour lead-time rule
  useEffect(() => {
    if (selectedSlotId && selectedSlotId.startsWith('today-')) {
      const winId = selectedSlotId.replace('today-', '');
      const stillValid = todayUpcomingSlots.some((w) => w.id === winId);
      if (!stillValid) {
        setSelectedSlotId(null);
      }
    }
  }, [selectedSlotId, todayUpcomingSlots]);

  if (!isOpen) return null;

  const baseFee =
    deliveryZone !== undefined && deliveryZone !== null
      ? Math.max(0, Number(deliveryZone.baseCharge) || 0)
      : STANDARD_DELIVERY_FEE;
  const freeThreshold =
    deliveryZone !== undefined && deliveryZone !== null
      ? deliveryZone.freeDeliveryAbove && deliveryZone.freeDeliveryAbove > 0
        ? Number(deliveryZone.freeDeliveryAbove)
        : null
      : FREE_DELIVERY_THRESHOLD;
  const areaLabel = deliveryZone?.name || 'बैढ़न (Waidhan)';
  const qualifiesFreeByThreshold = freeThreshold !== null && subtotal >= freeThreshold;
  const isFreeEligible = mode === 'pickup' || qualifiesFreeByThreshold;

  const buildSelectedPayload = (): ConfirmedDeliverySlot | null => {
    if (!selectedSlotId) return null;
    const modePrefix = mode === 'pickup' ? 'Pickup From Store' : 'Home Delivery';

    if (selectedSlotId.startsWith('today-')) {
      const winId = selectedSlotId.replace('today-', '');
      const win = todayUpcomingSlots.find((w) => w.id === winId);
      if (!win) return null;
      return {
        mode,
        slotId: selectedSlotId,
        dayLabel: todayLabel,
        windowLabel: win.label,
        slotLabel: `${modePrefix} • ${todayLabel}, ${win.label}`,
        isExpress: false,
      };
    }

    if (selectedSlotId.startsWith('tomorrow-')) {
      const winId = selectedSlotId.replace('tomorrow-', '');
      const win = TWO_HOUR_WINDOWS.find((w) => w.id === winId);
      if (!win) return null;
      return {
        mode,
        slotId: selectedSlotId,
        dayLabel: tomorrowLabel,
        windowLabel: win.label,
        slotLabel: `${modePrefix} • ${tomorrowLabel}, ${win.label}`,
        isExpress: false,
      };
    }

    return null;
  };

  const selectedPayload = buildSelectedPayload();

  const handleConfirm = () => {
    if (!selectedPayload) return;
    onConfirmSlot(selectedPayload);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-stone-950/65 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delivery-slot-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle (mobile) */}
        <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-stone-300" />
        </div>

        {/* Top Segmented Toggle: Home Delivery vs Pickup From Store */}
        <div className="px-4 pt-3 pb-3 border-b border-stone-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl flex-1">
              <button
                type="button"
                id="slot-mode-home-delivery"
                onClick={() => setMode('delivery')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  mode === 'delivery'
                    ? 'bg-white text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-[#0c831f]" />
                <span>Home Delivery</span>
              </button>
              <button
                type="button"
                id="slot-mode-store-pickup"
                onClick={() => setMode('pickup')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  mode === 'pickup'
                    ? 'bg-white text-stone-950 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Store className="w-3.5 h-3.5 text-[#0c831f]" />
                <span>Pickup From Store</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close delivery slot picker"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header row: Select a slot + Delivery fee status */}
          <div className="flex items-center justify-between gap-2 px-0.5">
            <h3
              id="delivery-slot-modal-title"
              className="font-heading font-black text-base text-stone-900 tracking-tight"
            >
              Select a slot
            </h3>

            <div className="text-xs font-bold tabular-nums flex items-center gap-1.5 min-w-0">
              <span className="text-stone-500 font-medium truncate max-w-[140px]">
                {mode === 'pickup' ? 'Pickup:' : `${areaLabel}:`}
              </span>
              {isFreeEligible ? (
                <>
                  <span className="text-stone-400 line-through shrink-0">
                    ₹{baseFee.toFixed(2)}
                  </span>
                  <span className="text-[#0c831f] font-black shrink-0">FREE</span>
                </>
              ) : (
                <span className="text-stone-900 font-black shrink-0">
                  ₹{baseFee.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Store Pickup Address Badge */}
          {mode === 'pickup' && (
            <div className="px-3 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0c831f] shrink-0" />
              <span className="font-semibold">
                Chaurasia Kirana Store: बस स्टैंड, बैढ़न
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Slots Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Today's Upcoming Slots (Strict 2-Hour Advance Lead-Time Filter) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-800">
                <Calendar className="w-3.5 h-3.5 text-[#0c831f]" />
                <span>{todayLabel}</span>
              </div>
              <span className="text-[11px] font-medium text-stone-500 tabular-nums">
                {todayUpcomingSlots.length}{' '}
                {todayUpcomingSlots.length === 1 ? 'slot' : 'slots'} left
              </span>
            </div>

            {todayUpcomingSlots.length === 0 ? (
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-600 text-center">
                No slots left for today
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {todayUpcomingSlots.map((win) => {
                  const slotKey = `today-${win.id}`;
                  const isSelected = selectedSlotId === slotKey;
                  return (
                    <button
                      key={slotKey}
                      type="button"
                      onClick={() => setSelectedSlotId(slotKey)}
                      className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 min-h-[44px] ${
                        isSelected
                          ? 'border-[#0c831f] bg-emerald-50/80 text-emerald-950 font-bold ring-1 ring-[#0c831f]'
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-800'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap tabular-nums">
                        <Clock
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-[#0c831f]' : 'text-stone-400'
                          }`}
                        />
                        {win.label}
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'border-[#0c831f] bg-[#0c831f] text-white'
                            : 'border-stone-300'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tomorrow's Full-Day Slots */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-800">
                <Calendar className="w-3.5 h-3.5 text-stone-600" />
                <span>{tomorrowLabel}</span>
              </div>
              <span className="text-[11px] font-medium text-stone-500">All day available</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {allTomorrowSlots.map((win) => {
                const slotKey = `tomorrow-${win.id}`;
                const isSelected = selectedSlotId === slotKey;
                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => setSelectedSlotId(slotKey)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 min-h-[44px] ${
                      isSelected
                        ? 'border-[#0c831f] bg-emerald-50/80 text-emerald-950 font-bold ring-1 ring-[#0c831f]'
                        : 'border-stone-200 bg-white hover:border-stone-300 text-stone-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold whitespace-nowrap tabular-nums">
                      <Clock
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#0c831f]' : 'text-stone-400'
                        }`}
                      />
                      {win.label}
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-[#0c831f] bg-[#0c831f] text-white'
                          : 'border-stone-300'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky Confirm Footer */}
        <div className="px-4 py-3.5 bg-white border-t border-stone-200 space-y-2">
          {selectedPayload ? (
            <p className="text-[11px] text-emerald-800 font-semibold text-center truncate">
              Selected: {selectedPayload.slotLabel}
            </p>
          ) : (
            <p className="text-[11px] text-stone-500 text-center">
              Tap any time slot above to activate confirmation
            </p>
          )}
          <button
            type="button"
            id="confirm-delivery-slot-btn"
            disabled={!selectedPayload}
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 rounded-xl bg-[#0c831f] hover:bg-[#0a731b] disabled:bg-stone-200 disabled:text-stone-500 text-white font-heading font-black text-sm flex items-center justify-center gap-1.5 shadow-md disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
          >
            <span>Confirm Delivery Slot</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
