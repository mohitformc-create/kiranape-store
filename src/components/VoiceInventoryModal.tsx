import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Package,
  Layers,
  Upload,
  Image as ImageIcon,
  Tag,
  Hash,
  HelpCircle,
  Volume2,
  Camera,
} from 'lucide-react';
import { Product, CustomCategory } from '../types';
import { CATEGORIES } from '../data/initialProducts';
import {
  parseVoiceInventorySpeech,
  GROCERY_EMOJI_PALETTE,
  createEmojiSvgDataUrl,
  ParsedVoiceItem,
} from '../utils/voiceInventoryParser';
import { FMCG_CDN_CATALOG, getCategoryEmojiDataUrl } from '../utils/productImageUtils';
import { playAdminNotificationChime } from '../utils/sound';
import { saveProductToCentralInventory } from '../services/orderApiService';
import { supabase } from '../config/supabase';
import { compressImageFile, dataUrlToFile } from '../utils/imageUtils';
import {
  formatSupabasePublicImageUrl,
  uploadProductImageToSupabase,
  getValidImageUrl,
} from '../services/supabaseClient';

interface VoiceInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  categories: CustomCategory[];
  onAddProduct: (data: any) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
}

const SAMPLE_VOICE_COMMANDS = [
  'डाबर च्यवनप्राश 1 किलो एमआरपी 590 सेलिंग प्राइस 480',
  'क्लासमेट रजिस्टर 1 पीस एमआरपी 60 सेलिंग 50',
  'रेनॉलड्स पेन 5 पीस एमआरपी 50 रेट 45',
  'फेविकोल 100 ग्राम एमआरपी 45 सेलिंग 40',
  'फॉर्च्यून कच्ची घानी सरसों तेल 1 लीटर MRP 160 रेट 145',
  'टाटा नमक 1 किलो प्रिंट रेट 28 में देना है 25',
  'आशीर्वाद शुद्ध चक्की आटा 10 किलो MRP 450 रेट 410',
];

export const VoiceInventoryModal: React.FC<VoiceInventoryModalProps> = ({
  isOpen,
  onClose,
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
}) => {
  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'hi-IN' | 'en-IN'>('hi-IN');
  const [transcript, setTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Form / Preview state
  const [parsedItem, setParsedItem] = useState<ParsedVoiceItem | null>(null);
  const [name, setName] = useState('');
  const [hindiName, setHindiName] = useState('');
  const [unit, setUnit] = useState('1 pc');
  const [mrp, setMrp] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(50);
  const [selectedCategory, setSelectedCategory] = useState<string>('General Grocery');
  const [selectedEmoji, setSelectedEmoji] = useState<string>('📦');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [useEmojiImage, setUseEmojiImage] = useState<boolean>(true);

  // Gallery/Camera Photo Upload & Supabase Storage state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Matching existing product
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [isUpdatingExisting, setIsUpdatingExisting] = useState<boolean>(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Available categories combined
  const allCategoryNames = React.useMemo(() => {
    const list = [...CATEGORIES.filter((c) => c !== 'All')];
    categories.forEach((cat) => {
      if (!list.includes(cat.name as any)) {
        list.push(cat.name as any);
      }
    });
    if (!list.includes('Health & Wellness' as any)) {
      list.push('Health & Wellness' as any);
    }
    return list;
  }, [categories]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);

        // If finalized, parse into fields
        if (event.results[0]?.isFinal) {
          handleProcessSpeech(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition Error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone access in browser.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice error: ${event.error}. You can also type below.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech init failed:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [speechLanguage]);

  // Start Voice Listening
  const startListening = () => {
    setSpeechError(null);
    setSaveSuccessNotice(null);
    if (!recognitionRef.current) {
      setSpeechError('Speech recognition not available on this browser. Please type below.');
      return;
    }
    try {
      recognitionRef.current.lang = speechLanguage;
      recognitionRef.current.start();
      playAdminNotificationChime();
    } catch {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
        }, 150);
      } catch (e: any) {
        setSpeechError('Unable to access microphone. Please type your phrase below.');
      }
    }
  };

  // Stop Voice Listening
  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    if (transcript.trim()) {
      handleProcessSpeech(transcript);
    }
  };

  // Speech processing & field hydration
  const handleProcessSpeech = (spokenText: string) => {
    if (!spokenText.trim()) return;

    const parsed = parseVoiceInventorySpeech(spokenText);
    setParsedItem(parsed);
    setName(parsed.name);
    setHindiName(parsed.hindiName || '');
    setUnit(parsed.unit);
    setMrp(parsed.mrp);
    setSellingPrice(parsed.sellingPrice);
    setSelectedCategory(parsed.category);
    setSelectedEmoji(parsed.suggestedEmoji);

    // Look for matching product in FMCG catalog for genuine product photo
    const fmcgMatch = FMCG_CDN_CATALOG.find(
      (f) =>
        f.name.toLowerCase().includes(parsed.name.toLowerCase()) ||
        parsed.name.toLowerCase().includes(f.name.toLowerCase())
    );

    if (fmcgMatch) {
      setImageUrl(fmcgMatch.imageUrl);
      setUseEmojiImage(false);
    } else {
      setImageUrl(createEmojiSvgDataUrl(parsed.suggestedEmoji));
      setUseEmojiImage(true);
    }

    // Check if product already exists in current store catalog
    checkForExistingProduct(parsed.name);
  };

  // Find if matching product exists in store inventory
  const checkForExistingProduct = (searchName: string) => {
    const cleanSearch = searchName.toLowerCase().trim();
    if (!cleanSearch) {
      setMatchedProduct(null);
      setIsUpdatingExisting(false);
      return;
    }

    const found = products.find((p) => {
      const pName = p.name.toLowerCase();
      const pHindi = (p.hindiName || '').toLowerCase();
      return (
        pName === cleanSearch ||
        pName.includes(cleanSearch) ||
        cleanSearch.includes(pName) ||
        (pHindi && pHindi.includes(cleanSearch))
      );
    });

    if (found) {
      setMatchedProduct(found);
      setIsUpdatingExisting(true);
      if (found.category) setSelectedCategory(found.category);
      if (found.unit) setUnit(found.unit);
      if (found.imageUrl && !found.imageUrl.includes('data:image/svg+xml')) {
        setImageUrl(found.imageUrl);
        setUseEmojiImage(false);
      }
    } else {
      setMatchedProduct(null);
      setIsUpdatingExisting(false);
    }
  };

  // Watch emoji change
  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    setImageFile(null);
    setUseEmojiImage(true);
    setImageUrl(createEmojiSvgDataUrl(emoji));
  };

  // Quick unit pill click
  const handleQuickUnit = (quickUnit: string) => {
    setUnit(quickUnit);
  };

  // Handle Gallery or Camera photo selection with client-side image compression
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploadError(null);
    setIsProcessingImage(true);

    try {
      // Compress image client-side to max 1000x1000px at quality 0.8 (under 500KB)
      const compressedDataUrl = await compressImageFile(file, 1000, 1000, 0.8);
      const cleanBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const optimizedFile = dataUrlToFile(compressedDataUrl, `${cleanBaseName || 'photo'}.jpg`);

      setImageFile(optimizedFile);
      setImageUrl(compressedDataUrl);
      setUseEmojiImage(false);
    } catch (err: any) {
      console.warn('Image processing error:', err);
      setImageUploadError('फ़ोटो प्रोसेस नहीं हो सकी। कृपया दोबारा प्रयास करें।');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Remove chosen photo and fallback to emoji tag
  const handleRemoveImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImageFile(null);
    setImageUrl(createEmojiSvgDataUrl(selectedEmoji));
    setUseEmojiImage(true);
    setImageUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // Upload image to Supabase Storage with strict public URL enforcement
  const uploadImageToStorage = async (file: File, base64Preview: string): Promise<string> => {
    const cleanFileName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}_${cleanFileName || 'product.jpg'}`;

    // Standard Cloud Public URL (https://sggpbjmxzooxwnwfodxp.supabase.co/storage/v1/object/public/product-images/${fileName})
    const canonicalPublicUrl = formatSupabasePublicImageUrl(fileName);

    try {
      // 1. Upload to Supabase Storage 'product-images'
      const uploadRes = await uploadProductImageToSupabase(file, fileName);
      if (uploadRes.publicUrl) {
        console.log('[Supabase Storage] Public Cloud URL generated:', uploadRes.publicUrl);
        return uploadRes.publicUrl;
      }
    } catch (storageErr) {
      console.warn('[Supabase Storage] Storage exception:', storageErr);
    }

    // 2. Fallback: Local Server CDN bucket pattern
    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Preview,
          fileName,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.publicUrl) {
          // Guarantee absolute URL so mobile devices & live deployments never fail
          const absoluteCdnUrl = json.publicUrl.startsWith('http')
            ? json.publicUrl
            : `${window.location.origin}${json.publicUrl}`;
          console.log('[Server CDN] Product photo stored on CDN:', absoluteCdnUrl);
          return absoluteCdnUrl;
        }
      }
    } catch (cdnErr) {
      console.warn('[Server CDN] Fallback CDN upload failed:', cdnErr);
    }

    // 3. Fallback: Canonical public cloud URL
    return canonicalPublicUrl;
  };

  // Discount calculation
  const discountPercent =
    mrp > 0 && sellingPrice > 0 && mrp > sellingPrice
      ? Math.round(((mrp - sellingPrice) / mrp) * 100)
      : 0;

  // Confirm Save or Update
  const handleSaveProduct = async () => {
    if (!name.trim()) {
      alert('Please enter a product name');
      return;
    }

    const finalMrp = Math.max(1, Number(mrp) || 100);
    const finalSp = Math.max(1, Number(sellingPrice) || Math.round(finalMrp * 0.9));
    const finalStock = Math.max(0, Number(stock) || 50);

    const isStationery =
      selectedCategory === 'Copies & Registers' ||
      selectedCategory === 'Pens, Pencils & Geometry' ||
      selectedCategory === 'Art, Craft & Fevicol' ||
      selectedCategory === 'Office & Daily Stationery' ||
      selectedCategory.toLowerCase().includes('stationery');

    setIsSaving(true);
    let finalImage = imageUrl;

    // Handle Supabase Storage photo upload if user uploaded a file
    if (imageFile) {
      setIsUploadingPhoto(true);
      setUploadStatusText('फ़ोटो अपलोड हो रही है, कृपया रुकें...');
      try {
        finalImage = await uploadImageToStorage(imageFile, imageUrl);
      } catch (uploadErr) {
        console.warn('Error during image upload, using base64 preview:', uploadErr);
      } finally {
        setIsUploadingPhoto(false);
        setUploadStatusText('');
      }
    } else if (useEmojiImage || !finalImage) {
      finalImage = createEmojiSvgDataUrl(selectedEmoji);
    }

    try {
      if (isUpdatingExisting && matchedProduct) {
        // UPDATE EXISTING PRODUCT
        const updates: Partial<Product> = {
          originalPrice: finalMrp,
          finalPrice: finalSp,
          discountPercent,
          unit: unit.trim() || matchedProduct.unit,
          stock: finalStock,
          imageUrl: finalImage,
          category: selectedCategory,
          department: isStationery ? 'stationery' : (matchedProduct.department || 'grocery'),
          updatedAt: Date.now(),
        };

        if (hindiName.trim()) updates.hindiName = hindiName.trim();

        onUpdateProduct(matchedProduct.id, updates);

        // Async save to Central Database and Supabase
        saveProductToCentralInventory({
          ...matchedProduct,
          ...updates,
        }).catch(console.warn);

        try {
          await supabase.from('products').update({
            name: matchedProduct.name,
            original_price: finalMrp,
            final_price: finalSp,
            unit: unit.trim() || matchedProduct.unit,
            stock: finalStock,
            image_url: finalImage,
            category: selectedCategory,
          }).eq('id', matchedProduct.id);
        } catch {}

        setSaveSuccessNotice(`✓ Updated "${matchedProduct.name}" rate to ₹${finalSp} (MRP ₹${finalMrp})`);
      } else {
        // CREATE NEW PRODUCT
        const newId = `prod_voice_${Date.now()}`;
        const newProduct: Product = {
          id: newId,
          name: name.trim(),
          hindiName: hindiName.trim() || undefined,
          category: selectedCategory,
          department: isStationery ? 'stationery' : 'grocery',
          unit: unit.trim() || '1 pc',
          originalPrice: finalMrp,
          discountPercent,
          finalPrice: finalSp,
          imageUrl: finalImage,
          isAvailable: true,
          stock: finalStock,
          updatedAt: Date.now(),
        };

        onAddProduct(newProduct);

        // Async dispatch
        saveProductToCentralInventory(newProduct).catch(console.warn);

        try {
          await supabase.from('products').insert([{
            id: newId,
            name: newProduct.name,
            hindi_name: newProduct.hindiName || null,
            category: newProduct.category,
            unit: newProduct.unit,
            original_price: finalMrp,
            final_price: finalSp,
            discount_percent: discountPercent,
            image_url: finalImage,
            stock: finalStock,
            is_available: true,
          }]);
        } catch {}

        setSaveSuccessNotice(`✓ Added "${newProduct.name}" at ₹${finalSp} (MRP ₹${finalMrp})`);
      }

      playAdminNotificationChime();

      setTimeout(() => {
        setIsSaving(false);
        setIsUploadingPhoto(false);
        setImageFile(null);
        setImageUploadError(null);
        onClose();
        // Reset form
        setTranscript('');
        setParsedItem(null);
        setName('');
        setSaveSuccessNotice(null);
      }, 1200);
    } catch (err: any) {
      console.error('Failed saving voice product:', err);
      alert('Could not save product: ' + (err.message || 'Unknown error'));
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Mic className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-base sm:text-lg leading-tight tracking-tight">
                  बोलकर सामान जोड़ें (AI Voice Add)
                </h3>
                <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Hindi / Hinglish
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                बस बोलें: नाम, वजन, MRP और रेट — AI खुद सब भर देगा!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Section 1: Voice Listening Card */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden border border-stone-700">
            {/* Background glowing aura when listening */}
            {isListening && (
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Voice Recognition Engine
                </span>
                <h4 className="font-heading font-extrabold text-base sm:text-lg">
                  {isListening ? '🎙️ सुन रहे हैं... बोलिए!' : 'माइक्रोफ़ोन दबाकर बोलें'}
                </h4>
                <p className="text-xs text-stone-300 max-w-md">
                  उदाहरण: &quot;च्यवनप्राश 1 किलो एमआरपी 590 सेलिंग प्राइस 480&quot;
                </p>
              </div>

              {/* Language Switcher & Mic Action */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <select
                  value={speechLanguage}
                  onChange={(e) => setSpeechLanguage(e.target.value as any)}
                  className="bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="hi-IN">हिंदी (hi-IN)</option>
                  <option value="en-IN">English (en-IN)</option>
                </select>

                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`px-5 py-3 rounded-2xl font-heading font-black text-sm transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95 ${
                    isListening
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 hover:shadow-emerald-500/25'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span>रोकें (Done)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" />
                      <span>बोलें (Start)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Transcript Display & Manual Text Fallback */}
            <div className="mt-4 pt-4 border-t border-stone-700/80 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProcessSpeech(transcript);
                    }
                  }}
                  placeholder="बोले गए शब्द यहाँ दिखेंगे, या खुद टाइप करके Enter दबाएं..."
                  className="w-full bg-stone-950/70 border border-stone-700 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-emerald-400 pr-24"
                />
                <button
                  type="button"
                  onClick={() => handleProcessSpeech(transcript)}
                  disabled={!transcript.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                >
                  भरें (Parse)
                </button>
              </div>

              {speechError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{speechError}</span>
                </div>
              )}

              {/* Quick Click Sample Chips for Testing */}
              <div className="pt-1">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mb-1.5">
                  Try Sample Voice Inputs (क्लिक करके टेस्ट करें):
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {SAMPLE_VOICE_COMMANDS.map((sample, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTranscript(sample);
                        handleProcessSpeech(sample);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 border border-stone-700 font-medium transition-colors cursor-pointer text-left"
                    >
                      &quot;{sample}&quot;
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Matched Existing Product Alert Notice */}
          {matchedProduct && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-heading font-black text-amber-950 text-sm">
                      पुराना सामान मिला (Existing Product Found)
                    </span>
                    <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                      #{matchedProduct.id}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    <strong>{matchedProduct.name}</strong> • Current Selling: ₹{matchedProduct.finalPrice} (MRP: ₹{matchedProduct.originalPrice})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setIsUpdatingExisting(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isUpdatingExisting
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  रेट अपडेट करें
                </button>
                <button
                  type="button"
                  onClick={() => setIsUpdatingExisting(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !isUpdatingExisting
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  नया अलग जोड़ें
                </button>
              </div>
            </div>
          )}

          {/* Section 3: Interactive Confirmation Form */}
          <div className="bg-stone-50 rounded-3xl p-4 sm:p-5 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
              <h4 className="font-heading font-black text-stone-900 text-sm flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-700" />
                <span>पुष्टि करें व एडिट करें (Parsed Product Details)</span>
              </h4>
              <span className="text-[11px] text-stone-500 font-medium">
                आप किसी भी फील्ड को हाथ से बदल सकते हैं
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name (English / Primary) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                  Product Name (सामान का नाम) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    checkForExistingProduct(e.target.value);
                  }}
                  placeholder="e.g. Dabur Chyawanprash"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              {/* Hindi Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                  Hindi Name (हिंदी नाम)
                </label>
                <input
                  type="text"
                  value={hindiName}
                  onChange={(e) => setHindiName(e.target.value)}
                  placeholder="उदा. डाबर च्यवनप्राश"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Row 2: Weight/Unit & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unit & Quick Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                  Pack Size / Unit (वजन या मात्रा) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. 1 kg, 500 g, 1 Litre"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {['1 kg', '500 g', '250 g', '1 Litre', '500 ml', '1 pc', '1 pkt', '5 kg'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => handleQuickUnit(u)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                        unit === u
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                  Category (केटेगरी) <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {allCategoryNames.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: MRP, Selling Price, and Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-3.5 rounded-2xl border border-stone-200">
              {/* MRP */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                  MRP (प्रिंट रेट ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={mrp || ''}
                    onChange={(e) => setMrp(Number(e.target.value) || 0)}
                    placeholder="590"
                    className="w-full pl-7 pr-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Selling Price */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Selling Price (बिक्री रेट ₹)
                  </label>
                  {discountPercent > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-stone-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(Number(e.target.value) || 0)}
                    placeholder="480"
                    className="w-full pl-7 pr-3 py-1.5 bg-emerald-50/50 border border-emerald-300 rounded-xl text-xs font-black text-emerald-950 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Stock Quantity */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
                  Stock (स्टॉक मात्रा)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={stock || ''}
                    onChange={(e) => setStock(Number(e.target.value) || 0)}
                    placeholder="50"
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-[11px] text-stone-400 font-bold">pcs</span>
                </div>
              </div>
            </div>

            {/* Row 4: Dedicated High-Fidelity Photo Upload Block (Gallery/Camera & Supabase Storage) */}
            <div className="space-y-3 pt-2 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <label className="text-xs font-heading font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-700" />
                  <span>सामान की फ़ोटो (Product Photo Upload)</span>
                </label>
                <span className="text-[10px] text-stone-500 font-medium">
                  {imageFile ? 'फ़ोटो तैयार (Ready to upload)' : (!useEmojiImage && imageUrl ? 'CDN/कस्टम फ़ोटो' : 'गैलरी/कैमरा फ़ोटो जोड़ें')}
                </span>
              </div>

              {/* Hidden File Inputs for Gallery & Camera */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                id="gallery-image-input"
                className="hidden"
                onChange={handleImageChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                id="camera-image-input"
                className="hidden"
                onChange={handleImageChange}
              />

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* 1:1 Preview Container */}
                <div
                  onClick={() => {
                    if (!imageFile && useEmojiImage) {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 overflow-hidden flex items-center justify-center flex-shrink-0 transition-all ${
                    imageFile || (!useEmojiImage && imageUrl)
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-xs'
                      : 'border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer bg-stone-50'
                  }`}
                  title={imageFile || (!useEmojiImage && imageUrl) ? 'Product Photo Preview' : 'फ़ोटो जोड़ने के लिए क्लिक करें'}
                >
                  {isProcessingImage ? (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin mb-1" />
                      <span className="text-[10px] font-bold text-emerald-800">कंप्रेस हो रहा है...</span>
                    </div>
                  ) : imageFile || (!useEmojiImage && imageUrl) ? (
                    <>
                      <img
                        src={getValidImageUrl(imageUrl, selectedCategory, name)}
                        alt={name || 'Product Photo'}
                        onError={(e) => {
                          const emojiFallback = getCategoryEmojiDataUrl(selectedCategory, name);
                          if ((e.currentTarget as HTMLImageElement).src !== emojiFallback) {
                            (e.currentTarget as HTMLImageElement).src = emojiFallback;
                          }
                        }}
                        className="w-full h-full object-contain p-1.5 mix-blend-multiply"
                      />
                      {/* Tiny "✕ (हटाएं)" Remove Button */}
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
                        title="✕ हटाएं (Remove Photo)"
                        aria-label="Remove Photo"
                      >
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </>
                  ) : (
                    /* Placeholder: "🖼️ फ़ोटो जोड़ें (गैलरी/कैमरा)" */
                    <div className="flex flex-col items-center justify-center p-2 text-center group-hover:scale-105 transition-transform">
                      <span className="text-2xl mb-1">🖼️</span>
                      <span className="text-[11px] font-heading font-black text-stone-800 leading-tight">
                        फ़ोटो जोड़ें
                      </span>
                      <span className="text-[9px] text-stone-500 font-medium">
                        (गैलरी/कैमरा)
                      </span>
                    </div>
                  )}
                </div>

                {/* Controls & Triggers */}
                <div className="flex-1 w-full space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Trigger Button: "🖼️ गैलरी से फ़ोटो चुनें (Choose from Gallery)" */}
                    <button
                      type="button"
                      id="gallery-image-trigger-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingImage || isUploadingPhoto}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-heading font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>🖼️</span>
                      <span>गैलरी से फ़ोटो चुनें (Choose from Gallery)</span>
                    </button>

                    {/* Camera Trigger Button */}
                    <button
                      type="button"
                      id="camera-image-trigger-btn"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isProcessingImage || isUploadingPhoto}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-stone-100 active:scale-95 text-stone-800 border border-stone-300 font-heading font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>कैमरा (Camera)</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-stone-500 font-medium leading-relaxed">
                    💡 <strong>क्लाइंट-साइड कंप्रेस:</strong> बड़ी से बड़ी 5MB-10MB फ़ोटो भी ऑटो कंप्रेस होकर 500KB से कम साइज़ में Supabase Storage में सुरक्षित सेव हो जाती है।
                  </p>

                  {imageFile && (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="truncate">
                        फ़ोटो तैयार: {imageFile.name} ({(imageFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  )}

                  {imageUploadError && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>{imageUploadError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Secondary Palette: Quick Emoji Tags */}
              <div className="pt-2 border-t border-stone-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    या तुरंत इमोजी टैग चुनें (Optional Quick Emoji Tag):
                  </span>
                  {useEmojiImage && (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                      टैग: {selectedEmoji}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {GROCERY_EMOJI_PALETTE.map(({ emoji, label }) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-transform active:scale-90 cursor-pointer flex-shrink-0 ${
                        selectedEmoji === emoji && useEmojiImage
                          ? 'bg-amber-100 border-2 border-amber-500 scale-110 shadow-xs'
                          : 'bg-stone-50 border border-stone-200 hover:bg-stone-100'
                      }`}
                      title={label}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {saveSuccessNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{saveSuccessNotice}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-stone-50 border-t border-stone-200 px-5 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving || isUploadingPhoto}
            className="px-4 py-2 rounded-xl text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveProduct}
            disabled={!name.trim() || isSaving || isUploadingPhoto || isProcessingImage}
            className="px-6 py-2.5 rounded-xl font-heading font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {isUploadingPhoto ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>फ़ोटो अपलोड हो रही है, कृपया रुकें...</span>
              </>
            ) : isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Store...</span>
              </>
            ) : isUpdatingExisting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>अपडेट करें (Save Updates)</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                <span>स्टोर में जोड़ें (Add to Catalog)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
