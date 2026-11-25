import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Clock,
  Store,
  Truck,
  Tag,
} from 'lucide-react';
import { CartItem, DeliverySlot, StoreSettings, Product } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { getCustomerSelectedLocation } from '../services/storageService';
import { CreatorCredits } from './CreatorCredits';
import { CartBumperProgressBar } from './CartBumperProgressBar';
import {
  calculateCartFinancials,
  STANDARD_DELIVERY_FEE,
  FREE_DELIVERY_THRESHOLD,
} from '../utils/rewardsEngine';
import { ConfirmedDeliverySlot, DeliveryMode, DeliverySlotModal } from './DeliverySlotModal';
import { saveCartAddress, getSavedCartAddress } from './CartDrawer';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  initialCustomer?: {
    fullName?: string;
    phoneNumber?: string;
    fullAddress?: string;
    locality?: string;
  };
  selectedDeliverySlot?: ConfirmedDeliverySlot | null;
  deliveryMode?: DeliveryMode;
  appliedCouponCode?: string | null;
  onUpdateDeliverySlot?: (slot: ConfirmedDeliverySlot) => void;
  onSubmitOrder: (customerDetails: {
    fullName: string;
    phoneNumber: string;
    fullAddress: string;
    deliverySlot: DeliverySlot;
    deliveryMode?: DeliveryMode;
    couponCode?: string | null;
  }) => Promise<void> | void;
  storeSettings?: StoreSettings;
  onAddStayfreeReward?: () => void;
  onAddToCart?: (product: Product) => void;
  onUpdateQuantity?: (itemKey: string, quantity: number) => void;
  catalogProducts?: Product[];
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  initialCustomer,
  selectedDeliverySlot,
  deliveryMode = 'delivery',
  appliedCouponCode = null,
  onUpdateDeliverySlot,
  onSubmitOrder,
  storeSettings = STORE_DEFAULTS,
}) => {
  const [fullName, setFullName] = useState(initialCustomer?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(initialCustomer?.phoneNumber || '');
  const [fullAddress, setFullAddress] = useState(initialCustomer?.fullAddress || '');
  const [activeSlot, setActiveSlot] = useState<ConfirmedDeliverySlot | null>(
    selectedDeliverySlot || null
  );
  const [activeMode, setActiveMode] = useState<DeliveryMode>(
    selectedDeliverySlot?.mode || deliveryMode
  );
  const [isSlotPickerOpen, setIsSlotPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedCartAddress();
      setFullName((prev) => initialCustomer?.fullName || saved.fullName || prev);
      setPhoneNumber((prev) => initialCustomer?.phoneNumber || saved.phoneNumber || prev);
      setFullAddress((prev) => initialCustomer?.fullAddress || saved.fullAddress || prev);
      if (selectedDeliverySlot) {
        setActiveSlot(selectedDeliverySlot);
        setActiveMode(selectedDeliverySlot.mode);
      } else {
        setActiveMode(deliveryMode);
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, initialCustomer, selectedDeliverySlot, deliveryMode]);

  const selectedLocation =
    initialCustomer?.locality ||
    getCustomerSelectedLocation() ||
    storeSettings.serviceArea ||
    'बैढ़न, सिंगरौली';

  if (!isOpen) return null;

  const financials = calculateCartFinancials(cartItems, {
    deliveryMode: activeMode,
    couponCode: appliedCouponCode,
  });

  const {
    subtotal,
    couponCode: validCoupon,
    couponDiscount,
    isFreeDelivery,
    deliveryCharge,
    subTotalWithDelivery,
    totalPayable: finalPayable,
  } = financials;

  const effectiveSlotLabel: DeliverySlot =
    activeSlot?.slotLabel ||
    (activeMode === 'pickup'
      ? 'Pickup From Store • Scheduled Slot'
      : 'Home Delivery • Scheduled Slot');

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.fullName = 'Please enter your full name';
    } else if (fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters';
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (!cleanedPhone) {
      errs.phoneNumber = 'Please enter your phone number';
    } else if (cleanedPhone.length < 10) {
      errs.phoneNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (activeMode !== 'pickup') {
      if (!fullAddress.trim()) {
        errs.fullAddress = 'Please enter your complete delivery address';
      } else if (fullAddress.trim().length < 6) {
        errs.fullAddress = 'Please include house/flat no., street, and area';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError(null);

    const finalAddress =
      activeMode === 'pickup'
        ? fullAddress.trim() || 'Chaurasia Kirana Store: बस स्टैंड, बैढ़न'
        : fullAddress.trim() || selectedLocation;

    // Persist customer details for future carts
    saveCartAddress({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      fullAddress: activeMode === 'pickup' ? fullAddress.trim() : finalAddress,
      locality: selectedLocation,
    });

    setIsSubmitting(true);
    try {
      await onSubmitOrder({
        fullName: fullName.trim() || 'Customer',
        phoneNumber: phoneNumber.trim() || '9424316081',
        fullAddress: finalAddress,
        deliverySlot: effectiveSlotLabel,
        deliveryMode: activeMode,
        couponCode: validCoupon,
      });
    } catch (err: unknown) {
      console.error('Error placing order:', err);
      const msg =
        err instanceof Error ? err.message : 'Unable to complete order. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0c831f] text-white flex items-center justify-center font-bold">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base leading-tight">
                Confirm & Place Order
              </h3>
              <p className="text-xs text-stone-300">
                No login required · Cash on Delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Confirmed Delivery Mode & Slot Summary */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#0c831f] text-white flex items-center justify-center shrink-0">
                {activeMode === 'pickup' ? (
                  <Store className="w-4 h-4" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                  <Clock className="w-3 h-3" />
                  <span>
                    {activeMode === 'pickup' ? 'Pickup From Store' : 'Home Delivery Slot'}
                  </span>
                </div>
                <p className="font-heading font-black text-xs sm:text-sm text-stone-900 mt-0.5 leading-snug">
                  {effectiveSlotLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSlotPickerOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-[#0c831f] border border-emerald-300 text-xs font-bold shrink-0 cursor-pointer transition-colors"
            >
              Change
            </button>
          </div>

          <CartBumperProgressBar currentSubtotal={subtotal} />

          {/* Field 1: Full Name */}
          <div>
            <label
              htmlFor="customer-full-name"
              className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5"
            >
              1. Full Name <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="customer-full-name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors({ ...errors, fullName: '' });
                }}
                placeholder="e.g. Ramesh Kumar"
                className={`w-full pl-10 pr-3.5 py-2.5 bg-stone-50 text-stone-900 placeholder:text-stone-400 text-sm rounded-xl border transition-all ${
                  errors.fullName
                    ? 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-200'
                    : 'border-stone-200 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.fullName}</p>
            )}
          </div>

          {/* Field 2: Phone Number */}
          <div>
            <label
              htmlFor="customer-phone-number"
              className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5"
            >
              2. Phone Number <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="customer-phone-number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
                }}
                placeholder="e.g. 9876543210"
                className={`w-full pl-10 pr-3.5 py-2.5 bg-stone-50 text-stone-900 placeholder:text-stone-400 text-sm rounded-xl border transition-all ${
                  errors.phoneNumber
                    ? 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-200'
                    : 'border-stone-200 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600'
                }`}
              />
            </div>
            {errors.phoneNumber ? (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.phoneNumber}</p>
            ) : (
              <p className="mt-1 text-[11px] text-stone-500">
                {activeMode === 'pickup'
                  ? 'We will call/SMS when your store pickup order is packed.'
                  : 'Delivery partner will call this number when arriving at your location.'}
              </p>
            )}
          </div>

          {/* Field 3: Full Delivery Address (or Store Pickup Info) */}
          {activeMode === 'pickup' ? (
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-[#0c831f]" />
                <span>Store Pickup Location</span>
              </div>
              <p className="font-semibold text-stone-800">
                Chaurasia Kirana Store: बस स्टैंड, बैढ़न
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold">
                Zero delivery fee — Pay Cash or UPI at the store counter.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="customer-full-address"
                  className="text-xs font-bold text-stone-800 uppercase tracking-wider"
                >
                  3. Full Delivery Address <span className="text-rose-600">*</span>
                </label>
                <span className="text-[11px] font-semibold text-stone-500 truncate max-w-[160px]">
                  {selectedLocation}
                </span>
              </div>
              <div className="relative">
                <div className="absolute top-3 left-3.5 pointer-events-none text-stone-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  id="customer-full-address"
                  rows={3}
                  value={fullAddress}
                  onChange={(e) => {
                    setFullAddress(e.target.value);
                    if (errors.fullAddress) setErrors({ ...errors, fullAddress: '' });
                  }}
                  placeholder="Flat / House No., Floor, Street, Landmark, Colony / Area..."
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-stone-50 text-stone-900 placeholder:text-stone-400 text-sm rounded-xl border transition-all resize-none ${
                    errors.fullAddress
                      ? 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-200'
                      : 'border-stone-200 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600'
                  }`}
                />
              </div>
              {errors.fullAddress && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.fullAddress}</p>
              )}
            </div>
          )}

          {/* Synchronized Bill Breakdown */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-2 shadow-2xs tabular-nums">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-stone-200/80">
              <span className="font-bold text-stone-700 uppercase tracking-wider">
                Order Summary
              </span>
              <span className="text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0c831f]" />
                Cash on Delivery (COD)
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex items-center justify-between">
                <span>Cart Value</span>
                <span className="font-bold text-stone-900">₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-stone-700 font-medium">
                    Delivery Charge{activeMode === 'pickup' ? ' (Pickup)' : ''}
                  </span>
                  {!isFreeDelivery && activeMode !== 'pickup' && (
                    <span className="block text-[10px] text-amber-700 font-medium">
                      Add ₹{Math.ceil(FREE_DELIVERY_THRESHOLD - subtotal)} more for FREE Delivery
                    </span>
                  )}
                </div>
                {isFreeDelivery ? (
                  <span className="text-[#0c831f] font-black flex items-center gap-1">
                    <span className="text-[11px] text-stone-400 line-through">
                      ₹{STANDARD_DELIVERY_FEE.toFixed(2)}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ₹0.00 (FREE)
                  </span>
                ) : (
                  <span className="font-bold text-stone-900">
                    ₹{deliveryCharge.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-stone-200/70">
                <span>Sub Total</span>
                <span className="font-bold text-stone-900">
                  ₹{subTotalWithDelivery.toFixed(2)}
                </span>
              </div>

              {couponDiscount > 0 && validCoupon && (
                <div className="flex items-center justify-between text-[#0c831f] font-bold">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Coupon ({validCoupon})
                  </span>
                  <span>-₹{couponDiscount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t border-stone-200 flex items-center justify-between">
              <span className="text-xs font-extrabold text-stone-900">
                Total Amount Payable
              </span>
              <span className="font-heading font-black text-xl text-emerald-950 font-mono">
                ₹{finalPayable.toFixed(2)}
              </span>
            </div>
          </div>

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {submitError}
            </div>
          )}

          {/* Submit Action */}
          <button
            id="submit-order-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-4 bg-[#0c831f] hover:bg-[#0a731b] active:scale-[0.99] disabled:opacity-70 text-white font-heading font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Placing Your Order...
              </span>
            ) : (
              <>
                Place Order (COD) · ₹{Math.round(finalPayable)}{' '}
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>

          <div className="pt-2 border-t border-stone-100">
            <CreatorCredits />
          </div>
        </form>
      </div>

      {/* Inline Slot Switcher */}
      <DeliverySlotModal
        isOpen={isSlotPickerOpen}
        onClose={() => setIsSlotPickerOpen(false)}
        subtotal={subtotal}
        initialMode={activeMode}
        initialSlotId={activeSlot?.slotId || null}
        storeAddress={storeSettings.address || 'थाना रोड, बैढ़न (10:00 AM - 9:00 PM)'}
        onConfirmSlot={(slot) => {
          setActiveSlot(slot);
          setActiveMode(slot.mode);
          onUpdateDeliverySlot?.(slot);
          setIsSlotPickerOpen(false);
        }}
      />
    </div>
  );
};
