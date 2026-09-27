import React from 'react';
import { Home, LayoutGrid, Camera, RotateCcw, ArrowRight, Zap, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';

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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Floating Quick-Commerce Cart Bar: Sticky pill with overlapping thumbnails right above nav */}
      {cartItemCount > 0 && (
        <div className="max-w-md sm:max-w-lg mx-auto px-3 pb-2 pointer-events-auto animate-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            id="floating-cart-pill-btn"
            onClick={onOpenCart}
            className="w-full bg-[#0c831f] hover:bg-[#096b18] text-white rounded-2xl p-2 sm:p-2.5 shadow-2xl border border-emerald-400/40 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all ring-2 ring-emerald-500/20"
          >
            {/* Left: 2-3 overlapping micro-thumbnails + Item count & Live Total */}
            <div className="flex items-center gap-2 sm:gap-2.5 pl-1 min-w-0">
              {/* Overlapping Thumbnails */}
              <div className="flex items-center -space-x-2.5 flex-shrink-0">
                {previewThumbnails.length > 0 ? (
                  previewThumbnails.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-0.5 border-2 border-[#0c831f] shadow-md overflow-hidden flex items-center justify-center relative"
                      style={{ zIndex: 3 - idx }}
                    >
                      <img
                        src={item.imageUrl || 'https://images.openfoodfacts.org/images/products/890/103/038/3828/front_en.10.400.jpg'}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  ))
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-white text-[#0c831f] flex items-center justify-center font-bold shadow-2xs">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Count & Live Total */}
              <div className="text-left leading-tight min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-black text-sm sm:text-base text-white truncate">
                    {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="text-emerald-200 font-normal">|</span>
                  <span className="font-heading font-black text-sm sm:text-base text-white">
                    ₹{cartTotalAmount}
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-emerald-100 font-bold flex items-center gap-1 mt-0.5">
                  <Zap className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                  <span>Express Doorstep Delivery</span>
                </div>
              </div>
            </div>

            {/* Right: Prominent "View Cart →" button */}
            <div className="flex items-center gap-1.5 bg-white hover:bg-stone-100 text-[#0c831f] text-xs sm:text-sm font-heading font-black px-3.5 sm:px-4 py-2 rounded-xl shadow-md flex-shrink-0 transition-transform active:scale-95">
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
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
