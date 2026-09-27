import React, { useState } from 'react';
import {
  Store,
  Phone,
  MapPin,
  Truck,
  IndianRupee,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Sparkles,
  Eye,
  EyeOff,
  Clock,
  ExternalLink,
  Upload,
  Camera,
  RefreshCw,
} from 'lucide-react';
import { StoreSettings, PromoBanner } from '../types';
import { CATEGORIES } from '../data/initialProducts';
import { compressImageFile } from '../utils/imageUtils';
import {
  getDeliveryLocations,
  addDeliveryLocation,
  removeDeliveryLocation,
  saveDeliveryLocations,
  DEFAULT_DELIVERY_LOCATIONS,
} from '../services/storageService';

interface AdminStoreSettingsProps {
  storeSettings: StoreSettings;
  banners: PromoBanner[];
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  onSaveBanners: (banners: PromoBanner[]) => Promise<void>;
  isFirebaseConnected?: boolean;
}

const PRESET_BANNER_IMAGES = [
  {
    name: 'Grains & Cooking Oils',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    badge: 'SUPER SAVER',
  },
  {
    name: 'Pure Desi Ghee & Spices',
    url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
    badge: 'FESTIVAL SPECIAL',
  },
  {
    name: 'Fresh Grocery Delivery',
    url: 'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&w=1200&q=80',
    badge: 'EXPRESS DELIVERY',
  },
  {
    name: 'Tea, Snacks & Staples',
    url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80',
    badge: 'WHOLESALE RATES',
  },
];

export const AdminStoreSettings: React.FC<AdminStoreSettingsProps> = ({
  storeSettings,
  banners,
  onSaveSettings,
  onSaveBanners,
  isFirebaseConnected = false,
}) => {
  // Store Settings Form State
  const [name, setName] = useState(storeSettings.name || '');
  const [tagline, setTagline] = useState(storeSettings.tagline || '');
  const [phone, setPhone] = useState(storeSettings.phone || '');
  const [whatsapp, setWhatsapp] = useState(storeSettings.whatsapp || '');
  const [address, setAddress] = useState(storeSettings.address || '');
  const [serviceArea, setServiceArea] = useState(storeSettings.serviceArea || 'Waidhan, Singrauli');
  const [deliveryTime, setDeliveryTime] = useState(storeSettings.deliveryTime || 'Bharosemand Delivery');
  const [minOrderForFreeDelivery, setMinOrderForFreeDelivery] = useState<number>(
    storeSettings.minOrderForFreeDelivery ?? 199
  );
  const [deliveryCharge, setDeliveryCharge] = useState<number>(
    storeSettings.deliveryCharge ?? 25
  );

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);
  const [settingsErrorMsg, setSettingsErrorMsg] = useState<string | null>(null);

  // Banner Management State
  const [bannerList, setBannerList] = useState<PromoBanner[]>(banners || []);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerBadge, setBannerBadge] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerCategory, setBannerCategory] = useState<string>('All');
  const [bannerIsActive, setBannerIsActive] = useState(true);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isSavingBanners, setIsSavingBanners] = useState(false);
  const [isCompressingBannerImage, setIsCompressingBannerImage] = useState(false);

  // Delivery Areas Management State
  const [deliveryAreas, setDeliveryAreas] = useState<string[]>(() => getDeliveryLocations());
  const [newAreaInput, setNewAreaInput] = useState('');
  const [areaNotice, setAreaNotice] = useState<string | null>(null);

  const handleAddArea = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAreaInput.trim();
    if (!trimmed) return;
    if (deliveryAreas.includes(trimmed)) {
      setAreaNotice(`"${trimmed}" is already added to delivery areas.`);
      setTimeout(() => setAreaNotice(null), 3000);
      return;
    }
    const updated = addDeliveryLocation(trimmed);
    setDeliveryAreas(updated);
    setNewAreaInput('');
    setAreaNotice(`Added "${trimmed}" to delivery areas!`);
    setTimeout(() => setAreaNotice(null), 3000);
  };

  const handleDeleteArea = (area: string) => {
    if (deliveryAreas.length <= 1) {
      alert('At least one delivery area must remain configured.');
      return;
    }
    const updated = removeDeliveryLocation(area);
    setDeliveryAreas(updated);
    setAreaNotice(`Removed "${area}".`);
    setTimeout(() => setAreaNotice(null), 3000);
  };

  const handleResetAreas = () => {
    saveDeliveryLocations(DEFAULT_DELIVERY_LOCATIONS);
    setDeliveryAreas(DEFAULT_DELIVERY_LOCATIONS);
    setAreaNotice('Reset to default delivery areas.');
    setTimeout(() => setAreaNotice(null), 3000);
  };

  // Sync incoming props if changed externally
  React.useEffect(() => {
    setName(storeSettings.name || '');
    setTagline(storeSettings.tagline || '');
    setPhone(storeSettings.phone || '');
    setWhatsapp(storeSettings.whatsapp || '');
    setAddress(storeSettings.address || '');
    setServiceArea(storeSettings.serviceArea || 'Waidhan, Singrauli');
    setDeliveryTime(storeSettings.deliveryTime || 'Bharosemand Delivery');
    setMinOrderForFreeDelivery(storeSettings.minOrderForFreeDelivery ?? 199);
    setDeliveryCharge(storeSettings.deliveryCharge ?? 25);
  }, [storeSettings]);

  React.useEffect(() => {
    setBannerList(banners || []);
  }, [banners]);

  // Handle Save Settings
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsErrorMsg(null);
    setSettingsSuccessMsg(null);
    setIsSavingSettings(true);

    try {
      if (!name.trim()) throw new Error('Store name cannot be empty');
      if (!phone.trim()) throw new Error('Store phone number cannot be empty');
      if (!address.trim()) throw new Error('Store address cannot be empty');

      await onSaveSettings({
        name: name.trim(),
        tagline: tagline.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        address: address.trim(),
        serviceArea: serviceArea.trim() || 'Waidhan, Singrauli',
        deliveryTime: deliveryTime.trim() || 'Bharosemand Delivery',
        minOrderForFreeDelivery: Number(minOrderForFreeDelivery) || 199,
        deliveryCharge: Number(deliveryCharge) || 0,
      });

      setSettingsSuccessMsg('Store settings saved successfully and updated live across customer screens!');
      setTimeout(() => setSettingsSuccessMsg(null), 5000);
    } catch (err: any) {
      setSettingsErrorMsg(err?.message || 'Failed to save settings. Please try again.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Open Banner Modal for Add
  const handleOpenAddBanner = () => {
    setEditingBannerId(null);
    setBannerTitle('');
    setBannerSubtitle('');
    setBannerBadge('SPECIAL OFFER');
    setBannerImageUrl('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80');
    setBannerCategory('All');
    setBannerIsActive(true);
    setBannerError(null);
    setIsBannerModalOpen(true);
  };

  // Open Banner Modal for Edit
  const handleOpenEditBanner = (b: PromoBanner) => {
    setEditingBannerId(b.id);
    setBannerTitle(b.title);
    setBannerSubtitle(b.subtitle || '');
    setBannerBadge(b.badge || '');
    setBannerImageUrl(b.imageUrl);
    setBannerCategory(b.linkCategory || 'All');
    setBannerIsActive(b.isActive);
    setBannerError(null);
    setIsBannerModalOpen(true);
  };

  // Handle Image File Upload (Convert to Compressed Data URL)
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBannerError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    setIsCompressingBannerImage(true);
    setBannerError(null);

    try {
      const dataUrl = await compressImageFile(file, 1200, 600, 0.85);
      setBannerImageUrl(dataUrl);
    } catch (err: any) {
      setBannerError(err?.message || 'Failed to process banner image from device');
    } finally {
      setIsCompressingBannerImage(false);
    }
  };

  // Save Banner (Add or Edit)
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);

    if (!bannerTitle.trim()) {
      setBannerError('Please enter a banner title');
      return;
    }
    if (!bannerImageUrl.trim()) {
      setBannerError('Please provide an image URL or upload an image');
      return;
    }

    setIsSavingBanners(true);
    try {
      let updated: PromoBanner[];

      if (editingBannerId) {
        updated = bannerList.map((item) =>
          item.id === editingBannerId
            ? {
                ...item,
                title: bannerTitle.trim(),
                subtitle: bannerSubtitle.trim(),
                badge: bannerBadge.trim(),
                imageUrl: bannerImageUrl.trim(),
                linkCategory: bannerCategory,
                isActive: bannerIsActive,
              }
            : item
        );
      } else {
        const newBanner: PromoBanner = {
          id: 'banner_' + Date.now(),
          title: bannerTitle.trim(),
          subtitle: bannerSubtitle.trim(),
          badge: bannerBadge.trim(),
          imageUrl: bannerImageUrl.trim(),
          linkCategory: bannerCategory,
          isActive: bannerIsActive,
          order: bannerList.length + 1,
          createdAt: Date.now(),
        };
        updated = [...bannerList, newBanner];
      }

      setBannerList(updated);
      await onSaveBanners(updated);
      setIsBannerModalOpen(false);
    } catch (err: any) {
      setBannerError(err?.message || 'Failed to save banner');
    } finally {
      setIsSavingBanners(false);
    }
  };

  // Toggle Active State
  const handleToggleBannerActive = async (id: string) => {
    const updated = bannerList.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b));
    setBannerList(updated);
    await onSaveBanners(updated);
  };

  // Delete Banner
  const handleDeleteBanner = async (id: string) => {
    if (bannerList.length <= 1) {
      if (!window.confirm('This is your only banner. Deleting it will show the default fallback banner. Continue?')) {
        return;
      }
    }
    const updated = bannerList.filter((b) => b.id !== id);
    setBannerList(updated);
    await onSaveBanners(updated);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ================= SECTION 1: STORE SETTINGS ================= */}
      <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-stone-900 text-lg">
                Store Details & Delivery Configuration
              </h3>
              <p className="text-xs text-stone-500">
                Changes are saved directly to store settings and immediately reflected on header, footer, and checkout screens.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Central Store DB Active
            </span>
          </div>
        </div>

        {settingsSuccessMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{settingsSuccessMsg}</span>
          </div>
        )}

        {settingsErrorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
            {settingsErrorMsg}
          </div>
        )}

        <form onSubmit={handleSettingsSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Store Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chaurasia Kirana Store"
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Store Tagline / Slogan
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Ghar tak taaza kirana, sabse tezi se!"
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Helpline Number */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Helpline / Support Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">
                Shown in customer header and footer for quick phone calls.
              </span>
            </div>

            {/* WhatsApp Number */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                WhatsApp Order Number
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Used to dispatch order notifications via WhatsApp.
              </span>
            </div>

            {/* Free Delivery Threshold */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Free Delivery Threshold Amount (₹) *
              </label>
              <div className="relative">
                <span className="text-sm font-bold text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={minOrderForFreeDelivery}
                  onChange={(e) => setMinOrderForFreeDelivery(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="199"
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:border-emerald-600"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                Orders above ₹{minOrderForFreeDelivery} receive free doorstep delivery.
              </span>
            </div>

            {/* Standard Delivery Charge */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Standard Delivery Charge (₹) *
              </label>
              <div className="relative">
                <span className="text-sm font-bold text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2">
                  ₹
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="25"
                  className="w-full pl-8 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:border-emerald-600"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                Fee charged if order subtotal is less than ₹{minOrderForFreeDelivery}.
              </span>
            </div>

            {/* Delivery Time Guarantee */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Delivery Guarantee Label
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  placeholder="e.g. 30-45 Mins"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Store Service Area / City */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Store Service Area / City *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  placeholder="e.g. Waidhan, Singrauli"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:bg-white focus:border-emerald-600"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                The location badge in the customer top header dynamically reflects this value in real-time (Default: Waidhan, Singrauli).
              </span>
            </div>

            {/* Store Address & Location */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                Store Address & Landmark Text *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shop No. 4, Main Market, Near Shiv Mandir, Ward No. 12"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">
                Displayed in the customer footer and order receipt.
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-heading font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {isSavingSettings ? 'Saving Settings...' : 'Save Store Settings'}
            </button>
          </div>
        </form>
      </section>

      {/* ================= SECTION 1.5: MANAGE DELIVERY AREAS ================= */}
      <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-stone-900 text-lg flex items-center gap-2">
                <span>Manage Delivery Areas</span>
                <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                  {deliveryAreas.length} Active Zones
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                Configure local delivery areas, landmarks, and sectors shown to customers in the top location drawer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAreas}
            className="text-[11px] font-bold text-stone-600 hover:text-stone-900 underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3 h-3" />
            Reset Defaults
          </button>
        </div>

        {areaNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{areaNotice}</span>
          </div>
        )}

        {/* Add New Area Input */}
        <form onSubmit={handleAddArea} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={newAreaInput}
              onChange={(e) => setNewAreaInput(e.target.value)}
              placeholder="e.g. बैढ़न (Waidhan) or Ward 5 / NTPC Colony"
              className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={!newAreaInput.trim()}
            className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white rounded-xl text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Delivery Area</span>
          </button>
        </form>

        {/* Active Delivery Areas List */}
        <div className="space-y-2 pt-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
            Current Delivery Zones (Saved to kiranape_delivery_locations):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {deliveryAreas.map((area, idx) => (
              <div
                key={area}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-stone-800 truncate" title={area}>
                    {area}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteArea(area)}
                  className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                  title={`Remove ${area}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION 2: PROMOTIONAL BANNERS ================= */}
      <section className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-stone-900 text-lg">
                Promotional Banners & Splash Carousel
              </h3>
              <p className="text-xs text-stone-500">
                Active banners appear on the customer home page as an auto-scrolling promo slider.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddBanner}
            className="py-2 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-heading font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Banner</span>
          </button>
        </div>

        {/* Banners List */}
        {bannerList.length === 0 ? (
          <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
            <ImageIcon className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-xs text-stone-600 font-semibold">No promotional banners configured yet</p>
            <p className="text-[11px] text-stone-400 max-w-sm mx-auto mt-1">
              Add your first offer banner to showcase festival deals, discounts, and superfast delivery.
            </p>
            <button
              onClick={handleOpenAddBanner}
              className="mt-3 px-3.5 py-1.5 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition-colors"
            >
              Create Banner
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bannerList.map((banner, index) => (
              <div
                key={banner.id || index}
                className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  banner.isActive
                    ? 'border-stone-200 bg-white shadow-xs'
                    : 'border-stone-200/60 bg-stone-50/70 opacity-60'
                }`}
              >
                {/* Banner Thumbnail & Badge Overlay */}
                <div className="relative h-32 w-full overflow-hidden bg-stone-900">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
                  
                  {/* Top Bar on Card */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    {banner.badge ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-extrabold uppercase">
                        {banner.badge}
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleBannerActive(banner.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                        banner.isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                      title={banner.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {banner.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{banner.isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Title overlay */}
                  <div className="absolute bottom-2.5 left-3 right-3 text-white">
                    <h4 className="font-heading font-black text-sm truncate">{banner.title}</h4>
                    {banner.subtitle && (
                      <p className="text-[11px] text-stone-200 truncate">{banner.subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Banner Details & Actions */}
                <div className="p-3 bg-white flex items-center justify-between border-t border-stone-100 text-xs">
                  <div className="flex items-center gap-2 text-stone-500 text-[11px]">
                    <span className="font-semibold text-stone-700">Category:</span>
                    <span className="bg-stone-100 px-2 py-0.5 rounded font-medium text-stone-800">
                      {banner.linkCategory || 'All'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditBanner(banner)}
                      className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================= MODAL: ADD / EDIT BANNER ================= */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="font-heading font-extrabold text-sm">
                  {editingBannerId ? 'Edit Promotional Banner' : 'Add New Promotional Banner'}
                </h4>
              </div>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="text-stone-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="p-5 overflow-y-auto space-y-4 flex-1">
              {bannerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                  {bannerError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Banner Headline / Offer Title *
                </label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. Festival Offer 20% Off"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Offer Subtitle / Description
                </label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="e.g. Pure chakki atta, dal & desi cow ghee at lowest wholesale prices"
                  className="w-full px-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600"
                />
              </div>

              {/* Badge & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    value={bannerBadge}
                    onChange={(e) => setBannerBadge(e.target.value)}
                    placeholder="e.g. 20% OFF"
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                    Link to Category
                  </label>
                  <select
                    value={bannerCategory}
                    onChange={(e) => setBannerCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Banner Image: Device Upload + Preview + Web Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-stone-700 uppercase">
                    Banner Image *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                    Direct Device Upload
                  </span>
                </div>

                {/* Device Upload Button */}
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold transition-all shadow-2xs">
                    {isCompressingBannerImage ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                    ) : (
                      <Upload className="w-4 h-4 text-emerald-700" />
                    )}
                    <span>{isCompressingBannerImage ? 'Compressing device photo...' : 'Choose Banner Photo from Device'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isCompressingBannerImage}
                      onChange={handleImageFileUpload}
                    />
                  </label>
                </div>

                {/* Image Preview */}
                {bannerImageUrl && (
                  <div className="relative h-32 rounded-xl overflow-hidden border border-stone-200 shadow-2xs">
                    <img
                      src={bannerImageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent p-3 flex flex-col justify-end text-white">
                      {bannerBadge && (
                        <span className="self-start px-2 py-0.5 rounded bg-amber-400 text-stone-950 text-[9px] font-extrabold uppercase mb-1">
                          {bannerBadge}
                        </span>
                      )}
                      <span className="font-bold text-sm truncate">{bannerTitle || 'Banner Headline Preview'}</span>
                      {bannerSubtitle && <span className="text-xs text-stone-300 truncate">{bannerSubtitle}</span>}
                    </div>
                  </div>
                )}

                {/* Collapsible: Paste URL or Choose Banner Sample */}
                <details className="text-xs text-stone-600 group">
                  <summary className="cursor-pointer font-semibold text-stone-500 hover:text-stone-800 list-none flex items-center gap-1 py-1">
                    <span className="text-[11px]">▸ Or paste custom image URL / choose sample template</span>
                  </summary>
                  <div className="pt-2 pl-2 space-y-2 border-l-2 border-stone-200 mt-1">
                    <input
                      type="url"
                      value={bannerImageUrl.startsWith('data:') ? '' : bannerImageUrl}
                      onChange={(e) => setBannerImageUrl(e.target.value)}
                      placeholder="Paste image URL (https://...)"
                      className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600"
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {PRESET_BANNER_IMAGES.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setBannerImageUrl(preset.url);
                            if (!bannerBadge) setBannerBadge(preset.badge);
                          }}
                          className="text-[10px] p-1.5 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-300 border border-stone-200 rounded-lg text-left truncate transition-colors cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </details>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="banner-is-active"
                  checked={bannerIsActive}
                  onChange={(e) => setBannerIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="banner-is-active" className="text-xs font-semibold text-stone-800 cursor-pointer">
                  Display this banner in customer home carousel immediately
                </label>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="py-2 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBanners}
                  className="py-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-heading font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingBanners ? 'Saving...' : editingBannerId ? 'Update Banner' : 'Add Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
