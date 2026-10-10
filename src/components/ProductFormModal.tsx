import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Image as ImageIcon,
  Sparkles,
  Tag,
  DollarSign,
  Layers,
  Upload,
  Camera,
  CheckCircle,
  RefreshCw,
  Plus,
  Trash2,
  Box,
  Languages,
  Check,
  Package,
  AlertCircle,
} from 'lucide-react';
import { Product, ProductVariant, CustomCategory } from '../types';
import { CATEGORIES } from '../data/initialProducts';
import { calculateFinalPrice, getCustomCategories, saveCustomCategories } from '../services/storageService';
import { compressImageFile, dataUrlToFile } from '../utils/imageUtils';
import { findBestCdnImage, getCategoryFallbackSvg, getCategoryEmojiDataUrl, getValidImageUrl } from '../utils/productImageUtils';
import { uploadProductImageToSupabase } from '../services/supabaseClient';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    hindiName?: string;
    category: string;
    unit: string;
    originalPrice: number;
    discountPercent: number;
    finalPrice?: number;
    imageUrl: string;
    isAvailable: boolean;
    stock?: number;
    description?: string;
    variants?: ProductVariant[];
  }) => void;
  editingProduct?: Product | null;
  categories?: CustomCategory[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct,
  categories,
}) => {
  const initialCats = categories && categories.length > 0 ? categories : getCustomCategories();
  const [categoryList, setCategoryList] = useState<CustomCategory[]>(initialCats);
  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [category, setCategory] = useState<string>('Atta & Flours');
  const [unit, setUnit] = useState('1 kg');
  const [originalPrice, setOriginalPrice] = useState<number | string>('100');
  const [sellingPriceInput, setSellingPriceInput] = useState<number | string>('90');
  const [discountPercent, setDiscountPercent] = useState<number | string>('10');
  const [stock, setStock] = useState<number | string>('50');
  const [imageUrl, setImageUrl] = useState('');
  const [directImageUrlInput, setDirectImageUrlInput] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState<string | null>(null);
  const [cdnMatchNotice, setCdnMatchNotice] = useState<string | null>(null);

  // Custom Category Inline Creation State
  const [showCustomCatForm, setShowCustomCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatHindi, setNewCatHindi] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Bi-directional price calculations
  const handleOriginalPriceChange = (val: string) => {
    setOriginalPrice(val);
    const numOrig = Number(val) || 0;
    const numDisc = Number(discountPercent) || 0;
    if (numOrig > 0) {
      const calc = calculateFinalPrice(numOrig, numDisc);
      setSellingPriceInput(calc.toString());
    }
  };

  const handleSellingPriceChange = (val: string) => {
    setSellingPriceInput(val);
    const numSell = Number(val) || 0;
    const numOrig = Number(originalPrice) || 0;
    if (numOrig > 0 && numSell >= 0) {
      if (numSell <= numOrig) {
        const computedDisc = Math.round(((numOrig - numSell) / numOrig) * 100);
        setDiscountPercent(computedDisc.toString());
      } else {
        setDiscountPercent('0');
      }
    }
  };

  const handleDiscountPercentChange = (val: string) => {
    setDiscountPercent(val);
    const numDisc = Number(val) || 0;
    const numOrig = Number(originalPrice) || 0;
    if (numOrig > 0) {
      const calc = calculateFinalPrice(numOrig, numDisc);
      setSellingPriceInput(calc.toString());
    }
  };

  const handleSaveCustomCategory = () => {
    if (!newCatName.trim()) return;
    const trimmed = newCatName.trim();
    const newCategoryObj: CustomCategory = {
      id: 'cat-custom-' + Date.now(),
      name: trimmed,
      hindiName: newCatHindi.trim() || undefined,
      icon: newCatIcon || '📦',
      order: categoryList.length + 1,
    };

    const updated = [...categoryList, newCategoryObj];
    setCategoryList(updated);
    saveCustomCategories(updated);
    setCategory(trimmed);
    setNewCatName('');
    setNewCatHindi('');
    setShowCustomCatForm(false);
  };

  const handleApplyDirectImageUrl = () => {
    if (!directImageUrlInput.trim()) return;
    setImageUrl(directImageUrlInput.trim());
    setDirectImageUrlInput('');
    if (errors.imageUrl) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.imageUrl;
        return next;
      });
    }
  };

  // Variant Management (Weight / Pack Size, MRP, Selling Price, Stock)
  const handleAddVariant = (weight_unit = '1kg', price = 100, mrp = 120, stockCount = 50) => {
    const newVariant: ProductVariant = {
      id: 'var-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      weight_unit,
      price,
      mrp,
      stock: stockCount,
    };
    setVariants((prev) => [...prev, newVariant]);
  };

  const handleUpdateVariant = (id: string, field: keyof ProductVariant, val: any) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  const handleRemoveVariant = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
  };

  const applyPresetVariants = (presetType: 'harpic' | 'atta' | 'rice') => {
    if (presetType === 'harpic') {
      setVariants([
        { id: 'var-500ml', weight_unit: '500ml', price: 105, mrp: 115, stock: 45 },
        { id: 'var-1l', weight_unit: '1L', price: 183, mrp: 195, stock: 30 },
      ]);
      setUnit('500ml');
      setOriginalPrice('115');
      setDiscountPercent('9');
    } else if (presetType === 'atta') {
      setVariants([
        { id: 'var-1kg', weight_unit: '1kg', price: 48, mrp: 55, stock: 50 },
        { id: 'var-5kg', weight_unit: '5kg', price: 215, mrp: 260, stock: 30 },
      ]);
      setUnit('1kg');
      setOriginalPrice('55');
      setDiscountPercent('13');
    } else if (presetType === 'rice') {
      setVariants([
        { id: 'var-1kg', weight_unit: '1kg', price: 45, mrp: 55, stock: 60 },
        { id: 'var-5kg', weight_unit: '5kg', price: 210, mrp: 250, stock: 35 },
        { id: 'var-10kg', weight_unit: '10kg', price: 415, mrp: 490, stock: 25 },
      ]);
      setUnit('1kg');
      setOriginalPrice('55');
      setDiscountPercent('18');
    }
  };

  // Layer 1: Auto Match Brand Image from FMCG CDN Database
  const handleAutoCdnMatch = () => {
    const match = findBestCdnImage(name, category);
    if (match) {
      setImageUrl(match.imageUrl);
      if (match.matchedItem?.hindiName && !hindiName) {
        setHindiName(match.matchedItem.hindiName);
      }
      setCdnMatchNotice(`Matched high-res photo for: ${match.matchedItem?.name || name}`);
      setTimeout(() => setCdnMatchNotice(null), 3500);
      if (errors.imageUrl) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.imageUrl;
          return next;
        });
      }
    } else {
      setCdnMatchNotice('No direct brand match found. You can upload photo or use category artwork.');
      setTimeout(() => setCdnMatchNotice(null), 3500);
    }
  };

  // Layer 2: Device Camera or Gallery Photo Upload (Compressed < 300KB -> Supabase Storage)
  const handleDeviceImageUpload = async (file: File) => {
    if (!file) return;
    setImageUploadError(null);
    setUploadSuccessNotice(null);
    setIsProcessingImage(true);

    try {
      // 1. Client-side compression using HTML5 canvas (target under 300KB)
      const dataUrl = await compressImageFile(file, 800, 800, 0.75);
      
      // 2. Convert compressed dataUrl to optimized JPEG File object
      const cleanBase = (name || file.name || 'product')
        .replace(/\.[^/.]+$/, '')
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${Date.now()}_${cleanBase || 'item'}.jpg`;
      const compressedFile = dataUrlToFile(dataUrl, fileName);

      // 3. Upload COMPRESSED file directly to Supabase Storage ('product-images' bucket)
      const uploadRes = await uploadProductImageToSupabase(compressedFile, fileName);
      const finalUrl = uploadRes.publicUrl || dataUrl;

      setImageUrl(finalUrl);
      const kbSize = (compressedFile.size / 1024).toFixed(0);
      setUploadSuccessNotice(`✓ फ़ोटो Supabase Storage में अपलोड हो गई (${kbSize} KB)`);
      setTimeout(() => setUploadSuccessNotice(null), 4000);

      if (errors.imageUrl) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.imageUrl;
          return next;
        });
      }
    } catch (err: any) {
      console.warn('Image processing/upload error:', err);
      setImageUploadError(err?.message || 'फ़ोटो प्रोसेस या अपलोड नहीं हो सकी। कृपया दोबारा प्रयास करें।');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Layer 3: Use Category Fallback Graphic
  const handleApplyCategoryFallback = () => {
    const svgUrl = getCategoryFallbackSvg(category, name || category);
    setImageUrl(svgUrl);
    if (errors.imageUrl) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.imageUrl;
        return next;
      });
    }
  };

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setHindiName(editingProduct.hindiName || '');
      setCategory(editingProduct.category);
      setUnit(editingProduct.unit);
      const orig = editingProduct.originalPrice;
      const disc = editingProduct.discountPercent;
      const final = editingProduct.finalPrice ?? calculateFinalPrice(orig, disc);
      setOriginalPrice(orig);
      setDiscountPercent(disc);
      setSellingPriceInput(final);
      setStock(editingProduct.stock !== undefined ? editingProduct.stock : 50);
      setImageUrl(editingProduct.imageUrl);
      setIsAvailable(editingProduct.isAvailable);
      setDescription(editingProduct.description || '');
      setVariants(editingProduct.variants ? [...editingProduct.variants] : []);
    } else {
      // Defaults for new item
      setName('');
      setHindiName('');
      setCategory('Atta & Flours');
      setUnit('1 kg');
      setOriginalPrice('100');
      setDiscountPercent('10');
      setSellingPriceInput('90');
      setStock('50');
      setImageUrl(getCategoryFallbackSvg('Atta & Flours', 'Atta & Flours'));
      setIsAvailable(true);
      setDescription('');
      setVariants([]);
    }
    setErrors({});
    setImageUploadError(null);
    setCdnMatchNotice(null);
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const numOriginal = Number(originalPrice) || 0;
  const numDiscount = Number(discountPercent) || 0;
  const calculatedSellingPrice = Number(sellingPriceInput) > 0 ? Number(sellingPriceInput) : calculateFinalPrice(numOriginal, numDiscount);
  const customerSavings = Math.max(0, numOriginal - calculatedSellingPrice);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Item name is required';
    if (!unit.trim()) errs.unit = 'Unit / Pack size is required (e.g. 1 kg, 500 ml)';
    if (numOriginal <= 0) errs.originalPrice = 'Original price (MRP) must be greater than 0';
    if (numDiscount < 0 || numDiscount > 90) errs.discountPercent = 'Discount must be between 0% and 90%';
    if (!imageUrl.trim()) errs.imageUrl = 'Product image is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Filter valid variants if any
    const validVariants = variants
      .filter((v) => v.weight_unit && v.weight_unit.trim())
      .map((v) => ({
        id: v.id || ('var-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)),
        weight_unit: v.weight_unit.trim(),
        price: Number(v.price) || calculatedSellingPrice,
        mrp: Number(v.mrp) || numOriginal,
        stock: v.stock !== undefined ? Number(v.stock) : 50,
      }));

    const isStationery =
      category === 'Copies & Registers' ||
      category === 'Pens, Pencils & Geometry' ||
      category === 'Art, Craft & Fevicol' ||
      category === 'Office & Daily Stationery' ||
      category.toLowerCase().includes('stationery');

    onSave({
      name: name.trim(),
      hindiName: hindiName.trim() || undefined,
      category,
      department: isStationery ? 'stationery' : (editingProduct?.department || 'grocery'),
      unit: unit.trim(),
      originalPrice: numOriginal,
      discountPercent: numDiscount,
      finalPrice: calculatedSellingPrice,
      imageUrl: imageUrl.trim(),
      isAvailable,
      stock: Number(stock) || 50,
      description: description.trim(),
      variants: validVariants.length > 0 ? validVariants : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-4 animate-fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-zoom-in">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg leading-tight">
                {editingProduct ? 'Edit Grocery Item' : '+ Add New Grocery Item (मैन्युअल जोड़ें)'}
              </h3>
              <p className="text-xs text-stone-300">
                Kiranape Express • 100% Manual Store Catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {/* Item Name (English & Hindi) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Product Title (English) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aashirvaad Shudh Chakki Atta"
                  className={`w-full px-3.5 py-2.5 bg-stone-50 text-stone-900 rounded-xl border text-sm transition-all ${
                    errors.name
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-stone-200 focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600'
                  }`}
                />
                {name.length > 2 && (
                  <button
                    type="button"
                    onClick={handleAutoCdnMatch}
                    className="absolute right-2 top-2 px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Search FMCG CDN photo match for this brand"
                  >
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>Auto-Match</span>
                  </button>
                )}
              </div>
              {errors.name && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-emerald-700" />
                  Bilingual Hindi Name (वैकल्पिक हिंदी नाम)
                </span>
                <span className="text-[10px] text-stone-400 font-normal">Customer Friendly</span>
              </label>
              <input
                type="text"
                value={hindiName}
                onChange={(e) => setHindiName(e.target.value)}
                placeholder="उदा. आशीर्वाद शुद्ध चक्की आटा / टाटा नमक"
                className="w-full px-3.5 py-2.5 bg-stone-50 text-stone-900 rounded-xl border border-stone-200 text-sm focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
              />
            </div>
          </div>

          {/* Category & Unit & Stock */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                    Category <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomCatForm(!showCustomCatForm)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showCustomCatForm ? 'Hide' : '+ Custom Cat'}</span>
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowCustomCatForm(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-stone-50 text-stone-900 rounded-xl border border-stone-200 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                >
                  {categoryList
                    .filter((c) => c.name !== 'All')
                    .map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.icon ? `${cat.icon} ` : ''}{cat.name}{cat.hindiName ? ` (${cat.hindiName})` : ''}
                      </option>
                    ))}
                  <option value="__add_new__" className="font-bold text-emerald-700">
                    ➕ + Add / Type Custom Category...
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                  Base Pack Size <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. 1 kg / 500ml / 1 Pc"
                  className="w-full px-3 py-2.5 bg-stone-50 text-stone-900 rounded-xl border border-stone-200 text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                />
                {errors.unit && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.unit}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                  In-Stock Qty
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="50"
                  className="w-full px-3 py-2.5 bg-stone-50 text-stone-900 rounded-xl border border-stone-200 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                />
              </div>
            </div>

            {/* Quick Pack Size Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-stone-400 font-bold uppercase">Quick Sizes:</span>
              {['500g', '1 kg', '2 kg', '5 kg', '1 ltr', '2 ltr', '5 ltr', '1 Pc', 'Pack of 2'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setUnit(sz)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                    unit === sz
                      ? 'bg-stone-900 text-white font-bold'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>

            {/* Inline Custom Category Creator */}
            {showCustomCatForm && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-emerald-900 block">
                  + Create New Category for Storefront
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Category Name (e.g. Frozen, Pooja)"
                    className="px-2.5 py-1.5 bg-white text-stone-900 rounded-lg border border-emerald-300 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    type="text"
                    value={newCatHindi}
                    onChange={(e) => setNewCatHindi(e.target.value)}
                    placeholder="Hindi Name (उदा. फ्रोजन सामान)"
                    className="px-2.5 py-1.5 bg-white text-stone-900 rounded-lg border border-emerald-300 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      placeholder="Emoji (e.g. 🧊)"
                      className="w-16 px-2 py-1.5 bg-white text-center rounded-lg border border-emerald-300 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomCategory}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Save Cat
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & Margin Calculations (MRP + Selling Price + Discount) */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3">
            <h5 className="font-heading font-bold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-amber-700" />
              Base Pack Pricing & Margin (MRP vs Selling Price)
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Original MRP (₹) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={originalPrice}
                    onChange={(e) => handleOriginalPriceChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border border-stone-200 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                  />
                </div>
                {errors.originalPrice && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.originalPrice}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  Kirana Selling Price (₹) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-600 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={sellingPriceInput}
                    onChange={(e) => handleSellingPriceChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border border-emerald-300 text-sm font-extrabold text-emerald-900 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Discount Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => handleDiscountPercentChange(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-white rounded-xl border border-stone-200 text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                  />
                  <span className="absolute right-3 top-2.5 text-stone-400 font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Live Selling Price Preview */}
            <div className="bg-white rounded-xl p-3 border border-amber-200/90 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-500 block">Customer Pays:</span>
                <span className="font-heading font-extrabold text-xl text-emerald-800">
                  ₹{calculatedSellingPrice}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-stone-500 block">Customer Savings:</span>
                <span className="text-xs font-bold text-emerald-600">
                  {customerSavings > 0 ? `₹${customerSavings} (${numDiscount}% OFF)` : 'Selling at MRP'}
                </span>
              </div>
            </div>
          </div>

          {/* Weight Variants (e.g. 500g, 1kg, 5kg) with custom MRP, Selling Price, and Stock */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Weight / Size Variants (500g, 1kg, 5kg)
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Configure custom MRP, Selling Price, and Stock for each pack size
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleAddVariant(unit || '1kg', calculatedSellingPrice, numOriginal, 50)}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Variant</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-stone-400 font-bold uppercase">Quick Presets:</span>
              <button
                type="button"
                onClick={() => applyPresetVariants('harpic')}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Harpic (500ml & 1L)
              </button>
              <button
                type="button"
                onClick={() => applyPresetVariants('atta')}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Atta (1kg & 5kg)
              </button>
              <button
                type="button"
                onClick={() => applyPresetVariants('rice')}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200 hover:border-emerald-300 text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Rice (1kg, 5kg & 10kg)
              </button>
            </div>

            {/* Variant Rows */}
            {variants.length > 0 ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-stone-500 uppercase px-1">
                  <div className="col-span-3">Weight / Unit</div>
                  <div className="col-span-3">Selling (₹)</div>
                  <div className="col-span-3">MRP (₹)</div>
                  <div className="col-span-2">Stock</div>
                  <div className="col-span-1 text-right">✕</div>
                </div>

                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-stone-200 shadow-2xs"
                  >
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={v.weight_unit}
                        onChange={(e) => handleUpdateVariant(v.id, 'weight_unit', e.target.value)}
                        placeholder="e.g. 500ml"
                        className="w-full px-2 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 focus:bg-white focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={v.price}
                        onChange={(e) => handleUpdateVariant(v.id, 'price', Number(e.target.value))}
                        placeholder="Price"
                        className="w-full px-2 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-emerald-800 focus:bg-white focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={v.mrp}
                        onChange={(e) => handleUpdateVariant(v.id, 'mrp', Number(e.target.value))}
                        placeholder="MRP"
                        className="w-full px-2 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-medium text-stone-600 focus:bg-white focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0"
                        value={v.stock !== undefined ? v.stock : 50}
                        onChange={(e) => handleUpdateVariant(v.id, 'stock', Number(e.target.value))}
                        placeholder="Qty"
                        className="w-full px-1.5 py-1.5 bg-stone-50 rounded-lg border border-stone-200 text-xs font-bold text-stone-900 text-center focus:bg-white focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete variant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-stone-400 italic bg-white/60 p-2 rounded-lg text-center border border-dashed border-stone-200">
                Single size item. Tap "+ Add Variant" to add 500g, 1kg, 5kg options with individual stock.
              </p>
            )}
          </div>

          {/* High-Fidelity Photo Upload & Supabase Storage Integration */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-700" />
                  Product Photo Upload (गैलरी / कैमरा फ़ोटो)
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Auto-compressed under 300KB &amp; saved to Supabase Storage ('product-images' bucket)
                </p>
              </div>
              {uploadSuccessNotice && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                  <Check className="w-3 h-3 text-emerald-600" />
                  {uploadSuccessNotice}
                </span>
              )}
            </div>

            {/* Hidden File Inputs for Gallery and Camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/*"
              onChange={(e) => e.target.files?.[0] && handleDeviceImageUpload(e.target.files[0])}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleDeviceImageUpload(e.target.files[0])}
              className="hidden"
            />

            {/* Visual 1:1 Preview and Multi-Action Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* 1:1 Preview Box */}
              <div
                onClick={() => {
                  if (!imageUrl || imageUrl.includes('data:image/svg')) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 overflow-hidden flex items-center justify-center flex-shrink-0 transition-all ${
                  imageUrl
                    ? 'border-emerald-500 bg-white shadow-xs'
                    : 'border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer bg-white'
                }`}
                title="Click to select image file"
              >
                {isProcessingImage ? (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mb-1" />
                    <span className="text-[10px] font-bold text-emerald-800">
                      कंप्रेस व अपलोड हो रहा है...
                    </span>
                  </div>
                ) : imageUrl ? (
                  <>
                    <img
                      src={getValidImageUrl(imageUrl, category, name)}
                      alt={name || 'Product'}
                      onError={(e) => {
                        const fallback = getCategoryEmojiDataUrl(category, name);
                        if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                          (e.currentTarget as HTMLImageElement).src = fallback;
                        }
                      }}
                      className="w-full h-full object-contain p-2 mix-blend-multiply"
                    />
                    {/* Remove photo button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl('');
                        setUploadSuccessNotice(null);
                        setImageUploadError(null);
                      }}
                      className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
                      title="✕ हटाएं (Remove Photo)"
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center group-hover:scale-105 transition-transform">
                    <span className="text-2xl mb-1">🖼️</span>
                    <span className="text-[11px] font-heading font-black text-stone-800 leading-tight">
                      फ़ोटो जोड़ें
                    </span>
                    <span className="text-[9px] text-stone-500 font-medium">
                      (गैलरी/कैमरा)
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Action Triggers */}
              <div className="flex-1 w-full space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingImage}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-heading font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>🖼️</span>
                    <span>गैलरी से फ़ोटो चुनें (Gallery File)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessingImage}
                    className="py-2 px-3 rounded-xl bg-white hover:bg-stone-100 active:scale-95 text-stone-800 border border-stone-300 font-heading font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>कैमरा (Camera)</span>
                  </button>
                </div>

                {/* Direct Image URL input */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="url"
                    value={directImageUrlInput}
                    onChange={(e) => setDirectImageUrlInput(e.target.value)}
                    placeholder="या Direct Image Web Link paste करें (https://...)"
                    className="flex-1 px-3 py-1.5 bg-white text-stone-900 rounded-xl border border-stone-200 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyDirectImageUrl}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    Apply Link
                  </button>
                </div>

                {/* Secondary Option: Auto CDN match or Illustrated Graphic */}
                <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAutoCdnMatch}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>FMCG Brand Auto-Match</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCategoryFallback}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Use Category Graphic</span>
                  </button>
                </div>
              </div>
            </div>

            {cdnMatchNotice && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>{cdnMatchNotice}</span>
              </div>
            )}

            {imageUploadError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{imageUploadError}</span>
              </div>
            )}
          </div>

          {/* In Stock status toggle */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-800 block">
                Instant Availability Status
              </span>
              <span className="text-[11px] text-stone-500 block">
                Switch whether this item is currently available for customers to order
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                isAvailable
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                  : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
              }`}
            >
              {isAvailable ? '● In Stock' : '✕ Out of Stock'}
            </button>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="bg-stone-50 px-5 sm:px-6 py-3.5 border-t border-stone-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-heading font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{editingProduct ? 'Update Product' : 'Save & Add Grocery Item'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
