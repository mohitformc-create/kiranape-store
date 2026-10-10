import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';
import { getCategoryFallbackSvg, getCategoryEmoji } from '../utils/productImageUtils';

export { SUPABASE_URL, SUPABASE_ANON_KEY };

// Official Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Default Public Bucket Name
export const PRODUCT_IMAGES_BUCKET = 'product-images';

// Base standard public URL prefix for Supabase Storage
export const SUPABASE_STORAGE_PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}`;

/**
 * Standard online CDN fallback image for general grocery items
 */
export const FALLBACK_GROCERY_CDN_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';

/**
 * Standard online CDN fallback image for stationery & school items
 */
export const FALLBACK_STATIONERY_CDN_IMAGE =
  'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=400&q=80';

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
 * Safeguard broken URLs:
 * If image_url starts with http://localhost, 127.0.0.1, /src/assets/, or contains a broken/relative path,
 * automatically substitutes it with high-quality CDN placeholders or SVG pack-shots.
 */
export function getValidImageUrl(
  url?: string | null,
  category?: string,
  name?: string
): string {
  // If it's already a valid absolute online URL or valid data URI:
  if (url && typeof url === 'string') {
    const trimmed = url.trim();
    if (!isLocalOrRelativeImageUrl(trimmed)) {
      if (
        trimmed.startsWith('https://') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('data:image/')
      ) {
        return trimmed;
      }
    }
  }

  // Detect stationery vs grocery for specialized high-fidelity fallback
  const isStationery =
    (category && /stationery|copies|register|pen|pencil|craft|office/i.test(category)) ||
    (name && /classmate|reynolds|register|notebook|fevicol|paper|pen/i.test(name));

  // If category or name exists, produce authentic branded SVG packshot
  if (category || name) {
    return getCategoryFallbackSvg(category || 'General Grocery', name || 'Product');
  }

  return isStationery ? FALLBACK_STATIONERY_CDN_IMAGE : FALLBACK_GROCERY_CDN_IMAGE;
}

/**
 * Uploads a product photo to Supabase Storage with strict public URL enforcement:
 * https://sggpbjmxzooxwnwfodxp.supabase.co/storage/v1/object/public/product-images/${fileName}
 */
export async function uploadProductImageToSupabase(
  file: File | Blob,
  fileNameInput?: string
): Promise<{ publicUrl: string; fileName: string; error?: any }> {
  const originalName = fileNameInput || (file instanceof File ? file.name : 'product.jpg');
  const cleanName = originalName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}_${cleanName || 'product.jpg'}`;

  // Form the canonical public URL standard
  const forcedPublicUrl = formatSupabasePublicImageUrl(fileName);

  try {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) {
      console.warn('[Supabase Storage] Upload error:', uploadError.message);
      // Return the canonical public URL anyway, or fallback if needed
      return { publicUrl: forcedPublicUrl, fileName, error: uploadError };
    }

    // Double-check via getPublicUrl
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
 * Synchronizes products from Supabase table 'products' and purges any relative localhost URLs
 */
export async function syncProductsFromSupabase(): Promise<any[] | null> {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error || !Array.isArray(data)) {
      return null;
    }

    // Sanitize image URLs from database rows
    const sanitized = data.map((item: any) => ({
      ...item,
      imageUrl: getValidImageUrl(item.image_url || item.imageUrl, item.category, item.name),
    }));

    return sanitized;
  } catch {
    return null;
  }
}

/**
 * Insert or upsert single product into Supabase table 'products'
 */
export async function insertProductToSupabase(product: any): Promise<boolean> {
  try {
    const payload = {
      id: product.id,
      name: product.name,
      hindi_name: product.hindiName || product.hindi_name || null,
      category: product.category || 'General Grocery',
      department: product.department || 'grocery',
      unit: product.unit || '1 pc',
      original_price: Number(product.originalPrice ?? product.original_price ?? 0),
      final_price: Number(product.finalPrice ?? product.final_price ?? 0),
      discount_percent: Number(product.discountPercent ?? product.discount_percent ?? 0),
      image_url: product.imageUrl || product.image_url || null,
      stock: Number(product.stock ?? 50),
      is_available: product.isAvailable !== false,
    };
    const { error } = await supabase.from('products').upsert([payload]);
    if (error) {
      console.warn('[Supabase] Failed upserting product:', error.message);
      return false;
    }
    console.log('[Supabase] Product saved successfully:', product.id);
    return true;
  } catch (err) {
    console.warn('[Supabase] Exception upserting product:', err);
    return false;
  }
}

/**
 * Update single product in Supabase table 'products'
 */
export async function updateProductInSupabase(id: string, updates: any): Promise<boolean> {
  try {
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.hindiName !== undefined) payload.hindi_name = updates.hindiName;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.department !== undefined) payload.department = updates.department;
    if (updates.unit !== undefined) payload.unit = updates.unit;
    if (updates.originalPrice !== undefined) payload.original_price = Number(updates.originalPrice);
    if (updates.finalPrice !== undefined) payload.final_price = Number(updates.finalPrice);
    if (updates.discountPercent !== undefined) payload.discount_percent = Number(updates.discountPercent);
    if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
    if (updates.stock !== undefined) payload.stock = Number(updates.stock);
    if (updates.isAvailable !== undefined) payload.is_available = Boolean(updates.isAvailable);

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
    // In PostgREST / Supabase, deleting with .neq('id', '___safe_guard___') deletes all rows
    const { data, error } = await supabase
      .from('products')
      .delete()
      .neq('id', '___non_existent_safe_id___')
      .select('id');

    if (error) {
      console.warn('[Supabase] Failed wiping all products:', error.message);
      return { success: false, error: error.message };
    }
    const count = Array.isArray(data) ? data.length : 0;
    console.log(`[Supabase] Wiped ${count} products from database.`);
    return { success: true, count };
  } catch (err: any) {
    console.warn('[Supabase] Exception wiping products:', err);
    return { success: false, error: err?.message || 'Wipe failed' };
  }
}
