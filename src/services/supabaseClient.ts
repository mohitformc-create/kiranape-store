import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';

export { SUPABASE_URL, SUPABASE_ANON_KEY };

// Official Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Default Public Bucket Name for product photos
export const PRODUCT_IMAGES_BUCKET = 'product-images';

// Base standard public URL prefix for Supabase Storage
export const SUPABASE_STORAGE_PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}`;

/**
 * High-quality grocery and stationery CDN fallbacks
 */
export const FALLBACK_GROCERY_CDN_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80';

export const FALLBACK_STATIONERY_CDN_IMAGE =
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=500&q=80';

/**
 * Standard SVG grocery placeholder image for immediate offline/error fallbacks
 */
export const DEFAULT_GROCERY_PLACEHOLDER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <rect width="200" height="200" rx="20" fill="#F8FAFC" />
  <circle cx="100" cy="90" r="50" fill="#E2E8F0" />
  <path d="M70,80 L130,80 L125,125 Q125,130 120,130 L80,130 Q75,130 75,125 Z" fill="#10B981" />
  <path d="M85,80 Q100,55 115,80" fill="none" stroke="#059669" stroke-width="5" stroke-linecap="round" />
  <circle cx="95" cy="100" r="4" fill="#FFFFFF" />
  <circle cx="105" cy="105" r="5" fill="#FBBF24" />
  <text x="100" y="165" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-weight="700" font-size="13" fill="#64748B">Kirana Store</text>
</svg>
`.trim())}`;

/**
 * Enforces external public URL standard:
 * https://sggpbjmxzooxwnwfodxp.supabase.co/storage/v1/object/public/product-images/${fileName}
 */
export function formatSupabasePublicImageUrl(fileName: string): string {
  const cleanName = fileName.replace(/^\/+/, '').replace(/\s+/g, '_');
  return `${SUPABASE_STORAGE_PUBLIC_BASE}/${cleanName}`;
}

/**
 * Checks if a given image URL is local, relative, or broken for live deployments
 */
export function isLocalOrRelativeImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim().toLowerCase();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return true;
  if (trimmed.startsWith('http://localhost') || trimmed.startsWith('https://localhost')) return true;
  if (trimmed.startsWith('http://127.0.0.1') || trimmed.startsWith('https://127.0.0.1')) return true;
  if (trimmed.startsWith('/src/') || trimmed.startsWith('src/') || trimmed.startsWith('@/')) return true;
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) return true;
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) return true;
  return false;
}

/**
 * Resolves any image URL or Supabase storage relative path into a working public URL
 * - If already a full URL (https://), validates it.
 * - If a relative path or storage filename, transforms it using supabase.storage.from('product-images').getPublicUrl().
 * - If empty or broken, uses category fallback SVG.
 */
export function resolveSupabaseImageUrl(
  url?: string | null,
  category?: string,
  name?: string,
  unit?: string,
  price?: number
): string {
  if (!url || typeof url !== 'string') {
    return getCategoryFallbackSvg(category || 'General Grocery', name || 'Product', unit, price);
  }

  const trimmed = url.trim();
  if (
    trimmed === '' ||
    trimmed === 'null' ||
    trimmed === 'undefined' ||
    isLocalOrRelativeImageUrl(trimmed)
  ) {
    return getCategoryFallbackSvg(category || 'General Grocery', name || 'Product', unit, price);
  }

  // If already absolute URL or inline data URI
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }

  // It is a relative storage key or path, e.g. "17123456_apple.jpg" or "product-images/photo.jpg"
  let cleanPath = trimmed.replace(/^\/+/, '');
  if (cleanPath.startsWith('storage/v1/object/public/product-images/')) {
    cleanPath = cleanPath.replace('storage/v1/object/public/product-images/', '');
  } else if (cleanPath.startsWith('product-images/')) {
    cleanPath = cleanPath.replace('product-images/', '');
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(cleanPath);
  if (data?.publicUrl) {
    return data.publicUrl;
  }

  return `${SUPABASE_STORAGE_PUBLIC_BASE}/${cleanPath}`;
}

/**
 * Compatibility wrapper
 */
export function getValidImageUrl(
  url?: string | null,
  category?: string,
  name?: string,
  unit?: string,
  price?: number
): string {
  return resolveSupabaseImageUrl(url, category, name, unit, price);
}

/**
 * Uploads a product photo to Supabase Storage with strict public URL enforcement:
 * Client compresses file to max 300KB before calling this.
 */
export async function uploadProductImageToSupabase(
  file: File | Blob,
  fileNameInput?: string
): Promise<{ publicUrl: string; fileName: string; error?: any }> {
  const originalName = fileNameInput || (file instanceof File ? file.name : 'product.jpg');
  const cleanName = originalName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}_${cleanName || 'product.jpg'}`;
  const forcedPublicUrl = formatSupabasePublicImageUrl(fileName);

  try {
    const { error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.warn('[Supabase Storage] Upload error:', uploadError.message);
      // Return public URL anyway in case bucket is public
      return { publicUrl: forcedPublicUrl, fileName, error: uploadError };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(fileName);

    return {
      publicUrl: publicUrl || forcedPublicUrl,
      fileName,
    };
  } catch (err: any) {
    console.warn('[Supabase Storage] Upload exception:', err);
    return { publicUrl: forcedPublicUrl, fileName, error: err };
  }
}

/**
 * Synchronizes products from Supabase table 'products'
 * Directly maps live rows to the app's Product model
 */
export async function syncProductsFromSupabase(): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) {
      console.warn('[Supabase] Failed syncing products:', error?.message);
      return null;
    }

    const sanitized = data.map((item: any) => {
      const sellPrice = Number(item.price ?? item.final_price ?? 0);
      const origPrice = Number(item.original_price ?? item.price ?? 0);
      const discount = origPrice > sellPrice && origPrice > 0
        ? Math.round(((origPrice - sellPrice) / origPrice) * 100)
        : 0;

      return {
        id: item.id,
        name: item.name,
        hindiName: item.hindi_name || item.name,
        category: item.category || 'General Grocery',
        department: item.department || 'grocery',
        unit: item.unit || '1 piece',
        originalPrice: origPrice,
        finalPrice: sellPrice,
        discountPercent: discount,
        imageUrl: resolveSupabaseImageUrl(item.image_url, item.category, item.name, item.unit, sellPrice),
        stock: Number(item.stock ?? 50),
        isAvailable: item.in_stock !== false,
        createdAt: item.created_at,
      };
    });

    return sanitized;
  } catch (err) {
    console.warn('[Supabase] Exception syncing products:', err);
    return null;
  }
}

/**
 * Seeds and synchronizes the Default Catalog to Supabase 'products' table
 * Prevents duplicates by matching product names
 */
export async function syncDefaultCatalogToSupabase(
  catalogList?: any[]
): Promise<{ success: boolean; totalSynced: number; message: string; error?: string }> {
  try {
    // If not supplied, import from defaultCatalog.json
    let listToSync = catalogList;
    if (!listToSync || !Array.isArray(listToSync) || listToSync.length === 0) {
      const catalogModule = await import('../data/defaultCatalog.json');
      listToSync = catalogModule.default;
    }

    if (!Array.isArray(listToSync) || listToSync.length === 0) {
      return { success: false, totalSynced: 0, message: 'No default products found to sync.' };
    }

    // 1. Fetch existing products from Supabase to prevent duplicate names
    const { data: existingRows } = await supabase
      .from('products')
      .select('name');

    const existingNames = new Set(
      (existingRows || []).map((r: any) => (r.name || '').trim().toLowerCase())
    );

    // 2. Prepare payload matching Supabase 'products' table schema
    const rowsToInsert = listToSync
      .filter((p: any) => !existingNames.has((p.name || '').trim().toLowerCase()))
      .map((p: any) => {
        const origPrice = Number(p.originalPrice ?? p.original_price ?? p.price ?? 0);
        const sellPrice = Number(p.finalPrice ?? p.price ?? p.originalPrice ?? 0);
        return {
          name: p.name,
          category: p.category || 'General Grocery',
          unit: p.unit || '1 piece',
          original_price: origPrice > 0 ? origPrice : sellPrice,
          price: sellPrice > 0 ? sellPrice : origPrice,
          image_url: p.imageUrl || p.image_url || null,
          in_stock: p.in_stock !== undefined ? Boolean(p.in_stock) : p.isAvailable !== false,
        };
      });

    if (rowsToInsert.length === 0) {
      return {
        success: true,
        totalSynced: 0,
        message: 'All default products are already present in Supabase table (no duplicates added).',
      };
    }

    // 3. Batch insert in chunks of 40 for optimal throughput
    const BATCH_SIZE = 40;
    let insertedCount = 0;
    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from('products').insert(batch);
      if (insertError) {
        console.warn('[Supabase] Batch insert failed:', insertError.message);
        throw new Error(insertError.message);
      }
      insertedCount += batch.length;
    }

    return {
      success: true,
      totalSynced: insertedCount,
      message: `✓ Safalta-purvak ${insertedCount} default products Supabase database mein sync ho gaye!`,
    };
  } catch (err: any) {
    console.error('[Supabase] Sync Default Catalog error:', err);
    return {
      success: false,
      totalSynced: 0,
      message: 'Failed to sync catalog: ' + (err?.message || 'Unknown error'),
      error: err?.message,
    };
  }
}

/**
 * Insert single product into Supabase table 'products'
 */
export async function insertProductToSupabase(product: any): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const origPrice = Number(product.originalPrice ?? product.original_price ?? 0);
    const sellPrice = Number(product.finalPrice ?? product.price ?? product.originalPrice ?? 0);

    const payload: any = {
      name: product.name,
      category: product.category || 'General Grocery',
      unit: product.unit || '1 piece',
      original_price: origPrice > 0 ? origPrice : sellPrice,
      price: sellPrice > 0 ? sellPrice : origPrice,
      image_url: product.imageUrl || product.image_url || null,
      in_stock: product.in_stock !== undefined ? Boolean(product.in_stock) : product.isAvailable !== false,
    };

    if (product.barcode) {
      payload.barcode = product.barcode;
    }

    // Include id if UUID format
    if (product.id && typeof product.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(product.id)) {
      payload.id = product.id;
    }

    let { data, error } = await supabase.from('products').insert([payload]).select();
    
    // If failed because 'barcode' column doesn't exist in Supabase schema, retry without barcode
    if (error && error.message?.toLowerCase().includes('barcode')) {
      delete payload.barcode;
      const retryResult = await supabase.from('products').insert([payload]).select();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.warn('[Supabase] Failed inserting product:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data: data?.[0] };
  } catch (err: any) {
    console.warn('[Supabase] Exception inserting product:', err);
    return { success: false, error: err?.message };
  }
}

/**
 * Update single product in Supabase table 'products'
 */
export async function updateProductInSupabase(id: string, updates: any): Promise<boolean> {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.unit !== undefined) payload.unit = updates.unit;
    if (updates.originalPrice !== undefined || updates.original_price !== undefined) {
      payload.original_price = Number(updates.originalPrice ?? updates.original_price);
    }
    if (updates.finalPrice !== undefined || updates.price !== undefined) {
      payload.price = Number(updates.finalPrice ?? updates.price);
    }
    if (updates.imageUrl !== undefined || updates.image_url !== undefined) {
      payload.image_url = updates.imageUrl || updates.image_url;
    }
    if (updates.isAvailable !== undefined || updates.in_stock !== undefined) {
      payload.in_stock = updates.in_stock !== undefined ? Boolean(updates.in_stock) : Boolean(updates.isAvailable);
    }

    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed updating product:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception updating product:', err);
    return false;
  }
}

/**
 * Delete single product from Supabase table 'products'
 */
export async function deleteProductFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed deleting product:', error.message);
      return false;
    }
    console.log('[Supabase] Product deleted from table:', id);
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception deleting product:', err);
    return false;
  }
}

/**
 * Wipe all products from Supabase table 'products' in 1-click
 */
export async function wipeAllProductsFromSupabase(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .gte('created_at', '1970-01-01T00:00:00Z')
      .select('id');

    if (error) {
      console.warn('[Supabase] Delete with gte failed, trying neq fallback:', error.message);
      const { data: d2, error: err2 } = await supabase
        .from('products')
        .delete()
        .neq('name', '___impossible_name___')
        .select('id');

      if (err2) {
        return { success: false, error: err2.message };
      }
      return { success: true, count: Array.isArray(d2) ? d2.length : 0 };
    }

    const count = Array.isArray(data) ? data.length : 0;
    console.log(`[Supabase] Wiped ${count} products from database.`);
    return { success: true, count };
  } catch (err: any) {
    console.warn('[Supabase] Exception wiping products:', err);
    return { success: false, error: err?.message || 'Wipe failed' };
  }
}
