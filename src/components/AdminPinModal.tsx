import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, AlertCircle, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import { getAdminPin } from '../services/storageService';
import { CreatorCredits } from './CreatorCredits';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setShake(false);
      setShowPassword(false);
      // Auto-focus the 4-digit PIN input
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStoredPin = (getAdminPin?.() || '2508')?.toString()?.trim() || '2508';

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = pin.trim();

    // Strict hardcoded verification: If PIN === "2508" (or "@2508" or stored PIN)
    const isMatch =
      entered === '2508' ||
      entered === '@2508' ||
      entered === currentStoredPin ||
      entered === currentStoredPin.replace(/^@/, '');

    if (isMatch) {
      setError('');
      onSuccess();
    } else {
      setShake(true);
      setError('गलत पिन! कृपया पुनः प्रयास करें।');
      setTimeout(() => {
        setShake(false);
      }, 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-stone-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden ${
          shake ? 'animate-bounce' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-emerald-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg leading-tight text-white">
                Admin Mode Access
              </h3>
              <p className="text-xs text-amber-300 font-medium">
                Enter Admin PIN (4 अंक दर्ज करें)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          <form onSubmit={handleVerify} className="w-full space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="admin-pin-input" className="block text-xs font-bold text-stone-700">
                Enter Admin PIN (4 अंक दर्ज करें):
              </label>

              {/* 4-Digit Masked Password Field */}
              <div className="relative flex items-center">
                <input
                  id="admin-pin-input"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter 4-digit PIN (2508)"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 font-mono text-center text-lg tracking-widest font-extrabold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1.5 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer rounded-lg"
                  title={showPassword ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error ? (
              <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200/80 p-2.5 rounded-xl animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-stone-400 text-xs py-0.5 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Default PIN: 2508 (Quick-Edit Access)</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="admin-verify-btn"
              type="submit"
              disabled={!pin.trim()}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 active:scale-[0.99] text-white font-heading font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Unlock Admin Mode (एडमिन मोड ऑन करें)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Creator & Branding Credits */}
          <div className="w-full mt-4 pt-3 border-t border-stone-100">
            <CreatorCredits />
          </div>
        </div>
      </div>
    </div>
  );
};
