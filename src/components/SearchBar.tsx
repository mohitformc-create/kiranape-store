import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Mic, Camera } from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  onSecretAdminTrigger?: () => void;
  onOpenParchiModal?: () => void;
  onOpenVoiceModal?: () => void;
  className?: string;
}

const ROTATING_SEARCH_PLACEHOLDERS = [
  'खोजें: चीनी, चावल, दाल, आटा, तेल...',
  'Search for sugar, fortune oil, atta, spices...',
  'Search for cheeni, chawal, sarso tel, ghee...',
  'खोजें: बिस्कुट, चाय पत्ती, सर्फ़, साबुन...',
  'Search for tata tea, surf excel, maggi, colgate...',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder,
  onSecretAdminTrigger,
  onOpenParchiModal,
  onOpenVoiceModal,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Rotating search hint text
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_SEARCH_PLACEHOLDERS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Direct user click handler for SpeechRecognition (Supports Android Mobile Browsers)
  const handleMicrophoneClick = async () => {
    // If currently listening, gracefully stop
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    // 1. Explicit Permission Request via getUserMedia
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks so mic hardware line is free for SpeechRecognition
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.warn('Microphone permission denied:', err);
      alert('Microphone permission denied. Kripya browser settings me mic allow karein.');
      setIsListening(false);
      return;
    }

    // 2. Browser Speech API Detection with Automatic Fallback to Voice Note Modal
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (onOpenVoiceModal) {
        // Automatically switch to Voice Note Modal mode so customer never gets stuck
        onOpenVoiceModal();
        return;
      }
      const msg =
        'Voice input is not supported in this browser. Please type your items or use Parchi upload.';
      alert(msg);
      return;
    }

    // 3. Configure Recognition Instance
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Supports Hindi & Hinglish
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalTrans += text;
          } else {
            interimTrans += text;
          }
        }

        const currentActive = (finalTrans || interimTrans).trim();
        if (currentActive) {
          if (currentActive === '9779') {
            onSearchChange('');
            onSecretAdminTrigger?.();
            setIsListening(false);
            try {
              recognition.stop();
            } catch {
              // ignore
            }
            return;
          }
          // Live stream words directly into the input box
          onSearchChange(currentActive);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error in SearchBar:', event.error);
        if (event.error === 'language-not-supported' && recognition.lang !== 'en-IN') {
          try {
            recognition.lang = 'en-IN';
            recognition.start();
            return;
          } catch {
            // ignore
          }
        }
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          alert('Microphone permission denied. Kripya browser settings me mic allow karein.');
        } else if (onOpenVoiceModal && event.error !== 'no-speech') {
          // If browser speech blocks, automatically switch to voice note modal
          onOpenVoiceModal();
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.warn('Speech recognition failed to start:', err);
      setIsListening(false);
      if (onOpenVoiceModal) {
        onOpenVoiceModal();
      }
    }
  };

  const activePlaceholder = isListening
    ? '🔴 Sun rahe hain... Bolie samaan ka naam'
    : (placeholder || ROTATING_SEARCH_PLACEHOLDERS[placeholderIndex]);

  return (
    <div className={`w-full relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const clean = searchQuery.trim();
          if (clean === '@2508' || clean === '2508' || clean === '9779') {
            onSearchChange('');
            onSecretAdminTrigger?.();
          }
        }}
        className="relative flex items-center"
      >
        {/* Left Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-stone-400" />
        </div>

        {/* Input Box with live streaming speech text */}
        <input
          id="search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            const clean = val.trim();
            if (clean === '@2508' || clean === '2508' || clean === '9779') {
              onSearchChange('');
              onSecretAdminTrigger?.();
              return;
            }
            onSearchChange(val);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const trimmed = searchQuery?.trim();
              if (trimmed === '@2508' || trimmed === '2508' || trimmed === '9779') {
                e.preventDefault();
                onSearchChange('');
                onSecretAdminTrigger?.();
              }
            }
          }}
          placeholder={activePlaceholder}
          className={`w-full pl-10 pr-20 py-2.5 bg-white text-stone-900 placeholder:text-stone-400 text-xs sm:text-sm rounded-full border transition-all shadow-sm font-medium focus:outline-hidden ${
            isListening
              ? 'border-red-500 ring-2 ring-red-400/30'
              : 'border-stone-200 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600'
          }`}
        />

        {/* Right Action Icons: Clear / Mic / Camera */}
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-0.5">
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

          {/* Microphone with pulsating Red/Green glowing ring */}
          <button
            type="button"
            onClick={handleMicrophoneClick}
            className={`p-1.5 rounded-full transition-all cursor-pointer relative ${
              isListening
                ? 'text-white bg-red-600 ring-4 ring-red-400/60 animate-pulse shadow-lg shadow-red-500/40'
                : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
            }`}
            title={isListening ? '🔴 Sun rahe hain... Bolie samaan ka naam - Tap to Stop' : 'Bol Kar Search Karein (Voice Search)'}
          >
            <Mic className={`w-4 h-4 ${isListening ? 'text-white animate-pulse' : 'text-stone-700'}`} />
          </button>

          {/* Camera / Lens Icon for Parchi */}
          {onOpenParchiModal && (
            <button
              type="button"
              onClick={onOpenParchiModal}
              className="p-1.5 rounded-full text-stone-600 hover:text-emerald-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Scan handwritten list (Parchi)"
            >
              <Camera className="w-4 h-4 text-emerald-700" />
            </button>
          )}
        </div>
      </form>

      {/* Pulsating Listening Feedback Badge */}
      {isListening && (
        <div className="mt-1.5 flex items-center justify-center gap-2 py-1 px-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-[11px] font-bold rounded-full shadow-md animate-pulse mx-auto w-fit border border-red-400/40">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>🔴 Sun rahe hain... Bolie samaan ka naam</span>
        </div>
      )}
    </div>
  );
};
