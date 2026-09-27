import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  silenceTimeoutMs?: number; // Default 5000ms (5 seconds pause)
}

/**
 * Continuous Web Speech Recognition Hook
 * Engineered for natural grocery dictation with automatic 5-second silence timeout
 * and resilient auto-restart against browser premature onend triggers.
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const toastTimeoutRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const isExplicitlyStoppedRef = useRef<boolean>(true);
  const lastActiveTextRef = useRef<string>('');
  const hasCommittedFinalRef = useRef<boolean>(false);
  const optionsRef = useRef<UseSpeechRecognitionOptions>(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  const getSpeechRecognitionClass = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return (
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      null
    );
  }, []);

  const isSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    const timeout = optionsRef.current.silenceTimeoutMs ?? 5000;
    silenceTimeoutRef.current = setTimeout(() => {
      // 5 seconds of silence detected -> automatically finish listening
      if (!isExplicitlyStoppedRef.current) {
        stopListening();
      }
    }, timeout);
  }, [clearSilenceTimer]);

  const stopListening = useCallback(() => {
    isExplicitlyStoppedRef.current = true;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, [clearSilenceTimer]);

  const startListening = useCallback(async () => {
    const SpeechRecognition = getSpeechRecognitionClass();

    if (!SpeechRecognition) {
      if (optionsRef.current.onError) {
        optionsRef.current.onError('not-supported');
      }
      return;
    }

    // Clean up previous instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    isExplicitlyStoppedRef.current = false;
    lastActiveTextRef.current = '';
    hasCommittedFinalRef.current = false;

    try {
      const recognition = new SpeechRecognition();
      // CONTINUOUS LISTENING ENGINE CONFIGURATION
      recognition.continuous = optionsRef.current.continuous ?? true;
      recognition.interimResults = optionsRef.current.interimResults ?? true;
      recognition.lang = optionsRef.current.lang ?? 'hi-IN'; // Primary Hindi / Hinglish

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
        lastActiveTextRef.current = '';
        hasCommittedFinalRef.current = false;
        resetSilenceTimer();
      };

      recognition.onspeechstart = () => {
        resetSilenceTimer();
      };

      recognition.onsoundstart = () => {
        resetSilenceTimer();
      };

      recognition.onresult = (event: any) => {
        resetSilenceTimer();
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            finalChunk += text;
          } else {
            interimChunk += text;
          }
        }

        const activeResult = (finalChunk || interimChunk).trim();
        if (activeResult) {
          lastActiveTextRef.current = activeResult;
        }

        if (interimChunk) {
          setInterimTranscript(interimChunk);
        }

        if (finalChunk) {
          hasCommittedFinalRef.current = true;
          setTranscript((prev) => (prev ? `${prev} ${finalChunk.trim()}` : finalChunk.trim()));
          setInterimTranscript('');
        }

        if (activeResult && optionsRef.current.onResult) {
          optionsRef.current.onResult(activeResult, !!finalChunk);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);

        // Natural fallback from hi-IN to en-IN for Hinglish grocery names
        if (event.error === 'language-not-supported' && recognition.lang !== 'en-IN') {
          try {
            recognition.lang = 'en-IN';
            recognition.start();
            return;
          } catch (e) {
            console.warn('Fallback to en-IN failed:', e);
          }
        }

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          const deniedMsg =
            'कृपया सेटिंग्स में जाकर माइक्रोफ़ोन की अनुमति (Microphone Permission) ऑन करें।';
          showToast(deniedMsg);
          stopListening();
        }

        if (optionsRef.current.onError) {
          optionsRef.current.onError(event.error);
        }
      };

      recognition.onend = () => {
        // If there was speech that was not finalized by an isFinal event, commit it onend
        if (!hasCommittedFinalRef.current && lastActiveTextRef.current) {
          if (optionsRef.current.onResult) {
            optionsRef.current.onResult(lastActiveTextRef.current, true);
          }
          setTranscript((prev) => (prev ? `${prev} ${lastActiveTextRef.current}` : lastActiveTextRef.current));
        }

        // CONTINUOUS LISTENING RESILIENCE:
        // In Chrome/Android, continuous speech recognition sometimes prematurely ends on brief pauses.
        // If the user did NOT explicitly stop and 5s silence hasn't expired, restart!
        if (!isExplicitlyStoppedRef.current) {
          try {
            recognition.start();
            return;
          } catch (e) {
            console.warn('Speech recognition restart notice:', e);
          }
        }

        clearSilenceTimer();
        setIsListening(false);
        setInterimTranscript('');
        if (optionsRef.current.onEnd) {
          optionsRef.current.onEnd();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err: any) {
      console.warn('Could not start speech recognition:', err);
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [getSpeechRecognitionClass, showToast, resetSilenceTimer, clearSilenceTimer, stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      isExplicitlyStoppedRef.current = true;
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [clearSilenceTimer]);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    toastMessage,
    startListening,
    stopListening,
    toggleListening,
    setTranscript,
    showToast,
  };
}
