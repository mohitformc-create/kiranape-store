import React, { useState } from 'react';
import { X, User, Phone, MapPin, Banknote, ShieldCheck, CheckCircle2, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { CartItem, DeliverySlot, StoreSettings } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { getCustomerSelectedLocation } from '../services/storageService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  initialCustomer?: {
    fullName?: string;
    phoneNumber?: string;
    fullAddress?: string;
  };
  onSubmitOrder: (customerDetails: {
    fullName: string;
    phoneNumber: string;
    fullAddress: string;
    deliverySlot: DeliverySlot;
  }) => Promise<void> | void;
  storeSettings?: StoreSettings;
}

const DELIVERY_SLOT_OPTIONS: { id: DeliverySlot; label: string; timeRange: string; desc: string }[] = [
  {
    id: 'Morning (10:00 AM - 2:00 PM)',
    label: 'Morning Slot',
    timeRange: '10:00 AM - 2:00 PM',
    desc: 'Fresh daytime staples & groceries',
  },
  {
    id: 'Evening (7:00 PM - 9:00 PM)',
    label: 'Evening Slot',
    timeRange: '7:00 PM - 9:00 PM',
    desc: 'Convenient post-work dinner delivery',
  },
];

const getInitialDeliverySlot = (): DeliverySlot => {
  const currentHour = new Date().getHours();
  return currentHour < 13 ? 'Morning (10:00 AM - 2:00 PM)' : 'Evening (7:00 PM - 9:00 PM)';
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  initialCustomer,
  onSubmitOrder,
  storeSettings = STORE_DEFAULTS,
}) => {
  const [fullName, setFullName] = useState(initialCustomer?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(initialCustomer?.phoneNumber || '');
  const [fullAddress, setFullAddress] = useState(initialCustomer?.fullAddress || '');
  const [deliverySlot, setDeliverySlot] = useState<DeliverySlot>(() => getInitialDeliverySlot());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedLocation = getCustomerSelectedLocation() || storeSettings.serviceArea || 'Waidhan, Singrauli';

  if (!isOpen) return null;

  // Bill calculations using dynamic store settings and item variants
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.product.finalPrice;
    return sum + price * item.quantity;
  }, 0);
  const minFree = storeSettings.minOrderForFreeDelivery ?? STORE_DEFAULTS.minOrderForFreeDelivery;
  const standardFee = storeSettings.deliveryCharge ?? STORE_DEFAULTS.deliveryCharge;
  const isFreeDelivery = subtotal >= minFree;
  const deliveryCharge = isFreeDelivery ? 0 : standardFee;
  const finalPayable = subtotal + deliveryCharge;

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

    if (!fullAddress.trim()) {
      errs.fullAddress = 'Please enter your complete delivery address';
    } else if (fullAddress.trim().length < 6) {
      errs.fullAddress = 'Please include house/flat no., street, and area';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError(null);

    setIsSubmitting(true);
    try {
      await onSubmitOrder({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        fullAddress: fullAddress.trim(),
        deliverySlot,
      });
      // The parent will dismiss modal and display the Order Placed Successfully screen
    } catch (err: unknown) {
      console.error('Error placing order:', err);
      const msg = err instanceof Error ? err.message : 'Unable to complete order. Please try again.';
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base leading-tight">
                Complete Your Delivery Order
              </h3>
              <p className="text-xs text-stone-300">
                No login required • Cash on Delivery ONLY
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Reassurance Notice */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-emerald-950">
              <strong>Zero prepayment required:</strong> Chaurasia Kirana delivers right to your doorstep.
              Hand over cash or scan delivery agent UPI upon arrival.
            </div>
          </div>

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
                autoFocus
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
                Delivery partner will call this number when arriving at your location.
              </p>
            )}
          </div>

          {/* Field 3: Full Address */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="customer-full-address"
                className="text-xs font-bold text-stone-800 uppercase tracking-wider"
              >
                3. Full Delivery Address <span className="text-rose-600">*</span>
              </label>
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                <MapPin className="w-3 h-3 text-amber-700" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{selectedLocation}</span>
              </div>
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
                placeholder="Flat / House No., Floor, Building Name, Street, Landmark, Colony / Area..."
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

          {/* Field 4: Preferred Delivery Slot */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                4. Preferred Delivery Slot <span className="text-rose-600">*</span>
              </label>
              <span className="text-[10px] font-bold text-stone-500 uppercase">2 Daily Slots</span>
            </div>

            {/* Note on daily delivery slots */}
            <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-950 font-medium mb-2.5 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <span>
                We currently deliver in 2 convenient daily slots: <strong>Morning (10AM-2PM)</strong> and <strong>Evening (7PM-9PM)</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DELIVERY_SLOT_OPTIONS.map((slot) => {
                const isSelected = deliverySlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setDeliverySlot(slot.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-600/30 text-emerald-950 shadow-xs'
                        : 'border-stone-200 bg-stone-50 hover:bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black leading-tight text-stone-900">
                        {slot.label}
                      </span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ml-1.5 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600'
                            : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/70 inline-block px-1.5 py-0.5 rounded mb-1">
                      {slot.timeRange}
                    </div>
                    <p className="text-[11px] text-stone-500 leading-snug">{slot.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method & Cost Breakdown */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/90 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-700 uppercase tracking-wider">
                Payment Method
              </span>
              <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                Cash on Delivery (COD)
              </span>
            </div>

            <div className="pt-2 border-t border-stone-200/80 space-y-1.5 text-xs text-stone-600">
              <div className="flex items-center justify-between">
                <span>Items Subtotal:</span>
                <span className="font-bold text-stone-800">₹{subtotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Doorstep Delivery Fee:</span>
                {isFreeDelivery ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    FREE (Order above ₹{minFree})
                  </span>
                ) : (
                  <span className="font-bold text-stone-800">
                    ₹{deliveryCharge} <span className="text-[10px] text-stone-400 font-normal">(Free above ₹{minFree})</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700">Total Cash to Keep Ready:</span>
              <span className="font-heading font-extrabold text-lg text-emerald-950">
                ₹{finalPayable}
              </span>
            </div>
          </div>

          {/* Error Message */}
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
            className="w-full py-3.5 px-4 bg-[#c62828] hover:bg-[#b71c1c] active:scale-[0.99] disabled:opacity-70 text-white font-heading font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Placing Your Order...
              </span>
            ) : (
              <>
                Place Order (Cash on Delivery) • ₹{finalPayable} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
