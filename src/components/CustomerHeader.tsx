import React, { useState, useEffect } from 'react';
import { Search, X, ShoppingBag, Store, Camera, Mic, MapPin, Zap, ChevronDown, Check } from 'lucide-react';
import { ProductCategory, AppUser, StoreSettings, CustomCategory } from '../types';
import { CATEGORIES, STORE_DEFAULTS } from '../data/initialProducts';
import {
  getCustomCategories,
  getDeliveryLocations,
  getCustomerSelectedLocation,
  setCustomerSelectedLocation,
} from '../services/storageService';
import { BrandLogo } from './BrandLogo';
import { SearchBar } from './SearchBar';

interface CustomerHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: ProductCategory;
  onSelectCategory: (category: ProductCategory) => void;
  totalCartItems: number;
  cartTotalAmount: number;
  onOpenCart: () => void;
  onOpenAdminPin?: () => void;
  onSecretAdminTrigger?: () => void;
  currentUser?: AppUser | null;
  onOpenAuth?: (tab?: 'customer' | 'admin') => void;
  onLogout?: () => void;
  onOpenTracker?: () => void;
  hasActiveOrders?: boolean;
  storeSettings?: StoreSettings;
  categories?: CustomCategory[];
  selectedDepartment?: 'grocery' | 'stationery';
  onSelectDepartment?: (dept: 'grocery' | 'stationery') => void;
  onOpenParchiModal?: () => void;
  onOpenVoiceModal?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  totalCartItems,
  cartTotalAmount,
  onOpenCart,
  onSecretAdminTrigger,
  storeSettings = STORE_DEFAULTS,
  categories,
  selectedDepartment = 'grocery',
  onSelectDepartment,
  onOpenParchiModal,
  onOpenVoiceModal,
}) => {
  const dynamicCategories = categories && categories.length > 0 ? categories : getCustomCategories();

  // Filter categories shown in pills based on active department
  const filteredCategories = React.useMemo(() => {
    return dynamicCategories.filter((cat) => {
      if (cat.name === 'All') return true;
      if (selectedDepartment === 'stationery') {
        return (
          cat.department === 'stationery' ||
          cat.name.includes('Copies') ||
          cat.name.includes('Pens') ||
          cat.name.includes('Art') ||
          cat.name.includes('Office')
        );
      }
      // grocery department
      return (
        cat.department !== 'stationery' &&
        !cat.name.includes('Copies') &&
        !cat.name.includes('Pens') &&
        !cat.name.includes('Art, Craft') &&
        !cat.name.includes('Office & Daily')
      );
    });
  }, [dynamicCategories, selectedDepartment]);

  const [deliveryLocationsList, setDeliveryLocationsList] = useState<string[]>(() => getDeliveryLocations());
  const [selectedLocation, setSelectedLocation] = useState<string>(() => {
    return getCustomerSelectedLocation() || storeSettings?.serviceArea || 'बैढ़न (Waidhan)';
  });
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [customLocationInput, setCustomLocationInput] = useState<string>('');

  // Sanitize delivery tagline to remove unrealistic quick-commerce promises
  const cleanDeliveryTagline = React.useMemo(() => {
    const raw = storeSettings?.deliveryTagline;
    if (!raw || raw.includes('15-30') || raw.includes('15 - 30') || raw.includes('15 to 30')) {
      return 'Shuddh Samaan, Bharosemand Delivery';
    }
    return raw;
  }, [storeSettings?.deliveryTagline]);

  // Sync delivery locations if storeSettings changes
  useEffect(() => {
    setDeliveryLocationsList(getDeliveryLocations());
  }, [storeSettings]);

  const handleSelectArea = (loc: string) => {
    setSelectedLocation(loc);
    setCustomerSelectedLocation(loc);
    setShowLocationModal(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full max-w-full overflow-x-hidden shadow-md">
      {/* Bright Yellow / Amber App Header (Minimal, Blinkit-Style) */}
      <div className="bg-[#ffc200] text-stone-900 border-b border-amber-400 px-3 sm:px-4 pt-2.5 pb-2">
        <div className="max-w-6xl mx-auto">
          {/* Top Row: Official Kiranape Logo + Store Name on Left, Aligned Deliver To Selector on Right */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Official Brand Identity Component */}
            <div className="flex items-center min-w-0 flex-shrink">
              <BrandLogo className="h-9 w-auto object-contain" subtitle={cleanDeliveryTagline} />
            </div>

            {/* Right: Delivery Area Selector Aligned Beside Brand */}
            <button
              type="button"
              id="header-location-selector-btn"
              onClick={() => {
                setDeliveryLocationsList(getDeliveryLocations());
                setShowLocationModal(true);
              }}
              className="flex items-center gap-1.5 bg-white/95 hover:bg-white active:scale-95 text-stone-900 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-extrabold shadow-2xs border border-stone-200 cursor-pointer transition-all max-w-[155px] xs:max-w-[200px] sm:max-w-sm flex-shrink-0"
              title="Deliver to - Change Location"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-700 fill-emerald-600 flex-shrink-0" />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-stone-400 leading-none">
                  Deliver to
                </span>
                <span className="truncate text-stone-950 text-xs font-black leading-tight">
                  {selectedLocation}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-stone-600 flex-shrink-0 ml-0.5" />
            </button>
          </div>

          {/* Minimal White Search Bar: Clean full-width pill with Mic and Camera icons */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSecretAdminTrigger={onSecretAdminTrigger}
            onOpenParchiModal={onOpenParchiModal}
            onOpenVoiceModal={onOpenVoiceModal}
            className="mt-2.5"
          />

          {/* Top Department Switcher (Blinkit / Zepto Style Modern Dual Pills) */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              id="dept-tab-grocery"
              onClick={() => {
                if (onSelectDepartment) onSelectDepartment('grocery');
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 ${
                selectedDepartment === 'grocery'
                  ? 'bg-white text-stone-900 shadow-xs ring-2 ring-emerald-600/30'
                  : 'bg-amber-400/80 hover:bg-white/80 text-stone-800'
              }`}
            >
              <span className="text-sm">🛒</span>
              <span>किराना (Grocery)</span>
              {selectedDepartment === 'grocery' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-0.5 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              id="dept-tab-stationery"
              onClick={() => {
                if (onSelectDepartment) onSelectDepartment('stationery');
              }}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 ${
                selectedDepartment === 'stationery'
                  ? 'bg-white text-stone-900 shadow-xs ring-2 ring-blue-600/30'
                  : 'bg-amber-400/80 hover:bg-white/80 text-stone-800'
              }`}
            >
              <span className="text-sm">📚</span>
              <span>स्टेशनरी (Stationery)</span>
              {selectedDepartment === 'stationery' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-0.5 animate-pulse" />
              )}
            </button>
          </div>

          {/* Horizontal Category Pills Strip: Scrollable rounded pills with icons and active highlights */}
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  onClick={() => onSelectCategory(cat.name as ProductCategory)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-[#0c831f] text-white shadow-xs font-black'
                      : 'bg-white hover:bg-stone-50 text-stone-800 border border-stone-200/90 shadow-2xs'
                  }`}
                >
                  <span className="text-sm leading-none">{cat.icon || '🏷️'}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Delivery Location Selection Modal / Bottom Drawer */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowLocationModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 p-5 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center text-base font-black shadow-2xs">
                  📍
                </div>
                <div>
                  <h3 className="font-heading font-black text-sm sm:text-base text-stone-900 leading-tight">
                    Choose Your Delivery Location
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    Select your colony, sector or landmark for fast doorstep delivery
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Delivery Areas List */}
            <div className="py-3.5 space-y-2 overflow-y-auto flex-1 max-h-[48vh]">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 block px-1">
                Available Delivery Zones ({deliveryLocationsList.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {deliveryLocationsList.map((loc) => {
                  const isSelected = selectedLocation === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => handleSelectArea(loc)}
                      className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer border active:scale-98 ${
                        isSelected
                          ? 'bg-amber-400 text-stone-950 border-amber-500 shadow-xs ring-2 ring-amber-400/40'
                          : 'bg-stone-50 hover:bg-amber-50/50 hover:border-amber-300 text-stone-800 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-stone-950 fill-stone-950' : 'text-amber-600'}`} />
                        <span className="truncate">{loc}</span>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-stone-950 flex-shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-stone-300 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Location input */}
            <div className="pt-3 border-t border-stone-100">
              <label htmlFor="custom-loc-input" className="text-[11px] font-bold text-stone-700 block mb-1.5">
                Or enter custom colony / landmark:
              </label>
              <div className="flex gap-2">
                <input
                  id="custom-loc-input"
                  type="text"
                  value={customLocationInput}
                  onChange={(e) => setCustomLocationInput(e.target.value)}
                  placeholder="e.g., Near SBI ATM, Ward No 4"
                  className="flex-1 px-3.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customLocationInput.trim()) {
                      handleSelectArea(customLocationInput.trim());
                      setCustomLocationInput('');
                    }
                  }}
                  disabled={!customLocationInput.trim()}
                  className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-amber-300 rounded-xl text-xs font-heading font-black cursor-pointer transition-all shadow-xs"
                >
                  Set Area
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

