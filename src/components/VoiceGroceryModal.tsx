import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Square,
  RotateCcw,
  Volume2,
  Phone,
  User,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from 'lucide-react';
import { playOrderChime } from '../utils/sound';
import {
  getCustomerSelectedLocation,
  getSavedCustomerPhone,
  saveCustomerPhone,
  saveVoiceNoteOrder,
  saveParchiOrder,
} from '../services/storageService';
import { dispatchOrderInBackground } from '../services/orderQueueService';
import { StoreSettings } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { getStoreOwnerWhatsAppNotificationUrl } from '../utils/orderUtils';
import { CreatorCredits } from './CreatorCredits';

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
  // Customer Delivery Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState(() => getSavedCustomerPhone() || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('Morning (10:00 AM - 2:00 PM)');
  const [selectedLocation, setSelectedLocation] = useState(
    () => getCustomerSelectedLocation() || storeSettings.serviceArea || 'Waidhan, Singrauli'
  );
  const [optionalNotes, setOptionalNotes] = useState('');

  // MediaRecorder Real Audio Engine
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

  // Live Speech Recognition for Transcript Assist
  const [recognizedTranscript, setRecognizedTranscript] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
  const [whatsappShareUrl, setWhatsappShareUrl] = useState<string | null>(null);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s} / 01:00`;
  };

  // Real Audio Note Engine
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
      console.warn('MediaRecorder start error:', err);
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
          console.warn('Error reading audio blob:', e);
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

  // Speech recognition for assisting text transcript
  const {
    isListening,
    interimTranscript,
    toastMessage,
    startListening,
    stopListening,
    showToast,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    lang: 'hi-IN',
    silenceTimeoutMs: 6000,
    onResult: (text, isFinal) => {
      if (text && text.trim()) {
        setRecognizedTranscript((prev) => (prev ? `${prev}, ${text.trim()}` : text.trim()));
      }
    },
    onError: (err) => {
      console.warn('Speech recognition warning:', err);
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        setMicBlocked(true);
        showToast("माइक्रोफ़ोन की अनुमति नहीं मिली! कृपया ब्राउज़र में Mic परमिशन Allow करें।");
      }
    },
  });

  // Tap to Record / Tap to Stop Toggle
  const handleToggleRecord = async () => {
    if (isListening || isRecordingAudio) {
      if (isListening) stopListening();
      await stopAudioCapture();
      return;
    }

    setMicBlocked(false);

    // Request real microphone permission
    let stream: MediaStream;
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported on this device/browser');
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      console.warn('Microphone permission request error:', err);
      setMicBlocked(true);
      showToast("माइक्रोफ़ोन की अनुमति दें / Please allow microphone in browser settings");
      return;
    }

    // Start real audio recording
    startAudioCaptureWithStream(stream);

    // Also start speech-to-text helper if supported
    try {
      const SpeechClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechClass) {
        startListening();
      }
    } catch (e) {
      console.warn('SpeechRecognition start notice:', e);
    }
  };

  const handleResetRecording = () => {
    if (isListening) stopListening();
    stopAudioCapture();
    setAudioRecordingUrl(null);
    setAudioBase64(null);
    audioBase64Ref.current = null;
    setRecognizedTranscript('');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const hasAudio = Boolean(
      audioBase64Ref.current || audioBase64 || audioRecordingUrl || (mediaRecorderRef.current && isRecordingAudio)
    );
    const hasTranscript = Boolean(recognizedTranscript.trim());

    if (!hasAudio && !hasTranscript) {
      errs.audio = 'कृपया पहले माइक बटन दबाकर अपनी आवाज़ में सामान का नाम रिकॉर्ड करें।';
    }
    if (!customerName.trim()) {
      errs.name = 'कृपया अपना पूरा नाम लिखें';
    }
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      errs.phone = 'कृपया 10 अंकों का मान्य मोबाइल नंबर लिखें';
    }
    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      errs.address = 'कृपया पूरा डिलीवरी पता (मकान नंबर, गली, लैंडमार्क) लिखें';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // 1. Instant Haptic Feedback & Audio Chime (0 milliseconds feedback)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([50, 50, 50]);
      } catch {
        // ignore if not supported
      }
    }
    playOrderChime();

    if (isListening) stopListening();

    let voiceNoteBase64 = audioBase64Ref.current || audioBase64;

    const voiceOrderId = `VOC-${Date.now().toString().slice(-5)}`;
    const fullTranscript = recognizedTranscript.trim() || optionalNotes.trim() || 'ग्राहक वॉइस नोट ऑडियो संलग्न';
    const orderNotes = `🎙️ वॉइस रिकॉर्डिंग ऑर्डर:\n${fullTranscript}`;

    saveCustomerPhone(customerPhone.trim());

    // 2. Format WhatsApp notification link for store owner
    const waUrl = getStoreOwnerWhatsAppNotificationUrl(
      {
        orderId: voiceOrderId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryLocation: selectedLocation,
        deliverySlot,
        orderType: 'voice',
        textDetails: fullTranscript,
      },
      storeSettings
    );

    // 3. OPTIMISTIC CONFIRMATION: Instantly show success screen in 0 milliseconds
    setWhatsappShareUrl(waUrl);
    setSubmittedOrderId(voiceOrderId);
    setIsSuccess(true);

    // 4. Save in Parchi and Voice local storage immediately
    saveParchiOrder({
      id: voiceOrderId,
      customerName: customerName.trim(),
      phone: customerPhone.trim(),
      customerPhone: customerPhone.trim(),
      deliveryLocation: selectedLocation,
      deliveryAddress: deliveryAddress.trim(),
      notes: orderNotes,
      voiceAudio: voiceNoteBase64 || undefined,
      voiceNoteBase64: voiceNoteBase64 || undefined,
      status: 'Pending',
    });

    saveVoiceNoteOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryLocation: selectedLocation,
      deliveryAddress: deliveryAddress.trim(),
      deliverySlot,
      items: [fullTranscript],
      voiceAudio: voiceNoteBase64 || undefined,
      voiceNoteBase64: voiceNoteBase64 || undefined,
    });

    // 5. Trigger live updates for Admin
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    // 6. Asynchronous Background Dispatch (auto-retry queue if offline or failed)
    (async () => {
      try {
        if (!voiceNoteBase64 && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          const exported = await stopAudioCapture();
          if (exported) voiceNoteBase64 = exported;
        }

        dispatchOrderInBackground({
          id: voiceOrderId,
          customerName: customerName.trim(),
          phone: customerPhone.trim(),
          address: deliveryAddress.trim(),
          deliverySlot,
          deliveryLocation: selectedLocation,
          isParchi: true,
          orderType: 'voice',
          voiceAudio: voiceNoteBase64 || undefined,
          voiceNoteBase64: voiceNoteBase64 || undefined,
          voiceAudioUrl: voiceNoteBase64 || undefined,
          itemsCount: 1,
          items: [],
          notes: orderNotes,
        });
      } catch (bgErr) {
        console.warn('[Voice Order] Background dispatch notice:', bgErr);
      }
    })();
  };

  const handleResetAndClose = () => {
    setIsSuccess(false);
    setSubmittedOrderId(null);
    setWhatsappShareUrl(null);
    handleResetRecording();
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

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
              🎙️
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-base sm:text-lg leading-tight">
                बोलकर राशन ऑर्डर करें (Voice Order)
              </h3>
              <p className="text-xs text-emerald-100">
                माइक दबाकर सामान बोलें • कैश ऑन डिलीवरी (COD)
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition-colors cursor-pointer"
            aria-label="Close Voice Order Modal"
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

            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
                Order ID #{submittedOrderId}
              </span>
              <h4 className="font-heading font-black text-stone-900 text-xl pt-1">
                ✅ आपका वॉइस आर्डर दर्ज हो गया!
              </h4>
              <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
                दुकानदार आपकी आवाज़ की रिकॉर्डिंग सुनकर किराना सामान पैक कर रहे हैं। आपके घर तक डिलीवरी जल्द पहुंचेगी।
              </p>
            </div>

            {/* Audio Preview Card */}
            {(audioRecordingUrl || audioBase64) && (
              <div className="max-w-xs mx-auto bg-amber-50 rounded-2xl p-3 border border-amber-300 text-left space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-heading font-black text-amber-950 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>आपकी रिकॉर्ड की गई आवाज़:</span>
                </span>
                <audio controls src={audioRecordingUrl || audioBase64 || ''} className="w-full h-8" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5 max-w-sm mx-auto">
              {/* WhatsApp Notification Button */}
              {whatsappShareUrl && (
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>दुकानदार को WhatsApp पर ऑर्डर भेजें</span>
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
          <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* PROMINENT TOP VOICE INTERFACE */}
            <div
              className={`p-5 rounded-3xl border transition-all text-center relative overflow-hidden ${
                isRecordingAudio || isListening
                  ? 'bg-gradient-to-b from-rose-500/10 via-amber-500/5 to-white border-rose-500 ring-4 ring-rose-400/20'
                  : audioRecordingUrl || audioBase64
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : 'bg-stone-50 border-stone-200'
              }`}
            >
              {/* Central Mic Button */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  {/* Glowing pulse rings when recording */}
                  {(isRecordingAudio || isListening) && (
                    <>
                      <span className="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping opacity-75" />
                      <span className="absolute -inset-1.5 rounded-full bg-rose-400/40 animate-pulse" />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleRecord}
                    className={`relative z-10 w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-xl transition-all cursor-pointer active:scale-95 ${
                      isRecordingAudio || isListening
                        ? 'bg-rose-600 text-white shadow-rose-500/50 animate-pulse scale-105'
                        : audioRecordingUrl || audioBase64
                        ? 'bg-emerald-700 text-white shadow-emerald-600/40 hover:bg-emerald-800'
                        : 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-105 shadow-emerald-600/40'
                    }`}
                    title={
                      isRecordingAudio || isListening
                        ? 'रिकॉर्डिंग रोकने के लिए टैप करें (Stop)'
                        : 'आवाज़ रिकॉर्ड करने के लिए टैप करें (Record)'
                    }
                  >
                    {isRecordingAudio || isListening ? (
                      <>
                        <Square className="w-7 h-7 fill-white text-white" />
                        <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">Stop</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-8 h-8 stroke-[2.5]" />
                        <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">Record</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status Indicator & Instructions */}
                <div className="mt-3.5 space-y-1.5">
                  {isRecordingAudio || isListening ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 bg-rose-100 text-rose-950 border border-rose-300 font-heading font-black text-xs sm:text-sm px-4 py-1 rounded-full shadow-2xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                        <span>🔴 आवाज़ रिकॉर्ड हो रही है... बोलिए</span>
                      </div>

                      {/* Timer & Pulsing Waveform Visualizer */}
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-xs font-mono font-black text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                          ⏱️ {formatTimer(recordingSeconds)}
                        </span>
                        <div className="flex items-center gap-1 h-6">
                          <span className="w-1 bg-rose-600 rounded-full animate-bounce [animation-delay:0ms] h-4" />
                          <span className="w-1 bg-amber-500 rounded-full animate-bounce [animation-delay:150ms] h-6" />
                          <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:300ms] h-3" />
                          <span className="w-1 bg-emerald-600 rounded-full animate-bounce [animation-delay:75ms] h-5" />
                          <span className="w-1 bg-rose-600 rounded-full animate-bounce [animation-delay:225ms] h-4" />
                          <span className="w-1 bg-amber-500 rounded-full animate-bounce [animation-delay:120ms] h-6" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleRecord}
                        className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-heading font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 inline-flex items-center gap-1.5"
                      >
                        <Square className="w-3 h-3 fill-white" />
                        <span>बोलना समाप्त करें (Stop Recording)</span>
                      </button>
                    </div>
                  ) : audioRecordingUrl || audioBase64 ? (
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 font-heading font-black text-xs px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>वॉइस नोट रिकॉर्ड हो गया है</span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">
                        नीचे रिकॉर्डिंग सुनकर चेक कर सकते हैं या &apos;फिर से बोलें&apos; दबाएं।
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="font-heading font-black text-sm text-stone-900 block">
                        माइक दबाकर राशन का सामान बोलें
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium block">
                        जैसे: &quot;2 किलो आशीर्वाद आटा, 1 लीटर तेल, 1 पैकेट टाटा नमक&quot;
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Interim Transcript Preview */}
              {interimTranscript && (
                <div className="mt-3 bg-white p-2.5 rounded-2xl border border-emerald-400 text-emerald-950 font-bold italic animate-pulse text-xs shadow-2xs">
                  &quot;{interimTranscript}...&quot;
                </div>
              )}

              {/* Recorded Audio Preview Player Card */}
              {(audioRecordingUrl || audioBase64) && !isRecordingAudio && (
                <div className="mt-3.5 p-3.5 bg-white border border-amber-300 rounded-2xl text-left space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-black text-xs text-amber-950 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-emerald-700" />
                      <span>आपकी आवाज़ की रिकॉर्डिंग (सुनें)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetRecording}
                      className="text-[11px] font-bold text-stone-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>फिर से बोलें (Re-record)</span>
                    </button>
                  </div>
                  <audio controls src={audioRecordingUrl || audioBase64 || ''} className="w-full h-9" />
                </div>
              )}

              {/* Recognized Words Assist */}
              {recognizedTranscript && !isRecordingAudio && (
                <div className="mt-2.5 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-left text-[11px] text-amber-950 space-y-0.5">
                  <span className="font-bold text-amber-900 block">📝 पहचाने गए शब्द:</span>
                  <p className="font-medium text-stone-800">{recognizedTranscript}</p>
                </div>
              )}

              {/* Microphone Blocked Fallback Guidance */}
              {micBlocked && (
                <div className="mt-3 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-left space-y-1.5">
                  <div className="flex items-start gap-2">
                    <MicOff className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-heading font-black text-rose-950 text-xs">
                        माइक्रोफ़ोन अनुमति बंद है
                      </p>
                      <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                        कृपया ब्राउज़र सेटिंग्स में जाकर माइक्रोफ़ोन की अनुमति (Allow Microphone) दें ताकि आपकी आवाज़ रिकॉर्ड हो सके।
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {errors.audio && (
                <p className="text-rose-600 font-bold text-[11px] bg-rose-50 p-2 rounded-xl border border-rose-200 mt-2">
                  {errors.audio}
                </p>
              )}

              {toastMessage && (
                <div className="mt-2 text-[11px] text-rose-700 bg-rose-100 p-2 rounded-xl flex items-center gap-1.5 justify-center font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
                  <span>{toastMessage}</span>
                </div>
              )}
            </div>

            {/* Optional Customer Note / Items Textarea */}
            <div className="bg-white rounded-2xl border border-stone-200 p-3 shadow-2xs">
              <label className="text-[10px] font-bold text-stone-600 block mb-1">
                सामान का नाम या कोई विशेष निर्देश (वैकल्पिक / Optional):
              </label>
              <textarea
                rows={2}
                value={optionalNotes}
                onChange={(e) => setOptionalNotes(e.target.value)}
                placeholder="उदा. ब्रांड का नाम, पैकिंग साइज या कोई जरूरी बात..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-600"
              />
            </div>

            {/* Delivery Address & Customer Details */}
            <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="font-heading font-black text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span>डिलीवरी का पता (Delivery Address)</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  कैश ऑन डिलीवरी (COD)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                    ग्राहक का नाम (Customer Name) *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (errors.name) setErrors({ ...errors, name: '' });
                      }}
                      placeholder="उदा. रमेश कुमार"
                      className="w-full pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-600"
                    />
                  </div>
                  {errors.name && <p className="text-rose-600 text-[10px] mt-0.5">{errors.name}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                    मोबाइल नंबर (10 Digits) *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value.replace(/\D/g, ''));
                        if (errors.phone) setErrors({ ...errors, phone: '' });
                      }}
                      placeholder="10 अंकों का मोबाइल नंबर"
                      maxLength={10}
                      className="w-full pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-600"
                    />
                  </div>
                  {errors.phone && <p className="text-rose-600 text-[10px] mt-0.5">{errors.phone}</p>}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                  डिलीवरी इलाका / Zone:
                </label>
                <div className="bg-amber-50 text-amber-950 font-bold px-2.5 py-1.5 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <span>📍 {selectedLocation}</span>
                  <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full font-black">
                    सत्यापित
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-600 block mb-0.5">
                  पूरा पता (मकान नंबर, गली, लैंडमार्क) *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => {
                      setDeliveryAddress(e.target.value);
                      if (errors.address) setErrors({ ...errors, address: '' });
                    }}
                    placeholder="मकान / दुकान नंबर, गली या प्रसिद्ध स्थल..."
                    className="w-full pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>
                {errors.address && <p className="text-rose-600 text-[10px] mt-0.5">{errors.address}</p>}
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-600 block mb-1">
                  <Clock className="w-3 h-3 inline mr-1 text-amber-600" />
                  डिलीवरी समय (Delivery Slot):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Morning (10:00 AM - 2:00 PM)',
                    'Evening (7:00 PM - 9:00 PM)',
                  ].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setDeliverySlot(slot)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        deliverySlot === slot
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {slot.includes('Morning') ? '🌅 सुबह (10 AM - 2 PM)' : '🌆 शाम (7 PM - 9 PM)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Submit Action */}
            <div className="pt-2 sticky bottom-0 bg-white/95 backdrop-blur-xs pb-1">
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-heading font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-700/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Mic className="w-4 h-4 fill-white" />
                <span>वॉइस आर्डर भेजें (Cash on Delivery)</span>
              </button>
              <p className="text-[10px] text-stone-400 text-center mt-1.5 font-medium">
                🔒 सुरक्षित ऑर्डर • दुकानदार ऑडियो सुनकर ताज़ा किराना पैक करेंगे
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

export default VoiceGroceryModal;
