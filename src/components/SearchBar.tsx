import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Mic } from 'lucide-react';
import { isMasterAdminPin } from '../config/adminConfig';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  onSecretAdminTrigger?: () => void;
  onOpenVoiceModal?: () => void;
  onOpenBarcodeScanner?: () => void;
  onOpenParchiModal?: () => void;
  onOpenDigitalParchiModal?: () => void;
  className?: string;
}

const ROTATING_SEARCH_PLACEHOLDERS = [
  'Search sugar, fortune oil, tea, ghee...',
  'Search for atta, dal, biscuits, surf...',
  'Search for milk, butter, bread, curd...',
  'खोजें: चीनी, फॉर्च्यून तेल, चाय पत्ती, घी...',
];

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder,
  onSecretAdminTrigger,
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [fallbackPlaceholder, setFallbackPlaceholder] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const noticeTimerRef = useRef<any>(null);

  // Rotating search hint text
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_SEARCH_PLACEHOLDERS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const showVoiceFallback = () => {
    const friendlyMsg = 'यहाँ बोलकर या टाइप करके सामान खोजें...';
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setFallbackPlaceholder(friendlyMsg);
    setVoiceNotice(friendlyMsg);
    noticeTimerRef.current = setTimeout(() => {
      setVoiceNotice(null);
      setFallbackPlaceholder(null);
    }, 4500);
    // Silently focus search input so user can type or use keyboard mic immediately
    searchInputRef.current?.focus();
  };

  // Safe Speech Recognition handler without alerts or mediaDevices conflicts
  const handleMicrophoneClick = () => {
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

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showVoiceFallback();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice(null);
        setFallbackPlaceholder(null);
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
          if (isMasterAdminPin(currentActive)) {
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
          onSearchChange(currentActive);
        }
      };

      recognition.onerror = (event: any) => {
        console.info('Speech recognition status:', event?.error);
        setIsListening(false);
        if (event?.error !== 'aborted') {
          showVoiceFallback();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.info('Speech recognition start failed:', err);
      setIsListening(false);
      showVoiceFallback();
    }
  };

  const activePlaceholder = isListening
    ? '🔴 सुन रहे हैं... बोलिए सामान का नाम'
    : fallbackPlaceholder || placeholder || ROTATING_SEARCH_PLACEHOLDERS[placeholderIndex];

  return (
    <div className={`w-full relative ${className}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isMasterAdminPin(searchQuery)) {
            onSearchChange('');
            searchInputRef.current?.blur();
            onSecretAdminTrigger?.();
            return;
          }
        }}
        className="relative flex items-center"
      >
        {/* Left Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-stone-400" />
        </div>

        {/* Clean Input Box with live streaming speech text */}
        <input
          id="search-input"
          ref={searchInputRef}
          type="search"
          value={searchQuery}
          onChange={(e) => {
            const val = e.target.value;
            if (isMasterAdminPin(val)) {
              onSearchChange('');
              searchInputRef.current?.blur();
              onSecretAdminTrigger?.();
              return;
            }
            onSearchChange(val);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (isMasterAdminPin(searchQuery)) {
                e.preventDefault();
                onSearchChange('');
                searchInputRef.current?.blur();
                onSecretAdminTrigger?.();
                return;
              }
            }
          }}
          placeholder={activePlaceholder}
          className={`w-full pl-10 pr-12 py-2.5 bg-stone-50/90 hover:bg-white focus:bg-white text-stone-900 placeholder:text-stone-400 text-xs sm:text-sm rounded-2xl border transition-all shadow-2xs font-medium focus:outline-hidden ${
            isListening
              ? 'border-red-500 ring-2 ring-red-400/30'
              : 'border-stone-200 focus:ring-2 focus:ring-[#0c831f]/20 focus:border-[#0c831f]'
          }`}
        />

        {/* Right Action Icons: Only Clear (X) and Voice (Mic) */}
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
              className="p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}

          {/* Gracefully Handled Microphone Icon */}
          <button
            type="button"
            id="search-voice-mic-btn"
            onClick={handleMicrophoneClick}
            className={`p-1.5 rounded-full transition-all cursor-pointer relative ${
              isListening
                ? 'text-white bg-red-600 ring-4 ring-red-400/60 animate-pulse shadow-md shadow-red-500/40'
                : 'text-stone-600 hover:text-emerald-700 hover:bg-stone-100'
            }`}
            title={isListening ? '🔴 सुन रहे हैं... बोलिए सामान का नाम (टैप करके रोकें)' : 'बोल कर खोजें (Voice Search)'}
            aria-label="Voice Search"
          >
            <Mic className={`w-4 h-4 ${isListening ? 'text-white animate-pulse' : 'text-stone-700'}`} />
          </button>
        </div>
      </form>

      {/* Pulsating Listening Feedback Badge */}
      {isListening && (
        <div className="mt-1.5 flex items-center justify-center gap-2 py-1 px-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-[11px] font-bold rounded-full shadow-md animate-pulse mx-auto w-fit border border-red-400/40">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>🔴 सुन रहे हैं... बोलिए सामान का नाम</span>
        </div>
      )}

      {/* Elegant, Non-Blocking In-App Voice Fallback Toast */}
      {voiceNotice && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-40 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold shadow-lg flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">🎙️</span>
            <span className="truncate">{voiceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setVoiceNotice(null);
              searchInputRef.current?.focus();
            }}
            className="p-1 text-amber-800 hover:text-amber-950 cursor-pointer flex-shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
