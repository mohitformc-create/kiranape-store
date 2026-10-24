import React from 'react';
import { Home, LayoutGrid, Camera, RotateCcw, ArrowRight, Zap, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

interface BottomNavBarProps {
  currentCategory: string;
  isSearching: boolean;
  cartItemCount: number;
  cartTotalAmount: number;
  cartItems?: CartItem[];
  onGoHome: () => void;
  onOrderAgain: () => void;
  onOpenCategories: () => void;
  onOpenParchi: () => void;
  onOpenCart: () => void;
  isOrderAgainActive?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  currentCategory,
  isSearching,
  cartItemCount,
  cartTotalAmount,
  cartItems = [],
  onGoHome,
  onOrderAgain,
  onOpenCategories,
  onOpenParchi,
  onOpenCart,
  isOrderAgainActive = false,
}) => {
  const isHomeActive = currentCategory === 'All' && !isSearching && !isOrderAgainActive;
  const isCategoriesActive = currentCategory !== 'All' && !isSearching && !isOrderAgainActive;

  // Up to 3 preview thumbnails of items in cart
  const previewThumbnails = cartItems.slice(0, 3);

  // Free delivery threshold (₹199 standard for Kirana stores)
  const freeDeliveryThreshold = 199;
  const remainingForFree = Math.max(0, freeDeliveryThreshold - cartTotalAmount);
  const progressPercent = Math.min(100, Math.round((cartTotalAmount / freeDeliveryThreshold) * 100));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Ultra-Sleek Blinkit Floating Cart Capsule */}
      {cartItemCount > 0 && (
        <div className="max-w-md mx-auto px-3 pb-2 pointer-events-auto animate-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            id="floating-cart-pill-btn"
            onClick={onOpenCart}
            className="w-full h-12 sm:h-13 px-3.5 py-2 rounded-2xl bg-[#0c831f] hover:bg-[#0a731b] active:scale-[0.99] transition-all shadow-xl shadow-emerald-950/20 border border-emerald-400/30 flex items-center justify-between cursor-pointer"
          >
            {/* Left: 2 overlapping round thumbnails with white outline */}
            <div className="flex items-center pl-0.5">
              <div className="flex items-center">
                {previewThumbnails.slice(0, 2).map((item, idx) => (
                  <img
                    key={item.id || idx}
                    src={item.imageUrl || getCategoryFallbackSvg(item.category || '', item.name)}
                    alt={item.name}
                    className="ring-2 ring-white rounded-full h-8 w-8 object-contain bg-white -ml-2 first:ml-0 shadow-sm flex-shrink-0"
                    onError={(e) => {
                      const fallback = getCategoryFallbackSvg(item.category || '', item.name);
                      if ((e.currentTarget as HTMLImageElement).src !== fallback) {
                        (e.currentTarget as HTMLImageElement).src = fallback;
                      }
                    }}
                  />
                ))}
                {previewThumbnails.length === 0 && (
                  <div className="ring-2 ring-white rounded-full h-8 w-8 bg-white text-[#0c831f] flex items-center justify-center font-bold shadow-sm">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            {/* Center: White bold text "View cart • X items | ₹XX" */}
            <div className="text-center px-2 flex-1 min-w-0">
              <span className="text-xs sm:text-[13px] font-heading font-black text-white truncate block">
                View cart • {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} | ₹{cartTotalAmount}
              </span>
            </div>

            {/* Right: Yellow pill button "Proceed >" */}
            <div className="bg-[#ffc200] hover:bg-[#e6af00] text-stone-950 text-xs font-heading font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-xs flex-shrink-0 active:scale-95 transition-transform">
              <span>Proceed</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.8]" />
            </div>
          </button>
        </div>
      )}

      {/* Fixed 4-Tab Bottom Navigation: Home | Order Again | Categories | 📸 Parchi */}
      <nav
        aria-label="Bottom Navigation"
        className="w-full bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-2xl pointer-events-auto"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 items-center h-16 px-1">
          {/* 1. Home Tab */}
          <button
            type="button"
            id="nav-tab-home"
            onClick={onGoHome}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors cursor-pointer relative ${
              isHomeActive ? 'text-emerald-700 font-black' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                isHomeActive ? 'bg-emerald-50 text-emerald-700 scale-105' : ''
              }`}
            >
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight leading-none">Home</span>
            {isHomeActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />
            )}
          </button>

          {/* 2. Order Again Tab */}
          <button
            type="button"
            id="nav-tab-order-again"
            onClick={onOrderAgain}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors cursor-pointer relative ${
              isOrderAgainActive ? 'text-emerald-700 font-black' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                isOrderAgainActive ? 'bg-emerald-50 text-emerald-700 scale-105' : ''
              }`}
            >
              <RotateCcw className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight leading-none">Order Again</span>
            {isOrderAgainActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />
            )}
          </button>

          {/* 3. Categories Tab */}
          <button
            type="button"
            id="nav-tab-categories"
            onClick={onOpenCategories}
            className={`flex flex-col items-center justify-center h-full gap-0.5 transition-colors cursor-pointer relative ${
              isCategoriesActive ? 'text-emerald-700 font-black' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                isCategoriesActive ? 'bg-emerald-50 text-emerald-700 scale-105' : ''
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </div>
            <span className="text-[11px] tracking-tight leading-none">Categories</span>
            {isCategoriesActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5" />
            )}
          </button>

          {/* 4. Order via Parchi Tab */}
          <button
            type="button"
            id="nav-tab-parchi"
            onClick={onOpenParchi}
            className="flex flex-col items-center justify-center h-full gap-0.5 text-stone-700 hover:text-stone-900 transition-colors cursor-pointer group relative"
          >
            <div className="relative p-1 rounded-xl bg-amber-100 group-hover:bg-amber-200 text-stone-950 transition-all shadow-2xs">
              <Camera className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
            </div>
            <span className="text-[11px] font-black text-stone-900 tracking-tight leading-none">
              📸 Parchi
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};
