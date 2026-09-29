import React, { useState } from 'react';
import { X, User, Lock, Mail, Phone, Store, LogIn, UserPlus } from 'lucide-react';
import { AppUser } from '../types';
import { signUpCustomer, signInCustomer } from '../services/firebase';
import { CreatorCredits } from './CreatorCredits';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: AppUser) => void;
  onSuccess?: (user: AppUser) => void;
  adminPin?: string;
  defaultTab?: 'customer' | 'admin';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onSuccess,
}) => {
  const [customerMode, setCustomerMode] = useState<'login' | 'signup'>('login');

  // Customer Form State
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Status & Error handling
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const triggerAuthSuccess = (user: AppUser) => {
    onAuthSuccess?.(user);
    onSuccess?.(user);
    onClose();
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (customerMode === 'signup') {
        if (!customerName?.trim()) throw new Error('Please enter your full name');
        if (!customerEmail?.trim()) throw new Error('Please enter your email');
        if (!customerPhone?.trim()) throw new Error('Please enter your phone number');
        if ((customerPassword || '').length < 6) throw new Error('Password must be at least 6 characters');

        const user = await signUpCustomer(customerEmail, customerPassword, customerName, customerPhone);
        triggerAuthSuccess(user);
      } else {
        if (!customerEmail?.trim()) throw new Error('Please enter your email');
        if (!customerPassword) throw new Error('Please enter your password');

        const user = await signInCustomer(customerEmail, customerPassword);
        triggerAuthSuccess(user);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="bg-stone-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-extrabold">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base leading-tight">
                Chaurasia Kirana Account
              </h3>
              <p className="text-xs text-stone-300">
                Log in or sign up to manage and track your orders
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

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            {/* Customer Switcher */}
              <div className="flex items-center justify-center gap-4 mb-4 border-b border-stone-200/80 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('login');
                    setErrorMsg(null);
                  }}
                  className={`text-xs font-bold transition-all cursor-pointer pb-1 border-b-2 ${
                    customerMode === 'login'
                      ? 'border-emerald-600 text-emerald-800'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Customer Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('signup');
                    setErrorMsg(null);
                  }}
                  className={`text-xs font-bold transition-all cursor-pointer pb-1 border-b-2 ${
                    customerMode === 'signup'
                      ? 'border-emerald-600 text-emerald-800'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  Create New Account
                </button>
              </div>

              <form onSubmit={handleCustomerSubmit} className="space-y-3">
                {customerMode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-4"
                >
                  {customerMode === 'signup' ? (
                    <>
                      <UserPlus className="w-4 h-4" /> Create Customer Account
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" /> Log In as Customer
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-3 border-t border-stone-100 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                >
                  Continue shopping as Guest (No login needed to order COD)
                </button>
              </div>

              {/* Creator & Branding Credits */}
              <div className="mt-4 pt-3 border-t border-stone-100">
                <CreatorCredits />
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};
