import React from 'react';
import { Camera, Mic, Sparkles } from 'lucide-react';

interface QuickOrderActionBarProps {
  onOpenParchiModal: () => void;
  onOpenVoiceModal: () => void;
}

export const QuickOrderActionBar: React.FC<QuickOrderActionBarProps> = ({
  onOpenParchiModal,
  onOpenVoiceModal,
}) => {
  return (
    <section
      aria-label="Quick Order Options"
      className="my-3.5 sm:my-4"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-stone-200 shadow-sm">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Left Action: Parchi Photo Upload */}
          <button
            type="button"
            id="quick-action-parchi-btn"
            onClick={onOpenParchiModal}
            className="group relative flex items-center gap-2 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-stone-50 hover:to-emerald-50/40 border border-emerald-200/80 hover:border-emerald-300 text-left transition-all duration-200 active:scale-[0.98] shadow-2xs hover:shadow-sm cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#0c831f] text-white flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Camera className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-xs sm:text-sm text-stone-900 leading-tight truncate">
                  📸 Parchi Ki Photo Bhejo
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-stone-500 font-semibold mt-0.5 truncate">
                कागज की पर्ची भेजें • COD
              </p>
            </div>
          </button>

          {/* Right Action: Voice Grocery Dictation */}
          <button
            type="button"
            id="quick-action-voice-btn"
            onClick={onOpenVoiceModal}
            className="group relative flex items-center gap-2 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50/80 via-white to-stone-50 hover:to-amber-50/50 border border-amber-200/80 hover:border-amber-300 text-left transition-all duration-200 active:scale-[0.98] shadow-2xs hover:shadow-sm cursor-pointer"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-xs sm:text-sm text-stone-900 leading-tight truncate">
                  🎙️ Bol Kar Saman Likhein
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-stone-500 font-semibold mt-0.5 truncate">
                बोलिए और लिस्ट तैयार • Live Mic
              </p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};
