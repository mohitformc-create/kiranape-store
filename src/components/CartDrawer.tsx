import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Home,
  Store,
  Tag,
  Check,
  RotateCcw,
  Percent,
  Sparkles,
} from 'lucide-react';
import { CartItem, StoreSettings, Order, Product } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import {
  getCustomerOrders,
  getCustomerSelectedLocation,
  setCustomerSelectedLocation,
} from '../services/storageService';
import { CartBumperProgressBar } from './CartBumperProgressBar';
import { UpsellCarousel } from './UpsellCarousel';
import { BlinkitProductPlaceholder } from './BlinkitProductPlaceholder';
import { hasRealDisplayImage } from '../utils/studioImageUpload';
import {
  calculateCartFinancials,
  STANDARD_DELIVERY_FEE,
} from '../utils/rewardsEngine';
import { STORE_COUPONS, evaluateCoupon } from '../utils/coupons';
import { DeliverySlotModal, ConfirmedDeliverySlot, DeliveryMode } from './DeliverySlotModal';
import {
  DeliveryZone,
  getDeliveryZones,
  getActiveDeliveryZones,
  resolveSelectedDeliveryZone,
  formatDeliveryZoneOption,
  subscribeToDeliveryZones,
} from '../services/deliveryZonesService';

const CART_ADDRESS_STORAGE_KEY = 'kiranape_saved_delivery_address_v1';

export interface SavedCartAddress {
  fullName: string;
  phoneNumber: string;
  fullAddress: string;
  locality: string;
}

export function getSavedCartAddress(): SavedCartAddress {
  const zones = getDeliveryZones();
  const defaultLoc = resolveSelectedDeliveryZone(zones, getCustomerSelectedLocation()).name;
  if (typeof window === 'undefined') {
    return { fullName: '', phoneNumber: '', fullAddress: '', locality: defaultLoc };
  }
  try {
    const raw = localStorage.getItem(CART_ADDRESS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const resolvedLocality = resolveSelectedDeliveryZone(zones, parsed.locality || defaultLoc).name;
      return {
        fullName: parsed.fullName || '',
        phoneNumber: parsed.phoneNumber || '',
        fullAddress: parsed.fullAddress || '',
        locality: resolvedLocality,
      };
    }
  } catch {}
  return { fullName: '', phoneNumber: '', fullAddress: '', locality: defaultLoc };
}

export function saveCartAddress(addr: SavedCartAddress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_ADDRESS_STORAGE_KEY, JSON.stringify(addr));
    if (addr.locality) {
      setCustomerSelectedLocation(addr.locality);
    }
  } catch {}
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (itemKey: string, quantity: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: (checkoutContext?: {
    deliverySlot: ConfirmedDeliverySlot;
    couponCode: string | null;
    savedAddress: SavedCartAddress;
  }) => void;
  storeSettings?: StoreSettings;
  orders?: Order[];
  onRepeatOrder?: (order: Order) => void;
  onAddStayfreeReward?: () => void;
  onAddToCart?: (product: Product) => void;
  catalogProducts?: Product[];
  appliedCouponCode?: string | null;
  onCouponChange?: (code: string | null) => void;
  deliveryMode?: DeliveryMode;
  onDeliveryModeChange?: (mode: DeliveryMode) => void;
  deliveryZones?: DeliveryZone[];
  onSelectedAreaChange?: (areaName: string) => void;
}

const CartItemThumb: React.FC<{ product: Product }> = ({ product }) => {
  const [errored, setErrored] = useState(false);
  const rawUrl = product.imageUrl || product.image_url || '';
  const showReal = hasRealDisplayImage(rawUrl) && !errored;

  if (!showReal) {
    return (
      <BlinkitProductPlaceholder
        name={product.name}
        category={product.category}
        weight={product.unit}
        compact
        className="w-full h-full"
      />
    );
  }

  return (
    <img
      src={rawUrl}
      alt={product.name}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className="w-full h-full object-contain"
    />
  );
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onClearCart,
  onProceedToCheckout,
  storeSettings = STORE_DEFAULTS,
  orders,
  onRepeatOrder,
  onAddToCart,
  catalogProducts = [],
  appliedCouponCode: controlledCouponCode,
  onCouponChange,
  deliveryMode: controlledDeliveryMode,
  onDeliveryModeChange,
  deliveryZones: externalDeliveryZones,
  onSelectedAreaChange,
}) => {
  const [repeatSuccessNotice, setRepeatSuccessNotice] = useState<string | null>(null);
  const [internalCouponCode, setInternalCouponCode] = useState<string | null>(null);
  const [internalDeliveryMode, setInternalDeliveryMode] = useState<DeliveryMode>('delivery');
  const [internalZones, setInternalZones] = useState<DeliveryZone[]>(() => getDeliveryZones());

  useEffect(() => {
    const unsub = subscribeToDeliveryZones((updated) => {
      setInternalZones(updated);
    });
    return () => unsub();
  }, []);

  const allDeliveryZones =
    externalDeliveryZones && externalDeliveryZones.length > 0
      ? externalDeliveryZones
      : internalZones;
  const activeDeliveryZones = getActiveDeliveryZones(allDeliveryZones);

  const appliedCouponCode =
    controlledCouponCode !== undefined ? controlledCouponCode : internalCouponCode;
  const setAppliedCouponCode = (code: string | null) => {
    setInternalCouponCode(code);
    onCouponChange?.(code);
  };

  const deliveryMode =
    controlledDeliveryMode !== undefined ? controlledDeliveryMode : internalDeliveryMode;
  const setDeliveryMode = (mode: DeliveryMode) => {
    setInternalDeliveryMode(mode);
    onDeliveryModeChange?.(mode);
  };

  // Address bar state
  const [savedAddress, setSavedAddress] = useState<SavedCartAddress>(() => getSavedCartAddress());
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [draftAddress, setDraftAddress] = useState<SavedCartAddress>(savedAddress);

  // Coupon modal state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Savings accordion state
  const [isSavingsExpanded, setIsSavingsExpanded] = useState(false);

  // Delivery slot picker modal state
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<ConfirmedDeliverySlot | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fresh = getSavedCartAddress();
      setSavedAddress(fresh);
      setDraftAddress(fresh);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedZone = resolveSelectedDeliveryZone(activeDeliveryZones, savedAddress.locality);

  const handleSelectAreaDirectly = (newAreaName: string) => {
    const resolved = resolveSelectedDeliveryZone(activeDeliveryZones, newAreaName);
    const updatedAddr: SavedCartAddress = {
      ...savedAddress,
      locality: resolved.name,
    };
    saveCartAddress(updatedAddr);
    setSavedAddress(updatedAddr);
    setDraftAddress((prev) => ({ ...prev, locality: resolved.name }));
    onSelectedAreaChange?.(resolved.name);
  };

  const pastOrders = orders && orders.length > 0 ? orders : getCustomerOrders();
  const lastOrder = pastOrders.length > 0 ? pastOrders[0] : null;

  const handleTriggerRepeat = (order: Order) => {
    onRepeatOrder?.(order);
    setRepeatSuccessNotice(`Items from Order #${order.id} reloaded!`);
    setTimeout(() => setRepeatSuccessNotice(null), 3000);
  };

  const financials = calculateCartFinancials(cartItems, {
    deliveryMode,
    couponCode: appliedCouponCode,
    deliveryZone: selectedZone,
  });

  const {
    itemsCount: totalCount,
    subtotal: cartValue,
    productDiscount,
    couponCode: validAppliedCoupon,
    couponDiscount,
    totalSavings,
    isFreeDelivery,
    deliveryCharge,
    baseDeliveryFee,
    freeDeliveryThreshold,
    subTotalWithDelivery,
    totalPayable: finalPayable,
  } = financials;

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const resolved = resolveSelectedDeliveryZone(activeDeliveryZones, draftAddress.locality);
    const cleaned: SavedCartAddress = {
      fullName: draftAddress.fullName.trim(),
      phoneNumber: draftAddress.phoneNumber.trim(),
      fullAddress: draftAddress.fullAddress.trim(),
      locality: resolved.name,
    };
    saveCartAddress(cleaned);
    setSavedAddress(cleaned);
    onSelectedAreaChange?.(resolved.name);
    setIsEditingAddress(false);
  };

  const handleApplyCouponCode = (rawCode: string) => {
    const res = evaluateCoupon(rawCode, cartValue);
    if (res.valid) {
      setAppliedCouponCode(res.code);
      setCouponInput('');
      setCouponFeedback({ type: 'success', text: res.message });
      setTimeout(() => {
        setIsCouponModalOpen(false);
        setCouponFeedback(null);
      }, 650);
    } else {
      setCouponFeedback({ type: 'error', text: res.message });
    }
  };

  const handleConfirmDeliverySlot = (slot: ConfirmedDeliverySlot) => {
    setConfirmedSlot(slot);
    setDeliveryMode(slot.mode);
    setIsSlotModalOpen(false);
    onProceedToCheckout({
      deliverySlot: slot,
      couponCode: validAppliedCoupon,
      savedAddress: {
        ...savedAddress,
        locality: selectedZone.name,
      },
    });
  };

  const displayAddressLine = savedAddress.fullAddress
    ? `${savedAddress.fullAddress}, ${selectedZone.name}`
    : `${selectedZone.name} (Tap Change to add house/street)`;

  const remainingForFree =
    freeDeliveryThreshold !== null && freeDeliveryThreshold > 0
      ? Math.max(0, Math.ceil(freeDeliveryThreshold - cartValue))
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="My Cart"
    >
      <div className="w-full max-w-md bg-stone-100 h-full flex flex-col shadow-2xl border-l border-stone-200 animate-in slide-in-from-right duration-300 relative">
        {/* ================================================================
            1. CLEAN CART HEADER (MY CART | Total Items: X | + Add Products)
        ================================================================ */}
        <div className="bg-white px-4 py-3.5 border-b border-stone-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Back to store"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-stone-950 text-base leading-tight tracking-tight">
                MY CART
              </h3>
              <p className="text-xs text-stone-500 font-semibold tabular-nums">
                Total Items: {totalCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#0c831f] border border-emerald-200 text-xs font-heading font-bold whitespace-nowrap transition-colors cursor-pointer"
            >
              + Add Products
            </button>
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearCart();
                  setAppliedCouponCode(null);
                }}
                className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Clear cart"
                aria-label="Clear cart"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Repeat notice */}
        {repeatSuccessNotice && (
          <div className="mx-3.5 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{repeatSuccessNotice}</span>
          </div>
        )}

        {/* ================================================================
            EMPTY CART STATE
        ================================================================ */}
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-stone-300 border border-stone-200 shadow-2xs">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-stone-800 text-lg">Your cart is empty</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Explore fresh groceries, daily staples, snacks & household essentials with great store savings.
              </p>
            </div>

            {lastOrder && (
              <div className="w-full max-w-xs bg-white border border-amber-200 rounded-2xl p-4 text-left shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-extrabold text-amber-800 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Repeat Last Order
                  </span>
                  <span className="text-stone-400">{lastOrder.createdAt}</span>
                </div>
                <div>
                  <p className="font-bold text-stone-900 text-xs line-clamp-1">
                    Order #{lastOrder.id} · {lastOrder.itemsCount} items
                  </p>
                  <p className="text-[11px] text-stone-600 font-semibold mt-0.5 tabular-nums">
                    ₹{lastOrder.finalPayableAmount} (Cash on Delivery)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerRepeat(lastOrder)}
                  className="w-full py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>1-Tap Reorder These Items</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#0c831f] hover:bg-[#0a731b] text-white font-heading font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              Browse Grocery Items
            </button>
          </div>
        ) : (
          /* ================================================================
             POPULATED CART SCROLLABLE BODY
          ================================================================ */
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {/* 1. Delivery Address & Area Selector Bar */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-3.5 shadow-2xs space-y-3">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#0c831f] flex items-center justify-center shrink-0 mt-0.5">
                    {deliveryMode === 'pickup' ? (
                      <Store className="w-4 h-4" />
                    ) : (
                      <Home className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-black text-xs sm:text-sm text-stone-900">
                        {deliveryMode === 'pickup' ? 'Pickup From Store' : 'Delivering to Home'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-0.5 leading-snug">
                      {deliveryMode === 'pickup'
                        ? 'Chaurasia Kirana Store: बस स्टैंड, बैढ़न'
                        : displayAddressLine}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingAddress((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#0c831f] hover:bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {isEditingAddress ? 'Cancel' : 'Change'}
                </button>
              </div>

              {/* Interactive Select Delivery Area / Locality Dropdown */}
              {deliveryMode !== 'pickup' && !isEditingAddress && (
                <div className="pt-2.5 border-t border-stone-100">
                  <label
                    htmlFor="cart-delivery-area-select"
                    className="block text-[11px] font-bold text-stone-700 mb-1.5"
                  >
                    अपना एरिया चुनें / Select Area
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#0c831f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="cart-delivery-area-select"
                      value={selectedZone.name}
                      onChange={(e) => handleSelectAreaDirectly(e.target.value)}
                      className="w-full min-h-[44px] pl-9 pr-9 py-2 text-xs sm:text-[13px] font-bold text-stone-900 bg-stone-50 hover:bg-white border border-stone-200 focus:border-[#0c831f] focus:bg-white focus:ring-2 focus:ring-emerald-600/20 rounded-xl appearance-none cursor-pointer transition-all"
                    >
                      {activeDeliveryZones.map((zone) => (
                        <option key={zone.id} value={zone.name}>
                          {formatDeliveryZoneOption(zone)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Inline Address Quick-Edit Form */}
              {isEditingAddress && (
                <form
                  onSubmit={handleSaveAddress}
                  className="mt-1 pt-3 border-t border-stone-100 space-y-2.5"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={draftAddress.fullName}
                      onChange={(e) =>
                        setDraftAddress((p) => ({ ...p, fullName: e.target.value }))
                      }
                      placeholder="Your Name"
                      className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#0c831f] focus:outline-none"
                    />
                    <input
                      type="tel"
                      value={draftAddress.phoneNumber}
                      onChange={(e) =>
                        setDraftAddress((p) => ({ ...p, phoneNumber: e.target.value }))
                      }
                      placeholder="Mobile No."
                      className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#0c831f] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cart-edit-area-select"
                      className="block text-[11px] font-bold text-stone-700 mb-1"
                    >
                      अपना एरिया चुनें / Select Area
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-[#0c831f] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        id="cart-edit-area-select"
                        value={resolveSelectedDeliveryZone(activeDeliveryZones, draftAddress.locality).name}
                        onChange={(e) =>
                          setDraftAddress((p) => ({ ...p, locality: e.target.value }))
                        }
                        className="w-full min-h-[42px] pl-9 pr-9 py-2 text-xs font-bold text-stone-900 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#0c831f] focus:outline-none appearance-none cursor-pointer"
                      >
                        {activeDeliveryZones.map((zone) => (
                          <option key={zone.id} value={zone.name}>
                            {formatDeliveryZoneOption(zone)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={draftAddress.fullAddress}
                    onChange={(e) =>
                      setDraftAddress((p) => ({ ...p, fullAddress: e.target.value }))
                    }
                    placeholder="House / Flat No., Street, Landmark..."
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#0c831f] focus:outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-[#0c831f] hover:bg-[#0a731b] text-white text-xs font-bold cursor-pointer"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Area-Aware Free Delivery Progress Bar / Area Delivery Charge Badge */}
            <CartBumperProgressBar
              currentSubtotal={cartValue}
              deliveryZone={selectedZone}
              deliveryMode={deliveryMode}
            />

            {/* 2. Cart Item Cards */}
            <div className="bg-white rounded-2xl border border-stone-200/90 divide-y divide-stone-100 overflow-hidden shadow-2xs">
              {cartItems.map((item) => {
                const { product, quantity, selectedVariant } = item;
                const price = Number(
                  selectedVariant ? selectedVariant.price : product.finalPrice
                );
                const mrp = Number(
                  selectedVariant ? selectedVariant.mrp : product.originalPrice
                );
                const effectiveMrp = Math.max(mrp, price);
                const unit = selectedVariant ? selectedVariant.weight_unit : product.unit;
                const itemKey =
                  item.itemKey ||
                  (selectedVariant ? `${product.id}::${selectedVariant.id}` : product.id);
                const itemTotal = price * quantity;
                const itemMrpTotal = effectiveMrp * quantity;
                const itemSavings = Math.max(0, Math.round(itemMrpTotal - itemTotal));
                const isFreeItem = price === 0;

                return (
                  <div key={itemKey} className="p-3.5 flex gap-3">
                    {/* Product Thumbnail */}
                    <div className="w-16 h-16 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center p-1 flex-shrink-0 overflow-hidden">
                      <CartItemThumb product={product} />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {/* Category / Brand metadata */}
                            <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide truncate">
                              {product.category || 'Kirana'}
                            </div>
                            <h5 className="font-heading font-bold text-xs sm:text-[13px] text-stone-900 line-clamp-2 leading-snug mt-0.5">
                              {product.name}
                            </h5>
                          </div>

                          {/* Delete Item Icon */}
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemKey, 0)}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Remove item"
                            aria-label={`Remove ${product.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Weight + Free Item badge */}
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-500 font-medium">
                          <span>{unit || '1 Pack'}</span>
                          {isFreeItem && (
                            <span className="text-[10px] font-black text-white bg-[#0c831f] px-1.5 py-0.5 rounded">
                              Free Item
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price Row + Quantity Stepper */}
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div className="min-w-0 tabular-nums">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="font-heading font-black text-sm text-stone-950">
                              {isFreeItem ? '₹0' : `₹${itemTotal}`}
                            </span>
                            {effectiveMrp > price && (
                              <span className="text-[11px] text-stone-400 line-through">
                                ₹{itemMrpTotal}
                              </span>
                            )}
                          </div>
                          {itemSavings > 0 && !isFreeItem && (
                            <span className="text-[11px] font-bold text-[#0c831f] block leading-tight mt-0.5">
                              You save ₹{itemSavings}
                            </span>
                          )}
                        </div>

                        {/* Quantity Stepper (- 1 +) */}
                        <div className="flex items-center bg-emerald-50 rounded-xl p-0.5 border border-emerald-200 shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemKey, quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#0c831f] hover:bg-white rounded-lg transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                          <span className="w-7 text-center text-xs font-black text-stone-900 select-none tabular-nums">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(itemKey, quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#0c831f] hover:bg-white rounded-lg transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. "Would you like to consider buying" Upsell Carousel */}
            <UpsellCarousel
              products={catalogProducts}
              cartItems={cartItems}
              onAddToCart={(prod) => {
                if (onAddToCart) {
                  onAddToCart(prod);
                } else {
                  onUpdateQuantity(prod.id, 1);
                }
              }}
              onUpdateQuantity={onUpdateQuantity}
              title="Would you like to consider buying"
              subtitle="Snacks, tea, biscuits & daily essentials"
            />

            {/* 4. Offers / Apply Coupon Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-3.5 shadow-2xs">
              {validAppliedCoupon ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#0c831f] flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-black text-xs text-emerald-900">
                          {validAppliedCoupon} Applied
                        </span>
                        <span className="text-[11px] font-bold text-[#0c831f] tabular-nums">
                          · Saved ₹{couponDiscount}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCouponModalOpen(true)}
                        className="text-[11px] font-semibold text-stone-500 hover:text-[#0c831f] cursor-pointer"
                      >
                        Change coupon
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAppliedCouponCode(null)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="cart-apply-coupon-btn"
                  onClick={() => setIsCouponModalOpen(true)}
                  className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-heading font-black text-sm text-stone-900 block leading-tight">
                        Apply Coupon
                      </span>
                      <span className="text-[11px] text-stone-500 block mt-0.5 truncate">
                        Save extra with KIRANA50, FIRSTORDER & more
                      </span>
                    </div>
                  </div>

                  <span className="flex items-center gap-0.5 text-xs font-black text-[#0c831f] group-hover:translate-x-0.5 transition-transform shrink-0 whitespace-nowrap">
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              )}

              {/* Notice if a previously selected coupon is currently ineligible */}
              {appliedCouponCode && !validAppliedCoupon && financials.couponMessage && (
                <p className="mt-2 pt-2 border-t border-stone-100 text-[11px] font-semibold text-amber-800">
                  {financials.couponMessage}
                </p>
              )}
            </div>

            {/* 5. Detailed Bill Summary Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-4 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-1 border-b border-stone-100">
                <h5 className="font-heading font-black text-xs text-stone-900 uppercase tracking-wider">
                  Bill Details
                </h5>
                <span className="text-[11px] text-stone-500 font-medium">
                  Cash on Delivery
                </span>
              </div>

              <div className="space-y-2 text-xs tabular-nums">
                {/* Cart Value */}
                <div className="flex justify-between text-stone-700">
                  <span>Cart Value</span>
                  <span className="font-bold text-stone-900">₹{cartValue.toFixed(2)}</span>
                </div>

                {/* Delivery Charge */}
                <div className="flex justify-between items-start text-stone-700 gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">
                      Delivery Charge{' '}
                      <span className="text-stone-500 font-medium">
                        ({deliveryMode === 'pickup' ? 'Store Pickup' : selectedZone.name})
                      </span>
                    </span>
                    {!isFreeDelivery &&
                      deliveryMode !== 'pickup' &&
                      freeDeliveryThreshold !== null &&
                      remainingForFree > 0 && (
                        <span className="text-[10px] font-semibold text-amber-700">
                          Add ₹{remainingForFree} more for FREE Delivery
                        </span>
                      )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isFreeDelivery ? (
                      <>
                        <span className="text-[11px] text-stone-400 line-through">
                          ₹{(baseDeliveryFee || STANDARD_DELIVERY_FEE).toFixed(2)}
                        </span>
                        <span className="font-black text-[#0c831f]">₹0.00 (FREE)</span>
                      </>
                    ) : (
                      <span className="font-bold text-stone-900">
                        ₹{deliveryCharge.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Sub Total */}
                <div className="flex justify-between text-stone-700 pt-1.5 border-t border-stone-100">
                  <span>Sub Total</span>
                  <span className="font-bold text-stone-900">
                    ₹{subTotalWithDelivery.toFixed(2)}
                  </span>
                </div>

                {/* Coupon Discount (when applied) */}
                {couponDiscount > 0 && validAppliedCoupon && (
                  <div className="flex justify-between text-[#0c831f] font-bold">
                    <span>Coupon Discount ({validAppliedCoupon})</span>
                    <span>-₹{couponDiscount.toFixed(2)}</span>
                  </div>
                )}

                {/* Total Amount Payable */}
                <div className="pt-2.5 border-t border-stone-200 flex justify-between items-baseline">
                  <span className="font-heading font-black text-sm text-stone-950">
                    Total Amount Payable
                  </span>
                  <span className="font-heading font-black text-lg text-stone-950">
                    ₹{finalPayable.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Expandable Green Total Savings Accordion */}
              {totalSavings > 0 && (
                <div className="mt-2 rounded-xl bg-emerald-50 border border-emerald-200 overflow-hidden">
                  <button
                    type="button"
                    id="cart-total-savings-accordion"
                    onClick={() => setIsSavingsExpanded((prev) => !prev)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-heading font-black text-emerald-900 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0c831f]" />
                      <span className="tabular-nums">Total Savings ₹{totalSavings.toFixed(0)}</span>
                    </span>
                    {isSavingsExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#0c831f]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#0c831f]" />
                    )}
                  </button>

                  {isSavingsExpanded && (
                    <div className="px-3 pb-2.5 pt-1 border-t border-emerald-200/80 space-y-1 text-[11px] text-emerald-900 tabular-nums">
                      <div className="flex justify-between">
                        <span>Product Discount</span>
                        <span className="font-bold">₹{productDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Coupon / Cart Discount</span>
                        <span className="font-bold">₹{couponDiscount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {confirmedSlot && (
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                    Selected Slot
                  </span>
                  <span className="font-bold text-stone-900 truncate block">
                    {confirmedSlot.slotLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(true)}
                  className="text-xs font-bold text-[#0c831f] underline cursor-pointer shrink-0"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            6. STICKY BOTTOM CHECKOUT BAR (TOTAL + Savings | Select Delivery Slot)
        ================================================================ */}
        {cartItems.length > 0 && (
          <div className="bg-white px-4 py-3 border-t border-stone-200 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col items-start min-w-0 tabular-nums">
              <span className="font-heading font-black text-base sm:text-lg text-stone-950 leading-tight whitespace-nowrap">
                TOTAL: ₹{Math.round(finalPayable)}
              </span>
              {totalSavings > 0 ? (
                <span className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-[#0c831f] text-[11px] font-extrabold whitespace-nowrap">
                  Savings: ₹{Math.round(totalSavings)}
                </span>
              ) : (
                <span className="text-[11px] text-stone-500 font-medium whitespace-nowrap">
                  {isFreeDelivery ? 'FREE Delivery' : `+₹${deliveryCharge} Delivery`}
                </span>
              )}
            </div>

            <button
              type="button"
              id="checkout-btn"
              onClick={() => setIsSlotModalOpen(true)}
              className="flex-1 max-w-[230px] py-3.5 px-4 rounded-xl bg-[#0c831f] hover:bg-[#0a731b] active:scale-[0.98] text-white font-heading font-black text-xs sm:text-sm shadow-md shadow-emerald-950/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Select Delivery Slot</span>
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* ================================================================
            COUPON PICKER SHEET (INSIDE CART)
        ================================================================ */}
        {isCouponModalOpen && (
          <div
            className="absolute inset-0 z-40 bg-stone-950/55 backdrop-blur-xs flex items-end animate-in fade-in duration-150"
            onClick={() => {
              setIsCouponModalOpen(false);
              setCouponFeedback(null);
            }}
          >
            <div
              className="w-full bg-white rounded-t-3xl max-h-[82%] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3.5 border-b border-stone-200 flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-black text-sm text-stone-950">
                    Apply Coupon & Offers
                  </h4>
                  <p className="text-[11px] text-stone-500 tabular-nums">
                    Cart Value: ₹{cartValue.toFixed(0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCouponModalOpen(false);
                    setCouponFeedback(null);
                  }}
                  className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Manual Coupon Code Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleApplyCouponCode(couponInput);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponFeedback(null);
                    }}
                    placeholder="Enter coupon code (e.g. KIRANA50)"
                    className="flex-1 px-3 py-2.5 text-xs font-bold uppercase tracking-wider bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-[#0c831f] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!couponInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-heading font-black cursor-pointer shrink-0"
                  >
                    APPLY
                  </button>
                </form>

                {couponFeedback && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold ${
                      couponFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {couponFeedback.text}
                  </div>
                )}

                {/* Available Store Coupons */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                    Available Store Coupons
                  </span>
                  {STORE_COUPONS.map((coupon) => {
                    const evalRes = evaluateCoupon(coupon.code, cartValue);
                    const isApplied = validAppliedCoupon === coupon.code;
                    return (
                      <div
                        key={coupon.code}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isApplied
                            ? 'border-[#0c831f] bg-emerald-50/70'
                            : 'border-stone-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-stone-900 text-white tracking-wider">
                                {coupon.code}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-800">
                                {coupon.tag}
                              </span>
                            </div>
                            <p className="font-heading font-bold text-xs text-stone-900 mt-1.5">
                              {coupon.title}
                            </p>
                            <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                              {coupon.description}
                            </p>
                            {!evalRes.valid && evalRes.shortfall && (
                              <p className="text-[11px] font-semibold text-amber-700 mt-1 tabular-nums">
                                Add ₹{evalRes.shortfall} more to unlock
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={!evalRes.valid && !isApplied}
                            onClick={() =>
                              isApplied
                                ? setAppliedCouponCode(null)
                                : handleApplyCouponCode(coupon.code)
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-heading font-black shrink-0 cursor-pointer transition-colors ${
                              isApplied
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : evalRes.valid
                                ? 'bg-[#0c831f] text-white hover:bg-[#0a731b]'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            {isApplied ? 'REMOVE' : 'APPLY'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Delivery Slot Picker Bottom-Sheet Modal */}
      <DeliverySlotModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        subtotal={cartValue}
        initialMode={deliveryMode}
        initialSlotId={confirmedSlot?.slotId || null}
        storeAddress={storeSettings.address || 'थाना रोड, बैढ़न (10:00 AM - 9:00 PM)'}
        deliveryZone={selectedZone}
        onConfirmSlot={handleConfirmDeliverySlot}
      />
    </div>
  );
};
