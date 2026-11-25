/**
 * Area-Based Delivery Charge & Locality Zones Service
 * Persists delivery zones in Supabase with instant localStorage fallback & live cross-component sync.
 */

import { supabase } from './supabaseClient';
import {
  DELIVERY_LOCATIONS_KEY,
  CUSTOMER_SELECTED_LOCATION_KEY,
} from './storageService';

export interface DeliveryZone {
  id: string;
  name: string;
  baseCharge: number;
  freeDeliveryAbove: number | null; // null or <= 0 means no free delivery threshold (always charges baseCharge)
  isActive: boolean;
  sortOrder?: number;
}

export const DELIVERY_ZONES_STORAGE_KEY = 'kiranape_delivery_zones_v1';
export const DELIVERY_ZONES_UPDATED_EVENT = 'kiranape_delivery_zones_updated';

export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'zone-waidhan',
    name: 'बैढ़न (Waidhan)',
    baseCharge: 29,
    freeDeliveryAbove: 499,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'zone-college-mod',
    name: 'कॉलेज मोड़ (College Mod)',
    baseCharge: 29,
    freeDeliveryAbove: 499,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'zone-majan-mod',
    name: 'माजन मोड़ (Majan Mod)',
    baseCharge: 19,
    freeDeliveryAbove: null,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'zone-dhonti',
    name: 'ढोंटी (Dhonti)',
    baseCharge: 29,
    freeDeliveryAbove: null,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'zone-navjeevan-vihar',
    name: 'नवजीवन विहार (Navjeevan Vihar)',
    baseCharge: 39,
    freeDeliveryAbove: null,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 'zone-vindhyanagar',
    name: 'विंध्यनगर (Vindhyanagar)',
    baseCharge: 39,
    freeDeliveryAbove: null,
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 'zone-navanagar',
    name: 'नवानगर (Navanagar)',
    baseCharge: 49,
    freeDeliveryAbove: null,
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 'zone-amlohri',
    name: 'अमलोरी (Amlohri)',
    baseCharge: 49,
    freeDeliveryAbove: null,
    isActive: true,
    sortOrder: 8,
  },
  {
    id: 'zone-jayant',
    name: 'जयंत (Jayant)',
    baseCharge: 49,
    freeDeliveryAbove: null,
    isActive: true,
    sortOrder: 9,
  },
  {
    id: 'zone-dudhichua',
    name: 'दुधीचुआ (Dudhichua)',
    baseCharge: 49,
    freeDeliveryAbove: null,
    isActive: true,
    sortOrder: 10,
  },
];

function sanitizeZone(raw: any, index: number): DeliveryZone | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = String(raw.name || '').trim();
  if (!name) return null;

  const baseCharge = Math.max(
    0,
    Math.round(Number(raw.baseCharge ?? raw.base_charge ?? 0) || 0)
  );
  const rawThreshold = raw.freeDeliveryAbove ?? raw.free_delivery_above;
  const parsedThreshold =
    rawThreshold !== null && rawThreshold !== undefined && rawThreshold !== ''
      ? Math.round(Number(rawThreshold))
      : null;
  const freeDeliveryAbove =
    parsedThreshold !== null && Number.isFinite(parsedThreshold) && parsedThreshold > 0
      ? parsedThreshold
      : null;

  return {
    id: String(raw.id || `zone-${index + 1}-${Date.now()}`),
    name,
    baseCharge,
    freeDeliveryAbove,
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : raw.is_active !== false,
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? index + 1),
  };
}

export function notifyDeliveryZonesUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DELIVERY_ZONES_UPDATED_EVENT));
  }
}

/**
 * Synchronously reads saved delivery zones from localStorage (fallback to 10 default zones).
 */
export function getDeliveryZones(): DeliveryZone[] {
  if (typeof window === 'undefined') return DEFAULT_DELIVERY_ZONES;
  try {
    const raw = localStorage.getItem(DELIVERY_ZONES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DELIVERY_ZONES_STORAGE_KEY, JSON.stringify(DEFAULT_DELIVERY_ZONES));
      return DEFAULT_DELIVERY_ZONES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_DELIVERY_ZONES;
    }
    const sanitized = parsed
      .map((item, idx) => sanitizeZone(item, idx))
      .filter((z): z is DeliveryZone => z !== null);
    return sanitized.length > 0 ? sanitized : DEFAULT_DELIVERY_ZONES;
  } catch {
    return DEFAULT_DELIVERY_ZONES;
  }
}

export function getActiveDeliveryZones(zones?: DeliveryZone[]): DeliveryZone[] {
  const list = zones && zones.length > 0 ? zones : getDeliveryZones();
  const active = list.filter((z) => z.isActive !== false);
  return active.length > 0 ? active : DEFAULT_DELIVERY_ZONES;
}

/**
 * Resolves a saved locality name to an active DeliveryZone.
 * Gracefully maps legacy names (like Ambedkar Chowk or Thana Road, Waidhan) to बैढ़न (Waidhan).
 */
export function resolveSelectedDeliveryZone(
  zones: DeliveryZone[],
  savedAreaName?: string | null
): DeliveryZone {
  const activeZones = getActiveDeliveryZones(zones);
  const raw = (savedAreaName || '').trim();

  if (raw) {
    const lower = raw.toLowerCase();
    // 1. Exact case-insensitive match
    const exact = activeZones.find((z) => z.name.trim().toLowerCase() === lower);
    if (exact) return exact;

    // 2. Partial containment match (e.g., "Waidhan" -> "बैढ़न (Waidhan)", "Jayant" -> "जयंत (Jayant)")
    const partial = activeZones.find((z) => {
      const zLower = z.name.toLowerCase();
      return zLower.includes(lower) || lower.includes(zLower);
    });
    if (partial) return partial;

    // 3. Extract English/Hindi keywords inside parentheses
    const parenMatch = activeZones.find((z) => {
      const m = z.name.match(/\(([^)]+)\)/);
      if (!m) return false;
      const eng = m[1].trim().toLowerCase();
      return eng.length >= 3 && lower.includes(eng);
    });
    if (parenMatch) return parenMatch;
  }

  return activeZones[0] || DEFAULT_DELIVERY_ZONES[0];
}

/**
 * Returns the clean locality name only (delivery charges calculate silently in the background).
 */
export function formatDeliveryZoneOption(zone: DeliveryZone): string {
  return zone.name;
}

/**
 * Persists delivery zones immediately to localStorage + attempts Supabase cloud sync.
 */
export async function saveDeliveryZones(
  zones: DeliveryZone[]
): Promise<{ savedLocally: boolean; savedToSupabase: boolean; zones: DeliveryZone[] }> {
  const cleaned = zones
    .map((z, idx) => sanitizeZone({ ...z, sortOrder: idx + 1 }, idx))
    .filter((z): z is DeliveryZone => z !== null);

  const finalZones = cleaned.length > 0 ? cleaned : DEFAULT_DELIVERY_ZONES;

  // 1. Immediate localStorage persistence & cross-component broadcast
  let savedLocally = false;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DELIVERY_ZONES_STORAGE_KEY, JSON.stringify(finalZones));
      // Keep legacy delivery locations list in sync
      const activeNames = finalZones.filter((z) => z.isActive).map((z) => z.name);
      if (activeNames.length > 0) {
        localStorage.setItem(DELIVERY_LOCATIONS_KEY, JSON.stringify(activeNames));
      }
      savedLocally = true;
      notifyDeliveryZonesUpdated();
    } catch (e) {
      console.warn('[DeliveryZones] LocalStorage save error:', e);
    }
  }

  // 2. Best-effort Supabase cloud persistence (table 'delivery_zones', with fallback to 'store_settings')
  let savedToSupabase = false;
  try {
    const rows = finalZones.map((z, idx) => ({
      id: z.id,
      name: z.name,
      base_charge: z.baseCharge,
      free_delivery_above: z.freeDeliveryAbove,
      is_active: z.isActive,
      sort_order: idx + 1,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('delivery_zones')
      .upsert(rows, { onConflict: 'id' });

    if (!upsertErr) {
      // Remove any deleted zones from Supabase table so cloud mirrors admin state exactly
      const currentIds = new Set(finalZones.map((z) => z.id));
      const { data: existingRows } = await supabase.from('delivery_zones').select('id');
      if (Array.isArray(existingRows)) {
        const idsToDelete = existingRows
          .map((r: any) => String(r.id))
          .filter((id) => !currentIds.has(id));
        if (idsToDelete.length > 0) {
          await supabase.from('delivery_zones').delete().in('id', idsToDelete);
        }
      }
      savedToSupabase = true;
    } else {
      // Fallback: attempt storing JSON payload in 'store_settings' key-value table if available
      const { error: kvErr } = await supabase.from('store_settings').upsert(
        {
          id: 'delivery_zones',
          value: finalZones,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
      if (!kvErr) {
        savedToSupabase = true;
      }
    }
  } catch (err) {
    console.warn('[DeliveryZones] Supabase sync fallback active (localStorage saved):', err);
  }

  return { savedLocally, savedToSupabase, zones: finalZones };
}

/**
 * Hydrates delivery zones from Supabase on app load if available.
 */
export async function syncDeliveryZonesFromSupabase(): Promise<DeliveryZone[] | null> {
  try {
    const { data, error } = await supabase
      .from('delivery_zones')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data
        .map((row, idx) => sanitizeZone(row, idx))
        .filter((z): z is DeliveryZone => z !== null);

      if (mapped.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(DELIVERY_ZONES_STORAGE_KEY, JSON.stringify(mapped));
          const activeNames = mapped.filter((z) => z.isActive).map((z) => z.name);
          if (activeNames.length > 0) {
            localStorage.setItem(DELIVERY_LOCATIONS_KEY, JSON.stringify(activeNames));
          }
          notifyDeliveryZonesUpdated();
        }
        return mapped;
      }
    }

    // Fallback check in 'store_settings' table
    const { data: kvData, error: kvErr } = await supabase
      .from('store_settings')
      .select('value')
      .eq('id', 'delivery_zones')
      .maybeSingle();

    if (!kvErr && kvData && Array.isArray(kvData.value) && kvData.value.length > 0) {
      const mapped = kvData.value
        .map((row: any, idx: number) => sanitizeZone(row, idx))
        .filter((z: DeliveryZone | null): z is DeliveryZone => z !== null);

      if (mapped.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(DELIVERY_ZONES_STORAGE_KEY, JSON.stringify(mapped));
          notifyDeliveryZonesUpdated();
        }
        return mapped;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to same-tab and cross-tab delivery zone updates (and customer location updates).
 */
export function subscribeToDeliveryZones(callback: (zones: DeliveryZone[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleUpdate = () => {
    callback(getDeliveryZones());
  };

  const handleStorage = (e: StorageEvent) => {
    if (
      e.key === DELIVERY_ZONES_STORAGE_KEY ||
      e.key === CUSTOMER_SELECTED_LOCATION_KEY
    ) {
      callback(getDeliveryZones());
    }
  };

  window.addEventListener(DELIVERY_ZONES_UPDATED_EVENT, handleUpdate);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(DELIVERY_ZONES_UPDATED_EVENT, handleUpdate);
    window.removeEventListener('storage', handleStorage);
  };
}
