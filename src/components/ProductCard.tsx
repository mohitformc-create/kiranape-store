import React, { useState } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { getCategoryFallbackSvg, getValidImageUrl } from '../utils/productImageUtils';

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

  // Cart key for this specific variant
  const itemKey = activeVariant ? `${product.id}::${activeVariant.id}` : product.id;
  const activeQtyInCart = cartQuantities
    ? cartQuantities[itemKey] || 0
    : quantityInCart;

  // Determine if item is stationery (to suppress food/veg badge)
  const isStationeryItem =
    product.department === 'stationery' ||
    product.category.toLowerCase().includes('stationery') ||
    product.category.toLowerCase().includes('copies') ||
    product.category.toLowerCase().includes('register') ||
    product.category.toLowerCase().includes('pen') ||
    product.category.toLowerCase().includes('craft') ||
    product.category.toLowerCase().includes('office');

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
    setTimeout(() => setIsAdding(false), 200);
  };

  return (
    <>
      <div
        id={`product-card-${product.id}`}
        className={`group relative flex flex-col justify-between h-full w-full min-w-0 bg-white rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden ${
          totalInCartForProduct > 0
            ? 'border-emerald-500 ring-1 ring-emerald-500/20'
            : 'border-stone-100 hover:border-stone-200 hover:shadow-md'
        } ${!product.isAvailable ? 'opacity-65' : ''}`}
      >
        {/* Product Image & Badges */}
        <div className="relative w-full bg-stone-50/60 overflow-hidden flex items-center justify-center pt-2">
          {/* Top-left red discount badge & Top-right FSSAI veg badge */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
            {hasDiscount && product.isAvailable ? (
              <div className="bg-[#e53935] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs tracking-tight">
                {discountPercent}% OFF
              </div>
            ) : (
              <span />
            )}

            {/* Veg Dot Indicator (for grocery/food items) */}
            {!isStationeryItem && (
              <div
                className="w-3.5 h-3.5 border border-emerald-600 bg-white rounded-[3px] p-[2px] flex items-center justify-center shadow-2xs"
                title="100% Vegetarian"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </div>
            )}
          </div>

          {/* Center aligned, aspect-ratio locked product packshot */}
          <div className="w-full h-28 flex items-center justify-center p-2">
            <img
              src={
                imageError
                  ? getCategoryFallbackSvg(
                      product.category,
                      product.name,
                      displayUnit,
                      displayPrice
                    )
                  : getValidImageUrl(
                      product.imageUrl,
                      product.category,
                      product.name,
                      displayUnit,
                      displayPrice
                    )
              }
              alt={product.name}
              onError={(e) => {
                setImageError(true);
                const fallback = getCategoryFallbackSvg(
                  product.category,
                  product.name,
                  displayUnit,
                  displayPrice
                );
                if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                  (e.currentTarget as HTMLImageElement).src = fallback;
                }
              }}
              loading="lazy"
              decoding="async"
              className="object-contain h-28 w-full group-hover:scale-105 transition-transform duration-200"
            />
          </div>

          {/* Out of stock overlay */}
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
            {/* Title: Maximum 2 lines with ellipsis */}
            <h4
              className="line-clamp-2 text-xs font-semibold text-gray-900 leading-snug group-hover:text-emerald-800 transition-colors"
              title={product.name}
            >
              {product.name}
            </h4>

            {/* Optional Hindi subtitle */}
            {product.hindiName && (
              <span className="block text-[11px] text-gray-400 font-medium line-clamp-1 mt-0.5">
                {product.hindiName}
              </span>
            )}

            {/* Unit/Weight: Clean gray text */}
            {hasVariants && product.variants && product.variants.length > 1 ? (
              <div className="mt-1.5 flex items-center gap-1 flex-wrap">
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
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                          : 'bg-white hover:bg-stone-50 text-gray-700 border-gray-200'
                      }`}
                      title={`${v.weight_unit} - ₹${v.price}`}
                    >
                      {v.weight_unit}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-gray-500 font-medium">
                {displayUnit || '1 pack'}
              </p>
            )}
          </div>

          {/* Pricing & Bottom-Right Corner Action Area */}
          <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between gap-1.5 min-w-0">
            {/* Pricing: Selling price bold dark & original price light cut-off gray */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-extrabold text-gray-900 leading-none">
                  ₹{displayPrice}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-gray-400 line-through font-normal leading-none">
                    ₹{displayMrp}
                  </span>
                )}
              </div>
              {hasDiscount && savings > 0 && (
                <span className="text-[10px] text-emerald-700 font-bold leading-none mt-0.5">
                  Save ₹{savings}
                </span>
              )}
            </div>

            {/* Bottom-right corner: Bright yellow circular '+' or [- qty +] pill switcher */}
            <div className="flex-shrink-0">
              {!product.isAvailable ? (
                <span className="px-2 py-1 rounded-md bg-stone-100 text-gray-400 text-[10px] font-medium block">
                  Unavailable
                </span>
              ) : activeQtyInCart === 0 ? (
                <button
                  type="button"
                  id={`add-btn-${product.id}-${activeVariant?.id || 'base'}`}
                  onClick={handleAdd}
                  className={`w-8 h-8 rounded-full bg-[#ffc200] hover:bg-[#ffb300] active:scale-90 text-stone-900 flex items-center justify-center font-black shadow-xs transition-all cursor-pointer ${
                    isAdding ? 'scale-90 bg-amber-400' : ''
                  }`}
                  title={`Add ${product.name} to Cart`}
                  aria-label={`Add ${product.name} to Cart`}
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              ) : (
                /* Elegant [- qty +] pill switcher */
                <div
                  id={`stepper-${product.id}-${activeVariant?.id || 'base'}`}
                  className="h-8 flex items-center bg-[#ffc200] text-stone-950 rounded-full px-1 shadow-xs border border-amber-300"
                >
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(itemKey, activeQtyInCart - 1)}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-amber-400/80 active:scale-90 transition-colors cursor-pointer text-stone-900"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <span className="w-5 text-center font-heading font-black text-xs select-none text-stone-950">
                    {activeQtyInCart}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(itemKey, activeQtyInCart + 1)}
                    className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-amber-400/80 active:scale-90 transition-colors cursor-pointer text-stone-900"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ondoor Pack Size Modal (if needed for variants) */}
      {showPackSizeModal && hasVariants && product.variants && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowPackSizeModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#ffc200] text-stone-900 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-black text-base leading-tight">
                  Select Pack Size
                </h3>
                <p className="text-xs text-stone-700 line-clamp-1">{product.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPackSizeModal(false)}
                className="w-8 h-8 rounded-full bg-stone-900/10 hover:bg-stone-900/20 text-stone-900 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-72 overflow-y-auto space-y-2.5">
              {product.variants.map((v) => {
                const isSelected = activeVariant?.id === v.id;
                const vKey = `${product.id}::${v.id}`;
                const vQty = cartQuantities ? cartQuantities[vKey] || 0 : 0;
                const vSavings = Math.max(0, v.mrp - v.price);

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-xs'
                        : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600'
                            : 'border-stone-300 bg-white'
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
                            <span className="text-emerald-700 font-bold text-[11px]">
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
                          className="w-8 h-8 rounded-full bg-[#ffc200] hover:bg-[#ffb300] active:scale-90 text-stone-900 flex items-center justify-center font-black shadow-xs cursor-pointer"
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </button>
                      ) : (
                        <div className="h-8 flex items-center bg-[#ffc200] text-stone-950 rounded-full px-1 shadow-xs border border-amber-300">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateQuantity(vKey, vQty - 1);
                            }}
                            className="w-6 h-6 flex items-center justify-center hover:bg-amber-400 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                          <span className="w-5 text-center font-heading font-black text-xs">
                            {vQty}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateQuantity(vKey, vQty + 1);
                            }}
                            className="w-6 h-6 flex items-center justify-center hover:bg-amber-400 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 bg-stone-50 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowPackSizeModal(false)}
                className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-heading font-bold text-xs shadow-xs hover:bg-stone-800 transition-colors cursor-pointer"
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
