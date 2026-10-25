import React, { useState, useRef } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Camera,
  UploadCloud,
  Link,
  Image as ImageIcon,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { CustomCategory, Product } from '../types';
import { uploadCategoryImageToSupabase, updateCategoryInSupabase } from '../services/supabaseClient';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface AdminCategoryManagerProps {
  categories: CustomCategory[];
  products: Product[];
  onAddCategory: (category: Omit<CustomCategory, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<CustomCategory>) => void;
  onDeleteCategory: (id: string) => void;
}

const PRESET_ICONS = ['🌾', '🍚', '🫒', '🌶️', '🥛', '🍪', '☕', '🧼', '🪔', '🍼', '🥤', '🍞', '🍫', '🧹', '🍬', '🥜', '🥫', '📦'];

// Suggested authentic 3D packshots for instant 1-click apply in admin
const SUGGESTED_PACKSHOTS: { name: string; url: string; label: string }[] = [
  {
    name: 'Pooja Samagri',
    label: 'Diya & Agarbatti 3D Pack',
    url: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=500&auto=format&fit=crop&q=80',
  },
  {
    name: 'Baby Care',
    label: 'Baby Care Essentials 3D',
    url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cold Drinks & Juices',
    label: 'Refreshing Juices / Drinks',
    url: 'https://images.openfoodfacts.org/images/products/890/103/038/3859/front_en.4.400.jpg',
  },
  {
    name: 'Atta & Flours',
    label: 'Aashirvaad Shuddh Chakki Atta',
    url: 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg',
  },
  {
    name: 'Rice & Dal',
    label: 'Fortune Premium Dal & Rice',
    url: 'https://images.openfoodfacts.org/images/products/890/171/200/1018/front_en.3.400.jpg',
  },
  {
    name: 'Oil & Ghee',
    label: 'Fortune Kachi Ghani Mustard Oil',
    url: 'https://images.openfoodfacts.org/images/products/890/600/728/0014/front_en.3.400.jpg',
  },
  {
    name: 'Snacks & Biscuits',
    label: 'Parle-G & Namkeen Pack',
    url: 'https://images.openfoodfacts.org/images/products/890/106/301/2160/front_en.11.400.jpg',
  },
  {
    name: 'Dairy & Bakery',
    label: 'Amul Butter & Dairy 3D',
    url: 'https://images.openfoodfacts.org/images/products/890/126/201/0058/front_en.4.400.jpg',
  },
  {
    name: 'Household Essentials',
    label: 'Surf Excel & Cleaners',
    url: 'https://images.openfoodfacts.org/images/products/890/103/038/3866/front_en.4.400.jpg',
  },
  {
    name: 'Personal Care',
    label: 'Dettol Soap & Bodywash',
    url: 'https://images.openfoodfacts.org/images/products/871/716/364/1216/front_en.3.400.jpg',
  },
];

// Pastel color cycle matching storefront
const PASTEL_COLORS = [
  'bg-[#f0fdf4]',
  'bg-[#f0f9ff]',
  'bg-[#faf5ff]',
  'bg-[#fff7ed]',
  'bg-[#fefce8]',
];

/**
 * Client-side canvas image compression to keep mobile uploads fast and lightweight (<250KB)
 */
async function compressImageToBlob(file: File, maxDim = 600, quality = 0.88): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ blob: file, dataUrl: e.target?.result as string });
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image file for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed reading file'));
    reader.readAsDataURL(file);
  });
}

export const AdminCategoryManager: React.FC<AdminCategoryManagerProps> = ({
  categories,
  products,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newEnglishName, setNewEnglishName] = useState('');
  const [newHindiName, setNewHindiName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEnglishName, setEditEnglishName] = useState('');
  const [editHindiName, setEditHindiName] = useState('');
  const [editIcon, setEditIcon] = useState('📦');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Category Photo Customization Modal State
  const [photoModalCategory, setPhotoModalCategory] = useState<CustomCategory | null>(null);
  const [photoInputMode, setPhotoInputMode] = useState<'upload' | 'url'>('upload');
  const [photoUrlInput, setPhotoUrlInput] = useState<string>('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoModalError, setPhotoModalError] = useState<string | null>(null);
  const [photoSuccessNotice, setPhotoSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getProductCountForCategory = (categoryName: string) => {
    if (categoryName === 'All') return products.length;
    return products.filter((p) => p.category?.toLowerCase() === categoryName.toLowerCase()).length;
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewEnglishName('');
    setNewHindiName('');
    setNewIcon('📦');
    setNewImageUrl('');
    setAddError(null);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEn = newEnglishName.trim();
    if (!trimmedEn) {
      setAddError('Please enter an English category name');
      return;
    }

    // Check duplicate
    const exists = categories.some((c) => c.name.toLowerCase() === trimmedEn.toLowerCase());
    if (exists) {
      setAddError(`Category "${trimmedEn}" already exists.`);
      return;
    }

    onAddCategory({
      name: trimmedEn,
      hindiName: newHindiName.trim() || undefined,
      icon: newIcon || '📦',
      imageUrl: newImageUrl.trim() || undefined,
      image_url: newImageUrl.trim() || undefined,
      isSystem: false,
    });

    setIsAdding(false);
    setNewEnglishName('');
    setNewHindiName('');
    setNewImageUrl('');
  };

  const handleStartEdit = (cat: CustomCategory) => {
    setEditingId(cat.id);
    setEditEnglishName(cat.name);
    setEditHindiName(cat.hindiName || '');
    setEditIcon(cat.icon || '📦');
  };

  const handleSaveEdit = (id: string) => {
    const trimmedEn = editEnglishName.trim();
    if (!trimmedEn) return;

    onUpdateCategory(id, {
      name: trimmedEn,
      hindiName: editHindiName.trim() || undefined,
      icon: editIcon || '📦',
    });

    setEditingId(null);
  };

  // Open Photo Customization Modal
  const handleOpenPhotoModal = (category: CustomCategory) => {
    setPhotoModalCategory(category);
    const existing = category.imageUrl || category.image_url || '';
    setPhotoUrlInput(existing);
    setPreviewImageUrl(existing);
    setSelectedFile(null);
    setCompressedBlob(null);
    setPhotoModalError(null);
    setPhotoSuccessNotice(null);
    // If existing image is present or user clicked, default to upload tab or url tab
    setPhotoInputMode(existing.startsWith('http') ? 'url' : 'upload');
  };

  // Handle local file selection (Gallery / Camera / Local)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoModalError(null);
    try {
      setSelectedFile(file);
      // Auto compress file
      const { blob, dataUrl } = await compressImageToBlob(file);
      setCompressedBlob(blob);
      setPreviewImageUrl(dataUrl);
    } catch (err: any) {
      setPhotoModalError(err?.message || 'Error loading image file');
    }
  };

  // Handle URL change
  const handleUrlInputChange = (url: string) => {
    setPhotoUrlInput(url);
    setPreviewImageUrl(url.trim());
    setSelectedFile(null);
    setCompressedBlob(null);
    setPhotoModalError(null);
  };

  // Commit & Save Category Photo
  const handleSaveCategoryPhoto = async () => {
    if (!photoModalCategory) return;
    setIsUploadingPhoto(true);
    setPhotoModalError(null);

    try {
      let finalImageUrl = previewImageUrl.trim();

      // Case 1: Uploading a file to Supabase Storage
      if (compressedBlob && selectedFile) {
        const uploadResult = await uploadCategoryImageToSupabase(
          compressedBlob,
          `${photoModalCategory.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${selectedFile.name}`
        );

        if (uploadResult.publicUrl) {
          finalImageUrl = uploadResult.publicUrl;
        } else if (previewImageUrl.startsWith('data:image/')) {
          // Fallback to data URL so image is never lost
          finalImageUrl = previewImageUrl;
        }
      }

      if (!finalImageUrl) {
        setPhotoModalError('Please choose an image file or paste an image URL first.');
        setIsUploadingPhoto(false);
        return;
      }

      // Update custom category state (syncs to LocalStorage & notifies storefront reactive subscribers)
      onUpdateCategory(photoModalCategory.id, {
        imageUrl: finalImageUrl,
        image_url: finalImageUrl,
      });

      // Background safe upsert to Supabase 'categories' table if active
      updateCategoryInSupabase(photoModalCategory.id, {
        name: photoModalCategory.name,
        imageUrl: finalImageUrl,
        image_url: finalImageUrl,
      }).catch((err) => console.warn('Supabase category update notice:', err));

      setPhotoSuccessNotice(`✓ Category "${photoModalCategory.name}" photo updated! Storefront par live render ho gayi hai.`);
      setTimeout(() => {
        setPhotoModalCategory(null);
        setPhotoSuccessNotice(null);
      }, 1200);
    } catch (err: any) {
      console.error('Failed saving category photo:', err);
      setPhotoModalError(err?.message || 'Failed saving category image. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Remove Photo & Reset to Fallback
  const handleRemoveCategoryPhoto = async () => {
    if (!photoModalCategory) return;
    setIsUploadingPhoto(true);
    try {
      onUpdateCategory(photoModalCategory.id, {
        imageUrl: '',
        image_url: '',
      });

      updateCategoryInSupabase(photoModalCategory.id, {
        name: photoModalCategory.name,
        imageUrl: '',
        image_url: '',
      }).catch(console.warn);

      setPhotoSuccessNotice('✓ Category photo removed. Default icon/packshot restored.');
      setTimeout(() => {
        setPhotoModalCategory(null);
        setPhotoSuccessNotice(null);
      }, 1000);
    } catch (err: any) {
      setPhotoModalError('Failed removing image: ' + err.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-xs">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-black text-stone-900 text-lg sm:text-xl leading-tight flex items-center gap-2">
              <span>Dynamic Category Manager</span>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {categories.length} Categories
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Customize 3D packshot photos, aisles & names synced live to Blinkit 4-column storefront.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStartAdd}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-heading font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Category</span>
        </button>
      </div>

      {/* Add New Category Form Drawer / Modal */}
      {isAdding && (
        <form
          onSubmit={handleSubmitAdd}
          className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm animate-zoomIn"
        >
          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
            <div className="flex items-center gap-2 text-emerald-900 font-heading font-extrabold text-sm sm:text-base">
              <Plus className="w-4 h-4 text-emerald-700" />
              <span>Add New Store Category (नई श्रेणी जोड़ें)</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* English Name */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                English Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={newEnglishName}
                onChange={(e) => {
                  setNewEnglishName(e.target.value);
                  if (addError) setAddError(null);
                }}
                placeholder="e.g. Pooja Samagri, Baby Care"
                className="w-full px-3.5 py-2.5 bg-white text-stone-900 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
            </div>

            {/* Hindi Name */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Hindi Name (हिंदी नाम)
              </label>
              <input
                type="text"
                value={newHindiName}
                onChange={(e) => setNewHindiName(e.target.value)}
                placeholder="e.g. पूजा सामग्री, शिशु देखभाल"
                className="w-full px-3.5 py-2.5 bg-white text-stone-900 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
            </div>

            {/* Emoji / Icon Identifier */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                Icon / Emoji
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={4}
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="w-14 text-center text-lg px-2 py-2 bg-white rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30"
                />
                <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
                  {PRESET_ICONS.slice(0, 7).map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewIcon(icon)}
                      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                        newIcon === icon ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white hover:bg-stone-100 border border-stone-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Optional Category Packshot Image Link */}
          <div>
            <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
              Category Photo Link (Optional 3D Packshot Image URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste direct PNG/JPG web link or add later via '📷 Change Photo'"
                className="flex-1 px-3.5 py-2 bg-white text-stone-900 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30"
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Tip: Google Images ya OpenFoodFacts se transparent 3D PNG packshot ka link paste karein.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold rounded-xl border border-stone-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-heading font-bold rounded-xl shadow-xs cursor-pointer"
            >
              Save Category
            </button>
          </div>
        </form>
      )}

      {/* Category List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {categories.map((category, idx) => {
          const isEditing = editingId === category.id;
          const productCount = getProductCountForCategory(category.name);
          const isSystemAll = category.name === 'All';
          const activePhoto = category.imageUrl || category.image_url;
          const pastelBg = PASTEL_COLORS[idx % PASTEL_COLORS.length];

          return (
            <div
              key={category.id}
              className={`bg-white rounded-2xl p-4 border transition-all ${
                isEditing
                  ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                  : 'border-stone-200/90 hover:border-stone-300 shadow-xs'
              }`}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="w-12 text-center text-lg py-1 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white"
                      title="Emoji Icon"
                    />
                    <input
                      type="text"
                      value={editEnglishName}
                      onChange={(e) => setEditEnglishName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-bold text-stone-900 focus:bg-white"
                      placeholder="English name"
                    />
                  </div>

                  <input
                    type="text"
                    value={editHindiName}
                    onChange={(e) => setEditHindiName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-medium text-stone-800 focus:bg-white"
                    placeholder="Hindi name (वैकल्पिक)"
                  />

                  <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => handleOpenPhotoModal(category)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{activePhoto ? 'Change Photo' : '+ Add Photo'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(category.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Category Thumbnail Box */}
                      <div className={`w-14 h-14 rounded-2xl ${pastelBg} border border-stone-200/80 flex items-center justify-center flex-shrink-0 shadow-2xs overflow-hidden p-1 relative group`}>
                        {activePhoto ? (
                          <img
                            src={activePhoto}
                            alt={category.name}
                            className="w-full h-full object-contain drop-shadow-sm group-hover:scale-110 transition-transform"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = getCategoryFallbackSvg(category.name);
                            }}
                          />
                        ) : (
                          <span className="text-2xl">{category.icon || '🏷️'}</span>
                        )}
                        {activePhoto && (
                          <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" title="Custom photo active" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-heading font-bold text-stone-900 text-sm truncate">
                            {category.name}
                          </h4>
                          {category.isSystem && (
                            <span className="text-[9px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                              Core
                            </span>
                          )}
                        </div>
                        {category.hindiName && (
                          <p className="text-xs text-stone-500 truncate font-medium">
                            {category.hindiName}
                          </p>
                        )}
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-1">
                          {productCount} {productCount === 1 ? 'item' : 'items'} in store
                        </span>
                      </div>
                    </div>

                    {!isSystemAll && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(category)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Rename / Edit category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(category.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Direct Change Photo Action Button */}
                  {!isSystemAll && (
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <div className="text-[11px] text-stone-500 font-medium truncate">
                        {activePhoto ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Custom Packshot Active
                          </span>
                        ) : (
                          <span>Default Fallback Icon</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenPhotoModal(category)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                        title="Upload from gallery or paste Google Image URL"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-700" />
                        <span>📷 Change Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= CATEGORY PHOTO UPLOAD / EDIT MODAL ================= */}
      {photoModalCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-stone-900 text-base sm:text-lg leading-tight">
                    Change Category Photo (श्रेणी फोटो)
                  </h3>
                  <p className="text-xs text-stone-600">
                    Category: <span className="font-bold text-emerald-800">{photoModalCategory.name}</span>
                    {photoModalCategory.hindiName ? ` (${photoModalCategory.hindiName})` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPhotoModalCategory(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Success Notification */}
              {photoSuccessNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{photoSuccessNotice}</span>
                </div>
              )}

              {/* Error Alert */}
              {photoModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{photoModalError}</span>
                </div>
              )}

              {/* LIVE BLINKIT CARD PREVIEW BOX */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/90 text-center space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">
                    Live Blinkit Storefront Card Preview
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    Actual Customer View
                  </span>
                </div>

                {/* Replica of the Customer 4-Column Card */}
                <div className="py-2 flex items-center justify-center">
                  <div className="w-28 aspect-[4/5] bg-[#f0fdf4] rounded-2xl p-2.5 flex flex-col items-center justify-between text-center shadow-sm border border-black/[0.06] transition-all hover:scale-105">
                    <div className="w-full flex-1 flex items-center justify-center p-0.5 min-h-0">
                      {previewImageUrl ? (
                        <img
                          src={previewImageUrl}
                          alt={photoModalCategory.name}
                          className="h-14 w-14 object-contain drop-shadow-sm transition-transform"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = getCategoryFallbackSvg(photoModalCategory.name);
                          }}
                        />
                      ) : (
                        <div className="h-14 w-14 flex items-center justify-center text-3xl">
                          {photoModalCategory.icon || '🏷️'}
                        </div>
                      )}
                    </div>
                    <div className="w-full px-0.5 mt-1">
                      <span className="text-[11px] font-semibold text-gray-800 text-center leading-3.5 line-clamp-2 block">
                        {photoModalCategory.name}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500">
                  {previewImageUrl
                    ? '✓ High-quality packshot selected. Save karne par homepage par yahi photo dikhegi.'
                    : 'Kripya niche se local photo upload karein ya direct Google image link paste karein.'}
                </p>
              </div>

              {/* TABS: OPTION A vs OPTION B */}
              <div className="space-y-3">
                <div className="flex items-center p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPhotoInputMode('upload')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      photoInputMode === 'upload'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-600" />
                    <span>Option A: Gallery / File Upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPhotoInputMode('url')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      photoInputMode === 'url'
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Link className="w-4 h-4 text-blue-600" />
                    <span>Option B: Direct Web Link (URL)</span>
                  </button>
                </div>

                {/* TAB 1: FILE UPLOAD */}
                {photoInputMode === 'upload' && (
                  <div className="space-y-3 animate-fadeIn">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 rounded-2xl p-6 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center mx-auto mb-2 shadow-xs group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <h5 className="font-heading font-extrabold text-stone-900 text-sm">
                        Tap to Choose Photo (फ़ोन गैलरी से चुनें)
                      </h5>
                      <p className="text-xs text-stone-500 mt-1">
                        PNG, JPG, WebP supported. File automatically optimized to ultra-fast &lt;200KB.
                      </p>
                      {selectedFile && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-emerald-300 text-xs font-bold text-emerald-800 shadow-2xs">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{selectedFile.name} (Ready to Save)</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: DIRECT IMAGE URL */}
                {photoInputMode === 'url' && (
                  <div className="space-y-3 animate-fadeIn">
                    <div>
                      <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                        Paste Image Web Link (Google Image / CDN URL)
                      </label>
                      <div className="relative">
                        <input
                          type="url"
                          value={photoUrlInput}
                          onChange={(e) => handleUrlInputChange(e.target.value)}
                          placeholder="https://example.com/packshot_atta_3d.png"
                          className="w-full pl-3.5 pr-20 py-2.5 bg-white text-stone-900 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                        />
                        {photoUrlInput && (
                          <button
                            type="button"
                            onClick={() => handleUrlInputChange('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-bold text-stone-400 hover:text-stone-700 bg-stone-100 rounded-md"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Kisi bhi website ya Google search se transparent background wali photo ka direct link paste karein.
                      </p>
                    </div>

                    {/* SUGGESTED PACKSHOT CHIPS */}
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-stone-600 block mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Quick Recommended Packshots (1-Click Apply):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-stone-50 rounded-xl border border-stone-200/80">
                        {SUGGESTED_PACKSHOTS.map((sug) => (
                          <button
                            key={sug.label}
                            type="button"
                            onClick={() => handleUrlInputChange(sug.url)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer border ${
                              photoUrlInput === sug.url
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {sug.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50 flex items-center justify-between gap-3">
              {(photoModalCategory.imageUrl || photoModalCategory.image_url) ? (
                <button
                  type="button"
                  onClick={handleRemoveCategoryPhoto}
                  disabled={isUploadingPhoto}
                  className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Remove Custom Photo
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoModalCategory(null)}
                  disabled={isUploadingPhoto}
                  className="px-4 py-2 bg-white hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl border border-stone-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveCategoryPhoto}
                  disabled={isUploadingPhoto || !previewImageUrl}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-heading font-extrabold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isUploadingPhoto ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Photo...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Update Category Image</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-heading font-extrabold text-stone-900 text-base">
              Delete this category?
            </h4>
            <p className="text-xs text-stone-500">
              Removing this category will not delete its products, but products may need to be recategorized.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
