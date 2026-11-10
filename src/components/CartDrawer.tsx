import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Truck, Sparkles, RotateCcw, Check, Gift, Share2 } from 'lucide-react';
import { CartItem, StoreSettings, Order, Product } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { getCustomerOrders } from '../services/storageService';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';
import { CartBumperProgressBar } from './CartBumperProgressBar';
import { UpsellCarousel } from './UpsellCarousel';
import { calculateCartFinancials } from '../utils/rewardsEngine';

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
  onAddStayfreeReward?: () => void;
  onAddToCart?: (product: Product) => void;
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
  onAddStayfreeReward,
  onAddToCart,
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

  // Strict numeric calculations from centralized rewardsEngine
  const financials = calculateCartFinancials(cartItems);
  const {
    itemsCount: totalCount,
    subtotal: subtotalSellingPrice,
    subtotalOriginalMRP: totalOriginalMRP,
    totalSavings,
    isFreeDelivery,
    deliveryCharge,
    totalPayable: finalPayable,
    unlockedGifts,
    amountNeededForNext,
  } = financials;

  // Stayfree XL Special Reward Unlock Logic (@ ₹180 on ₹1999+ orders)
  const STAYFREE_REWARD_ID = 'prod-stayfree-secure-xl-40';
  const STAYFREE_THRESHOLD = 1999;
  const isStayfreeInCart = cartItems.some((item) => item.product.id === STAYFREE_REWARD_ID);
  const remainingForStayfree = Math.max(0, STAYFREE_THRESHOLD - subtotalSellingPrice);
  const isStayfreeUnlocked = subtotalSellingPrice >= STAYFREE_THRESHOLD;
  const stayfreeProgress = Math.min(100, Math.round((subtotalSellingPrice / STAYFREE_THRESHOLD) * 100));

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
            {/* Dynamic Bumper Offer Progress Bar (Gamification: ₹999 & ₹1999) */}
            <CartBumperProgressBar currentSubtotal={subtotalSellingPrice} />

            {/* Stayfree XL Special Reward Unlock Logic (@ ₹180 on ₹1999+ orders) */}
            {isStayfreeUnlocked ? (
              <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-rose-700 text-white rounded-2xl p-3.5 shadow-sm space-y-1.5 border border-pink-400/30 animate-in fade-in">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-base flex-shrink-0">
                      🎉
                    </div>
                    <div>
                      <span className="bg-yellow-300 text-stone-950 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                        REWARD UNLOCKED
                      </span>
                      <h4 className="font-heading font-black text-xs sm:text-sm text-white leading-tight mt-0.5">
                        Stayfree Secure XL (40 Pads) @ ₹180!
                      </h4>
                      <p className="text-[10px] text-pink-100 font-medium">
                        MRP ₹270 • Save ₹90 on this exclusive cart deal
                      </p>
                    </div>
                  </div>

                  {!isStayfreeInCart ? (
                    <button
                      type="button"
                      onClick={onAddStayfreeReward}
                      className="flex-shrink-0 px-3 py-1.5 bg-white text-rose-700 hover:bg-pink-50 active:scale-95 rounded-xl text-xs font-heading font-black shadow-xs cursor-pointer transition-all"
                    >
                      + Add @ ₹180
                    </button>
                  ) : (
                    <span className="flex-shrink-0 text-[10px] font-black bg-white/25 border border-white/40 px-2.5 py-1 rounded-lg text-white">
                      ✓ Added @ ₹180
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-pink-50/90 via-rose-50/80 to-pink-50/90 border border-pink-200/90 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs text-rose-950">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-pink-200 text-pink-700 flex items-center justify-center flex-shrink-0 text-xs">
                      🎁
                    </div>
                    <span className="font-medium text-xs leading-tight">
                      Add <strong className="font-bold text-pink-900">₹{remainingForStayfree}</strong> more to unlock <strong className="text-pink-900">Stayfree XL 40s at ₹180!</strong>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-pink-800 whitespace-nowrap ml-2">
                    ₹{subtotalSellingPrice} / ₹{STAYFREE_THRESHOLD}
                  </span>
                </div>

                <div className="w-full bg-pink-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-600 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${stayfreeProgress}%` }}
                  />
                </div>

                <p className="text-[10px] text-pink-800 text-right font-medium">
                  {stayfreeProgress}% to ₹180 Stayfree Deal (MRP ₹270, Save ₹90)
                </p>
              </div>
            )}

            {/* Reverse Cart Total Warning: If Stayfree is in cart but subtotal < 1999 */}
            {!isStayfreeUnlocked && isStayfreeInCart && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs animate-in fade-in">
                <span className="text-base flex-shrink-0">⚠️</span>
                <span className="leading-snug">
                  Cart subtotal is below ₹{STAYFREE_THRESHOLD}. Stayfree XL has reverted to regular price ₹200. Add <strong>₹{remainingForStayfree}</strong> more to get it at <strong>₹180</strong>!
                </span>
              </div>
            )}

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
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">
                          {unit}
                        </span>
                        {item.isRewardItem || (product.id === 'prod-stayfree-secure-xl-40' && isStayfreeUnlocked) ? (
                          <span className="text-[9px] font-black bg-gradient-to-r from-pink-600 to-rose-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                            🌟 ₹180 REWARD ITEM
                          </span>
                        ) : product.id === 'prod-stayfree-secure-xl-40' ? (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                            Regular ₹200 (Unlock @ ₹180 on ₹1999+)
                          </span>
                        ) : null}
                      </div>

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

            {/* Blinkit-Style 'You Might Also Like' Upsell Recommendations */}
            <UpsellCarousel
              cartItems={cartItems}
              onAddToCart={(prod) => {
                if (onAddToCart) {
                  onAddToCart(prod);
                } else {
                  onUpdateQuantity(prod.id, 1);
                }
              }}
              onUpdateQuantity={onUpdateQuantity}
            />



            {/* Bill Details */}
            <div className="bg-white rounded-2xl border border-stone-200/90 p-4 space-y-2.5 shadow-xs">
              <h5 className="font-heading font-bold text-xs text-stone-800 uppercase tracking-wider flex items-center justify-between">
                <span>Bill Summary</span>
                <span className="text-[10px] text-stone-400 font-sans font-normal">Cash on Delivery</span>
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

              <div className="flex justify-between text-xs text-stone-800 font-semibold pt-1 border-t border-stone-100">
                <span>Items Subtotal</span>
                <span className="font-bold">₹{subtotalSellingPrice}</span>
              </div>

              {/* Unlocked Free Gifts itemized at ₹0 with prominent green 'FREE GIFT' badge */}
              {unlockedGifts.length > 0 && (
                <div className="space-y-1.5 py-2 px-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-700" />
                    <span>UNLOCKED FREE REWARDS</span>
                  </div>
                  {unlockedGifts.map((gift) => (
                    <div key={gift.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span>{gift.icon}</span>
                        <span className="font-bold text-emerald-950 truncate">{gift.name}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                          FREE GIFT
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-stone-400 line-through">₹{gift.mrp}</span>
                        <span className="font-black text-emerald-700">₹0</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Delivery Charge: Shows "FREE" ONLY when deliveryCharge === 0 (subtotal >= 499) */}
              <div className="flex justify-between text-xs items-center">
                <div className="flex flex-col">
                  <span className="text-stone-700 font-medium">Delivery Charge</span>
                  {!isFreeDelivery && (
                    <span className="text-[10px] text-amber-700 font-medium">
                      Add ₹{499 - subtotalSellingPrice} more to unlock FREE Delivery 🚚
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {isFreeDelivery ? (
                    <>
                      <span className="text-[11px] text-stone-400 line-through">₹30</span>
                      <span className="text-emerald-700 font-black">FREE</span>
                    </>
                  ) : (
                    <span className="text-stone-900 font-bold">₹{deliveryCharge}</span>
                  )}
                </div>
              </div>

              {/* Strict Mathematical Guarantee: Items Subtotal + Delivery Charge === TOTAL PAYABLE (COD) */}
              <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline font-heading">
                <div>
                  <span className="font-extrabold text-stone-900 text-sm">To Pay</span>
                  <span className="block text-[10px] text-stone-500 font-sans font-normal">
                    Items Subtotal + Delivery Charge
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

        {/* Sticky Bottom Checkout Trigger - Blinkit-style tactile emerald green */}
        {cartItems.length > 0 && (
          <div className="bg-white/95 backdrop-blur-md p-3.5 sm:p-4 border-t border-stone-200 shadow-2xl">
            <button
              id="checkout-btn"
              onClick={onProceedToCheckout}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-heading font-bold text-sm rounded-2xl shadow-lg shadow-emerald-950/15 flex items-center justify-between transition-all cursor-pointer border border-emerald-500/40"
            >
              <div className="flex flex-col items-start leading-tight">
                <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold">
                  {totalCount} {totalCount === 1 ? 'Item' : 'Items'} • {isFreeDelivery ? 'FREE Delivery' : '+₹30 Delivery'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black font-mono">₹{finalPayable}</span>
                  {totalSavings > 0 && (
                    <span className="text-[11px] text-emerald-200 font-sans font-medium">
                      (Saved ₹{totalSavings})
                    </span>
                  )}
                </div>
              </div>
              <span className="flex items-center gap-1.5 font-black text-xs sm:text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl backdrop-blur-xs transition-colors">
                Proceed to Checkout <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
