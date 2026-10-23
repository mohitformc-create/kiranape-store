import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  X,
  Send,
  ShoppingBag,
  CheckCircle,
  Sparkles,
  Trash2,
  MapPin,
  Phone,
  User,
  ArrowRight,
  MessageCircle,
  Copy,
  Check,
} from 'lucide-react';
import { StoreSettings } from '../types';
import {
  saveParchiOrder,
  getSavedCustomerPhone,
  saveCustomerPhone,
  getCustomerSelectedLocation,
} from '../services/storageService';
import { insertSupabaseOrder } from '../services/supabaseOrderService';
import { dispatchOrderInBackground } from '../services/orderQueueService';
import { playOrderChime } from '../utils/sound';

interface DigitalParchiModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings: StoreSettings;
}

// Popular Kirana Quick Add Suggestion Chips
const QUICK_GROCERY_CHIPS = [
  '5kg आशीर्वाद आटा',
  '1L फॉर्च्यून सरसों तेल',
  '1kg चीनी',
  '1kg अरहर (तूर) दाल',
  '1 टाटा नमक',
  '250g टाटा चायपत्ती',
  '1kg बासमती चावल',
  '1kg सर्फ एक्सेल',
  '1 डेटॉल साबुन',
  '1 पैकेट पारले-जी',
  '1kg आलू',
  '1kg प्याज',
];

export const DigitalParchiModal: React.FC<DigitalParchiModalProps> = ({
  isOpen,
  onClose,
  storeSettings,
}) => {
  const [parchiText, setParchiText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [submittedWhatsAppUrl, setSubmittedWhatsAppUrl] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [errors, setErrors] = useState<{
    parchiText?: string;
    customerName?: string;
    customerPhone?: string;
    deliveryAddress?: string;
  }>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved phone & location on open
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setSubmittedOrderId(null);
      setSubmittedWhatsAppUrl(null);
      setErrors({});

      const savedPhone = getSavedCustomerPhone();
      if (savedPhone) setCustomerPhone(savedPhone);

      const savedLoc = getCustomerSelectedLocation();
      if (savedLoc && !deliveryAddress) {
        setDeliveryAddress(savedLoc);
      }

      // Auto-focus the notepad textarea after modal transition
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Real-time line item counter (counting non-empty lines)
  const nonBlankLines = parchiText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const itemsCount = nonBlankLines.length;

  // Quick Chip click handler: Appends new item with numbering
  const handleAddChip = (chipText: string) => {
    setParchiText((prev) => {
      const trimmed = prev.trim();
      const nextNumber = itemsCount + 1;
      const formattedEntry = `${nextNumber}. ${chipText}`;
      if (!trimmed) {
        return `${formattedEntry}\n`;
      }
      return `${trimmed}\n${formattedEntry}\n`;
    });
    // Focus back on textarea
    textareaRef.current?.focus();
  };

  // Clear all text
  const handleClear = () => {
    if (parchiText.trim() && !window.confirm('क्या आप पर्ची की सारी लिस्ट साफ़ करना चाहते हैं?')) {
      return;
    }
    setParchiText('');
    setErrors((prev) => ({ ...prev, parchiText: undefined }));
    textareaRef.current?.focus();
  };

  // Copy list text to clipboard
  const handleCopy = () => {
    if (!parchiText.trim()) return;
    navigator.clipboard?.writeText(parchiText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Build clean WhatsApp link
  const buildWhatsAppMessageUrl = (orderId: string, phoneNum?: string, addr?: string, name?: string) => {
    const rawStorePhone = storeSettings?.whatsapp || storeSettings?.phone || '9424316081';
    const cleanStorePhone = rawStorePhone.replace(/\D/g, '').slice(-10);
    const storeTarget = `91${cleanStorePhone}`;

    const storeName = storeSettings?.name || 'Chaurasia Kirana Store';
    const finalName = (name || customerName).trim() || 'ग्राहक';
    const finalPhone = (phoneNum || customerPhone).trim() || 'Not provided';
    const finalAddr = (addr || deliveryAddress).trim() || storeSettings?.serviceArea || 'Waidhan, Singrauli';

    const message = `🛒 *नई डिजिटल किराना पर्ची (Grocery Order List)*
🏪 *${storeName} (Kiranape Express)*
━━━━━━━━━━━━━━━━━━━━
🆔 *पर्ची नंबर:* #${orderId}
👤 *ग्राहक:* ${finalName}
📱 *फ़ोन:* ${finalPhone}
📍 *डिलीवरी पता:* ${finalAddr}
━━━━━━━━━━━━━━━━━━━━
📝 *सामान की लिस्ट (Items List):*
${parchiText.trim()}

━━━━━━━━━━━━━━━━━━━━
💵 *भुगतान विधि:* कैश ऑन डिलीवरी (Cash on Delivery - COD)
ℹ️ _कृपया यह सामान पैक करके घर भिजवा दीजिए।_`;

    return `https://wa.me/${storeTarget}?text=${encodeURIComponent(message)}`;
  };

  // Validation function
  const validateForm = (requireFullAddress: boolean = true) => {
    const newErrors: typeof errors = {};

    if (!parchiText.trim()) {
      newErrors.parchiText = 'कृपया पर्ची में कम से कम 1 सामान का नाम और मात्रा लिखें।';
    }

    if (requireFullAddress) {
      if (!customerName.trim()) {
        newErrors.customerName = 'कृपया अपना नाम दर्ज करें।';
      }

      const cleanPhone = customerPhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        newErrors.customerPhone = 'कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें।';
      }

      if (!deliveryAddress.trim() || deliveryAddress.trim().length < 4) {
        newErrors.deliveryAddress = 'कृपया पूरा डिलीवरी पता (मकान नंबर / गली / इलाका) दर्ज करें।';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ACTION 1: Send via WhatsApp
  const handleWhatsAppOrder = () => {
    if (!parchiText.trim()) {
      setErrors({ parchiText: 'कृपया पर्ची में सामान का नाम और मात्रा लिखें।' });
      textareaRef.current?.focus();
      return;
    }

    const parchiId = `PRC-${Date.now().toString().slice(-5)}`;
    const selectedLoc = getCustomerSelectedLocation() || storeSettings.serviceArea || 'Waidhan, Singrauli';
    const finalName = customerName.trim() || 'Customer';
    const finalPhone = customerPhone.trim() || '';
    const finalAddress = deliveryAddress.trim() || selectedLoc;

    if (finalPhone) {
      saveCustomerPhone(finalPhone);
    }

    // Persist locally in store records
    saveParchiOrder({
      id: parchiId,
      customerName: finalName,
      phone: finalPhone,
      customerPhone: finalPhone,
      address: finalAddress,
      deliveryAddress: finalAddress,
      deliveryLocation: selectedLoc,
      notes: `📝 डिजिटल पर्ची:\n${parchiText.trim()}`,
      status: 'Pending',
    });

    // Background push to Supabase
    insertSupabaseOrder({
      id: parchiId,
      customerName: finalName,
      phone: finalPhone || 'Not provided',
      address: finalAddress,
      items: nonBlankLines.map((item, idx) => ({ name: item, quantity: 1, price: 0, index: idx + 1 })),
      total: 0,
      orderType: 'parchi',
      voiceData: null,
      parchiData: null,
      status: 'Pending',
    }).catch(console.warn);

    dispatchOrderInBackground({
      id: parchiId,
      customerName: finalName,
      phone: finalPhone,
      address: finalAddress,
      deliveryLocation: selectedLoc,
      isParchi: true,
      orderType: 'parchi',
      notes: `📝 डिजिटल पर्ची:\n${parchiText.trim()}`,
    });

    playOrderChime();

    // Trigger WhatsApp deep link
    const waUrl = buildWhatsAppMessageUrl(parchiId, finalPhone, finalAddress, finalName);
    window.open(waUrl, '_blank');

    setSubmittedOrderId(parchiId);
    setSubmittedWhatsAppUrl(waUrl);
    setIsSuccess(true);
  };

  // ACTION 2: Direct Store Delivery Order (App Checkout)
  const handleDirectOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm(true)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const parchiId = `PRC-${Date.now().toString().slice(-5)}`;
      const selectedLoc = getCustomerSelectedLocation() || storeSettings.serviceArea || 'Waidhan, Singrauli';
      const cleanPhone = customerPhone.trim();

      saveCustomerPhone(cleanPhone);

      // 1. Save in local Parchi repository & main orders
      saveParchiOrder({
        id: parchiId,
        customerName: customerName.trim(),
        phone: cleanPhone,
        customerPhone: cleanPhone,
        address: deliveryAddress.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryLocation: selectedLoc,
        notes: `📝 डिजिटल पर्ची:\n${parchiText.trim()}`,
        status: 'Pending',
      });

      // 2. Play store chime & mobile haptic
      playOrderChime();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {}
      }

      // 3. Dispatch in background to Supabase Cloud & Central Express Server
      insertSupabaseOrder({
        id: parchiId,
        customerName: customerName.trim(),
        phone: cleanPhone,
        address: deliveryAddress.trim(),
        items: nonBlankLines.map((item, idx) => ({ name: item, quantity: 1, price: 0, index: idx + 1 })),
        total: 0,
        orderType: 'parchi',
        voiceData: null,
        parchiData: null,
        status: 'Pending',
      }).catch(console.warn);

      dispatchOrderInBackground({
        id: parchiId,
        customerName: customerName.trim(),
        phone: cleanPhone,
        address: deliveryAddress.trim(),
        deliveryLocation: selectedLoc,
        isParchi: true,
        orderType: 'parchi',
        notes: `📝 डिजिटल पर्ची:\n${parchiText.trim()}`,
      });

      // 4. Update UI event listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('kiranape_orders_updated'));
        window.dispatchEvent(new Event('storage'));
      }

      const waUrl = buildWhatsAppMessageUrl(parchiId, cleanPhone, deliveryAddress.trim(), customerName.trim());
      setSubmittedOrderId(parchiId);
      setSubmittedWhatsAppUrl(waUrl);
      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting digital parchi order:', err);
      alert('ऑर्डर दर्ज करने में कोई समस्या हुई। कृपया दोबारा प्रयास करें या सीधे WhatsApp पर भेजें।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setParchiText('');
    setSubmittedOrderId(null);
    setSubmittedWhatsAppUrl(null);
    setErrors({});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="digital-parchi-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 text-amber-300 flex items-center justify-center border border-white/20 shadow-xs flex-shrink-0">
              <FileText className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <h3 id="digital-parchi-title" className="font-heading font-black text-base sm:text-lg leading-tight flex items-center gap-1.5">
                <span>📝 डिजिटल किराना पर्ची</span>
                <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Quick Note
                </span>
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                सामान के नाम और मात्रा लिखें, हम पैक करके घर भेज देंगे
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
            title="बंद करें (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* SUCCESS SCREEN */}
          {isSuccess ? (
            <div className="text-center py-6 sm:py-8 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md border-4 border-emerald-50 animate-bounce">
                <CheckCircle className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-mono font-black px-3 py-1 rounded-full border border-emerald-300">
                  Order ID: #{submittedOrderId}
                </span>
                <h4 className="font-heading font-black text-xl text-stone-900 mt-2">
                  आपकी डिजिटल पर्ची दर्ज हो गई है!
                </h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto mt-1">
                  दुकानदार आपकी पर्ची देखकर सामान पैक कर रहे हैं। डिलीवरी पर नकद भुगतान (COD) करें।
                </p>
              </div>

              {/* Parchi Summary Box */}
              <div className="bg-[#fffdf5] border-2 border-dashed border-amber-300 rounded-2xl p-4 text-left max-w-md mx-auto shadow-2xs">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-2 mb-2 text-xs font-bold text-amber-900">
                  <span>📝 आपकी लिखी पर्ची ({itemsCount} आइटम्स):</span>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-black">
                    COD Order
                  </span>
                </div>
                <pre className="text-xs text-stone-800 font-sans whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto pr-1">
                  {parchiText}
                </pre>
              </div>

              {/* Action Buttons in Success Screen */}
              <div className="pt-2 space-y-2.5 max-w-sm mx-auto">
                {submittedWhatsAppUrl && (
                  <a
                    href={submittedWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-heading font-black text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>WhatsApp पर भी दुकानदार को सूचित करें</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  दुकान पर वापस जाएं (Back to Store)
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE ENTRY FORM */
            <form onSubmit={handleDirectOrder} className="space-y-4">
              {/* RULED NOTEBOOK NOTEPAD CONTAINER */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <label htmlFor="digital-parchi-textarea" className="font-heading font-black text-stone-900 flex items-center gap-1.5">
                    <span>सामान की लिस्ट लिखें (Type Items Line by Line):</span>
                    <span className="text-rose-600 font-black">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    {/* Live Line Counter Badge */}
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      📝 {itemsCount} {itemsCount === 1 ? 'सामान' : 'सामान'}
                    </span>

                    {/* Clear Button */}
                    {parchiText.trim() && (
                      <button
                        type="button"
                        onClick={handleClear}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="साफ़ करें"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>साफ़ करें</span>
                      </button>
                    )}

                    {/* Copy Button */}
                    {parchiText.trim() && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer transition-colors"
                        title="कॉपी करें"
                      >
                        {copiedNotification ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">कॉपी हुआ!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>कॉपी</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* The Ruled Notepad Textarea with red vertical margin rule */}
                <div className="relative rounded-2xl border-2 border-amber-300/80 bg-[#fffdf5] shadow-xs overflow-hidden transition-all focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20">
                  {/* Left Red Margin Rule (Authentic Notebook Paper Feel) */}
                  <div className="absolute left-7 top-0 bottom-0 w-px bg-rose-300/80 pointer-events-none" />

                  <textarea
                    id="digital-parchi-textarea"
                    ref={textareaRef}
                    rows={7}
                    value={parchiText}
                    onChange={(e) => {
                      setParchiText(e.target.value);
                      if (errors.parchiText) {
                        setErrors((prev) => ({ ...prev, parchiText: undefined }));
                      }
                    }}
                    placeholder={`उदा.\n1. 5 किलो आशीर्वाद आटा\n2. 1 लीटर सरसों तेल\n3. 1 किलो चीनी\n4. 500 ग्राम अरहर दाल\n5. 1 पैकेट टाटा नमक...`}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-stone-900 placeholder:text-stone-400 font-sans text-xs sm:text-sm leading-7 resize-y focus:outline-hidden"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #e8dfc8 28px)',
                      backgroundAttachment: 'local',
                    }}
                  />
                </div>

                {errors.parchiText && (
                  <p className="text-xs font-semibold text-rose-600 pl-1">{errors.parchiText}</p>
                )}
              </div>

              {/* QUICK ADD SUGGESTION CHIPS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold px-1">
                  <span className="flex items-center gap-1 text-stone-700">
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                    <span>जल्दी जोड़ने के लिए टैप करें (Quick Add):</span>
                  </span>
                  <span>1-Tap Add</span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none no-scrollbar touch-pan-x">
                  {QUICK_GROCERY_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleAddChip(chip)}
                      className="flex-shrink-0 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-stone-800 hover:text-stone-950 border border-amber-200/90 rounded-xl text-[11px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* CUSTOMER DELIVERY DETAILS */}
              <div className="bg-stone-50/80 rounded-2xl p-3 sm:p-3.5 border border-stone-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h4 className="font-heading font-black text-xs sm:text-sm text-stone-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    <span>डिलीवरी की जानकारी (Doorstep Details)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    COD Only
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Name Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      आपका नाम (Customer Name) <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: undefined }));
                        }}
                        placeholder="उदा. राहुल शर्मा"
                        className={`w-full pl-8 pr-3 py-2 bg-white rounded-xl text-xs border font-medium focus:outline-hidden transition-colors ${
                          errors.customerName
                            ? 'border-rose-400 ring-1 ring-rose-300'
                            : 'border-stone-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        }`}
                      />
                    </div>
                    {errors.customerName && (
                      <p className="text-[10px] font-semibold text-rose-600 mt-0.5">{errors.customerName}</p>
                    )}
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      मोबाइल नंबर (10-Digit Mobile) <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
                      <input
                        type="tel"
                        maxLength={10}
                        value={customerPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setCustomerPhone(val);
                          if (errors.customerPhone) setErrors((prev) => ({ ...prev, customerPhone: undefined }));
                        }}
                        placeholder="उदा. 9876543210"
                        className={`w-full pl-8 pr-3 py-2 bg-white rounded-xl text-xs border font-medium focus:outline-hidden transition-colors ${
                          errors.customerPhone
                            ? 'border-rose-400 ring-1 ring-rose-300'
                            : 'border-stone-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                        }`}
                      />
                    </div>
                    {errors.customerPhone && (
                      <p className="text-[10px] font-semibold text-rose-600 mt-0.5">{errors.customerPhone}</p>
                    )}
                  </div>
                </div>

                {/* Delivery Address Input */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    पूरा पता (Full Doorstep Address & Landmark) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      if (errors.deliveryAddress) setErrors((prev) => ({ ...prev, deliveryAddress: undefined }));
                    }}
                    placeholder="मकान नंबर, गली, लैंडमार्क, वार्ड / कॉलोनी..."
                    className={`w-full px-3 py-2 bg-white rounded-xl text-xs border font-medium focus:outline-hidden transition-colors ${
                      errors.deliveryAddress
                        ? 'border-rose-400 ring-1 ring-rose-300'
                        : 'border-stone-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                    }`}
                  />
                  {errors.deliveryAddress && (
                    <p className="text-[10px] font-semibold text-rose-600 mt-0.5">{errors.deliveryAddress}</p>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS (Two clear, prominent options) */}
              <div className="pt-1 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Button 1: Send via WhatsApp */}
                  <button
                    type="button"
                    id="digital-parchi-whatsapp-btn"
                    onClick={handleWhatsAppOrder}
                    disabled={!parchiText.trim() || isSubmitting}
                    className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] disabled:opacity-50 text-white font-heading font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    title="पर्ची सीधे व्हाट्सएप पर भेजें"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>📲 WhatsApp पर पर्ची भेजें</span>
                  </button>

                  {/* Button 2: Direct Store Delivery Order */}
                  <button
                    type="submit"
                    id="digital-parchi-direct-order-btn"
                    disabled={!parchiText.trim() || isSubmitting}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] disabled:opacity-50 text-white font-heading font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    title="दुकान पर डायरेक्ट आर्डर दर्ज करें"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>{isSubmitting ? 'ऑर्डर दर्ज हो रहा है...' : '🛒 सीधे आर्डर करें (COD)'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-3 text-[11px] text-stone-500 font-medium text-center">
                  <span>✓ नकद भुगतान (COD)</span>
                  <span>•</span>
                  <span>✓ कोई मिनिमम आर्डर नहीं</span>
                  <span>•</span>
                  <span>✓ शुद्ध व ताज़ा सामान</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalParchiModal;
