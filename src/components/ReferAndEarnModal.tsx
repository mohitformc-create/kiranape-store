import React, { useState } from 'react';
import { X, Gift, Share2, Copy, Check, Users, Sparkles, MessageCircle, ArrowRight } from 'lucide-react';
import { StoreSettings } from '../types';

interface ReferAndEarnModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings?: StoreSettings;
}

const STORAGE_REFERRAL_KEY = 'kiranape_user_referral_code_v1';

function getOrGenerateReferralCode(): string {
  if (typeof window === 'undefined') return 'WAIDHAN50';
  try {
    const existing = localStorage.getItem(STORAGE_REFERRAL_KEY);
    if (existing) return existing;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCode = `KIRANAPE-${randomSuffix}`;
    localStorage.setItem(STORAGE_REFERRAL_KEY, newCode);
    return newCode;
  } catch {
    return 'WAIDHAN50';
  }
}

export const ReferAndEarnModal: React.FC<ReferAndEarnModalProps> = ({
  isOpen,
  onClose,
  storeSettings,
}) => {
  const [referralCode] = useState<string>(() => getOrGenerateReferralCode());
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kiranape-store.vercel.app';
  const referralLink = `${appUrl}/?ref=${referralCode}`;

  const shareText = `🛒 *Kiranape Express Waidhan se Taaza Kirana Mangwayein!* ⚡

Ghar baithe paayein taaza rashan aur stationery sabse tezi se free home delivery ke saath! 
🎁 Mere invite code *${referralCode}* se apne pehle order (₹499+) par paayein flat ₹50 ki chhoot aur muft gifts (Free Phenyl + Harpic)!

👉 Abhi order karein: ${referralLink}`;

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="relative bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-5 text-stone-950 flex flex-col items-center text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center text-3xl mb-2.5">
            🎁
          </div>

          <span className="text-[10px] font-black uppercase tracking-widest bg-stone-950 text-amber-300 px-2.5 py-0.5 rounded-full mb-1">
            Waidhan Community Rewards
          </span>

          <h3 className="font-heading font-black text-xl text-stone-950 leading-tight">
            Refer & Earn ₹50 Cash Off
          </h3>
          <p className="text-xs text-stone-900 font-semibold max-w-xs mt-1">
            Invite your neighbors in Waidhan! When they place their first order above ₹499, both of you get ₹50 off or a free grocery surprise.
          </p>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* User's Referral Code Card */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center space-y-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 block">
              Your Unique Invite Code
            </span>

            <div className="flex items-center justify-center gap-2">
              <div className="bg-white border-2 border-dashed border-amber-400 px-4 py-2 rounded-xl text-lg font-mono font-black text-stone-950 tracking-wider shadow-2xs">
                {referralCode}
              </div>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-heading font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-300" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Big Green 1-Click WhatsApp Share Button */}
          <button
            type="button"
            id="share-referral-whatsapp-btn"
            onClick={handleWhatsAppShare}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.99] text-white font-heading font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>Share Invite on WhatsApp</span>
          </button>

          {/* How It Works Steps */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
            <h5 className="font-heading font-bold text-xs text-stone-800 uppercase tracking-wider">
              How it works (3 Simple Steps)
            </h5>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  1
                </span>
                <p>
                  <strong>Share your code:</strong> Send your WhatsApp link to friends & family in Waidhan (Majan Mod to Vindhyanagar).
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  2
                </span>
                <p>
                  <strong>Friend shops:</strong> They place their first fresh grocery order of ₹499 or more.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  3
                </span>
                <p>
                  <strong>Both get rewarded:</strong> You both get ₹50 credit off your orders or free grocery gifts!
                </p>
              </div>
            </div>
          </div>

          {/* Real-time Stats Card */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white border border-stone-200 rounded-xl p-2.5 shadow-2xs">
              <span className="text-[10px] text-stone-500 block font-medium">Invited</span>
              <span className="font-heading font-black text-base text-stone-900">0</span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-2.5 shadow-2xs">
              <span className="text-[10px] text-stone-500 block font-medium">Earned</span>
              <span className="font-heading font-black text-base text-emerald-700">₹0</span>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-2.5 shadow-2xs">
              <span className="text-[10px] text-stone-500 block font-medium">Next Reward</span>
              <span className="font-heading font-black text-base text-amber-600">₹50</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            Done & Back to Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
