import React, { useState } from 'react';
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
import { StoreSettings, PromoBanner, CustomCategory } from '../types';
import { compressImageFile } from '../utils/imageUtils';

interface AdminOffersAndSettingsProps {
  storeSettings: StoreSettings;
  banners: PromoBanner[];
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  onSaveBanners: (banners: PromoBanner[]) => Promise<void>;
  categories?: CustomCategory[];
}

const INSTAMART_PRESETS = [
  {
    title: 'Super Saver FMCG Deals',
    subtitle: 'Britannia, Good Day, Dove & Surf Excel at wholesale prices!',
    badge: 'UP TO 25% OFF',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    linkCategory: 'Snacks & Biscuits',
  },
  {
    title: 'Tea Time Combos & Biscuits',
    subtitle: 'Brooke Bond Red Label + Britannia Marie Gold & Bourbon',
    badge: 'DAILY ESSENTIAL',
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
    linkCategory: 'Tea, Coffee & Drinks',
  },
  {
    title: 'Pure Desi Ghee & Chakki Atta',
    subtitle: 'Aashirvaad Shudh Chakki Atta & Fortune Kachi Ghani Oil',
    badge: 'WHOLESALE BAZAAR',
    imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
    linkCategory: 'Atta & Flours',
  },
  {
    title: 'Home Cleaning & Laundry Care',
    subtitle: 'Surf Excel, Rin, Vim Dishwash & Domex Germ Kill',
    badge: 'SUPER VALUE',
    imageUrl: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=1200&q=80',
    linkCategory: 'Household Essentials',
  },
];

export const AdminOffersAndSettings: React.FC<AdminOffersAndSettingsProps> = ({
  storeSettings,
  banners,
  onSaveSettings,
  onSaveBanners,
  categories = [],
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
  const [bannerBadge, setBannerBadge] = useState('SUPER SAVER');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerCategory, setBannerCategory] = useState('All');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

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
    setBannerBadge('SUPER SAVER');
    setBannerImageUrl(INSTAMART_PRESETS[0].imageUrl);
    setBannerCategory('All');
    setBannerIsActive(true);
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

    let updated: PromoBanner[];
    if (editingBannerId) {
      updated = bannerList.map((b) =>
        b.id === editingBannerId
          ? {
              ...b,
              title: bannerTitle.trim(),
              subtitle: bannerSubtitle.trim() || undefined,
              badge: bannerBadge.trim() || undefined,
              imageUrl: bannerImageUrl.trim(),
              linkCategory: bannerCategory,
              isActive: bannerIsActive,
            }
          : b
      );
    } else {
      const newBanner: PromoBanner = {
        id: `banner-${Date.now()}`,
        title: bannerTitle.trim(),
        subtitle: bannerSubtitle.trim() || undefined,
        badge: bannerBadge.trim() || undefined,
        imageUrl: bannerImageUrl.trim(),
        linkCategory: bannerCategory,
        isActive: bannerIsActive,
        createdAt: Date.now(),
      };
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-bold text-stone-900 text-sm truncate">
                        {banner.title}
                      </h4>
                      {banner.linkCategory && banner.linkCategory !== 'All' && (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          {banner.linkCategory}
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

            <form onSubmit={handleSaveModalBanner} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Banner Headline *</label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. Super Saver FMCG Combos"
                  className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-semibold text-stone-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                  required
                />
              </div>

              {/* Subtitle / Discount Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Discount Tag / Badge</label>
                  <input
                    type="text"
                    value={bannerBadge}
                    onChange={(e) => setBannerBadge(e.target.value)}
                    placeholder="e.g. UP TO 25% OFF"
                    className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-900 font-bold focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">Target Category</label>
                  <select
                    value={bannerCategory}
                    onChange={(e) => setBannerCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-900 font-medium focus:bg-white"
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
              </div>

              {/* Subtitle */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">Subtitle / Offer Description</label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="e.g. Britannia, Good Day, Dove & Surf Excel at wholesale prices"
                  className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-sm text-stone-900 focus:bg-white"
                />
              </div>

              {/* Image URL & Phone Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-700">Banner Background Image *</label>
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
                  placeholder="https://... image URL"
                  className="w-full px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs font-mono text-stone-800 focus:bg-white"
                  required
                />

                {isUploading && (
                  <p className="text-xs text-amber-600 animate-pulse font-medium">
                    Compressing image from device...
                  </p>
                )}

                {/* Preview */}
                {bannerImageUrl && (
                  <div className="mt-2 h-28 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 relative">
                    <img
                      src={bannerImageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent p-3 flex flex-col justify-end text-white">
                      {bannerBadge && (
                        <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-1.5 py-0.5 rounded w-fit uppercase">
                          {bannerBadge}
                        </span>
                      )}
                      <p className="font-heading font-extrabold text-sm text-white drop-shadow-xs">
                        {bannerTitle || 'Headline Preview'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
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
