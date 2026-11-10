import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, Check, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Product } from '../types';
import { updateProductDirectlyInFirestore } from '../services/firebase';
import { compressImageFile } from '../utils/imageUtils';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface ProductQuickEditModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated?: (updated: Product) => void;
}

const UNIT_PRESETS = [
  '100g',
  '200g',
  '250g',
  '500g',
  '1 kg',
  '2 kg',
  '5 kg',
  '10 kg',
  '250ml',
  '500ml',
  '1 Litre',
  '2 Litre',
  '5 Litre',
  '1 Pc',
  'Pack of 2',
  'Pack of 4',
  'Combo Pack',
];

export const ProductQuickEditModal: React.FC<ProductQuickEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onProductUpdated,
}) => {
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [stockCount, setStockCount] = useState<number>(50);
  const [unit, setUnit] = useState<string>('1 pc');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (product) {
      setSellingPrice(Number(product.finalPrice) || Number(product.originalPrice) || 0);
      setMrp(Number(product.originalPrice) || Number(product.finalPrice) || 0);
      setIsAvailable(product.isAvailable !== false);
      setStockCount(Number(product.stockCount ?? product.stock ?? 50));
      setUnit(product.unit || '1 pc');
      setImageUrl(product.imageUrl || '');
      setErrorNotice(null);
      setSuccessNotice(null);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const discountPercent = mrp > sellingPrice && mrp > 0
    ? Math.round(((mrp - sellingPrice) / mrp) * 100)
    : 0;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 400, 400, 0.82);
      setImageUrl(compressedDataUrl);
      setErrorNotice(null);
    } catch (err: any) {
      console.warn('Image compress warning:', err);
      setErrorNotice('Could not compress photo. Please paste an image URL instead.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sellingPrice < 0 || mrp < 0) {
      setErrorNotice('Price cannot be negative.');
      return;
    }
    if (sellingPrice > mrp && mrp > 0) {
      setErrorNotice('Warning: Selling price cannot exceed the printed MRP.');
      return;
    }

    setIsSaving(true);
    setErrorNotice(null);

    try {
      const updated = await updateProductDirectlyInFirestore(product.id, {
        finalPrice: Number(sellingPrice),
        originalPrice: Number(mrp),
        discountPercent,
        isAvailable,
        stockCount: Number(stockCount),
        stock: Number(stockCount),
        unit: unit.trim(),
        imageUrl: imageUrl.trim(),
        updatedAt: Date.now(),
      });

      if (onProductUpdated) {
        onProductUpdated(updated);
      }

      setSuccessNotice('Product updated successfully in store!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error updating product:', err);
      setErrorNotice(err?.message || 'Failed to save product to Firestore');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-stone-950/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-stone-900 to-stone-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-black text-xs shadow-xs">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-sm tracking-tight text-white">
                  Quick Controller
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                  Admin Live
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate max-w-[240px]">
                {product.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorNotice && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Product Identification Strip */}
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <div className="w-14 h-14 rounded-xl bg-white border border-stone-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
              <img
                src={imageUrl || getCategoryFallbackSvg(product.category, product.name)}
                alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getCategoryFallbackSvg(product.category, product.name);
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-heading font-extrabold text-xs text-stone-900 truncate">
                {product.name}
              </h4>
              {product.hindiName && (
                <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
                  {product.hindiName}
                </p>
              )}
              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-200/80 text-stone-700">
                {product.category}
              </span>
            </div>
          </div>

          {/* 1. SELLING PRICE & MRP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Selling Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-700 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-2 text-base font-heading font-black text-emerald-700 bg-emerald-50/50 border border-emerald-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Printed MRP (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={mrp}
                  onChange={(e) => setMrp(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-2 text-sm font-bold text-stone-700 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-stone-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {discountPercent > 0 && (
            <div className="text-[11px] font-bold text-emerald-800 bg-emerald-100/60 border border-emerald-200/80 px-2.5 py-1 rounded-lg flex items-center justify-between">
              <span>Customer Discount:</span>
              <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                {discountPercent}% OFF (Bachat: ₹{Math.max(0, mrp - sellingPrice)})
              </span>
            </div>
          )}

          {/* 2. STOCK STATUS & QUANTITY */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-stone-900">
                  Stock Availability
                </span>
                <span className="text-[10px] text-stone-500">
                  {isAvailable ? 'Customers can order immediately' : 'Marked Out of Stock'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailable(!isAvailable)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isAvailable
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                {isAvailable ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>In Stock</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Out of Stock</span>
                  </>
                )}
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <label className="font-bold text-stone-700">Inventory Units Count</label>
                <div className="flex items-center gap-1">
                  {[10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStockCount(num)}
                      className="px-1.5 py-0.5 text-[10px] font-bold bg-white border border-stone-300 hover:border-emerald-600 rounded-md text-stone-700"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min={0}
                value={stockCount}
                onChange={(e) => setStockCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-xl font-bold text-stone-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 3. UNIT LABEL */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <label className="font-bold text-stone-700 uppercase">
                Unit / Pack Size *
              </label>
              <span className="text-[10px] text-stone-400">e.g. 1 kg, 500g, 1 Pc</span>
            </div>
            <input
              type="text"
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. 1 kg, 500g, 1 Litre"
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1 mt-1.5 max-h-16 overflow-y-auto">
              {UNIT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setUnit(p)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors ${
                    unit === p
                      ? 'bg-emerald-700 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* 4. IMAGE URL & DEVICE UPLOAD */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <label className="font-bold text-stone-700 uppercase">
                Image Source (URL or Gallery)
              </label>
              <span className="text-[10px] text-stone-400">Supabase CDN or Web</span>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://sggpbjmxzooxwnwfodxp.supabase.co/..."
                className="w-full px-3 py-2 text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:bg-white focus:border-emerald-600 focus:outline-hidden truncate"
              />

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="flex-1 py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-stone-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isCompressing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      <span>Optimizing Photo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-stone-600" />
                      <span>Choose from Phone Gallery</span>
                    </>
                  )}
                </button>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="py-1.5 px-2.5 text-stone-500 hover:text-rose-600 text-[11px] font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isCompressing}
              className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-heading font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving to Firestore...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save to Store Catalog</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
