import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  RefreshCw,
  Plus,
  Minus,
  Box,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  ClipboardPaste,
  FolderOpen,
} from 'lucide-react';
import { Product, ProductVariant } from '../types';
import { getValidImageUrl } from '../utils/productImageUtils';
import { calculateFinalPrice } from '../services/storageService';
import { BlinkitProductPlaceholder } from './BlinkitProductPlaceholder';
import {
  buildGoogleStudioSearchUrl,
  extractClipboardImageOrUrl,
  hasRealDisplayImage,
  hasSupabaseStorageImage,
  savePermanentImageToSupabaseProduct,
  uploadStudioImageToSupabase,
} from '../utils/studioImageUpload';

interface AdminVisualProductCardProps {
  product: Product;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onRequestDelete: (id: string) => void;
  onOpenEditModal: (product: Product) => void;
  deliveryTime?: string;
}

export const AdminVisualProductCard: React.FC<AdminVisualProductCardProps> = ({
  product,
  onUpdateProduct,
  onRequestDelete,
  onOpenEditModal,
  deliveryTime = 'Bharosemand Delivery',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [studioPasteVal, setStudioPasteVal] = useState('');
  const [studioUploadErr, setStudioUploadErr] = useState<string | null>(null);
  const [studioDone, setStudioDone] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [product.imageUrl]);

  const showRealImage = hasRealDisplayImage(product.imageUrl) && !imageError;
  const isPermanentSupabasePhoto = hasSupabaseStorageImage(product.imageUrl);

  // Variant Selection State
  const hasVariants = Boolean(product.variants && product.variants.length > 0);
  const defaultVariant = hasVariants ? product.variants![0] : null;
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    defaultVariant ? defaultVariant.id : ''
  );

  const activeVariant = hasVariants
    ? product.variants!.find((v) => v.id === selectedVariantId) || defaultVariant
    : null;

  // Active pricing calculations
  const displayPrice = activeVariant ? activeVariant.price : product.finalPrice;
  const displayMrp = activeVariant ? activeVariant.mrp : product.originalPrice;
  const displayUnit = activeVariant ? activeVariant.weight_unit : product.unit;
  const hasDiscount = displayMrp > displayPrice;
  const discountPercent = hasDiscount
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : product.discountPercent;
  const savings = Math.max(0, displayMrp - displayPrice);
  const stockCount = product.stock !== undefined ? product.stock : 50;

  // Inline Title (English Name) Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(product.name);

  useEffect(() => {
    setNameValue(product.name);
  }, [product.name]);

  const handleSaveName = () => {
    setIsEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== product.name) {
      onUpdateProduct(product.id, { name: trimmed });
    } else {
      setNameValue(product.name);
    }
  };

  // Inline Hindi Name Editing State
  const [isEditingHindi, setIsEditingHindi] = useState(false);
  const [hindiValue, setHindiValue] = useState(product.hindiName || '');

  useEffect(() => {
    setHindiValue(product.hindiName || '');
  }, [product.hindiName]);

  const handleSaveHindi = () => {
    setIsEditingHindi(false);
    const trimmed = hindiValue.trim();
    if (trimmed !== (product.hindiName || '')) {
      onUpdateProduct(product.id, { hindiName: trimmed });
    }
  };

  // Inline Price Editing State
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(String(displayPrice));

  useEffect(() => {
    setPriceValue(String(displayPrice));
  }, [displayPrice]);

  const handleSavePrice = () => {
    setIsEditingPrice(false);
    const num = Math.max(1, Number(priceValue) || displayPrice);
    if (activeVariant && product.variants) {
      const updatedVariants = product.variants.map((v) =>
        v.id === activeVariant.id ? { ...v, price: num } : v
      );
      onUpdateProduct(product.id, { variants: updatedVariants });
    } else {
      const newDiscount =
        product.originalPrice > num
          ? Math.round(((product.originalPrice - num) / product.originalPrice) * 100)
          : 0;
      onUpdateProduct(product.id, { finalPrice: num, discountPercent: newDiscount });
    }
  };

  // Inline MRP Editing State
  const [isEditingMrp, setIsEditingMrp] = useState(false);
  const [mrpValue, setMrpValue] = useState(String(displayMrp));

  useEffect(() => {
    setMrpValue(String(displayMrp));
  }, [displayMrp]);

  const handleSaveMrp = () => {
    setIsEditingMrp(false);
    const num = Math.max(1, Number(mrpValue) || displayMrp);
    if (activeVariant && product.variants) {
      const updatedVariants = product.variants.map((v) =>
        v.id === activeVariant.id ? { ...v, mrp: num } : v
      );
      onUpdateProduct(product.id, { variants: updatedVariants });
    } else {
      const newFinalPrice = calculateFinalPrice(num, product.discountPercent);
      onUpdateProduct(product.id, { originalPrice: num, finalPrice: newFinalPrice });
    }
  };

  // Inline Unit Editing State
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [unitValue, setUnitValue] = useState(displayUnit);

  useEffect(() => {
    setUnitValue(displayUnit);
  }, [displayUnit]);

  const handleSaveUnit = () => {
    setIsEditingUnit(false);
    const trimmed = unitValue.trim();
    if (!trimmed) return;
    if (activeVariant && product.variants) {
      const updatedVariants = product.variants.map((v) =>
        v.id === activeVariant.id ? { ...v, weight_unit: trimmed } : v
      );
      onUpdateProduct(product.id, { variants: updatedVariants });
    } else {
      onUpdateProduct(product.id, { unit: trimmed });
    }
  };

  const handleStudioSourceUpload = async (source: File | Blob | string) => {
    try {
      setIsUploadingImage(true);
      setStudioUploadErr(null);
      const permanentUrl = await uploadStudioImageToSupabase(source, product.name);
      await savePermanentImageToSupabaseProduct({
        productId: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        price: product.finalPrice,
        originalPrice: product.originalPrice,
        permanentUrl,
      }).catch((err) => {
        console.warn('Supabase products image_url sync warning:', err);
      });
      onUpdateProduct(product.id, { imageUrl: permanentUrl });
      setImageError(false);
      setStudioPasteVal('');
      setStudioDone(true);
    } catch (err: any) {
      console.error('Failed to compress/upload studio image:', err);
      setStudioUploadErr(err?.message || 'फोटो अपलोड नहीं हो सकी।');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await handleStudioSourceUpload(file);
  };

  const handlePasteInStudioBox = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const extracted = extractClipboardImageOrUrl(e.clipboardData);
    if (!extracted) return;
    e.preventDefault();
    if (typeof extracted === 'string') {
      setStudioPasteVal(extracted);
    }
    await handleStudioSourceUpload(extracted);
  };

  const handleStockChange = (delta: number) => {
    const newStock = Math.max(0, stockCount + delta);
    onUpdateProduct(product.id, { stock: newStock });
  };

  return (
    <div
      id={`admin-product-card-${product.id}`}
      className={`group relative flex flex-col justify-between h-full w-full min-w-0 bg-white rounded-xl sm:rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md ${
        product.isAvailable
          ? 'border-emerald-500/60 ring-1 ring-emerald-500/20'
          : 'border-rose-300 bg-rose-50/10'
      }`}
    >
      {/* Top Section: Product Image with 1-Tap Camera Replacement & Badges */}
      <div
        className="relative w-full aspect-square bg-stone-50 overflow-hidden flex items-center justify-center p-2.5 sm:p-3 group/img select-none cursor-pointer"
        title="Tap to change photo from Camera/Gallery"
      >
        {/* Direct Overlay File Input over Card Photo */}
        <input
          id={`visual-card-file-${product.id}`}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          onChange={handleFileChange}
        />

        <div className="w-full h-full flex items-center justify-center pointer-events-none">
          {isUploadingImage ? (
            <div className="absolute inset-0 bg-white/90 z-30 flex flex-col items-center justify-center gap-1.5 text-emerald-700">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-[11px] font-bold">Uploading photo...</span>
            </div>
          ) : showRealImage ? (
            <img
              src={getValidImageUrl(product.imageUrl, product.category, product.name, product.unit, product.finalPrice)}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain mix-blend-multiply group-hover/img:scale-105 transition-transform duration-300"
            />
          ) : (
            <BlinkitProductPlaceholder
              name={product.name}
              category={product.category}
              weight={displayUnit}
            />
          )}
        </div>

        {/* 1-Tap Camera Change Badge Overlay */}
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <span
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-900/85 text-white text-[10px] font-bold shadow-md backdrop-blur-xs"
            title="Tap to upload new photo"
          >
            <Camera className="w-3 h-3 text-amber-300" />
            <span className="hidden sm:inline">Change Photo</span>
          </span>
        </div>

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-emerald-700 text-white text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 z-10 pointer-events-none">
            <Sparkles className="w-2.5 h-2.5 text-emerald-200" />
            <span>{discountPercent}% OFF</span>
          </div>
        )}

        {/* Low Stock Radar Badge */}
        {stockCount <= 5 && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 z-10 animate-pulse border border-rose-300 pointer-events-none">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-200" />
            <span>Low Stock ({stockCount})</span>
          </div>
        )}

        {/* Weight / Pack size tag - tap to inline edit unit if desired */}
        <div className="absolute bottom-2 left-2 z-30">
          {isEditingUnit ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-white p-1 rounded-md shadow-lg border border-amber-500"
            >
              <input
                type="text"
                autoFocus
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveUnit();
                  if (e.key === 'Escape') setIsEditingUnit(false);
                }}
                onBlur={handleSaveUnit}
                className="w-14 text-[11px] font-bold px-1 text-stone-900 focus:outline-none"
              />
              <button
                type="button"
                onMouseDown={handleSaveUnit}
                className="text-emerald-600 hover:text-emerald-700 p-0.5 cursor-pointer"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingUnit(true);
              }}
              className="bg-stone-900/85 hover:bg-stone-900 text-white text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1 cursor-pointer transition-colors"
              title="Click to edit weight/unit"
            >
              <span>{displayUnit}</span>
              <Edit2 className="w-2.5 h-2.5 text-stone-300 opacity-60 hover:opacity-100" />
            </button>
          )}
        </div>

        {/* Delivery micro-indicator */}
        <div className="absolute bottom-2 right-2 bg-emerald-50/90 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-200/80 backdrop-blur-xs flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5 text-emerald-600" />
          <span>{deliveryTime}</span>
        </div>
      </div>

      {/* Middle Section: Editable Names & Variants */}
      <div className="p-2.5 sm:p-3 flex flex-col flex-1 justify-between min-w-0">
        <div className="min-w-0">
          {/* Category Micro label with Quick Full Edit Modal Button */}
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-block truncate">
              {product.category}
            </span>

            <div className="flex items-center gap-1">
              {/* Cart Suggestion (You might also like) Toggle */}
              <button
                type="button"
                onClick={() =>
                  onUpdateProduct(product.id, {
                    isCartRecommended: !product.isCartRecommended,
                    featuredInCart: !product.isCartRecommended,
                  })
                }
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  product.isCartRecommended
                    ? 'text-amber-600 bg-amber-100 ring-1 ring-amber-400'
                    : 'text-stone-300 hover:text-amber-500 hover:bg-stone-100'
                }`}
                title={
                  product.isCartRecommended
                    ? "In Cart 'You Might Also Like' (Click to remove)"
                    : "Add to Cart 'You Might Also Like'"
                }
              >
                <Sparkles
                  className={`w-3 h-3 ${
                    product.isCartRecommended ? 'fill-amber-500 text-amber-600' : ''
                  }`}
                />
              </button>
              {/* Full Edit Modal */}
              <button
                type="button"
                onClick={() => onOpenEditModal(product)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                title="Open detailed editor"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              {/* Delete button */}
              <button
                type="button"
                onClick={() => onRequestDelete(product.id)}
                className="p-1 rounded-md text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Product English Name (1-Tap Inline Editable) */}
          <div className="min-h-[1.75rem] sm:min-h-[2.25rem]">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setNameValue(product.name);
                      setIsEditingName(false);
                    }
                  }}
                  onBlur={handleSaveName}
                  className="w-full text-xs sm:text-sm font-semibold text-stone-900 border border-amber-500 rounded px-1.5 py-0.5 bg-amber-50/50 focus:outline-none focus:bg-white"
                  placeholder="Enter product title..."
                />
                <button
                  type="button"
                  onMouseDown={handleSaveName}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer flex-shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingName(true)}
                className="group/name flex items-start justify-between gap-1 cursor-pointer rounded hover:bg-amber-50/70 p-0.5 -m-0.5 transition-colors"
                title="Click to edit English title"
              >
                <h4 className="font-semibold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2 break-words">
                  {product.name}
                </h4>
                <Edit2 className="w-3 h-3 text-stone-400 opacity-0 group-hover/name:opacity-100 flex-shrink-0 mt-0.5 transition-opacity" />
              </div>
            )}
          </div>

          {/* Hindi Subtitle (1-Tap Inline Editable) */}
          <div className="mt-0.5 min-h-[1.125rem]">
            {isEditingHindi ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  autoFocus
                  value={hindiValue}
                  onChange={(e) => setHindiValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveHindi();
                    if (e.key === 'Escape') {
                      setHindiValue(product.hindiName || '');
                      setIsEditingHindi(false);
                    }
                  }}
                  onBlur={handleSaveHindi}
                  className="w-full text-[11px] text-stone-700 border border-amber-500 rounded px-1.5 py-0.5 bg-amber-50/50 focus:outline-none focus:bg-white"
                  placeholder="हिंदी नाम लिखें..."
                />
                <button
                  type="button"
                  onMouseDown={handleSaveHindi}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer flex-shrink-0"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingHindi(true)}
                className="group/hindi flex items-center justify-between gap-1 cursor-pointer rounded hover:bg-amber-50/70 px-0.5 -mx-0.5 transition-colors"
                title="Click to edit Hindi name"
              >
                <span className="text-[11px] text-stone-500 font-medium line-clamp-1">
                  {product.hindiName || <span className="italic text-stone-400">+ Add Hindi Name</span>}
                </span>
                <Edit2 className="w-2.5 h-2.5 text-stone-400 opacity-0 group-hover/hindi:opacity-100 flex-shrink-0 transition-opacity" />
              </div>
            )}
          </div>
        </div>

        {/* Variant / Weight Selector Chips (Switches Active Variant For Instant Inline Price Editing) */}
        {hasVariants && product.variants!.length > 1 && (
          <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {product.variants!.map((v) => {
              const isSelected = activeVariant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVariantId(v.id);
                  }}
                  className={`px-2 py-1 text-[10px] sm:text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex-shrink-0 flex items-center gap-1 active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-extrabold'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                  title={`Select ${v.weight_unit} (₹${v.price}) to edit its price`}
                >
                  <span>{v.weight_unit}</span>
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-black ${
                      isSelected ? 'bg-amber-400 text-stone-950' : 'bg-stone-200/80 text-stone-700'
                    }`}
                  >
                    ₹{v.price}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Pricing Area: Inline Fast Numeric Editing for Selling Price & MRP */}
        <div
          className={`pt-2 flex items-center justify-between gap-1.5 min-w-0 ${
            hasVariants && product.variants!.length > 1 ? 'mt-1' : 'mt-2 border-t border-stone-100'
          }`}
        >
          {/* Price Box */}
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Selling Price (1-Tap Inline Numeric Edit) */}
              {isEditingPrice ? (
                <div className="flex items-center gap-0.5">
                  <span className="text-emerald-700 font-black text-xs">₹</span>
                  <input
                    type="number"
                    autoFocus
                    value={priceValue}
                    onChange={(e) => setPriceValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePrice();
                      if (e.key === 'Escape') {
                        setPriceValue(String(displayPrice));
                        setIsEditingPrice(false);
                      }
                    }}
                    onBlur={handleSavePrice}
                    className="w-16 text-sm font-black text-emerald-700 border border-emerald-500 rounded px-1 py-0.5 bg-emerald-50/50 focus:outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onMouseDown={handleSavePrice}
                    className="text-emerald-700 hover:text-emerald-800 p-0.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingPrice(true)}
                  className="group/pr flex items-baseline gap-1 hover:bg-emerald-50 rounded px-1 py-0.5 -mx-1 transition-colors cursor-pointer text-left"
                  title="Click to edit selling price"
                >
                  <span className="font-heading font-black text-stone-900 group-hover/pr:text-emerald-700 text-sm sm:text-base leading-none">
                    ₹{displayPrice}
                  </span>
                  <Edit2 className="w-2.5 h-2.5 text-stone-400 opacity-0 group-hover/pr:opacity-100 transition-opacity" />
                </button>
              )}

              {/* MRP (1-Tap Inline Numeric Edit) */}
              {isEditingMrp ? (
                <div className="flex items-center gap-0.5">
                  <span className="text-stone-400 font-bold text-[11px]">₹</span>
                  <input
                    type="number"
                    autoFocus
                    value={mrpValue}
                    onChange={(e) => setMrpValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveMrp();
                      if (e.key === 'Escape') {
                        setMrpValue(String(displayMrp));
                        setIsEditingMrp(false);
                      }
                    }}
                    onBlur={handleSaveMrp}
                    className="w-14 text-xs font-medium text-stone-600 border border-stone-400 rounded px-1 py-0.5 bg-stone-50 focus:outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onMouseDown={handleSaveMrp}
                    className="text-stone-700 hover:text-stone-900 p-0.5 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingMrp(true)}
                  className="group/mrp flex items-baseline gap-0.5 text-[10px] sm:text-xs text-stone-400 line-through hover:text-stone-700 hover:no-underline rounded px-1 py-0.5 transition-colors cursor-pointer"
                  title="Click to edit MRP"
                >
                  <span>₹{displayMrp}</span>
                  <Edit2 className="w-2 h-2 text-stone-400 opacity-0 group-hover/mrp:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {hasDiscount && (
              <span className="text-[9px] sm:text-[10px] text-emerald-700 font-bold leading-tight mt-0.5 truncate">
                Save ₹{savings}
              </span>
            )}
          </div>

          {/* In Stock / Out of Stock 1-Tap Toggle (Prominent Green/Red Switch) */}
          <button
            id={`admin-stock-toggle-${product.id}`}
            type="button"
            onClick={() => onUpdateProduct(product.id, { isAvailable: !product.isAvailable })}
            className={`h-8 px-2.5 rounded-full text-[10px] sm:text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer flex-shrink-0 shadow-sm border ${
              product.isAvailable
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-500/20'
                : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 ring-2 ring-rose-500/20'
            }`}
            title="1-tap toggle In Stock / Out of Stock"
          >
            {/* Visual Switch Track & Knob */}
            <span
              className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                product.isAvailable ? 'bg-emerald-800 justify-end' : 'bg-rose-800 justify-start'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
            </span>
            <span className="whitespace-nowrap font-bold">
              {product.isAvailable ? 'In Stock' : 'Out of Stock'}
            </span>
          </button>
        </div>

        {/* Stock Inventory Stepper Bar at Bottom */}
        <div className="mt-2 pt-1.5 border-t border-dashed border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
          {stockCount <= 5 ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 text-[10px] font-extrabold border border-rose-200 animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
              <span>Low ({stockCount} left)</span>
            </span>
          ) : (
            <span className="font-medium text-[10px]">Stock Count:</span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleStockChange(-5)}
              className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition-colors cursor-pointer text-xs"
              title="Decrease stock by 5"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className="font-bold text-stone-800 min-w-[20px] text-center text-xs">
              {stockCount}
            </span>
            <button
              type="button"
              onClick={() => handleStockChange(5)}
              className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold flex items-center justify-center transition-colors cursor-pointer text-xs"
              title="Increase stock by 5"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Fast Studio Photo Uploader Bar (shown for items without a supabase.co/storage image or newly marked Done) */}
        {(!isPermanentSupabasePhoto || studioDone) && (
          <div className="mt-2 pt-2 border-t border-stone-200 space-y-1.5">
            {studioDone && isPermanentSupabasePhoto ? (
              <div className="flex items-center justify-between text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                <span>✅ Done (Supabase Saved)</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <a
                    href={buildGoogleStudioSearchUrl(product.name, displayUnit)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-h-[30px] inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-bold transition-colors truncate"
                    title="Google पर फ्रेश पैक फोटो खोजें"
                  >
                    <Search className="w-3 h-3 text-amber-700 shrink-0" />
                    <span className="truncate">🔍 फ्रेश पैक फोटो खोजें</span>
                  </a>

                  <div className="relative overflow-hidden rounded-lg cursor-pointer shrink-0">
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      className="min-h-[30px] inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-colors whitespace-nowrap"
                    >
                      <FolderOpen className="w-3 h-3 shrink-0" />
                      <span>📁 गैलरी से चुनें</span>
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingImage}
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      aria-label={`Upload photo for ${product.name}`}
                    />
                  </div>
                </div>

                <div className="relative flex items-center gap-1">
                  <ClipboardPaste className="w-3 h-3 text-stone-400 absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={studioPasteVal}
                    disabled={isUploadingImage}
                    onChange={(e) => setStudioPasteVal(e.target.value)}
                    onPaste={(e) => void handlePasteInStudioBox(e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && studioPasteVal.trim()) {
                        e.preventDefault();
                        void handleStudioSourceUpload(studioPasteVal.trim());
                      }
                    }}
                    placeholder="📋 फोटो / लिंक पेस्ट करें (Ctrl+V)"
                    className="w-full min-h-[30px] pl-6 pr-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                  {studioPasteVal.trim() && !isUploadingImage && (
                    <button
                      type="button"
                      onClick={() => void handleStudioSourceUpload(studioPasteVal.trim())}
                      className="min-h-[30px] px-2 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      सेव
                    </button>
                  )}
                </div>

                {studioUploadErr && (
                  <p className="text-[10px] font-semibold text-rose-700 leading-tight">
                    {studioUploadErr}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
