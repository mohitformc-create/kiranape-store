import { API_BASE_URL } from '../config/api';
import {
  supabase,
  isLocalOrRelativeImageUrl,
  uploadProductImageToSupabase,
} from '../services/supabaseClient';
import {
  compressImageDataUrl,
  compressImageFile,
  dataUrlToFile,
} from './imageUtils';

/**
 * Checks whether an image URL is permanently hosted in Supabase Storage.
 * Original 359+ Supabase Storage images always match this check and must stay untouched.
 */
export function hasSupabaseStorageImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.trim().toLowerCase().includes('supabase.co/storage');
}

/**
 * Checks whether an image URL is a real raster/photo asset (not empty, SVG placeholder, or local path).
 */
export function hasRealDisplayImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower === '' ||
    lower === 'null' ||
    lower === 'undefined' ||
    lower.startsWith('data:image/svg+xml') ||
    lower.includes('placeholder') ||
    lower.includes('no-image') ||
    lower.includes('default-product') ||
    isLocalOrRelativeImageUrl(trimmed)
  ) {
    return false;
  }
  return true;
}

/**
 * Builds the exact Google Images search URL for crisp white-background Indian retail packshots.
 */
export function buildGoogleStudioSearchUrl(name: string, weight?: string): string {
  const safeName = (name || '').trim();
  const safeWeight = (weight || '').trim();
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(
    `${safeName} ${safeWeight} white background pack india`
  )}`;
}

const slugifyProductFilename = (productName: string): string => {
  const slug = (productName || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `${Date.now()}_${slug || 'studio_pack'}.jpg`;
};

async function fetchExternalImageAsDataUrl(url: string): Promise<string> {
  const trimmed = url.trim();

  // Attempt 1: Direct browser fetch (works when remote CDN supports CORS)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const res = await fetch(trimmed, { mode: 'cors', signal: controller.signal });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0 && (!blob.type || blob.type.startsWith('image/'))) {
          if (blob.type === 'image/svg+xml') {
            throw new Error('SVG URL is not a raster photo');
          }
          return await compressImageFile(blob, 800, 800, 0.82);
        }
      }
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Fall through to server-side proxy
  }

  // Attempt 2: Server-side proxy endpoint (/api/proxy-image) to bypass CORS
  const proxyEndpoint = API_BASE_URL ? `${API_BASE_URL}/api/proxy-image` : '/api/proxy-image';
  const proxyRes = await fetch(proxyEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmed }),
  });

  const payload = await proxyRes.json().catch(() => null);
  if (!proxyRes.ok || !payload?.success || !payload?.dataUrl) {
    throw new Error(
      payload?.error ||
        'लिंक से फोटो डाउनलोड नहीं हो सकी। कृपया Google Images में फोटो पर Right-Click/Long-Press करके "Copy Image" करें और बॉक्स में Ctrl+V से पेस्ट करें, या गैलरी से चुनें।'
    );
  }

  return compressImageDataUrl(payload.dataUrl, 800, 800, 0.82);
}

/**
 * Accepts a local File/Blob, clipboard Blob, data:image URL, or external image URL,
 * compresses it cleanly on a crisp white studio background, uploads it to Supabase Storage
 * `product-images` bucket, and returns the permanent public Supabase URL.
 */
export async function uploadStudioImageToSupabase(
  source: File | Blob | string,
  productName: string
): Promise<string> {
  let compressedDataUrl: string;

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) {
      throw new Error('कृपया कोई वैध फोटो या इमेज लिंक पेस्ट करें।');
    }

    if (trimmed.startsWith('data:image/')) {
      if (trimmed.toLowerCase().startsWith('data:image/svg+xml')) {
        throw new Error('SVG की जगह असली JPG/PNG प्रोडक्ट फोटो चुनें।');
      }
      compressedDataUrl = await compressImageDataUrl(trimmed, 800, 800, 0.82);
    } else if (/^https?:\/\//i.test(trimmed)) {
      compressedDataUrl = await fetchExternalImageAsDataUrl(trimmed);
    } else {
      throw new Error('कृपया https:// से शुरू होने वाला सीधा इमेज लिंक पेस्ट करें, या सीधे इमेज पेस्ट करें।');
    }
  } else {
    compressedDataUrl = await compressImageFile(source, 800, 800, 0.82);
  }

  const fileName = slugifyProductFilename(productName);
  const compressedFile = dataUrlToFile(compressedDataUrl, fileName);

  const uploadRes = await uploadProductImageToSupabase(compressedFile, fileName);
  if (uploadRes.error) {
    throw new Error(
      `Supabase Storage अपलोड त्रुटि: ${uploadRes.error.message || 'Upload failed'}`
    );
  }

  if (!uploadRes.publicUrl || !hasSupabaseStorageImage(uploadRes.publicUrl)) {
    throw new Error('Supabase Storage पब्लिक URL प्राप्त नहीं हुआ।');
  }

  return uploadRes.publicUrl;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Persists a permanent Supabase Storage URL into the Supabase `products` table.
 */
export async function savePermanentImageToSupabaseProduct(params: {
  supabaseId?: string;
  productId?: string;
  name: string;
  category?: string;
  unit?: string;
  price?: number;
  originalPrice?: number;
  permanentUrl: string;
}): Promise<{ saved: boolean; supabaseId?: string; error?: string }> {
  const { supabaseId, productId, name, category, unit, price, originalPrice, permanentUrl } = params;

  const targetId = supabaseId || (productId && UUID_REGEX.test(productId) ? productId : undefined);
  if (targetId) {
    const { data, error } = await supabase
      .from('products')
      .update({ image_url: permanentUrl })
      .eq('id', targetId)
      .select('id');

    if (!error && Array.isArray(data) && data.length > 0) {
      return { saved: true, supabaseId: String(data[0].id) };
    }
  }

  // Fallback 1: Try exact productId match even if non-UUID
  if (productId && productId !== targetId) {
    const { data, error } = await supabase
      .from('products')
      .update({ image_url: permanentUrl })
      .eq('id', productId)
      .select('id');

    if (!error && Array.isArray(data) && data.length > 0) {
      return { saved: true, supabaseId: String(data[0].id) };
    }
  }

  // Fallback 2: Lookup by exact name in Supabase products table
  if (name.trim()) {
    const { data: matchedRows } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', name.trim())
      .limit(1);

    if (Array.isArray(matchedRows) && matchedRows.length > 0) {
      const foundId = String(matchedRows[0].id);
      const { error: updErr } = await supabase
        .from('products')
        .update({ image_url: permanentUrl })
        .eq('id', foundId);

      if (!updErr) {
        return { saved: true, supabaseId: foundId };
      }
    }
  }

  // Fallback 3: Insert new row into Supabase products if item only existed locally
  const sellPrice = Number(price || originalPrice || 0);
  const mrpPrice = Number(originalPrice || price || 0);
  const { data: inserted, error: insertErr } = await supabase
    .from('products')
    .insert([
      {
        name: name.trim(),
        category: category || 'General Grocery',
        unit: unit || '1 Pc',
        price: sellPrice,
        original_price: mrpPrice > 0 ? mrpPrice : sellPrice,
        image_url: permanentUrl,
        in_stock: true,
      },
    ])
    .select('id');

  if (insertErr) {
    return { saved: false, error: insertErr.message };
  }

  return {
    saved: true,
    supabaseId: Array.isArray(inserted) && inserted[0]?.id ? String(inserted[0].id) : undefined,
  };
}

/**
 * Extracts either a pasted binary image file or an image URL string from a ClipboardEvent DataTransfer.
 */
export function extractClipboardImageOrUrl(
  clipboardData: DataTransfer | null | undefined
): File | string | null {
  if (!clipboardData) return null;

  const items: DataTransferItem[] = clipboardData.items
    ? Array.from(clipboardData.items)
    : [];
  for (const ci of items) {
    if (ci.type && ci.type.startsWith('image/')) {
      const file = ci.getAsFile();
      if (file) return file;
    }
  }

  const files: File[] = clipboardData.files
    ? Array.from(clipboardData.files)
    : [];
  for (const f of files) {
    if (!f.type || f.type.startsWith('image/')) {
      return f;
    }
  }

  const pastedText = clipboardData.getData('text/plain').trim();
  if (pastedText && (/^https?:\/\//i.test(pastedText) || pastedText.startsWith('data:image/'))) {
    return pastedText;
  }

  return null;
}
