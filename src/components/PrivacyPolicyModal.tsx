import React, { useEffect } from 'react';
import { ShieldCheck, X, PhoneCall, Mail, MapPin, Lock, FileText, CheckCircle, Trash2, ArrowLeft } from 'lucide-react';
import { StoreSettings } from '../types';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings: StoreSettings;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  storeSettings,
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const helplinePhone = storeSettings.phone || '9424316081';
  const helplineEmail = 'mohitformc@gmail.com';
  const storeAddress = storeSettings.address || 'Chaurasia Kirana & General Store, Main Road, Waidhan, Singrauli, MP - 486886';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-policy-title" className="font-heading font-extrabold text-base sm:text-lg leading-tight">
                Privacy Policy
              </h2>
              <p className="text-[11px] text-stone-400">
                Chaurasia Kirana / Kiranape • Google Play Store Compliant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close Privacy Policy"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-stone-700 leading-relaxed">
          {/* Quick Notice Card */}
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-950 text-sm">Commitment to User Privacy</h4>
              <p className="text-emerald-900 mt-1 text-xs sm:text-xs">
                Chaurasia Kirana (Kiranape) values your trust. We collect only the minimum required information to fulfill your grocery delivery orders in Singrauli & Waidhan. We <strong>never sell, rent, or trade your personal data</strong> to third parties or advertisers.
              </p>
            </div>
          </div>

          {/* Section 1: Overview */}
          <section className="space-y-2">
            <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              1. Overview & Application Scope
            </h3>
            <p>
              This Privacy Policy explains how <strong>Chaurasia Kirana & General Store</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;Kiranape&quot;) collects, uses, protects, and discloses personal information when you use our mobile application and web ordering platform.
            </p>
            <p className="text-stone-500 text-xs">
              <strong>Last Updated:</strong> September 2026 • Effective for all users in India.
            </p>
          </section>

          {/* Section 2: Data We Collect */}
          <section className="space-y-2">
            <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              2. Information We Collect
            </h3>
            <p>
              When you place an order or create an account, we collect only information necessary to deliver items to your doorstep:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-stone-600">
              <li><strong>Customer Name:</strong> To identify the recipient of the grocery order.</li>
              <li><strong>Phone / Mobile Number:</strong> To send order confirmation updates, WhatsApp receipts, and allow delivery personnel to contact you during delivery.</li>
              <li><strong>Delivery Address:</strong> House/room number, landmark, street, and town (e.g. Waidhan, Singrauli) to ensure accurate delivery.</li>
              <li><strong>Order History & Cart Items:</strong> Products, quantities, timestamps, and chosen delivery slots to prepare and fulfill your package.</li>
            </ul>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <strong>No Financial or Card Data Collected:</strong> Kiranape operates strictly on <strong>Cash on Delivery (COD)</strong>. We do not collect or store debit card, credit card, net banking, or UPI PIN credentials.
            </div>
          </section>

          {/* Section 3: How We Use Data */}
          <section className="space-y-2">
            <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-700" />
              3. Purpose & How We Use Your Information
            </h3>
            <p>We use your information exclusively for legitimate local business operations:</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-stone-600">
              <li>To pack, dispatch, and fulfill your groceries within 30–45 minutes.</li>
              <li>To provide live order tracking and delivery status updates.</li>
              <li>To answer support queries, address missing item claims, or provide helpline assistance.</li>
              <li>To maintain active store inventory records based on local grocery demand.</li>
            </ul>
          </section>

          {/* Section 4: Zero Selling or Sharing */}
          <section className="space-y-2">
            <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              4. No Third-Party Selling or Advertising Sharing
            </h3>
            <p className="bg-stone-100 p-3 rounded-xl border border-stone-200/80 font-medium text-stone-800">
              <strong>Strict Guarantee:</strong> We do NOT sell, lease, monetize, or disclose your personal information, phone numbers, or addresses to third-party marketing companies, advertisers, or external data brokers.
            </p>
            <p className="text-stone-600 text-xs">
              Your details are accessible solely by authorized Chaurasia Kirana staff for packing and local delivery drivers for locating your address.
            </p>
          </section>

          {/* Section 5: Data Storage & Security */}
          <section className="space-y-2">
            <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              5. Data Security & Cloud Infrastructure
            </h3>
            <p>
              Your data is stored securely using <strong>Google Cloud Firestore</strong> infrastructure with SSL/TLS encryption in transit and AES-256 encryption at rest. Firestore access is protected by strict role-based security rules.
            </p>
          </section>

          {/* Section 6: Data Retention & Deletion Rights */}
          <section className="space-y-2">
            <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base flex items-center gap-2 text-rose-700">
              <Trash2 className="w-4 h-4 text-rose-600" />
              6. Your Rights & Data Deletion Policy (Play Store Compliant)
            </h3>
            <p>
              Under Google Play Store Developer Policies and Indian Information Technology laws, you have full ownership of your data. You may request:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-stone-600">
              <li>A copy of all information associated with your phone number.</li>
              <li>Correction of your delivery address or contact name.</li>
              <li><strong>Complete deletion</strong> of your account profile and historic order records from our database.</li>
            </ul>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2 text-xs">
              <p className="font-semibold text-stone-900">How to request data deletion:</p>
              <p>
                Send a WhatsApp message or SMS with the word <strong>&quot;DELETE MY DATA&quot;</strong> along with your registered mobile number to our helpline:
              </p>
              <div className="flex flex-wrap items-center gap-4 text-emerald-800 font-semibold pt-1">
                <a href={`tel:${helplinePhone}`} className="flex items-center gap-1 hover:underline">
                  <PhoneCall className="w-3.5 h-3.5" /> Call/WhatsApp: {helplinePhone}
                </a>
                <a href={`mailto:${helplineEmail}?subject=Data%20Deletion%20Request%20-%20Kiranape`} className="flex items-center gap-1 hover:underline">
                  <Mail className="w-3.5 h-3.5" /> Email: {helplineEmail}
                </a>
              </div>
              <p className="text-stone-500 text-[11px]">
                Upon receiving your request, your personal records will be permanently purged from our database within 48 hours.
              </p>
            </div>
          </section>

          {/* Section 7: Contact & Store Information */}
          <section className="space-y-2 border-t border-stone-200 pt-4">
            <h3 className="font-heading font-bold text-stone-900 text-sm sm:text-base">
              7. Store Contact & Grievance Details
            </h3>
            <p className="text-xs text-stone-600">
              If you have any questions or concerns regarding this policy, please reach out directly:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-stone-50 p-3 rounded-xl border border-stone-200">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Address:</strong> {storeAddress}</span>
              </div>
              <div className="flex items-start gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Helpline:</strong> +91 {helplinePhone}</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Email:</strong> {helplineEmail}</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Operating Hours:</strong> 6:30 AM - 10:30 PM (Daily)</span>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-5 py-3 border-t border-stone-200 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            © {new Date().getFullYear()} Chaurasia Kirana (Kiranape)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </button>
        </div>
      </div>
    </div>
  );
};
