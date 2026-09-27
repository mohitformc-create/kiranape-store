import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Layers,
  Sparkles,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { CustomCategory, Product } from '../types';

interface AdminCategoryManagerProps {
  categories: CustomCategory[];
  products: Product[];
  onAddCategory: (category: Omit<CustomCategory, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<CustomCategory>) => void;
  onDeleteCategory: (id: string) => void;
}

const PRESET_ICONS = ['🌾', '🍚', '🫒', '🌶️', '🥛', '🍪', '☕', '🧼', '🪔', '🍼', '🥤', '🍞', '🍫', '🧹', '🍬', '🥜', '🥫', '📦'];

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
  const [addError, setAddError] = useState<string | null>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEnglishName, setEditEnglishName] = useState('');
  const [editHindiName, setEditHindiName] = useState('');
  const [editIcon, setEditIcon] = useState('📦');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getProductCountForCategory = (categoryName: string) => {
    if (categoryName === 'All') return products.length;
    return products.filter((p) => p.category?.toLowerCase() === categoryName.toLowerCase()).length;
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewEnglishName('');
    setNewHindiName('');
    setNewIcon('📦');
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
      isSystem: false,
    });

    setIsAdding(false);
    setNewEnglishName('');
    setNewHindiName('');
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
              Manage custom aisles (Pooja Samagri, Baby Care, Cold Drinks) synced live across the storefront.
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
        {categories.map((category) => {
          const isEditing = editingId === category.id;
          const productCount = getProductCountForCategory(category.name);
          const isSystemAll = category.name === 'All';

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

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
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
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-xl flex-shrink-0 shadow-2xs">
                      {category.icon || '🏷️'}
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
              )}
            </div>
          );
        })}
      </div>

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
