import React, { useEffect, useState } from 'react';
import { X, Sparkles, ShoppingBag, ArrowRight, Truck, Gift } from 'lucide-react';

interface LaunchOfferModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onExploreCatalog?: () => void;
}

const POSTER_IMAGE_PATH = '/assets/aistudio/1793598219669_be3473c9.png';
const SESSION_STORAGE_KEY = 'kiranape_launch_poster_seen_session_v2';

export const LaunchOfferModal: React.FC<LaunchOfferModalProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onExploreCatalog,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Auto-launch popup modal once per session on home opening
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if user already dismissed it this session
    try {
      const alreadySeen = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!alreadySeen && controlledIsOpen === undefined) {
        // Small delay for smooth entry animation after app loads
        const timer = setTimeout(() => {
          setInternalIsOpen(true);
        }, 350);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore storage errors
    }
  }, [controlledIsOpen]);

  const isModalVisible = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
      } catch {}
    }
    setInternalIsOpen(false);
    if (controlledOnClose) {
      controlledOnClose();
    }
  };

  const handleStartShopping = () => {
    handleDismiss();
    if (onExploreCatalog) {
      onExploreCatalog();
    }
  };

  if (!isModalVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Dialog Content */}
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-amber-300/40 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Close 'X' Button */}
        <button
          type="button"
          id="close-launch-poster-btn"
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-stone-950/85 hover:bg-stone-900 text-white flex items-center justify-center shadow-lg border border-white/20 active:scale-90 transition-all cursor-pointer"
          title="Close Offer Banner (X)"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white stroke-[2.5]" />
        </button>

        {/* Top Gold Header Strip */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-stone-950 px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-sm flex-shrink-0">
          <Sparkles className="w-4 h-4 text-stone-950 fill-stone-950" />
          <span>Exclusive Waidhan Launch Offers!</span>
        </div>

        {/* Scrollable Image Area with Poster Asset */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 relative bg-stone-950 flex flex-col items-center">
          <img
            src={POSTER_IMAGE_PATH}
            alt="Kiranape Waidhan Launch Offer Poster - Free Phenyl, Harpic and Delivery"
            className="w-full h-auto object-contain select-none max-h-[70vh] sm:max-h-[72vh]"
            loading="eager"
            onError={(e) => {
              // Fallback if local asset is loading
              console.warn('Launch poster image preview failed, retrying');
            }}
          />
        </div>

        {/* Bottom Action Footer with 1-Tap Start Shopping */}
        <div className="p-3.5 bg-gradient-to-t from-stone-950 via-stone-900 to-stone-900 border-t border-stone-800 flex flex-col gap-2 flex-shrink-0">
          <button
            type="button"
            id="start-shopping-launch-btn"
            onClick={handleStartShopping}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0c831f] to-emerald-600 hover:from-[#0a731b] hover:to-emerald-700 active:scale-[0.99] text-white font-heading font-black text-sm sm:text-base shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/40"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Claim Gifts & Start Shopping ➔</span>
          </button>

          <p className="text-[11px] text-center text-amber-200/90 font-medium">
            ⚡ Free Home Delivery across Waidhan (Majan Mod to Vindhyanagar)
          </p>
        </div>
      </div>
    </div>
  );
};
