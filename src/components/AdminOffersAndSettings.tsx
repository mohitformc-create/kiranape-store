import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Tag,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  CheckCircle,
  Truck,
  IndianRupee,
  Save,
  Upload,
  Camera,
  Layers,
  Store,
  Phone,
  MapPin,
  Clock,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StoreSettings, PromoBanner, CustomCategory, Product, BannerTargetType } from '../types';
import { compressImageFile } from '../utils/imageUtils';

interface AdminOffersAndSettingsProps {
  storeSettings: StoreSettings;
  banners: PromoBanner[];
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  onSaveBanners: (banners: PromoBanner[]) => Promise<void>;
  categories?: CustomCategory[];
  products?: Product[];
}

export const GRADIENT_PRESETS = [
  { label: 'Pink Rose', value: 'from-pink-600 via-rose-600 to-rose-700', bg: 'bg-gradient-to-r from-pink-600 to-rose-700' },
  { label: 'Amber Orange', value: 'from-amber-500 via-orange-500 to-orange-600', bg: 'bg-gradient-to-r from-amber-500 to-orange-600' },
  { label: 'Emerald Teal', value: 'from-emerald-600 via-teal-600 to-teal-700', bg: 'bg-gradient-to-r from-emerald-600 to-teal-700' },
  { label: 'Royal Blue', value: 'from-blue-600 via-indigo-600 to-indigo-700', bg: 'bg-gradient-to-r from-blue-600 to-indigo-700' },
  { label: 'Purple Violet', value: 'from-purple-600 via-violet-600 to-fuchsia-700', bg: 'bg-gradient-to-r from-purple-600 to-violet-700' },
  { label: 'Dark Slate', value: 'from-stone-800 via-stone-900 to-black', bg: 'bg-gradient-to-r from-stone-800 to-black' },
];

export const BADGE_SUGGESTIONS = [
  'EXCLUSIVE DEAL',
  'CRAZY BISCUIT OFFER',
  '🌟 EXCLUSIVE CART REWARD',
  '⚡ FAST & FREE DELIVERY',
  'SUPER SAVER',
  'DAILY ESSENTIAL',
  'FLAT 50% OFF',
  'BESTSELLER',
];

const INSTAMART_PRESETS = [
  {
    title: 'Super Saver FMCG Deals',
    subtitle: 'Britannia, Good Day, Dove & Surf Excel at wholesale prices!',
    badge: 'UP TO 25% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    linkCategory: 'Snacks & Biscuits',
    gradient: 'from-emerald-600 via-teal-600 to-teal-700',
  },
  {
    title: 'Tea Time Combos & Biscuits',
    subtitle: 'Brooke Bond Red Label + Britannia Marie Gold & Bourbon',
    badge: 'DAILY ESSENTIAL',
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
    linkCategory: 'Tea, Coffee & Drinks',
    gradient: 'from-amber-500 via-orange-500 to-orange-600',
  },
  {
    title: 'Pure Desi Ghee & Chakki Atta',
    subtitle: 'Aashirvaad Shudh Chakki Atta & Fortune Kachi Ghani Oil',
    badge: 'WHOLESALE BAZAAR',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
    linkCategory: 'Atta & Flours',
    gradient: 'from-blue-600 via-indigo-600 to-indigo-700',
  },
  {
    title: 'Home Cleaning & Laundry Care',
    subtitle: 'Surf Excel, Rin, Vim Dishwash & Domex Germ Kill',
    badge: 'SUPER VALUE',
    imageUrl: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=1200&q=80',
    linkCategory: 'Household Essentials',
    gradient: 'from-purple-600 via-violet-600 to-fuchsia-700',
  },
];

export const AdminOffersAndSettings: React.FC<AdminOffersAndSettingsProps> = ({
  storeSettings,
  banners,
  onSaveSettings,
  onSaveBanners,
  categories = [],
  products = [],
}) => {
  // Global Store Settings Form State
  const [deliveryTagline, setDeliveryTagline] = useState(
    storeSettings.deliveryTagline || 'Shuddh Samaan, Bharosemand Delivery - Waidhan Store'
  );
  const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState<number>(
    storeSettings.minOrderForFreeDelivery ?? 199
  );
  const [deliveryCharge, setDeliveryCharge] = useState<number>(
    storeSettings.deliveryCharge ?? 25
  );
  const [storeName, setStoreName] = useState(storeSettings.name || 'Chaurasia Kirana Store');
  const [phone, setPhone] = useState(storeSettings.phone || '9424316081');
  const [whatsapp, setWhatsapp] = useState(storeSettings.whatsapp || '9424316081');
  const [address, setAddress] = useState(
    storeSettings.address || 'Shop No. 4, Main Market, Near Shiv Mandir, Ward No. 12, Waidhan'
  );

  const [isSavingRules, setIsSavingRules] = useState(false);
  const [rulesSuccessMsg, setRulesSuccessMsg] = useState<string | null>(null);

  // Banner State
  const [bannerList, setBannerList] = useState<PromoBanner[]>(banners || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerBadge, setBannerBadge] = useState('EXCLUSIVE DEAL');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerCategory, setBannerCategory] = useState('All');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerGradient, setBannerGradient] = useState<string>('from-pink-600 via-rose-600 to-rose-700');
  const [bannerButtonText, setBannerButtonText] = useState<string>('Claim Deal ➔');
  const [bannerTargetType, setBannerTargetType] = useState<BannerTargetType>('category');
  const [bannerProductId, setBannerProductId] = useState<string>('');
  const [bannerShowDirectAdd, setBannerShowDirectAdd] = useState<boolean>(false);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Searchable products for banner deep-linking
  const searchedProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products.slice(0, 100);
    const q = productSearchQuery.toLowerCase().trim();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .slice(0, 80);
  }, [products, productSearchQuery]);

  // Sync when prop changes
  React.useEffect(() => {
    setBannerList(banners || []);
  }, [banners]);

  React.useEffect(() => {
    setDeliveryTagline(storeSettings.deliveryTagline || 'Shuddh Samaan, Bharosemand Delivery - Waidhan Store');
    setMinOrderForFreeDelivery(storeSettings.minOrderForFreeDelivery ?? 199);
    setDeliveryCharge(storeSettings.deliveryCharge ?? 25);
    setStoreName(storeSettings.name || 'Chaurasia Kirana Store');
    setPhone(storeSettings.phone || '9424316081');
    setWhatsapp(storeSettings.whatsapp || '9424316081');
    setAddress(storeSettings.address || 'Shop No. 4, Main Market, Near Shiv Mandir, Ward No. 12, Waidhan');
  }, [storeSettings]);

  // Handle Save Global Rules
  const handleSaveStoreRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingRules(true);
    setRulesSuccessMsg(null);
    try {
      await onSaveSettings({
        deliveryTagline,
        minOrderForFreeDelivery: Number(minOrderForFreeDelivery) || 199,
        deliveryCharge: Number(deliveryCharge) || 25,
        name: storeName,
        phone,
        whatsapp,
        address,
      });
      setRulesSuccessMsg('Store rules & delivery settings saved permanently to kiranape_store_settings!');
      setTimeout(() => setRulesSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save store rules:', err);
    } finally {
      setIsSavingRules(false);
    }
  };

  // Toggle Banner Active Status
  const handleToggleActive = async (bannerId: string) => {
    const updated = bannerList.map((b) =>
      b.id === bannerId ? { ...b, isActive: !b.isActive } : b
    );
    setBannerList(updated);
    await onSaveBanners(updated);
    setBannerNotice('Banner visibility updated.');
    setTimeout(() => setBannerNotice(null), 2500);
  };

  // Move Banner Up / Down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= bannerList.length) return;

    const copy = [...bannerList];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setBannerList(copy);
    await onSaveBanners(copy);
    setBannerNotice('Banners reordered successfully.');
    setTimeout(() => setBannerNotice(null), 2500);
  };

  // Delete Banner
  const handleDeleteBanner = async (bannerId: string) => {
    const updated = bannerList.filter((b) => b.id !== bannerId);
    setBannerList(updated);
    await onSaveBanners(updated);
    setBannerNotice('Banner removed.');
    setTimeout(() => setBannerNotice(null), 2500);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingBannerId(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerBadge('EXCLUSIVE DEAL');
    setBannerImageUrl(INSTAMART_PRESETS[0].imageUrl);
    setBannerCategory('All');
    setBannerIsActive(true);
    setBannerGradient('from-pink-600 via-rose-600 to-rose-700');
    setBannerButtonText('Claim Deal ➔');
    setBannerTargetType('category');
    setBannerProductId('');
    setBannerShowDirectAdd(false);
    setProductSearchQuery('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (banner: PromoBanner) => {
    setEditingBannerId(banner.id);
    setBannerTitle(banner.title);
    setBannerSubtitle(banner.subtitle || '');
    setBannerBadge(banner.badge || 'SPECIAL OFFER');
    setBannerImageUrl(banner.imageUrl);
    setBannerCategory(banner.linkCategory || 'All');
    setBannerIsActive(banner.isActive);
    setBannerGradient(banner.gradient || 'from-pink-600 via-rose-600 to-rose-700');
    setBannerButtonText(banner.buttonText || 'Claim Deal ➔');
    
    // Infer or use targetType
    let inferredTarget: BannerTargetType = banner.targetType || 'category';
    if (!banner.targetType) {
      if (banner.productId) inferredTarget = 'product';
      else if (banner.actionType === 'parchi') inferredTarget = 'parchi';
      else if (banner.actionType === 'whatsapp') inferredTarget = 'whatsapp';
      else inferredTarget = 'category';
    }
    setBannerTargetType(inferredTarget);
    setBannerProductId(banner.productId || '');
    setBannerShowDirectAdd(banner.showDirectAdd ?? false);
    setProductSearchQuery('');
    setIsModalOpen(true);
  };

  // Handle Photo Upload with Compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImageFile(file, 1200, 600, 0.85);
      setBannerImageUrl(compressed);
    } catch (err) {
      console.error('Failed to compress banner image:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Save Banner Modal
  const handleSaveModalBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerImageUrl.trim()) return;

    const bannerPayload: Partial<PromoBanner> = {
      title: bannerTitle.trim(),
      subtitle: bannerSubtitle.trim() || undefined,
      badge: bannerBadge.trim() || undefined,
      imageUrl: bannerImageUrl.trim(),
      linkCategory: bannerTargetType === 'category' ? bannerCategory : undefined,
      isActive: bannerIsActive,
      gradient: bannerGradient,
      buttonText: bannerButtonText.trim() || 'Claim Deal ➔',
      targetType: bannerTargetType,
      productId: bannerTargetType === 'product' ? bannerProductId : undefined,
      showDirectAdd: bannerTargetType === 'product' ? bannerShowDirectAdd : false,
      actionType:
        bannerTargetType === 'product'
          ? (bannerProductId === 'prod-stayfree-secure-xl-40' ? 'stayfree_deal' : 'product')
          : bannerTargetType === 'parchi'
          ? 'parchi'
          : bannerTargetType === 'whatsapp'
          ? 'whatsapp'
          : 'category',
    };

    let updated: PromoBanner[];
    if (editingBannerId) {
      updated = bannerList.map((b) =>
        b.id === editingBannerId
          ? ({
              ...b,
              ...bannerPayload,
            } as PromoBanner)
          : b
      );
    } else {
      const newBanner: PromoBanner = {
        id: `banner-${Date.now()}`,
        isActive: bannerIsActive,
        createdAt: Date.now(),
        order: bannerList.length + 1,
        ...bannerPayload,
      } as PromoBanner;
      updated = [newBanner, ...bannerList];
    }

    setBannerList(updated);
    await onSaveBanners(updated);
    setIsModalOpen(false);
    setBannerNotice(editingBannerId ? 'Banner updated successfully!' : 'New banner added!');
    setTimeout(() => setBannerNotice(null), 3000);
  };

  // Load Preset Offers
  const handleLoadPresets = async () => {
    const existingTitles = new Set(bannerList.map((b) => b.title.toLowerCase().trim()));
    const toAdd: PromoBanner[] = INSTAMART_PRESETS.filter(
      (p) => !existingTitles.has(p.title.toLowerCase().trim())
    ).map((p, idx) => ({
      id: `banner-preset-${Date.now()}-${idx}`,
      title: p.title,
      subtitle: p.subtitle,
      badge: p.badge,
      imageUrl: p.imageUrl,
      linkCategory: p.linkCategory,
      isActive: true,
      createdAt: Date.now() + idx,
    }));

    if (toAdd.length === 0) {
      setBannerNotice('All preset banners are already loaded.');
      setTimeout(() => setBannerNotice(null), 2500);
      return;
    }

    const merged = [...bannerList, ...toAdd];
    setBannerList(merged);
    await onSaveBanners(merged);
    setBannerNotice(`Loaded ${toAdd.length} curated Instamart offer banners!`);
    setTimeout(() => setBannerNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {bannerNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* SECTION 1: GLOBAL STORE RULES & DELIVERY (MERCHANT EDITABLE) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-stone-900 text-base sm:text-lg">
                Global Store Rules & Express Delivery
              </h3>
              <p className="text-xs text-stone-500">
                Configure delivery thresholds, store tagline, and customer hotline saved in <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono font-bold">kiranape_store_settings</code>
              </p>
            </div>
          </div>
        </div>

        {rulesSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{rulesSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveStoreRules} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Delivery Tagline */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <span>⚡ Store Header Tagline</span>
                <span className="text-[10px] text-stone-400 font-normal">(Shown in header badge)</span>
              </label>
              <input
                type="text"
                value={deliveryTagline}
                onChange={(e) => setDeliveryTagline(e.target.value)}
                placeholder="Shuddh Samaan, Bharosemand Delivery - Waidhan Store"
                className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                required
              />
            </div>

            {/* Free Delivery Threshold */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                <span>Free Delivery Threshold (₹)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={minOrderForFreeDelivery}
                  onChange={(e) => setMinOrderForFreeDelivery(Math.max(0, Number(e.target.value)))}
                  placeholder="199"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                  required
                />
              </div>
              <p className="text-[10px] text-stone-400">
                Cart total above this gets FREE delivery. Below this charges ₹{deliveryCharge}.
              </p>
            </div>

            {/* Standard Delivery Charge */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
                <span>Delivery Charge for Small Orders (₹)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value)))}
                  placeholder="25"
                  className="w-full pl-8 pr-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                  required
                />
              </div>
            </div>

            {/* WhatsApp Hotline */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Hotline (10 Digits)</span>
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9424316081"
                className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-mono font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                required
              />
            </div>

            {/* Store Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-stone-600" />
                <span>Store Name</span>
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Chaurasia Kirana Store"
                className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-bold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                required
              />
            </div>

            {/* Store Address */}
            <div className="sm:col-span-2 lg:col-span-3 space-y-1">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span>Store Physical Address</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop No. 4, Main Market, Near Shiv Mandir, Ward No. 12, Waidhan"
                className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition-all"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingRules}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-heading font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingRules ? 'Saving Rules...' : 'Save Global Store Rules'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: DYNAMIC PROMO BANNERS & OFFERS MANAGER */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-extrabold text-stone-900 text-base sm:text-lg">
                  Dynamic Storefront Hero Carousel & Offers
                </h3>
                <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {bannerList.filter((b) => b.isActive).length} Active
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Promo cards displayed in the customer hero slider. Add custom offers or link to any category.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleLoadPresets}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-heading font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Load standard curated grocery offer cards"
            >
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              <span>Load Instamart Presets</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-heading font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Add New Banner</span>
            </button>
          </div>
        </div>

        {/* Banners List */}
        {bannerList.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300">
            <Sparkles className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-700">No promo banners configured yet</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              Add custom offer banners or click &quot;Load Instamart Presets&quot; to inject curated cards.
            </p>
            <button
              type="button"
              onClick={handleLoadPresets}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Load Curated Offer Banners
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bannerList.map((banner, index) => (
              <div
                key={banner.id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  banner.isActive
                    ? 'bg-white border-stone-200 shadow-2xs hover:border-stone-300'
                    : 'bg-stone-50/80 border-stone-200/60 opacity-60'
                }`}
              >
                {/* Banner Preview & Meta */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-20 sm:w-28 h-14 rounded-lg overflow-hidden bg-stone-100 border border-stone-200 flex-shrink-0 relative">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    {banner.badge && (
                      <span className="absolute top-1 left-1 bg-amber-400 text-stone-950 font-black text-[9px] px-1 py-0.2 rounded shadow-2xs uppercase">
                        {banner.badge}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-heading font-bold text-stone-900 text-sm truncate">
                        {banner.title}
                      </h4>
                      {/* Destination Type Badge */}
                      {banner.targetType === 'product' || banner.productId ? (
                        <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                          🎯 Product Deal
                        </span>
                      ) : banner.targetType === 'parchi' || banner.actionType === 'parchi' ? (
                        <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                          📝 Parchi Modal
                        </span>
                      ) : banner.targetType === 'whatsapp' || banner.actionType === 'whatsapp' ? (
                        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          💬 WhatsApp Support
                        </span>
                      ) : banner.linkCategory && banner.linkCategory !== 'All' ? (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          📂 {banner.linkCategory}
                        </span>
                      ) : null}

                      {/* Direct "+ ADD" indicator */}
                      {banner.showDirectAdd && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                          🛒 Direct "+ ADD"
                        </span>
                      )}
                    </div>
                    {banner.subtitle && (
                      <p className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                        {banner.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          banner.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {banner.isActive ? '● Live on Storefront' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls: Active Switch, Move Up/Down, Edit, Delete */}
                <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-shrink-0">
                  {/* Active / Inactive Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(banner.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      banner.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                    title={banner.isActive ? 'Deactivate banner' : 'Activate banner'}
                  >
                    {banner.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{banner.isActive ? 'Active' : 'Inactive'}</span>
                  </button>

                  {/* Reorder Up */}
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-stone-600 transition-colors cursor-pointer"
                    title="Move banner up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Reorder Down */}
                  <button
                    type="button"
                    disabled={index === bannerList.length - 1}
                    onClick={() => handleMove(index, 'down')}
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-stone-600 transition-colors cursor-pointer"
                    title="Move banner down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(banner)}
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-800 transition-colors cursor-pointer"
                    title="Edit banner details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteBanner(banner.id)}
                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Delete banner"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT BANNER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h4 className="font-heading font-extrabold text-stone-900 text-base">
                  {editingBannerId ? 'Edit Promo Banner' : '+ Add New Storefront Banner'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalBanner} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Banner Headline *</label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. Stayfree Secure XL (40 Pads) @ ₹180 Only!"
                  className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                  required
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Subtitle / Offer Description</label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="e.g. MRP ₹270 pack just at ₹180 on orders above ₹1999!"
                  className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-900 focus:bg-white"
                />
              </div>

              {/* Badge / Tag with Quick Select Suggestions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Discount Tag / Badge</label>
                <input
                  type="text"
                  value={bannerBadge}
                  onChange={(e) => setBannerBadge(e.target.value)}
                  placeholder="e.g. EXCLUSIVE DEAL"
                  className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-900 font-bold focus:bg-white"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-stone-400 font-medium">Quick Suggestions:</span>
                  {BADGE_SUGGESTIONS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setBannerBadge(tag)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                        bannerBadge === tag
                          ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-2xs'
                          : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Gradient Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700">Background Gradient Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GRADIENT_PRESETS.map((preset) => {
                    const isSelected = bannerGradient === preset.value;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setBannerGradient(preset.value)}
                        className={`p-2 rounded-xl border flex items-center gap-2 text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/30'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg ${preset.bg} flex-shrink-0 shadow-2xs`} />
                        <span className="text-xs font-bold text-stone-800 line-clamp-1">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Link Destination Type */}
              <div className="space-y-2 pt-1 border-t border-stone-100">
                <label className="text-xs font-bold text-stone-800">
                  Link Destination Type (Click Action) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'product', label: 'Specific Product', icon: '🎯' },
                    { id: 'category', label: 'Category', icon: '📂' },
                    { id: 'parchi', label: 'Parchi Modal', icon: '📝' },
                    { id: 'whatsapp', label: 'WhatsApp Help', icon: '💬' },
                  ].map((dst) => (
                    <button
                      key={dst.id}
                      type="button"
                      onClick={() => {
                        const target = dst.id as BannerTargetType;
                        setBannerTargetType(target);
                        if (target === 'product') {
                          setBannerShowDirectAdd(true);
                          setBannerButtonText('+ ADD');
                        } else if (target === 'parchi') {
                          setBannerButtonText('Upload / Type Parchi ➔');
                        } else if (target === 'whatsapp') {
                          setBannerButtonText('Chat on WhatsApp ➔');
                        } else {
                          setBannerShowDirectAdd(false);
                          setBannerButtonText('Claim Deal ➔');
                        }
                      }}
                      className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center text-center gap-1 transition-all cursor-pointer ${
                        bannerTargetType === dst.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <span className="text-base">{dst.icon}</span>
                      <span>{dst.label}</span>
                    </button>
                  ))}
                </div>

                {/* Sub-Panel: When Destination is 'product' */}
                {bannerTargetType === 'product' && (
                  <div className="space-y-2.5 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200/80 mt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <span>🎯 Select Store Product *</span>
                      </label>
                      <span className="text-[10px] text-indigo-700 font-bold bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                        {products.length} products loaded
                      </span>
                    </div>

                    {/* Search box to quickly find product */}
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder="Search product by name to pick..."
                      className="w-full px-3 py-1.5 bg-white rounded-lg border border-indigo-200 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    {/* Product Select Dropdown */}
                    <select
                      value={bannerProductId}
                      onChange={(e) => {
                        const pId = e.target.value;
                        setBannerProductId(pId);
                        const chosen = products.find((p) => p.id === pId);
                        if (chosen) {
                          if (!bannerTitle || bannerTitle === 'Headline Preview') {
                            setBannerTitle(chosen.name);
                          }
                          if (!bannerImageUrl || bannerImageUrl.includes('unsplash')) {
                            setBannerImageUrl(chosen.imageUrl);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-indigo-300 text-xs text-stone-900 font-semibold focus:outline-none"
                      required={bannerTargetType === 'product'}
                    >
                      <option value="">-- Click to choose product --</option>
                      {searchedProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit}) - ₹{p.finalPrice} [MRP ₹{p.originalPrice}]
                        </option>
                      ))}
                    </select>

                    {/* Toggle: Direct Add-to-Cart Button on Banner */}
                    <div className="pt-2 border-t border-indigo-200/70">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={bannerShowDirectAdd}
                          onChange={(e) => setBannerShowDirectAdd(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-indigo-950">
                          [✓] Show Direct &quot;+ ADD&quot; to Cart Button on Banner
                        </span>
                      </label>
                      <p className="text-[11px] text-indigo-800 ml-6 mt-0.5 leading-snug">
                        Customers can directly add this product to cart and adjust quantity (+ / -) right from the homepage banner without opening anything else!
                      </p>
                    </div>
                  </div>
                )}

                {/* Sub-Panel: When Destination is 'category' */}
                {bannerTargetType === 'category' && (
                  <div className="space-y-1 bg-stone-50 p-3 rounded-xl border border-stone-200">
                    <label className="text-xs font-bold text-stone-700">Target Category to Open</label>
                    <select
                      value={bannerCategory}
                      onChange={(e) => setBannerCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl border border-stone-200 text-xs text-stone-900 font-medium focus:bg-white"
                    >
                      <option value="All">All Categories (Storewide)</option>
                      {categories
                        .filter((c) => c.name !== 'All')
                        .map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name} {cat.hindiName ? `(${cat.hindiName})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Sub-Panel: When Destination is 'parchi' */}
                {bannerTargetType === 'parchi' && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <span className="text-base">📝</span>
                    <span>Tapping this banner triggers the handwritten / digital grocery list notepad sheet directly.</span>
                  </div>
                )}

                {/* Sub-Panel: When Destination is 'whatsapp' */}
                {bannerTargetType === 'whatsapp' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <span>Tapping this banner opens WhatsApp chat with Kiranape store assistance on 9424316081.</span>
                  </div>
                )}
              </div>

              {/* Button Text */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Banner Action Button Text</label>
                <input
                  type="text"
                  value={bannerButtonText}
                  onChange={(e) => setBannerButtonText(e.target.value)}
                  placeholder="e.g. Claim Deal ➔ or + ADD"
                  className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-900 font-bold focus:bg-white"
                />
              </div>

              {/* Image URL & Phone Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700">Banner Packshot / Graphic Image *</label>
                  <label className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload from Phone</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <input
                  type="url"
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="https://... image URL or packshot"
                  className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono text-stone-800 focus:bg-white"
                  required
                />

                {isUploading && (
                  <p className="text-xs text-amber-600 animate-pulse font-medium">
                    Compressing image from device...
                  </p>
                )}

                {/* Live Card Preview */}
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Live Storefront Card Preview
                  </label>
                  <div
                    className={`rounded-2xl bg-gradient-to-br ${bannerGradient} p-4 text-white shadow-md relative overflow-hidden flex items-center justify-between gap-3`}
                  >
                    <div className="flex-1 min-w-0 pr-2 z-10">
                      {bannerBadge && (
                        <span className="inline-block bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
                          {bannerBadge}
                        </span>
                      )}
                      <h4 className="font-heading font-black text-sm text-white line-clamp-1 drop-shadow-xs">
                        {bannerTitle || 'Headline Preview'}
                      </h4>
                      {bannerSubtitle && (
                        <p className="text-[11px] text-white/90 line-clamp-1 mt-0.5">
                          {bannerSubtitle}
                        </p>
                      )}
                      <div className="pt-2">
                        {bannerShowDirectAdd ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-stone-950 text-xs font-heading font-black shadow-xs">
                            <span>🛒 + ADD</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white text-stone-900 text-xs font-heading font-extrabold shadow-xs">
                            <span>{bannerButtonText || 'Claim Deal ➔'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/20 flex-shrink-0">
                      <img
                        src={bannerImageUrl || INSTAMART_PRESETS[0].imageUrl}
                        alt="Preview"
                        className="w-full h-full object-contain drop-shadow-md rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                <input
                  type="checkbox"
                  id="modal-banner-active"
                  checked={bannerIsActive}
                  onChange={(e) => setBannerIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="modal-banner-active" className="text-xs font-bold text-stone-700 cursor-pointer">
                  Activate banner on storefront immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-heading font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  {editingBannerId ? 'Update Banner' : 'Save & Publish Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
