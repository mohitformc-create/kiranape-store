import React, { useEffect, useState } from 'react';
import { CheckCircle, PhoneCall, Clock, MapPin, Banknote, ShoppingBag, ArrowRight, Truck, Package, Check, RefreshCw, MessageCircle } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { ORDER_STATUS_STEPS, ORDER_STATUS_LABELS } from '../services/firebase';
import { getStoreOwnerWhatsAppNotificationUrl } from '../utils/orderUtils';
import { CreatorCredits } from './CreatorCredits';
import { API_BASE_URL } from '../config/api';

interface OrderConfirmationModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order: initialOrder,
  onClose,
}) => {
  const [currentOrder, setCurrentOrder] = useState<Order | null>(initialOrder);

  useEffect(() => {
    setCurrentOrder(initialOrder);
    if (!initialOrder?.id) return;

    // Real-time live status updates from central internal server
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/${initialOrder.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.order) {
            setCurrentOrder(data.order);
          }
        }
      } catch {
        // silent fallback
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [initialOrder?.id]);

  if (!currentOrder) return null;

  // Determine active step index
  const statusKey = currentOrder.status || 'received';
  let activeStepIndex = ORDER_STATUS_STEPS.findIndex((s) => s.key === statusKey);
  if (activeStepIndex === -1) {
    if (statusKey === 'New Order') activeStepIndex = 0;
    else if (statusKey === 'Packed') activeStepIndex = 1;
    else if (statusKey === 'Out for Delivery') activeStepIndex = 2;
    else if (statusKey === 'Delivered') activeStepIndex = 3;
    else activeStepIndex = 0;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[94vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Celebration Header */}
        <div className="bg-gradient-to-b from-emerald-700 to-emerald-800 text-white p-5 text-center relative overflow-hidden">
          {/* Celebratory Confetti Sprinkles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
            {[
              { left: '8%', delay: '0s', bg: '#f59e0b', rotate: '15deg', width: '6px', height: '10px' },
              { left: '18%', delay: '0.4s', bg: '#ef4444', rotate: '-25deg', width: '8px', height: '8px' },
              { left: '28%', delay: '0.8s', bg: '#3b82f6', rotate: '45deg', width: '5px', height: '11px' },
              { left: '40%', delay: '0.2s', bg: '#10b981', rotate: '10deg', width: '7px', height: '9px' },
              { left: '52%', delay: '1.1s', bg: '#ec4899', rotate: '-35deg', width: '6px', height: '12px' },
              { left: '64%', delay: '0.5s', bg: '#f59e0b', rotate: '50deg', width: '8px', height: '7px' },
              { left: '76%', delay: '0.9s', bg: '#8b5cf6', rotate: '-15deg', width: '6px', height: '10px' },
              { left: '86%', delay: '0.3s', bg: '#06b6d4', rotate: '30deg', width: '7px', height: '8px' },
              { left: '94%', delay: '0.7s', bg: '#10b981', rotate: '-40deg', width: '5px', height: '11px' },
            ].map((p, i) => (
              <span
                key={i}
                className="confetti-piece"
                style={{
                  left: p.left,
                  backgroundColor: p.bg,
                  animationDelay: p.delay,
                  transform: `rotate(${p.rotate})`,
                  width: p.width,
                  height: p.height,
                }}
              />
            ))}
          </div>

          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-2 border border-white/30 shadow-inner relative z-10">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1.5 relative z-10">
            <span className="inline-block bg-amber-400 text-stone-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Order #{currentOrder.id}
            </span>
            <span className="inline-flex items-center gap-1 bg-emerald-900/60 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
              Live Server Sync
            </span>
          </div>

          <h3 className="font-heading font-extrabold text-xl sm:text-2xl leading-tight relative z-10">
            ✅ Aapka Order Darz Ho Gaya Hai!
          </h3>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 font-medium relative z-10">
            Kiranape Express jald hi aapke pate par deliver karega.
          </p>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-stone-800">
          {/* Blinkit-Style Savings Banner ("🎉 YAY! You saved ₹XX") */}
          {currentOrder.totalSavings > 0 && (
            <div className="bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-teal-500/15 border-2 border-emerald-400/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center text-xl shadow-xs flex-shrink-0">
                  🎉
                </div>
                <div>
                  <h4 className="font-heading font-black text-base text-emerald-950 leading-tight">
                    YAY! You saved ₹{currentOrder.totalSavings}
                  </h4>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5">
                    Kiranape direct store wholesale discount applied
                  </p>
                </div>
              </div>
              <span className="bg-emerald-700 text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex-shrink-0 shadow-2xs">
                Saved ₹{currentOrder.totalSavings}
              </span>
            </div>
          )}

          {/* Central Order Live Intake Banner */}
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0">
                ⚡
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-stone-900 leading-tight">
                    Central Server Registered
                  </span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.2 rounded">
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-stone-600">
                  Dukan par order darz ho chuka hai. Cash on Delivery (COD).
                </p>
              </div>
            </div>
            <a
              href={`tel:${STORE_DEFAULTS.phone}`}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition-transform active:scale-95 flex items-center gap-1 flex-shrink-0"
            >
              <PhoneCall className="w-3 h-3" />
              <span>Call Store</span>
            </a>
          </div>

          {/* Real-time Order Tracking Step Bar */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-700" /> Live Delivery Status
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white uppercase">
                {currentOrder.statusLabel || ORDER_STATUS_LABELS[currentOrder.status] || currentOrder.status}
              </span>
            </div>

            {/* Stepper Dots */}
            <div className="relative flex items-center justify-between px-2 pt-2 pb-1">
              <div className="absolute top-5 left-6 right-6 h-0.5 bg-stone-200 -z-0" />
              <div
                className="absolute top-5 left-6 h-0.5 bg-emerald-600 transition-all duration-500 -z-0"
                style={{
                  width: `${(Math.min(activeStepIndex, 3) / 3) * 85}%`,
                }}
              />

              {ORDER_STATUS_STEPS.map((step, idx) => {
                const isPassed = idx < activeStepIndex;
                const isCurrent = idx === activeStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center relative z-10 text-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-200 animate-pulse'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border-2 border-stone-300 text-stone-400'
                      }`}
                    >
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 font-bold max-w-[75px] leading-tight ${
                        isCurrent
                          ? 'text-emerald-900'
                          : isPassed
                          ? 'text-stone-700'
                          : 'text-stone-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Slot info */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">
                  Delivery Slot:
                </p>
                <p className="text-[11px] text-stone-600 font-medium">
                  {currentOrder.deliverySlot || 'Instant Delivery (30-45 mins)'}
                </p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded">
              Confirmed
            </span>
          </div>

          {/* Amount Due on Delivery */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Cash to Pay at Doorstep
                </span>
                <span className="text-[11px] text-emerald-700">Payment on delivery</span>
              </div>
            </div>
            <span className="font-heading font-extrabold text-2xl text-emerald-950">
              ₹{currentOrder.finalPayableAmount}
            </span>
          </div>

          {/* Delivery Details */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-3.5 space-y-2 text-xs">
            <h5 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
              Customer & Address
            </h5>
            <div className="space-y-1 text-stone-700">
              <p>
                <span className="text-stone-400">Customer:</span>{' '}
                <strong>{currentOrder.customerName}</strong>
              </p>
              <p>
                <span className="text-stone-400">Phone:</span>{' '}
                <strong>{currentOrder.phone || currentOrder.customerPhone}</strong>
              </p>
              {currentOrder.deliveryLocation && (
                <p>
                  <span className="text-stone-400">Delivery Zone:</span>{' '}
                  <strong className="text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded text-[11px]">{currentOrder.deliveryLocation}</strong>
                </p>
              )}
              <div className="flex items-start gap-1 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 flex-shrink-0" />
                <span className="text-stone-600 line-clamp-2">{currentOrder.address}</span>
              </div>
            </div>
          </div>

          {/* Ordered Items Breakdown */}
          <div className="space-y-2">
            <h5 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span>Items ({currentOrder.itemsCount})</span>
              <span className="text-[10px] text-stone-400 font-normal">
                Ordered at {currentOrder.createdAt}
              </span>
            </h5>
            <div className="border border-stone-200 rounded-2xl divide-y divide-stone-100 overflow-hidden bg-white text-xs">
              {currentOrder.items.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-semibold text-stone-800 line-clamp-1">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded flex-shrink-0">
                      {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-stone-500">x{item.quantity}</span>
                    <span className="font-bold text-stone-900">₹{item.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Store Support helpline */}
          <div className="text-center pt-1">
            <p className="text-[11px] text-stone-500 mb-2">
              Questions regarding your order or address change?
            </p>
            <a
              href={`tel:${STORE_DEFAULTS.phone}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Call Store ({STORE_DEFAULTS.phone})
            </a>
          </div>
        </div>

        {/* Footer Actions: Direct WhatsApp Link to Owner + Back to Store */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-2">
          {(() => {
            const ownerWhatsAppUrl = getStoreOwnerWhatsAppNotificationUrl({
              orderId: currentOrder.id,
              customerName: currentOrder.customerName,
              customerPhone: currentOrder.phone || currentOrder.customerPhone || '',
              deliveryAddress: currentOrder.address,
              deliveryLocation: currentOrder.deliveryLocation,
              deliverySlot: currentOrder.deliverySlot,
              orderType: (currentOrder.orderType as any) || 'cart',
              itemsCount: currentOrder.itemsCount || currentOrder.items?.length,
              finalAmount: currentOrder.finalPayableAmount,
              textDetails: (currentOrder.items || [])
                .map((i) => `${i.name} (${i.unit}) x${i.quantity}`)
                .join(', '),
            });

            return (
              <a
                href={ownerWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-heading font-extrabold text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>दुकानदार को WhatsApp पर ऑर्डर भेजें (Direct WhatsApp)</span>
              </a>
            );
          })()}

          <button
            id="order-done-btn"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white font-heading font-bold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" /> Back to Store <ArrowRight className="w-4 h-4" />
          </button>

          {/* Official Creator & Branding Credits */}
          <div className="pt-2 border-t border-stone-200">
            <CreatorCredits />
          </div>
        </div>
      </div>
    </div>
  );
};
