import React, { useState } from 'react';
import { Plus, Minus, Check, ShoppingBag, Sparkles, ChevronDown, X } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface ProductCardProps {
  product: Product;
  quantityInCart?: number;
  cartQuantities?: Record<string, number>;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  onUpdateQuantity: (itemKey: string, newQuantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart = 0,
  cartQuantities,
  onAddToCart,
  onUpdateQuantity,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showPackSizeModal, setShowPackSizeModal] = useState(false);

  // Variant State Management
  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const defaultVariant = hasVariants ? product.variants![0] : null;
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariant ? defaultVariant.id : ''
  );

  const activeVariant = hasVariants
    ? product.variants!.find((v) => v.id === selectedVariantId) || defaultVariant
    : null;

  // Pricing calculations
  const displayPrice = activeVariant ? activeVariant.price : product.finalPrice;
  const displayMrp = activeVariant ? activeVariant.mrp : product.originalPrice;
  const displayUnit = activeVariant ? activeVariant.weight_unit : product.unit;
  const hasDiscount = displayMrp > displayPrice;
  const discountPercent = hasDiscount
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : product.discountPercent;
  const savings = Math.max(0, displayMrp - displayPrice);

  // Unit price calculation (e.g. ₹21.8/100g)
  const unitPrice = React.useMemo(() => {
    const u = (displayUnit || '').toLowerCase();
    if (u.includes('910g')) return `₹${(displayPrice / 9.1).toFixed(1)}/100g`;
    if (u.includes('1.82kg')) return `₹${(displayPrice / 18.2).toFixed(1)}/100g`;
    if (u.includes('4.55kg')) return `₹${(displayPrice / 45.5).toFixed(1)}/100g`;
    if (u.includes('1.74kg')) return `₹${(displayPrice / 17.4).toFixed(1)}/100g`;
    if (u.includes('5 ltr') || u.includes('5l')) return `₹${Math.round(displayPrice / 5)}/L`;
    if (u.includes('2 ltr') || u.includes('2l')) return `₹${Math.round(displayPrice / 2)}/L`;
    if (u.includes('1 ltr') || u.includes('1l')) return `₹${(displayPrice / 10).toFixed(1)}/100ml`;
    if (u.includes('750g')) return `₹${(displayPrice / 7.5).toFixed(1)}/100g`;
    if (u.includes('800g')) return `₹${(displayPrice / 8).toFixed(1)}/100g`;
    if (u.includes('870g')) return `₹${(displayPrice / 8.7).toFixed(1)}/100g`;
    if (u.includes('1.001kg') || u.includes('1kg')) return `₹${(displayPrice / 10).toFixed(1)}/100g`;
    if (u.includes('500g')) return `₹${(displayPrice / 5).toFixed(1)}/100g`;
    if (u.includes('200g')) return `₹${(displayPrice / 2).toFixed(1)}/100g`;
    if (u.includes('100g')) return `₹${displayPrice}/100g`;
    return null;
  }, [displayPrice, displayUnit]);

  // Cart key for this specific variant
  const itemKey = activeVariant ? `${product.id}::${activeVariant.id}` : product.id;
  const activeQtyInCart = cartQuantities
    ? (cartQuantities[itemKey] || 0)
    : quantityInCart;

  // Check if any variant of this product is in cart
  const totalInCartForProduct = cartQuantities
    ? Object.entries(cartQuantities).reduce((acc, [key, qty]) => {
        if (key === product.id || key.startsWith(`${product.id}::`)) {
          return acc + (Number(qty) || 0);
        }
        return acc;
      }, 0)
    : activeQtyInCart;

  const handleAdd = () => {
    setIsAdding(true);
    onAddToCart(product, activeVariant || undefined);
    setTimeout(() => setIsAdding(false), 300);
  };

  return (
    <>
      <div
        id={`product-card-${product.id}`}
        className={`group relative flex flex-col justify-between h-full w-full min-w-0 bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
          totalInCartForProduct > 0
            ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/25'
            : 'border-stone-200 hover:border-stone-300 hover:shadow-md'
        } ${!product.isAvailable ? 'opacity-65' : ''}`}
      >
        {/* Product Image & Badges */}
        <div className="relative w-full aspect-square bg-stone-50/80 overflow-hidden flex items-center justify-center p-2.5 sm:p-3">
          <img
            src={imageError || !product.imageUrl ? getCategoryFallbackSvg(product.category, product.name, product.unit, product.originalPrice || product.finalPrice) : product.imageUrl}
            alt={product.name}
            onError={(e) => {
              setImageError(true);
              const fallback = getCategoryFallbackSvg(product.category, product.name, product.unit, product.originalPrice || product.finalPrice);
              if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                (e.currentTarget as HTMLImageElement).src = fallback;
              }
            }}
            loading="lazy"
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
          />

          {/* Top Badges: Discount Pill + Veg Indicator */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
            {hasDiscount && product.isAvailable ? (
              <div className="bg-blue-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 uppercase tracking-wide">
                <span>{discountPercent}% OFF</span>
              </div>
            ) : <span />}

            {/* Vegetarian Green Dot Indicator (FSSAI) */}
            <div
              className="w-4 h-4 border border-emerald-600 bg-white/95 rounded-[3px] p-[2px] flex items-center justify-center shadow-2xs"
              title="100% Vegetarian"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </div>
          </div>

          {/* Out of stock overlay badge */}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-[1px] flex items-center justify-center z-10">
              <span className="bg-stone-900 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-md">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between min-w-0">
          <div className="min-w-0">
            {/* Bold Product Title */}
            <h4 className="font-heading font-extrabold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2 min-h-[1.75rem] sm:min-h-[2.25rem] break-words group-hover:text-emerald-800 transition-colors">
              {product.name}
            </h4>
            {product.hindiName && (
              <span className="block text-[11px] text-stone-500 font-medium line-clamp-1 mt-0.5">
                {product.hindiName}
              </span>
            )}

            {/* Pack Size Selector Pills (with clean rounded-lg borders & green active selection) */}
            {hasVariants && product.variants && product.variants.length > 1 ? (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {product.variants.map((v) => {
                  const isSelected = activeVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVariantId(v.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#0c831f] text-white border-[#0c831f] shadow-2xs font-black'
                          : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
                      }`}
                      title={`${v.weight_unit} - ₹${v.price}`}
                    >
                      {v.weight_unit}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                  {displayUnit}
                </span>
                {unitPrice && (
                  <span className="text-[10px] text-stone-400 font-medium truncate">
                    ({unitPrice})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Pricing & Green-Bordered "+ ADD" Action Area */}
          <div className="pt-2.5 mt-2 border-t border-stone-100 flex items-end justify-between gap-1.5 min-w-0">
            {/* Price Box */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-heading font-black text-stone-950 text-sm sm:text-base leading-none">
                  ₹{displayPrice}
                </span>
                {hasDiscount && (
                  <span className="text-[10px] sm:text-xs text-stone-400 line-through font-normal leading-none">
                    ₹{displayMrp}
                  </span>
                )}
              </div>
              {hasDiscount && (
                <span className="text-[9px] sm:text-[10px] text-emerald-700 font-extrabold leading-tight mt-0.5 truncate">
                  Save ₹{savings}
                </span>
              )}
            </div>

            {/* Action Button: Green-Bordered "+ ADD" Button Transforming into Interactive Quantity Stepper */}
            <div className="flex-shrink-0">
              {!product.isAvailable ? (
                <span className="px-2 py-1 rounded-md bg-stone-100 text-stone-400 text-[10px] font-medium block">
                  Unavailable
                </span>
              ) : activeQtyInCart === 0 ? (
                <button
                  id={`add-btn-${product.id}-${activeVariant?.id || 'base'}`}
                  onClick={handleAdd}
                  className={`h-7 sm:h-8 px-3 sm:px-3.5 rounded-lg font-heading font-black text-xs sm:text-sm border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer tracking-wider ${
                    isAdding ? 'bg-emerald-50 scale-95' : ''
                  }`}
                  title={`Add ${displayUnit} to Cart`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ADD</span>
                </button>
              ) : (
                /* Interactive Quantity Stepper (- 1 +) */
                <div
                  id={`stepper-${product.id}-${activeVariant?.id || 'base'}`}
                  className="h-7 sm:h-8 flex items-center bg-[#0c831f] text-white rounded-lg shadow-xs overflow-hidden border border-[#0c831f]"
                >
                  <button
                    onClick={() => onUpdateQuantity(itemKey, activeQtyInCart - 1)}
                    className="w-6 sm:w-7 h-full flex items-center justify-center hover:bg-[#096b18] active:bg-[#075313] transition-colors cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                  <span className="w-5 sm:w-6 text-center font-heading font-black text-xs select-none">
                    {activeQtyInCart}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(itemKey, activeQtyInCart + 1)}
                    className="w-6 sm:w-7 h-full flex items-center justify-center hover:bg-[#096b18] active:bg-[#075313] transition-colors cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ondoor Pack Size Modal / Bottom Sheet */}
      {showPackSizeModal && hasVariants && product.variants && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowPackSizeModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#c62828] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-black text-base leading-tight">
                  Select Pack Size
                </h3>
                <p className="text-xs text-red-100 line-clamp-1">{product.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPackSizeModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Variants List */}
            <div className="p-4 max-h-72 overflow-y-auto space-y-2.5">
              {product.variants.map((v) => {
                const isSelected = (activeVariant?.id === v.id);
                const vKey = `${product.id}::${v.id}`;
                const vQty = cartQuantities ? (cartQuantities[vKey] || 0) : 0;
                const vSavings = Math.max(0, v.mrp - v.price);

                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      setSelectedVariantId(v.id);
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#c62828] bg-red-50/50 ring-2 ring-[#c62828]/20 shadow-xs'
                        : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#c62828] bg-[#c62828]' : 'border-stone-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="font-heading font-black text-stone-900 text-sm">
                          {v.weight_unit}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-black text-stone-950">₹{v.price}</span>
                          {v.mrp > v.price && (
                            <span className="text-stone-400 line-through">₹{v.mrp}</span>
                          )}
                          {vSavings > 0 && (
                            <span className="text-[#c62828] font-bold text-[11px]">
                              Save ₹{vSavings}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {vQty === 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVariantId(v.id);
                            onAddToCart(product, v);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#c62828] hover:bg-[#b71c1c] text-white font-heading font-black text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ADD</span>
                        </button>
                      ) : (
                        <div className="flex items-center bg-[#c62828] text-white rounded-xl shadow-xs overflow-hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateQuantity(vKey, vQty - 1);
                            }}
                            className="w-7 h-7 flex items-center justify-center hover:bg-[#b71c1c] cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-heading font-black text-xs">
                            {vQty}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateQuantity(vKey, vQty + 1);
                            }}
                            className="w-7 h-7 flex items-center justify-center hover:bg-[#b71c1c] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-stone-50 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowPackSizeModal(false)}
                className="w-full py-2.5 rounded-xl bg-[#c62828] text-white font-heading font-bold text-xs shadow-xs hover:bg-[#b71c1c] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

