import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, AlertCircle, KeyRound, ShieldCheck, ArrowRight } from 'lucide-react';
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
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [shake, setShake] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShake(false);
      setShowPassword(false);
      // Auto-focus the password input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPassword = (getAdminPin?.() || '@2508')?.toString()?.trim() || '@2508';

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const enteredPassword = password.trim();

    // Accept BOTH "@2508" and "2508" (without @ symbol), or stored configured pin
    const isMatch =
      enteredPassword === '@2508' ||
      enteredPassword === '2508' ||
      enteredPassword === currentPassword ||
      enteredPassword === currentPassword.replace(/^@/, '');

    if (isMatch) {
      setError('');
      // Store session state immediately
      try {
        sessionStorage.setItem('kiranape_admin_auth', 'true');
        sessionStorage.setItem('kiranape_admin_authenticated', 'true');
      } catch {
        // ignore
      }
      onSuccess();
    } else {
      setShake(true);
      setError('गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg leading-tight">Store Owner Access</h3>
              <p className="text-xs text-stone-300">Enter Admin Password to manage store</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700/50 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          <form onSubmit={handleVerify} className="w-full space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="admin-password-input" className="block text-xs font-bold text-stone-700">
                Admin Password / सिक्योरिटी पासवर्ड:
              </label>

              {/* Password Input with Show/Hide Toggle */}
              <div className="relative flex items-center">
                <input
                  id="admin-password-input"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter Admin Password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 font-mono text-base tracking-wider focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 p-1.5 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer rounded-lg"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error ? (
              <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold bg-rose-50 border border-rose-200/80 p-2.5 rounded-xl animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-stone-400 text-xs py-0.5 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Restricted to Chaurasia Kirana store owner</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="admin-verify-btn"
              type="submit"
              disabled={!password.trim()}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 active:scale-[0.99] text-white font-heading font-extrabold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Submit & Open Admin Panel</span>
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
