import React from 'react';
import { Camera, Mic, PenLine } from 'lucide-react';

interface QuickOrderActionBarProps {
  onOpenParchiModal: () => void;
  onOpenVoiceModal: () => void;
  onOpenDigitalParchiModal?: () => void;
}

export const QuickOrderActionBar: React.FC<QuickOrderActionBarProps> = ({
  onOpenParchiModal,
  onOpenVoiceModal,
  onOpenDigitalParchiModal,
}) => {
  return (
    <section aria-label="Quick Order Options" className="my-3 sm:my-3.5">
      <div className="bg-white rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 border border-stone-200 shadow-xs">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
          {/* Action 1: Digital Parchi (Type Grocery List) */}
          <button
            type="button"
            id="quick-action-digital-parchi-btn"
            onClick={onOpenDigitalParchiModal}
            className="group relative flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 hover:to-amber-100/50 border border-amber-200/90 hover:border-amber-300 transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer"
            title="सामान लिखकर भेजें (Type Grocery List)"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <PenLine className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block font-heading font-black text-[11px] sm:text-xs text-stone-900 leading-tight truncate">
                📝 पर्ची टाइप करें
              </span>
              <p className="hidden sm:block text-[10px] text-stone-500 font-semibold mt-0.5 truncate">
                सामान लिखकर मंगाएं
              </p>
            </div>
          </button>

          {/* Action 2: Parchi Photo Upload */}
          <button
            type="button"
            id="quick-action-parchi-btn"
            onClick={onOpenParchiModal}
            className="group relative flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 hover:to-emerald-100/50 border border-emerald-200/90 hover:border-emerald-300 transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer"
            title="कागज की पर्ची का फोटो भेजें"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#0c831f] text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block font-heading font-black text-[11px] sm:text-xs text-stone-900 leading-tight truncate">
                📸 पर्ची का फोटो
              </span>
              <p className="hidden sm:block text-[10px] text-stone-500 font-semibold mt-0.5 truncate">
                कागज की पर्ची भेजें
              </p>
            </div>
          </button>

          {/* Action 3: Voice Grocery Dictation */}
          <button
            type="button"
            id="quick-action-voice-btn"
            onClick={onOpenVoiceModal}
            className="group relative flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-2.5 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-50/80 via-white to-teal-50/40 hover:to-teal-100/50 border border-teal-200/90 hover:border-teal-300 transition-all duration-200 active:scale-[0.97] shadow-2xs hover:shadow-xs cursor-pointer"
            title="बोलकर सामान लिखवाएं (Voice Note)"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Mic className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block font-heading font-black text-[11px] sm:text-xs text-stone-900 leading-tight truncate">
                🎙️ बोलकर आर्डर
              </span>
              <p className="hidden sm:block text-[10px] text-stone-500 font-semibold mt-0.5 truncate">
                बोलिए और लिस्ट तैयार
              </p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};
