import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Send,
  Plus,
  Trash2,
  Phone,
  User,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Square,
  RotateCcw,
  FileText,
  ShoppingBag,
} from 'lucide-react';
import { playOrderChime } from '../utils/sound';
import {
  getCustomerSelectedLocation,
  getSavedCustomerPhone,
  saveCustomerPhone,
  saveVoiceNoteOrder,
  saveParchiOrder,
} from '../services/storageService';
import { sendOrderToCentralServer } from '../services/orderApiService';
import { StoreSettings } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import {
  ParsedGroceryItem,
  parseSingleGroceryItem,
  parseVoiceStreamToItems,
} from '../utils/groceryVoiceParser';

interface VoiceGroceryModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings?: StoreSettings;
}

export const VoiceGroceryModal: React.FC<VoiceGroceryModalProps> = ({
  isOpen,
  onClose,
  storeSettings = STORE_DEFAULTS,
}) => {
  // Parsed grocery list items
  const [groceryItems, setGroceryItems] = useState<ParsedGroceryItem[]>([
    parseSingleGroceryItem('2 packet Tata Namak (1kg)'),
    parseSingleGroceryItem('1 packet Fortune Refined Oil (1L)'),
    parseSingleGroceryItem('1 kilo Chana Dal'),
  ]);
  const [manualInput, setManualInput] = useState('');
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Customer Delivery Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState(() => getSavedCustomerPhone() || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('Morning (10:00 AM - 2:00 PM)');
  const [selectedLocation, setSelectedLocation] = useState(
    () => getCustomerSelectedLocation() || storeSettings.serviceArea || 'Waidhan, Singrauli'
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Pure Audio Recording Mode (Fallback for Android WebViews / unsupported SpeechRecognition)
  const [isPureAudioMode, setIsPureAudioMode] = useState(false);

  // MediaRecorder Audio Note Engine (Runs in parallel with speech dictation)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingUrl, setAudioRecordingUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const audioBase64Ref = useRef<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const [micBlocked, setMicBlocked] = useState(false);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s} / 01:00`;
  };

  const handleIncomingSpeechChunk = useCallback((spokenText: string) => {
    if (!spokenText || !spokenText.trim()) return;

    const parsedItems = parseVoiceStreamToItems(spokenText);
    if (parsedItems.length === 0) return;

    setGroceryItems((prev) => {
      const existingNames = new Set(prev.map((it) => it.formatted.toLowerCase()));
      const toAdd = parsedItems.filter((it) => !existingNames.has(it.formatted.toLowerCase()));

      if (toAdd.length === 0) return prev;

      // Highlight the most recently added item
      setLastAddedId(toAdd[toAdd.length - 1].id);
      setTimeout(() => setLastAddedId(null), 2500);

      return [...prev, ...toAdd];
    });
  }, []);

  // Parallel MediaRecorder Audio Note Engine Functions
  const startAudioCaptureWithStream = (stream: MediaStream) => {
    try {
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        const candidateTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/aac',
          'audio/ogg',
          '',
        ];
        mimeType = candidateTypes.find((type) => !type || MediaRecorder.isTypeSupported(type)) || '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 59) {
            // Auto stop at 60 seconds (1 minute limit)
            stopAudioCapture();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('MediaRecorder audio capture notice:', err);
      setIsRecordingAudio(false);
    }
  };

  const stopAudioCapture = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setIsRecordingAudio(false);

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(audioBase64Ref.current || audioBase64 || null);
        return;
      }

      recorder.onstop = () => {
        try {
          if (audioChunksRef.current.length > 0) {
            const mime = recorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mime });
            const url = URL.createObjectURL(audioBlob);
            setAudioRecordingUrl(url);

            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                const b64 = reader.result;
                setAudioBase64(b64);
                audioBase64Ref.current = b64;
                resolve(b64);
              } else {
                resolve(audioBase64Ref.current || null);
              }
            };
            reader.readAsDataURL(audioBlob);
          } else {
            resolve(audioBase64Ref.current || null);
          }
        } catch (e) {
          console.warn('Error exporting audio as base64:', e);
          resolve(audioBase64Ref.current || null);
        } finally {
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
          }
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        console.warn('Recorder stop error:', err);
        resolve(audioBase64Ref.current || null);
      }
    });
  };

  // Clean up recording tracks on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Continuous speech recognition engine - DECOUPLED from MediaRecorder
  const {
    isListening,
    interimTranscript,
    isSupported: speechSupported,
    toastMessage,
    startListening,
    stopListening,
    showToast,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: 'hi-IN',
    silenceTimeoutMs: 5000,
    onResult: (text, isFinal) => {
      if (isFinal) {
        handleIncomingSpeechChunk(text);
      }
    },
    onEnd: () => {
      // DECOUPLED: Silence ending SpeechRecognition MUST NEVER kill the MediaRecorder audio capture!
    },
    onError: (err) => {
      console.warn('VoiceGroceryModal speech error:', err);
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setMicBlocked(true);
        showToast("⚠️ माइक्रोफ़ोन की अनुमति नहीं मिली! कृपया ब्राउज़र/फ़ोन सेटिंग्स में जाकर Mic की परमिशन 'Allow' करें।");
      } else {
        // Automatic graceful fallback to pure audio recording mode on Android WebViews / error
        setIsPureAudioMode(true);
      }
    },
  });

  // Start / Stop Master Toggle with Robust Android Mic Permission & Graceful Fallback
  const handleToggleListening = async () => {
    if (isListening || isRecordingAudio) {
      stopListening();
      await stopAudioCapture();
      return;
    }

    setMicBlocked(false);

    // 1. Explicit try-catch getUserMedia call for Android & mobile browsers
    let stream: MediaStream;
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported on this browser');
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      console.warn('Microphone permission request error on device:', err);
      setMicBlocked(true);
      showToast("⚠️ माइक्रोफ़ोन की अनुमति नहीं मिली! कृपया ब्राउज़र/फ़ोन सेटिंग्स में जाकर Mic की परमिशन 'Allow' करें।");
      return;
    }

    // 2. Start parallel MediaRecorder with the active audio stream
    startAudioCaptureWithStream(stream);

    // 3. Check Web Speech Recognition support on this Android device/WebView
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      // Speech-to-Text is not supported on user's Android WebView/phone
      // Gracefully switch to pure Audio Recording mode
      setIsPureAudioMode(true);
      return;
    }

    try {
      setIsPureAudioMode(false);
      startListening();
    } catch (speechErr) {
      console.warn('SpeechRecognition start failed, switching to pure Audio Recording mode:', speechErr);
      setIsPureAudioMode(true);
    }
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const parsed = parseSingleGroceryItem(manualInput.trim());
    setGroceryItems((prev) => [...prev, parsed]);
    setManualInput('');
  };

  const handleRemoveItem = (id: string) => {
    setGroceryItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearAll = () => {
    if (isListening) stopListening();
    stopAudioCapture();
    setAudioRecordingUrl(null);
    setAudioBase64(null);
    audioBase64Ref.current = null;
    setGroceryItems([]);
  };

  const handleEditItemText = (id: string, newFormatted: string) => {
    setGroceryItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const reParsed = parseSingleGroceryItem(newFormatted);
          return { ...reParsed, id };
        }
        return it;
      })
    );
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const hasRecordedAudio = Boolean(
      audioBase64Ref.current || audioBase64 || audioRecordingUrl || (mediaRecorderRef.current && isRecordingAudio)
    );
    const hasTextItems = groceryItems.length > 0;

    if (!hasTextItems && !hasRecordedAudio) {
      errs.items = 'कृपया सामान बोलें, आवाज़ रिकॉर्ड करें या नीचे सामान का नाम लिखें।';
    }
    if (!customerName.trim()) {
      errs.name = 'Please enter your full name';
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'Please enter a valid 10-digit mobile number';
    }
    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      errs.address = 'Please enter your complete doorstep delivery address';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitVoiceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (isListening) {
      stopListening();
    }

    // Export recorded audio as Base64
    let voiceNoteBase64 = audioBase64Ref.current || audioBase64;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      const exported = await stopAudioCapture();
      if (exported) {
        voiceNoteBase64 = exported;
      }
    }

    playOrderChime();

    const voiceId = `VOC-${Date.now().toString().slice(-5)}`;
    const hasTextItems = groceryItems.length > 0;
    const formattedList = hasTextItems
      ? groceryItems.map((item, idx) => `${idx + 1}. ${item.formatted}`).join('\n')
      : '';

    const orderNotes = hasTextItems
      ? `🎙️ Voice Dictation Parchi (${groceryItems.length} items):\n` +
        formattedList +
        (voiceNoteBase64 ? '\n\n[🎧 Customer Voice Audio Attached]' : '')
      : '🎙️ वॉइस पर्ची (ऑडियो रिकॉर्डिंग)';

    // 1. Save customer phone
    saveCustomerPhone(customerPhone);

    // 2. Send to Central Server Database (POST /api/orders)
    try {
      await sendOrderToCentralServer({
        id: voiceId,
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        address: deliveryAddress.trim(),
        deliverySlot,
        deliveryLocation: selectedLocation,
        isParchi: true,
        orderType: 'voice',
        voiceNoteBase64: voiceNoteBase64 || undefined,
        items: hasTextItems
          ? groceryItems.map((it) => ({
              productId: it.id,
              name: it.itemName,
              unit: it.unit || 'unit',
              quantity: parseInt(it.quantity || '1', 10) || 1,
              price: 0,
              total: 0,
            }))
          : [],
        itemsCount: hasTextItems ? groceryItems.length : 1,
        notes: orderNotes,
      });
    } catch (err) {
      console.warn('Central server voice order ingest notice:', err);
    }

    // 3. Save inside local storage parchi orders
    saveParchiOrder({
      id: voiceId,
      customerName: customerName.trim(),
      phone: customerPhone.trim(),
      customerPhone: customerPhone.trim(),
      deliveryLocation: selectedLocation,
      deliveryAddress: deliveryAddress.trim(),
      items: hasTextItems ? groceryItems.map((it) => it.formatted) : ['🎙️ वॉइस पर्ची (ऑडियो रिकॉर्डिंग)'],
      notes: orderNotes,
      voiceNoteBase64: voiceNoteBase64 || undefined,
      status: 'Pending',
    });

    // Also register voice note in dedicated voice storage
    saveVoiceNoteOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryLocation: selectedLocation,
      deliveryAddress: deliveryAddress.trim(),
      deliverySlot,
      items: hasTextItems ? groceryItems.map((it) => it.formatted) : ['🎙️ वॉइस पर्ची (ऑडियो रिकॉर्डिंग)'],
      voiceNoteBase64: voiceNoteBase64 || undefined,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    // 4. In-App Confirmation (Zero client-side WhatsApp redirect)
    setIsSuccess(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-4 py-3.5 text-stone-950 flex items-center justify-between border-b border-amber-500/40 relative">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-stone-950 text-amber-300 flex items-center justify-center shadow-md flex-shrink-0">
              <Mic className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-base sm:text-lg tracking-tight">
                  Continuous Voice Dictation
                </h3>
                <span className="bg-stone-950 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Live Parchi
                </span>
              </div>
              <p className="text-[11px] text-stone-900 font-bold opacity-90">
                Bolte jaiye — real-time me rashan parchi banti rahegi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-950/10 hover:bg-stone-950/20 text-stone-950 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h4 className="font-heading font-black text-stone-900 text-xl">
              ✅ Aapka Order Darz Ho Gaya Hai!
            </h4>
            <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
              Kiranape Express jald hi aapke pate par deliver karega. Dukan wale bhaiya aapka saman pack kar rahe hain.
            </p>

            {/* Generated Parchi Summary */}
            {groceryItems.length > 0 ? (
              <div className="max-w-xs mx-auto bg-stone-50 rounded-2xl p-3 border border-stone-200 text-left text-xs space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block">
                  📋 Parchi Items ({groceryItems.length})
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {groceryItems.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 font-semibold text-stone-800">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{it.formatted}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-xs mx-auto bg-amber-50 rounded-2xl p-3.5 border border-amber-300 text-left text-xs space-y-2 shadow-2xs">
                <div className="flex items-center gap-1.5 font-heading font-black text-amber-950 text-xs">
                  <Volume2 className="w-4 h-4 text-emerald-700" />
                  <span>🎙️ ग्राहक वॉइस रिकॉर्डिंग ऑर्डर</span>
                </div>
                <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                  आपकी आवाज़ की रिकॉर्डिंग एडमिन पैनल पर भेज दी गई है। दुकानदार सुनकर सामान पैक करेंगे।
                </p>
                {audioBase64 && (
                  <audio controls src={audioBase64} className="w-full h-8 mt-1" />
                )}
              </div>
            )}

            <div className="pt-2 space-y-2 max-w-xs mx-auto">
              <a
                href={`tel:${storeSettings.phone || STORE_DEFAULTS.phone}`}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-heading font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Phone className="w-4 h-4" />
                <span>Call Store Helpline ({storeSettings.phone || STORE_DEFAULTS.phone})</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-heading font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Done / Return to Store
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Active Voice Speaking Studio / Soundwave Bar */}
              <div
                className={`p-4 rounded-3xl border transition-all text-center relative overflow-hidden ${
                  isListening
                    ? 'bg-gradient-to-b from-emerald-500/10 via-amber-500/5 to-white border-emerald-500 ring-4 ring-emerald-400/20'
                    : isRecordingAudio
                    ? 'bg-gradient-to-b from-red-500/10 via-amber-500/5 to-white border-red-500 ring-4 ring-red-400/20'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                {/* Microphone Trigger Button & Live Status */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative">
                    {/* Glowing outer rings when active */}
                    {(isListening || isRecordingAudio) && (
                      <>
                        <span className="absolute -inset-2.5 rounded-full bg-emerald-500/30 animate-ping opacity-75" />
                        <span className="absolute -inset-1 rounded-full bg-emerald-400/40 animate-pulse" />
                      </>
                    )}

                    <button
                      type="button"
                      onClick={handleToggleListening}
                      className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-95 ${
                        isListening
                          ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/40 hover:bg-emerald-700'
                          : isRecordingAudio
                          ? 'bg-red-600 text-white shadow-xl shadow-red-500/40 animate-pulse'
                          : 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-stone-950 hover:scale-105 shadow-amber-500/30'
                      }`}
                      title={
                        isListening
                          ? 'Tap to Stop Dictation'
                          : isRecordingAudio
                          ? 'Stop Audio Note'
                          : 'Tap to Start Continuous Dictation'
                      }
                    >
                      {isListening ? (
                        <Square className="w-6 h-6 fill-white text-white" />
                      ) : isRecordingAudio ? (
                        <Square className="w-6 h-6 fill-white text-white" />
                      ) : (
                        <Mic className="w-8 h-8 stroke-[2.5]" />
                      )}
                    </button>
                  </div>

                  {/* Real-time Indicator Required Copy */}
                  <div className="mt-3.5 space-y-1">
                    {isListening ? (
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-heading font-black text-xs sm:text-sm px-3.5 py-1 rounded-full shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          <span>🟢 Sun rahe hain... Bolte jaiye, parchi ban rahi hai</span>
                        </div>
                        {/* Animated Soundwave Visualizer Bars */}
                        <div className="flex items-center justify-center gap-1 h-5 pt-1">
                          <span className="w-1 bg-emerald-600 rounded-full animate-bounce [animation-delay:0ms] h-4" />
                          <span className="w-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms] h-5" />
                          <span className="w-1 bg-amber-500 rounded-full animate-bounce [animation-delay:300ms] h-3" />
                          <span className="w-1 bg-emerald-600 rounded-full animate-bounce [animation-delay:75ms] h-5" />
                          <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:225ms] h-3.5" />
                          <span className="w-1 bg-amber-500 rounded-full animate-bounce [animation-delay:120ms] h-4" />
                        </div>
                        <p className="text-[11px] text-stone-500 font-medium">
                          Rukne ke liye &apos;Stop&apos; dabayein ya 5 second chup rahein.
                        </p>
                      </div>
                    ) : isRecordingAudio ? (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 bg-red-100 text-red-950 border border-red-300 font-heading font-black text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-2xs">
                          <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                          <span>🔴 आवाज़ रिकॉर्ड हो रही है...</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs font-black text-red-700 font-mono">
                          <span>⏱️ {formatTimer(recordingSeconds)}</span>
                        </div>
                        {/* Soundwave animation */}
                        <div className="flex items-center justify-center gap-1.5 h-6 pt-0.5">
                          <span className="w-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:0ms] h-5" />
                          <span className="w-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:150ms] h-6" />
                          <span className="w-1.5 bg-red-500 rounded-full animate-bounce [animation-delay:300ms] h-4" />
                          <span className="w-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:75ms] h-6" />
                          <span className="w-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:225ms] h-4" />
                          <span className="w-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:120ms] h-5" />
                        </div>
                        <div className="pt-1.5 flex justify-center">
                          <button
                            type="button"
                            onClick={async () => {
                              if (isListening) stopListening();
                              await stopAudioCapture();
                            }}
                            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-heading font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Square className="w-3.5 h-3.5 fill-white" />
                            <span>⏹️ रिकॉर्डिंग रोकें और ऑर्डर भेजें</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="font-heading font-black text-sm text-stone-900 block">
                          🎤 Mic dabayein aur lagataar saman bolte jaiye
                        </span>
                        <span className="text-[11px] text-stone-500 font-medium block">
                          Jaise: &quot;2 packet Tata namak, ek kilo chana dal aur Fortune tel 1 litre&quot;
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Interim Transcript Bubble */}
                {interimTranscript && (
                  <div className="mt-3 bg-white p-2.5 rounded-2xl border border-emerald-400 text-emerald-950 font-bold italic animate-pulse text-xs shadow-2xs">
                    &quot;{interimTranscript}...&quot;
                  </div>
                )}

                {/* Recorded Audio Player Card */}
                {(audioRecordingUrl || audioBase64) && (
                  <div className="mt-3 p-3 bg-amber-50/90 border border-amber-300 rounded-2xl text-left space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-black text-xs text-amber-950 flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-emerald-700" />
                        <span>🎧 Customer Voice Note (Ready to Send)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAudioRecordingUrl(null);
                          setAudioBase64(null);
                          audioBase64Ref.current = null;
                        }}
                        className="text-[11px] font-bold text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        Delete Note
                      </button>
                    </div>
                    <audio controls src={audioRecordingUrl || audioBase64 || ''} className="w-full h-8" />
                  </div>
                )}

                {/* Microphone Blocked Fallback Guidance */}
                {micBlocked && (
                  <div className="mt-3 p-3.5 bg-red-50 border-2 border-red-300 rounded-2xl text-left space-y-2 animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MicOff className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="font-heading font-black text-red-950 text-sm">
                          माइक्रोफ़ोन अनुमति बंद है
                        </p>
                        <p className="text-red-800 font-bold leading-relaxed">
                          कृपया सेटिंग्स में जाकर माइक्रोफ़ोन की अनुमति (Microphone Permission) ऑन करें।
                        </p>
                        <ul className="text-[11px] text-red-700 space-y-0.5 list-disc pl-4 pt-1 font-medium">
                          <li>ब्राउज़र में ऊपर URL बार के पास लगे 🔒 (ताला) आइकन पर टैप करें</li>
                          <li>Permissions में &apos;Microphone&apos; को Allow करें</li>
                          <li>या नीचे दिए गए बॉक्स में सामान का नाम टाइप करें</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {toastMessage && (
                  <div className="mt-2 text-[11px] text-rose-700 bg-rose-100 p-2 rounded-xl flex items-center gap-1.5 justify-center font-medium">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                    <span>{toastMessage}</span>
                  </div>
                )}
              </div>

              {/* REAL-TIME EDITABLE PARCHI RECEIPT */}
              <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs space-y-3">
                {/* Parchi Header */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4 text-amber-800" />
                    </div>
                    <div>
                      <span className="font-heading font-black text-stone-900 text-sm block leading-none">
                        Rashan Parchi
                      </span>
                      <span className="text-[10px] text-stone-400 font-bold">
                        Kiranape Express Doorstep
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-amber-400 text-stone-950 font-black px-2.5 py-0.5 rounded-full text-[11px] shadow-2xs">
                      {groceryItems.length} Items
                    </span>
                    {groceryItems.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[11px] font-bold text-stone-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Clear all items and start speaking fresh"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear All / Phir Se Bolein</span>
                      </button>
                    )}
                  </div>
                </div>

                {errors.items && (
                  <p className="text-rose-600 font-bold text-[11px] bg-rose-50 p-2 rounded-xl border border-rose-200">
                    {errors.items}
                  </p>
                )}

                {/* Numbered Grocery List with Badges and Instant Delete */}
                {groceryItems.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-1">
                    <Mic className="w-7 h-7 mx-auto text-amber-500 animate-bounce" />
                    <p className="font-bold text-stone-700 text-xs">Parchi abhi khali hai</p>
                    <p className="text-[11px] text-stone-400 max-w-xs mx-auto">
                      Mic button dabakar lagataar bolein ya niche likhkar add karein.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {groceryItems.map((item, idx) => {
                      const isNewlyAdded = item.id === lastAddedId;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border transition-all ${
                            isNewlyAdded
                              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 scale-[1.01]'
                              : 'bg-stone-50/80 border-stone-200/80 hover:bg-amber-50/40 hover:border-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Numbered bullet */}
                            <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-950 font-black text-[10px] flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>

                            {/* Quantity badge if parsed */}
                            {(item.quantity || item.unit) && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] flex-shrink-0 uppercase">
                                {item.quantity ? `${item.quantity} ` : ''}
                                {item.unit || ''}
                              </span>
                            )}

                            {/* Editable text */}
                            <input
                              type="text"
                              value={item.formatted}
                              onChange={(e) => handleEditItemText(item.id, e.target.value)}
                              className="w-full bg-transparent font-bold text-stone-900 text-xs focus:outline-none focus:bg-white rounded px-1.5 py-0.5 border border-transparent focus:border-stone-300 transition-colors"
                              title="Tap to edit item name"
                            />
                          </div>

                          {/* Instant Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-stone-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0"
                            title="Remove this item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* + Add Item Manual Input Fallback */}
                <form onSubmit={handleAddManualItem} className="pt-1 flex gap-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Likhkar add karein (e.g. 500g Besan, 2 Maggi)..."
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </form>
              </div>

              {/* Delivery Address & Customer Details Accordion */}
              <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-700" />
                    <span>Delivery Address Details</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    COD Available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                      Customer Name *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Aapka pura naam"
                        className="w-full pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-600"
                      />
                    </div>
                    {errors.name && <p className="text-rose-600 text-[10px] mt-0.5">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                      Mobile Number (10 Digits) *
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        maxLength={10}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-600"
                      />
                    </div>
                    {errors.phone && <p className="text-rose-600 text-[10px] mt-0.5">{errors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                    Delivery Area / Zone:
                  </label>
                  <div className="bg-amber-100/60 text-amber-950 font-bold px-2.5 py-1.5 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <span>📍 {selectedLocation}</span>
                    <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full font-black">
                      Confirmed
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                    Pura Pata (Full Doorstep Address & Landmark) *
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Ghar / Dukan ka number, gali, landmark..."
                      className="w-full pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-600"
                    />
                  </div>
                  {errors.address && <p className="text-rose-600 text-[10px] mt-0.5">{errors.address}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-1">
                    <Clock className="w-3 h-3 inline mr-1 text-amber-600" />
                    Delivery Time Slot:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Morning (10:00 AM - 2:00 PM)',
                      'Evening (7:00 PM - 9:00 PM)',
                    ].map((slot) => {
                      const isSelected = deliverySlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setDeliverySlot(slot)}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 font-extrabold text-amber-950 shadow-2xs'
                              : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                          }`}
                        >
                          <div className="text-[11px] leading-tight">{slot}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer with Primary Submit CTA */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitVoiceOrder}
                disabled={isSuccess}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-heading font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 text-emerald-200" />
                <span>
                  {groceryItems.length === 0 && (audioRecordingUrl || audioBase64 || isRecordingAudio)
                    ? '🎙️ पर्ची भेजें (वॉइस रिकॉर्डिंग ऑर्डर)'
                    : 'Parchi Ban Gayi / Submit Order (COD)'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default VoiceGroceryModal;
