import React from 'react';
import { Sparkles } from 'lucide-react';
import { ProductCategory, AppUser, StoreSettings, CustomCategory } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { getCustomCategories } from '../services/storageService';
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
  onOpenDigitalParchiModal?: () => void;
  onOpenLaunchPoster?: () => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onSecretAdminTrigger,
  categories,
  selectedDepartment = 'grocery',
  onOpenLaunchPoster,
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

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden bg-white/95 backdrop-blur-md shadow-xs border-b border-stone-200/70">
      <div className="px-3 sm:px-4 pt-2.5 pb-2.5">
        <div className="max-w-6xl mx-auto space-y-2">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Clean Brand name "Kiranapė" with customizable image logo */}
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <img
                src="/logo.png"
                alt="Kiranapė Logo"
                className="w-8 h-8 rounded-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="font-heading font-black text-lg sm:text-xl text-[#0c831f] tracking-tight">
                Kiranapė
              </span>
            </div>
          </div>

          {/* Full-Width Rounded-2xl Search Bar */}
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSecretAdminTrigger={onSecretAdminTrigger}
            className="w-full"
          />

          {/* Top Horizontal Category Tabs: Smoothly scrollable with clear icons & soft highlight */}
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar touch-pan-x scroll-smooth">
            {onOpenLaunchPoster && (
              <button
                type="button"
                id="tab-launch-offers-pill"
                onClick={onOpenLaunchPoster}
                className="px-3 py-1 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs hover:brightness-105 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                <span>🔥 Launch Offers</span>
              </button>
            )}

            {filteredCategories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.id || cat.name}
                  type="button"
                  onClick={() => onSelectCategory(cat.name as ProductCategory)}
                  className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-700 text-white font-black shadow-xs'
                      : 'bg-white/95 hover:bg-white text-stone-800 border border-stone-200/80 shadow-2xs font-semibold'
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
    </header>
  );
};
