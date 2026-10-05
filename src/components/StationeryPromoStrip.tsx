import React from 'react';
import { ArrowRight, Sparkles, BookOpen, PenTool } from 'lucide-react';

interface StationeryPromoStripProps {
  onExploreStationery: () => void;
}

export const StationeryPromoStrip: React.FC<StationeryPromoStripProps> = ({
  onExploreStationery,
}) => {
  return (
    <div
      onClick={onExploreStationery}
      className="relative my-4 rounded-2xl sm:rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden border border-blue-400/30 group select-none active:scale-[0.99]"
      role="banner"
      aria-label="Stationery Department Available"
    >
      {/* Decorative Background Elements */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-sky-400/20 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left Side: Icon & Copy */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-2xl sm:text-3xl shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
            🎒
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                New Department
              </span>
              <span className="text-sky-200 text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                10-20 Min Doorstep Delivery
              </span>
            </div>

            <h3 className="font-heading font-black text-sm sm:text-base md:text-lg text-white leading-tight">
              स्कूल व ऑफिस स्टेशनरी भी उपलब्ध!
            </h3>
            <p className="text-xs sm:text-sm text-sky-100 font-medium">
              अब कॉपी, पेन और फेविकोल भी सीधे घर मंगाएं
            </p>
          </div>
        </div>

        {/* Right Side: Quick Highlights & CTA Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 self-start md:self-center flex-wrap">
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-bold text-sky-100">
            <span className="bg-white/10 px-2 py-1 rounded-lg border border-white/15">📓 कॉपियां</span>
            <span className="bg-white/10 px-2 py-1 rounded-lg border border-white/15">🖊️ पेन</span>
            <span className="bg-white/10 px-2 py-1 rounded-lg border border-white/15">🎨 फेविकोल</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExploreStationery();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer group-hover:shadow-amber-400/30"
          >
            <span>एक्सप्लोर करें (Explore)</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
