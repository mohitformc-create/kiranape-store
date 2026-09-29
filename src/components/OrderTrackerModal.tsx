import React, { useState, useEffect } from 'react';
import { X, Search, Package, Clock, Truck, Check, Banknote, MapPin, PhoneCall, ArrowRight } from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { ORDER_STATUS_STEPS, ORDER_STATUS_LABELS } from '../services/firebase';
import { fetchOrderById } from '../services/orderApiService';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { CreatorCredits } from './CreatorCredits';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentOrders: Order[];
  initialOrderId?: string;
  storeSettings?: StoreSettings;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen,
  onClose,
  recentOrders,
  initialOrderId,
  storeSettings,
}) => {
  const [searchId, setSearchId] = useState(initialOrderId || (recentOrders[0]?.id ?? ''));
  const [activeOrder, setActiveOrder] = useState<Order | null>(
    recentOrders.find((o) => o.id === (initialOrderId || recentOrders[0]?.id)) || null
  );
  const [isSearching, setIsSearching] = useState(false);

  // Sync initial order id
  useEffect(() => {
    if (initialOrderId) {
      setSearchId(initialOrderId);
    } else if (recentOrders.length > 0 && !activeOrder) {
      setActiveOrder(recentOrders[0]);
      setSearchId(recentOrders[0].id);
    }
  }, [initialOrderId, recentOrders]);

  // Poll live status updates of active order from central server
  useEffect(() => {
    if (!activeOrder?.id) return;
    const interval = setInterval(async () => {
      try {
        const updated = await fetchOrderById(activeOrder.id);
        if (updated) {
          setActiveOrder(updated);
        }
      } catch {
        // silent fallback
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeOrder?.id]);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchId.trim().toUpperCase();
    if (!query) return;

    // Check if in recent orders
    const matched = recentOrders.find(
      (o) => o.id.toUpperCase() === query || o.id.toUpperCase() === `CK-${query}`
    );

    if (matched) {
      setActiveOrder(matched);
      return;
    }

    // Query Central Server Internal REST API for this ID
    setIsSearching(true);
    const targetId = query.startsWith('CK-') ? query : `CK-${query}`;
    try {
      const serverOrder = await fetchOrderById(targetId);
      if (serverOrder) {
        setActiveOrder(serverOrder);
        setIsSearching(false);
        return;
      }

      // Try raw query
      const rawOrder = await fetchOrderById(query);
      if (rawOrder) {
        setActiveOrder(rawOrder);
      }
    } catch (err) {
      console.warn('Order search notice:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Determine active step index
  const statusKey = activeOrder?.status || 'received';
  let activeStepIndex = ORDER_STATUS_STEPS.findIndex((s) => s.key === statusKey);
  if (activeStepIndex === -1) {
    const sk = statusKey.toLowerCase();
    if (sk === 'new order' || sk === 'pending' || sk === 'received') activeStepIndex = 0;
    else if (sk === 'packed' || sk === 'accepted' || sk === 'processing') activeStepIndex = 1;
    else if (sk === 'out for delivery' || sk === 'out_for_delivery') activeStepIndex = 2;
    else if (sk === 'delivered') activeStepIndex = 3;
    else activeStepIndex = 0;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base leading-tight">
                Live Order Tracking
              </h3>
              <p className="text-xs text-stone-300">
                Real-time live status updates from Chaurasia Kirana
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="p-4 bg-stone-50 border-b border-stone-200 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Order ID (e.g. CK-1234)"
              className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
          >
            {isSearching ? 'Checking...' : 'Track'}
          </button>
        </form>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeOrder ? (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">
                      Order #{activeOrder.id}
                    </span>
                    <span className="text-[11px] text-stone-500 ml-2">
                      {activeOrder.createdAt}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-700 text-white uppercase">
                    {activeOrder.statusLabel || ORDER_STATUS_LABELS[activeOrder.status] || activeOrder.status}
                  </span>
                </div>

                {/* Progress Stepper */}
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
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900">
                        Scheduled Delivery Slot:
                      </p>
                      <p className="text-[11px] text-stone-600 font-medium">
                        {activeOrder.deliverySlot || 'Morning (10:00 AM - 2:00 PM)'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                    Confirmed
                  </span>
                </div>
                {activeOrder.deliveryLocation && (
                  <div className="flex items-center gap-2 pt-1.5 border-t border-stone-200/60 text-xs text-stone-700">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                    <span className="font-bold text-stone-900">Delivery Area:</span>
                    <span className="font-medium text-stone-800">{activeOrder.deliveryLocation}</span>
                  </div>
                )}
              </div>

              {/* Amount Due on Delivery */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-700" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Pay on Delivery: ₹{activeOrder.finalPayableAmount}
                    </span>
                    <span className="text-[10px] text-emerald-700">Cash on Delivery (COD)</span>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-stone-800">
                  {activeOrder.itemsCount} Items
                </span>
              </div>

              {/* Items in this order */}
              <div className="space-y-1.5">
                <h5 className="text-[11px] font-bold text-stone-700 uppercase">
                  Order Items
                </h5>
                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 overflow-hidden bg-white text-xs">
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <span className="text-stone-800 font-medium">
                        {item.name} <span className="text-stone-400">({item.unit})</span>
                      </span>
                      <span className="text-stone-600">
                        x{item.quantity} = <strong>₹{item.total}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Store Helpline */}
              <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-center">
                <p className="text-xs text-stone-700 font-medium mb-2">
                  Need help with order? Call <span className="font-bold text-emerald-900">{storeSettings?.phone || '9424316081'}</span>
                </p>
                <a
                  href={`tel:${storeSettings?.phone || '9424316081'}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call {storeSettings?.phone || '9424316081'}
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                <Package className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-stone-800">No recent orders found on this device</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                You haven't placed any orders from this phone/browser yet. Place your first order or track with an Order ID.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                Start Shopping <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Recent Orders List if multiple orders exist */}
          {recentOrders.length > 1 && (
            <div className="pt-2 border-t border-stone-100">
              <h5 className="text-[11px] font-bold text-stone-500 uppercase mb-2">
                Your Recent Orders
              </h5>
              <div className="space-y-1.5">
                {recentOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setActiveOrder(o);
                      setSearchId(o.id);
                    }}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                      activeOrder?.id === o.id
                        ? 'border-emerald-600 bg-emerald-50/50 font-bold text-emerald-950'
                        : 'border-stone-200 bg-stone-50 hover:bg-white text-stone-700'
                    }`}
                  >
                    <span>
                      #{o.id} ({o.itemsCount} items)
                    </span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-stone-200">
                      {o.statusLabel || ORDER_STATUS_LABELS[o.status] || o.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Official Creator & Branding Credits */}
          <div className="w-full pt-4 mt-2 border-t border-stone-100">
            <CreatorCredits />
          </div>
        </div>
      </div>
    </div>
  );
};
