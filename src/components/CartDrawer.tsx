import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck, Sparkles, RotateCcw, Check } from 'lucide-react';
import { CartItem, StoreSettings, Order } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { getCustomerOrders } from '../services/storageService';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (itemKey: string, quantity: number) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
  storeSettings?: StoreSettings;
  orders?: Order[];
  onRepeatOrder?: (order: Order) => void;
}

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
}) => {
  const [repeatSuccessNotice, setRepeatSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Retrieve previous orders for 1-Tap Repeat Order strictly for this customer
  const pastOrders = orders && orders.length > 0 ? orders : getCustomerOrders();
  const lastOrder = pastOrders.length > 0 ? pastOrders[0] : null;

  const handleTriggerRepeat = (order: Order) => {
    if (onRepeatOrder) {
      onRepeatOrder(order);
    }
    setRepeatSuccessNotice(`Items from Order #${order.id} reloaded!`);
    setTimeout(() => setRepeatSuccessNotice(null), 3000);
  };

  // Calculate bill totals taking variants into account
  const totalOriginalMRP = cartItems.reduce((sum, item) => {
    const mrp = item.selectedVariant ? item.selectedVariant.mrp : item.product.originalPrice;
    return sum + mrp * item.quantity;
  }, 0);

  const subtotalSellingPrice = cartItems.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.product.finalPrice;
    return sum + price * item.quantity;
  }, 0);

  const totalSavings = Math.max(0, totalOriginalMRP - subtotalSellingPrice);

  const minFree = storeSettings.minOrderForFreeDelivery ?? STORE_DEFAULTS.minOrderForFreeDelivery;
  const standardFee = storeSettings.deliveryCharge ?? STORE_DEFAULTS.deliveryCharge;
  const isFreeDelivery = subtotalSellingPrice >= minFree;
  const deliveryCharge = isFreeDelivery ? 0 : standardFee;
  const finalPayable = subtotalSellingPrice + deliveryCharge;

  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-stone-50 h-full flex flex-col shadow-2xl border-l border-stone-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-white px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#c62828] flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-stone-900 text-lg leading-tight">
                My Kirana Basket
              </h3>
              <p className="text-xs text-stone-500">
                {totalCount} {totalCount === 1 ? 'item' : 'items'} in your cart
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {cartItems.length > 0 && (
              <button
                onClick={onClearCart}
                className="p-1.5 text-xs text-stone-400 hover:text-rose-600 transition-colors mr-1"
                title="Empty basket"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {repeatSuccessNotice && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{repeatSuccessNotice}</span>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center text-stone-300 border border-stone-200">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-stone-800 text-lg">Your basket is empty</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-xs">
                Explore our fresh grocery catalog and add your daily essentials with big store discounts.
              </p>
            </div>

            {/* 1-Tap Repeat Previous Order Card (if customer has placed an order before) */}
            {lastOrder && (
              <div className="w-full max-w-xs bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 text-left shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-amber-700" /> Repeat Last Order
                  </span>
                  <span className="text-[10px] text-stone-500 font-medium">{lastOrder.createdAt}</span>
                </div>
                <div>
                  <p className="font-bold text-stone-900 text-xs line-clamp-1">
                    Order #{lastOrder.id} • {lastOrder.itemsCount} items
                  </p>
                  <p className="text-[11px] text-stone-600 font-semibold mt-0.5">
                    ₹{lastOrder.finalPayableAmount} (Cash on Delivery)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTriggerRepeat(lastOrder)}
                  className="w-full py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>1-Tap Reorder These Items</span>
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm transition-all cursor-pointer"
            >
              Browse Grocery Items
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Smart Free Delivery Progress Bar */}
            <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between text-xs text-emerald-950">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-xs leading-tight">
                    {isFreeDelivery ? (
                      <strong className="text-emerald-900 font-bold">
                        🎉 FREE Doorstep Delivery Unlocked!
                      </strong>
                    ) : (
                      <span>
                        Add <strong className="font-bold text-emerald-900">₹{minFree - subtotalSellingPrice}</strong> more for <strong className="text-emerald-900">FREE Delivery</strong>
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 whitespace-nowrap ml-2">
                  ₹{subtotalSellingPrice} / ₹{minFree}
                </span>
              </div>

              {/* Visual Progress Bar Meter */}
              <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.round((subtotalSellingPrice / minFree) * 100))}%` }}
                />
              </div>

              {!isFreeDelivery && (
                <p className="text-[10px] text-emerald-800 text-right font-medium">
                  {Math.round((subtotalSellingPrice / minFree) * 100)}% to Free Delivery
                </p>
              )}
            </div>

            {/* Discount savings celebratory pill */}
            {totalSavings > 0 && (
              <div className="bg-gradient-to-r from-amber-500/15 to-emerald-500/15 border border-emerald-300/60 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  You are saving <strong className="text-emerald-800">₹{totalSavings}</strong> with {storeSettings.name || 'Kirana'} discounts!
                </span>
              </div>
            )}

            {/* Item list */}
            <div className="bg-white rounded-2xl border border-stone-200/90 divide-y divide-stone-100 overflow-hidden shadow-xs">
              {cartItems.map((item) => {
                const { product, quantity, selectedVariant } = item;
                const price = selectedVariant ? selectedVariant.price : product.finalPrice;
                const mrp = selectedVariant ? selectedVariant.mrp : product.originalPrice;
                const unit = selectedVariant ? selectedVariant.weight_unit : product.unit;
                const itemKey = item.itemKey || (selectedVariant ? `${product.id}::${selectedVariant.id}` : product.id);
                const itemTotal = price * quantity;
                const hasDiscount = mrp > price;
                const discountPercent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;

                return (
                  <div key={itemKey} className="p-3.5 flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-center p-1.5 flex-shrink-0">
                      <img
                        src={product.imageUrl || getCategoryFallbackSvg(product.category, product.name)}
                        alt={product.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.src = getCategoryFallbackSvg(product.category, product.name);
                        }}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-semibold text-stone-900 line-clamp-1">
                        {product.name}
                      </h5>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                        {unit}
                      </span>

                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="font-heading font-bold text-xs text-stone-900">
                          ₹{price}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-stone-400 line-through">
                            ₹{mrp}
                          </span>
                        )}
                        {hasDiscount && (
                          <span className="text-[10px] text-emerald-600 font-bold">
                            {discountPercent}% OFF
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepper & Line Total */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                        <button
                          onClick={() => onUpdateQuantity(itemKey, quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-950 hover:bg-white rounded transition-colors"
                          title="Decrease"
                        >
                          {quantity === 1 ? <Trash2 className="w-3 h-3 text-rose-600" /> : <Minus className="w-3 h-3" />}
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-stone-900 select-none">
                          {quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(itemKey, quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-stone-950 hover:bg-white rounded transition-colors"
                          title="Increase"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs font-extrabold text-stone-900">
                        ₹{itemTotal}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bill Details */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-4 space-y-2.5 shadow-xs">
              <h5 className="font-heading font-bold text-xs text-stone-800 uppercase tracking-wider">
                Bill Summary
              </h5>

              <div className="flex justify-between text-xs text-stone-600">
                <span>Total Items MRP</span>
                <span>₹{totalOriginalMRP}</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                  <span>Kirana Store Discount</span>
                  <span>-₹{totalSavings}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-stone-600">
                <span>Delivery Charge</span>
                <span>
                  {isFreeDelivery ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    `₹${deliveryCharge}`
                  )}
                </span>
              </div>

              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline font-heading">
                <div>
                  <span className="font-extrabold text-stone-900 text-sm">To Pay</span>
                  <span className="block text-[10px] text-stone-500 font-sans font-normal">
                    Cash on Delivery (No online fee)
                  </span>
                </div>
                <span className="text-lg font-extrabold text-stone-950">
                  ₹{finalPayable}
                </span>
              </div>
            </div>

            {/* COD Trust Badge */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs text-amber-950">
              <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>
                <strong>100% Cash on Delivery:</strong> Pay cash to our delivery partner upon receiving your package.
              </span>
            </div>
          </div>
        )}

        {/* Footer Checkout Trigger */}
        {cartItems.length > 0 && (
          <div className="bg-white p-4 border-t border-stone-200 shadow-lg">
            <button
              id="checkout-btn"
              onClick={onProceedToCheckout}
              className="w-full py-3 px-4 bg-[#c62828] hover:bg-[#b71c1c] active:scale-[0.99] text-white font-heading font-bold text-sm rounded-xl shadow-md flex items-center justify-between transition-all"
            >
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] text-red-200 uppercase tracking-wider">
                  {totalCount} Items • Pay on Delivery
                </span>
                <span className="text-base font-extrabold">₹{finalPayable}</span>
              </div>
              <span className="flex items-center gap-1.5 font-bold">
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
