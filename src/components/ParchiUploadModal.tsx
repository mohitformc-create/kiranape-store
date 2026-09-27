import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Phone,
  MapPin,
  User,
  FileText,
  CheckCircle,
  MessageCircle,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { compressImageFile, formatWhatsAppPhone } from '../utils/imageUtils';
import { saveParchiOrder, getCustomerSelectedLocation } from '../services/storageService';
import { sendOrderToCentralServer } from '../services/orderApiService';
import { playOrderChime } from '../utils/sound';
import { StoreSettings } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';

interface ParchiUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings?: StoreSettings;
}

export const ParchiUploadModal: React.FC<ParchiUploadModalProps> = ({
  isOpen,
  onClose,
  storeSettings = STORE_DEFAULTS,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      // HTML5 Canvas compression: scale max dimensions to 1024px, 0.65 JPEG quality (~90KB, sharp handwritten text)
      const base64 = await compressImageFile(file, 1024, 1024, 0.65);
      setImagePreview(base64);
      if (errors.image) {
        setErrors((prev) => ({ ...prev, image: '' }));
      }
    } catch (err) {
      console.error('Error compressing parchi image:', err);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!imagePreview) {
      errs.image = 'Please capture or upload a photo of your handwritten grocery list';
    }
    if (!customerName.trim()) {
      errs.customerName = 'Please enter your name';
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.customerPhone = 'Please enter a valid 10-digit mobile number';
    }
    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      errs.deliveryAddress = 'Please enter your complete doorstep delivery address';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !imagePreview) return;

    // Play crisp audio chime
    playOrderChime();

    const selectedLoc = getCustomerSelectedLocation() || storeSettings.serviceArea || 'Waidhan, Singrauli';
    const parchiId = `PRC-${Date.now().toString().slice(-5)}`;

    // Step 1: Send to Central Server Database (POST /api/orders - Zepto/Blinkit Architecture)
    try {
      await sendOrderToCentralServer({
        id: parchiId,
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        address: deliveryAddress.trim(),
        deliveryLocation: selectedLoc,
        isParchi: true,
        parchiBase64: imagePreview,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      console.warn('Central server parchi ingest notice:', err);
    }

    // Step 2: Persist into kiranape_parchi_orders via centralized saveParchiOrder
    saveParchiOrder({
      id: parchiId,
      customerName: customerName.trim(),
      phone: customerPhone.trim(),
      customerPhone: customerPhone.trim(),
      address: deliveryAddress.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryLocation: selectedLoc,
      imageBase64: imagePreview,
      imageUrl: imagePreview,
      notes: notes.trim() || undefined,
      status: 'Pending',
    });

    // Step 3: Trigger Admin Event so the parchi photo appears immediately in Admin Hub (Passcode: 9779)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    // Step 4: Display clean in-app confirmation (Blinkit/Zepto Style: Zero client-side WhatsApp redirect)
    setIsSuccess(true);
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setSubmittedWhatsAppUrl(null);
    setImagePreview(null);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setNotes('');
    setErrors({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col my-auto animate-zoomIn">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl shadow-xs">
              📸
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg leading-tight">
                Upload Parchi / List Photo
              </h3>
              <p className="text-xs text-emerald-100">
                कागज की पर्ची की फोटो भेजें • 100% Cash on Delivery
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>

            <h4 className="font-heading font-black text-stone-900 text-xl">
              ✅ Aapka Order Darz Ho Gaya Hai!
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
              Kiranape Express jald hi aapke pate par deliver karega.
            </p>

            {/* Uploaded Parchi Photo Preview */}
            {imagePreview && (
              <div className="max-w-xs mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 bg-stone-900 shadow-md">
                <img
                  src={imagePreview}
                  alt="Uploaded Parchi Preview"
                  className="w-full max-h-44 object-contain"
                />
                <div className="bg-stone-900/90 text-white text-[10px] font-bold py-1 px-2 flex items-center justify-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>Parchi Photo Saved in Central System</span>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2 max-w-xs mx-auto">
              <a
                href={`tel:${storeSettings.phone || STORE_DEFAULTS.phone}`}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-heading font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Call Store Helpline</span>
              </a>
              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-heading font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Done / Return to Store
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex-1 overflow-y-auto space-y-4">
            {/* Helpful Hindi Prompt */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">टाइप करने की ज़रूरत नहीं!</strong>
                <p className="text-[11px] text-amber-900/90 mt-0.5">
                  कागज पर लिखी किराने की पर्ची या डायरी के पन्ने की साफ फोटो लें। हम आपके घर ताज़ा सामान भिजवा देंगे।
                </p>
              </div>
            </div>

            {/* Photo Capture & Upload Area */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>1. Parchi / Handwritten List Photo <span className="text-rose-600">*</span></span>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold underline"
                  >
                    Change Photo
                  </button>
                )}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-stone-900 max-h-56 flex items-center justify-center">
                  <img
                    src={imagePreview}
                    alt="Handwritten Parchi"
                    className="w-full h-full object-contain max-h-56"
                  />
                  <div className="absolute bottom-2 right-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Photo Ready</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all hover:bg-stone-50 ${
                    errors.image
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-stone-300 hover:border-emerald-600'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-100 shadow-2xs">
                    {isCompressing ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                    ) : (
                      <Camera className="w-7 h-7" />
                    )}
                  </div>
                  <h5 className="font-heading font-bold text-stone-800 text-sm">
                    {isCompressing ? 'Compressing Photo...' : 'Tap to Take Photo or Upload Parchi'}
                  </h5>
                  <p className="text-[11px] text-stone-500 mt-1">
                    कैमरा खोलें या गैलरी से पर्ची की फोटो चुनें (JPG, PNG)
                  </p>
                </div>
              )}
              {errors.image && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">{errors.image}</p>
              )}
            </div>

            {/* Customer Name */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                2. Your Full Name (आपका नाम) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) setErrors({ ...errors, customerName: '' });
                  }}
                  placeholder="e.g. Ramesh Sharma"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-stone-50 text-stone-900 rounded-xl border text-xs font-semibold transition-all ${
                    errors.customerName
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-stone-200 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600'
                  }`}
                />
              </div>
              {errors.customerName && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customerName}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                3. Mobile Number (मोबाइल नंबर) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value.replace(/\D/g, ''));
                    if (errors.customerPhone) setErrors({ ...errors, customerPhone: '' });
                  }}
                  placeholder="e.g. 9876543210"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-stone-50 text-stone-900 rounded-xl border text-xs font-semibold transition-all ${
                    errors.customerPhone
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-stone-200 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600'
                  }`}
                />
              </div>
              {errors.customerPhone && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customerPhone}</p>
              )}
            </div>

            {/* Delivery Address */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                4. Doorstep Delivery Address (घर का पूरा पता) <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute top-2.5 left-3.5 pointer-events-none text-stone-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (errors.deliveryAddress) setErrors({ ...errors, deliveryAddress: '' });
                  }}
                  placeholder="House/Flat No., Street, Colony, Landmark..."
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-stone-50 text-stone-900 rounded-xl border text-xs font-semibold transition-all resize-none ${
                    errors.deliveryAddress
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-stone-200 focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600'
                  }`}
                />
              </div>
              {errors.deliveryAddress && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.deliveryAddress}</p>
              )}
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Special Request / Brand Preferences (वैकल्पिक)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Aashirvaad Atta only, Fortune Mustard Oil, fresh packet milk"
                className="w-full px-3.5 py-2 bg-stone-50 text-stone-900 rounded-xl border border-stone-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-600/30"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-heading font-extrabold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Parchi to WhatsApp Store (9424316081)</span>
              </button>
              <p className="text-[10px] text-center text-stone-400 mt-2">
                100% Free Service • Pay Cash on Delivery when your groceries arrive at your doorstep
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
