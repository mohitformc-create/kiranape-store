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
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { compressImageFile, formatWhatsAppPhone } from '../utils/imageUtils';
import { saveParchiOrder, getCustomerSelectedLocation, saveCustomerPhone } from '../services/storageService';
import { dispatchOrderInBackground } from '../services/orderQueueService';
import { playOrderChime } from '../utils/sound';
import { StoreSettings } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { getStoreOwnerWhatsAppNotificationUrl } from '../utils/orderUtils';
import { CreatorCredits } from './CreatorCredits';
import { supabase } from '../config/supabase';
import { insertSupabaseOrder } from '../services/supabaseOrderService';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      // HTML5 Canvas compression: max 1200x1200px, JPEG format, quality 0.75 (clean Base64 dataURL)
      const base64 = await compressImageFile(file, 1200, 1200, 0.75);
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
      errs.image = 'कृपया पहले अपनी राशन पर्ची की फोटो खींचें या गैलरी से चुनें';
    }
    if (!customerName.trim()) {
      errs.customerName = 'कृपया अपना पूरा नाम लिखें';
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.customerPhone = 'कृपया 10 अंकों का मान्य मोबाइल नंबर लिखें';
    }
    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      errs.deliveryAddress = 'कृपया पूरा डिलीवरी पता लिखें';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !imagePreview) return;

    // 1. Instant Haptic Feedback & Audio Chime (0 milliseconds feedback)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([50, 50, 50]);
      } catch {
        // ignore if not supported
      }
    }
    playOrderChime();

    const selectedLoc = getCustomerSelectedLocation() || storeSettings.serviceArea || 'Waidhan, Singrauli';
    const parchiId = `PRC-${Date.now().toString().slice(-5)}`;

    // 2. Persist customer phone and parchi order locally immediately
    saveCustomerPhone(customerPhone.trim());
    saveParchiOrder({
      id: parchiId,
      customerName: customerName.trim(),
      phone: customerPhone.trim(),
      customerPhone: customerPhone.trim(),
      address: deliveryAddress.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryLocation: selectedLoc,
      slipPhoto: imagePreview,
      imageBase64: imagePreview,
      imageUrl: imagePreview,
      notes: notes.trim() || undefined,
      status: 'Pending',
    });

    // 3. Format WhatsApp notification URL for store owner
    const waUrl = getStoreOwnerWhatsAppNotificationUrl(
      {
        orderId: parchiId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryLocation: selectedLoc,
        orderType: 'parchi',
        textDetails: notes.trim() || undefined,
      },
      storeSettings
    );

    // 4. OPTIMISTIC CONFIRMATION: Instantly show success confirmation in 0 milliseconds
    setSubmittedWhatsAppUrl(waUrl);
    setSubmittedOrderId(parchiId);
    setIsSuccess(true);

    // 5. Trigger live updates for same-tab / cross-tab Admin
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    // 6. Asynchronously dispatch to Supabase & central server in background
    insertSupabaseOrder({
      id: parchiId,
      customerName: customerName.trim() || 'Customer',
      phone: customerPhone.trim() || 'Not provided',
      address: deliveryAddress.trim() || 'Store Pickup',
      items: notes.trim() ? [{ name: `Parchi Notes: ${notes.trim()}`, quantity: 1, price: 0 }] : [],
      total: 0,
      orderType: 'parchi',
      voiceData: null,
      parchiData: imagePreview || null,
      status: 'Pending',
    }).catch((err) => {
      console.warn('[Supabase Parchi Order Error]:', err);
    });

    dispatchOrderInBackground({
      id: parchiId,
      customerName: customerName.trim(),
      phone: customerPhone.trim(),
      address: deliveryAddress.trim(),
      deliveryLocation: selectedLoc,
      isParchi: true,
      orderType: 'parchi',
      slipPhoto: imagePreview,
      slipImageUrl: imagePreview,
      parchiBase64: imagePreview,
      parchiImageUrl: imagePreview,
      notes: notes.trim() || undefined,
    });
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setSubmittedOrderId(null);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col my-auto">
        {/* Header */}
        <div className="bg-emerald-800 text-white px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-xl shadow-xs">
              📸
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg leading-tight">
                फोटो पर्ची अपलोड करें (Ration Slip)
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

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
                Order #{submittedOrderId}
              </span>
              <h4 className="font-heading font-black text-stone-900 text-xl pt-1">
                ✅ आपकी राशन पर्ची जमा हो गई!
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
                दुकानदार आपकी पर्ची देखकर सामान तैयार कर रहे हैं। आपके घर तक डिलीवरी जल्द पहुंचेगी।
              </p>
            </div>

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
                  <span>पर्ची सुरक्षित सेव हो गई</span>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2.5 max-w-sm mx-auto">
              {/* WhatsApp Notification Button */}
              {submittedWhatsAppUrl && (
                <a
                  href={submittedWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>दुकानदार को WhatsApp पर सूचित करें</span>
                </a>
              )}

              <a
                href={`tel:${storeSettings.phone || STORE_DEFAULTS.phone}`}
                className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-heading font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>कॉल स्टोर हेल्पलाइन ({storeSettings.phone || STORE_DEFAULTS.phone})</span>
              </a>

              <button
                type="button"
                onClick={handleResetAndClose}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-heading font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                दुकान पर वापस जाएं (Done)
              </button>

              {/* Official Creator & Branding Credits */}
              <div className="pt-2 border-t border-stone-200">
                <CreatorCredits />
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Helpful Prompt */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-950">
              <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">टाइप करने की बिल्कुल ज़रूरत नहीं!</strong>
                <p className="text-[11px] text-amber-900/90 mt-0.5 leading-relaxed">
                  कागज पर लिखी किराने की पर्ची या डायरी की फोटो खींचें। दुकानदार सामान पैक करके आपके घर भिजवा देंगे।
                </p>
              </div>
            </div>

            {/* Photo Capture & Upload Area */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>1. राशन पर्ची की फोटो (Parchi Photo) <span className="text-rose-600">*</span></span>
              </label>

              {/* Hidden file inputs: Camera and Gallery */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {imagePreview ? (
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-stone-900 max-h-56 flex items-center justify-center shadow-sm">
                    <img
                      src={imagePreview}
                      alt="Handwritten Parchi"
                      className="w-full h-full object-contain max-h-56"
                    />
                    <div className="absolute bottom-2 right-2 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      <span>फोटो तैयार है</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-700" />
                      <span>फोटो बदलें</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImagePreview(null)}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>हटाएं</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* 1. Camera Capture Button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/60 hover:bg-emerald-100/60 text-emerald-950 flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                        {isCompressing ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-white" />
                        ) : (
                          <Camera className="w-6 h-6" />
                        )}
                      </div>
                      <span className="font-heading font-extrabold text-xs">
                        कैमरा खोलें
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        सीधे फोटो खींचें
                      </span>
                    </button>

                    {/* 2. Gallery Picker Button */}
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="p-4 rounded-2xl border-2 border-stone-300 hover:border-amber-500 bg-stone-50 hover:bg-amber-50/50 text-stone-900 flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-95 shadow-2xs cursor-pointer"
                    >
                      <div className="w-12 h-12 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <span className="font-heading font-extrabold text-xs">
                        गैलरी से चुनें
                      </span>
                      <span className="text-[10px] text-stone-500 font-medium">
                        पुराना फोटो अपलोड
                      </span>
                    </button>
                  </div>

                  {errors.image && (
                    <p className="text-xs text-rose-600 mt-1 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                      {errors.image}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Customer Details */}
            <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 space-y-3">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  2. आपका नाम (Full Name) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errors.customerName) setErrors({ ...errors, customerName: '' });
                    }}
                    placeholder="उदा. रमेश कुमार"
                    className="w-full pl-9 pr-3 py-2 bg-white text-stone-900 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                </div>
                {errors.customerName && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customerName}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  3. मोबाइल नंबर (10 Digits) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value.replace(/\D/g, ''));
                      if (errors.customerPhone) setErrors({ ...errors, customerPhone: '' });
                    }}
                    placeholder="10 अंकों का मोबाइल नंबर"
                    className="w-full pl-9 pr-3 py-2 bg-white text-stone-900 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                </div>
                {errors.customerPhone && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.customerPhone}</p>
                )}
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  4. पूरा पता (Full Doorstep Address) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      if (errors.deliveryAddress) setErrors({ ...errors, deliveryAddress: '' });
                    }}
                    placeholder="मकान / दुकान नंबर, गली, प्रसिद्ध स्थल..."
                    className="w-full pl-9 pr-3 py-2 bg-white text-stone-900 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                  />
                </div>
                {errors.deliveryAddress && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{errors.deliveryAddress}</p>
                )}
              </div>

              {/* Extra Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  5. कोई विशेष निर्देश या सामान की जानकारी (वैकल्पिक):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="उदा. सामान 1 बजे तक चाहिए, खुला बेसन मत भेजना..."
                  className="w-full px-3 py-2 bg-white text-stone-900 rounded-xl border border-stone-200 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 sticky bottom-0 bg-white/95 backdrop-blur-xs pb-1">
              <button
                type="submit"
                disabled={isCompressing}
                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-heading font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <Camera className="w-4 h-4 fill-white" />
                <span>फोटो पर्ची ऑर्डर भेजें (Cash on Delivery)</span>
              </button>
              <p className="text-[10px] text-stone-400 text-center mt-1.5 font-medium">
                🔒 सुरक्षित ऑर्डर • 100% कैश ऑन डिलीवरी • दुकान से ताज़ा सामान
              </p>

              {/* Official Creator & Branding Credits */}
              <div className="pt-2 mt-2 border-t border-stone-100">
                <CreatorCredits />
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ParchiUploadModal;
