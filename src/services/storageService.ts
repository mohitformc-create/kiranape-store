import { Product, Order, OrderStatus, StoreSettings, PromoBanner, CustomCategory, ParchiOrder } from '../types';
import { INITIAL_PRODUCTS, STORE_DEFAULTS, DEFAULT_BANNERS } from '../data/initialProducts';
import { WHOLESALE_105_PRODUCTS } from '../data/wholesaleCatalog105';
import { FORTUNE_OIL_PRODUCTS } from '../data/fortuneCatalog';
import { STATIONERY_PRODUCTS } from '../data/stationeryCatalog';
import { idbGet, idbSet, idbDelete } from './idbStorage';

export const ALL_VERIFIED_PRODUCTS: Product[] = [...WHOLESALE_105_PRODUCTS, ...FORTUNE_OIL_PRODUCTS];

export const PERMANENT_CATALOG_KEY = 'kiranape_permanent_catalog';
export const SETTINGS_STORAGE_KEY = 'kiranape_store_settings';
export const CUSTOM_CATEGORIES_KEY = 'kiranape_custom_categories';
export const PARCHI_ORDERS_KEY = 'kiranape_parchi_orders';
export const WHOLESALE_INJECTED_FLAG = 'kiranape_wholesale_fortune_injected_v4';
export const CLEAN_SLATE_FLAG = 'kiranape_clean_slate_reset_v5';
export const DELIVERY_LOCATIONS_KEY = 'kiranape_delivery_locations';
export const CUSTOMER_SELECTED_LOCATION_KEY = 'customer_selected_location';
export const DEVICE_USER_ID_KEY = 'kiranape_device_user_id';
export const CUSTOMER_PHONE_KEY = 'kiranape_customer_phone';

// One-time purge of obsolete/demo mock keys to prevent 12 demo orders from ever reappearing
if (typeof window !== 'undefined') {
  try {
    const purgeFlag = 'kiranape_mock_orders_purged_v5';
    if (!localStorage.getItem(purgeFlag)) {
      localStorage.removeItem('kirana_orders');
      localStorage.removeItem('admin_orders_backup');
      localStorage.removeItem('chaurasia_kirana_orders_v1');
      localStorage.removeItem('chaurasia_kirana_orders_v2');
      localStorage.removeItem('dummy_orders');
      localStorage.removeItem('demo_orders');
      localStorage.setItem(purgeFlag, 'true');
    }
  } catch {}
}

export const DEFAULT_DELIVERY_LOCATIONS: string[] = [
  'बैढ़न (Waidhan)',
  'सिंगरौली (Singrauli)',
  'मोरवा (Morwa)',
  'अंबेडकर चौक (Ambedkar Chowk)',
];

export function getDeviceUserId(): string {
  if (typeof window === 'undefined') return 'device_kiranape_default';
  try {
    let devId = localStorage.getItem(DEVICE_USER_ID_KEY);
    if (!devId) {
      devId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(DEVICE_USER_ID_KEY, devId);
    }
    return devId;
  } catch {
    return 'device_kiranape_temp';
  }
}

export function getSavedCustomerPhone(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(CUSTOMER_PHONE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveCustomerPhone(phone: string): void {
  if (typeof window === 'undefined' || !phone) return;
  try {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean) {
      localStorage.setItem(CUSTOMER_PHONE_KEY, clean);
    }
  } catch (e) {
    console.warn('Error saving customer phone:', e);
  }
}

export function getDeliveryLocations(): string[] {
  if (typeof window === 'undefined') return DEFAULT_DELIVERY_LOCATIONS;
  try {
    const raw = localStorage.getItem(DELIVERY_LOCATIONS_KEY);
    if (!raw) {
      localStorage.setItem(DELIVERY_LOCATIONS_KEY, JSON.stringify(DEFAULT_DELIVERY_LOCATIONS));
      return DEFAULT_DELIVERY_LOCATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DELIVERY_LOCATIONS;
  } catch {
    return DEFAULT_DELIVERY_LOCATIONS;
  }
}

export function saveDeliveryLocations(locations: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DELIVERY_LOCATIONS_KEY, JSON.stringify(locations));
    notifySync();
  } catch (e) {
    console.error('Error saving delivery locations:', e);
  }
}

export function addDeliveryLocation(loc: string): string[] {
  const current = getDeliveryLocations();
  const trimmed = loc.trim();
  if (!trimmed || current.includes(trimmed)) return current;
  const updated = [...current, trimmed];
  saveDeliveryLocations(updated);
  return updated;
}

export function removeDeliveryLocation(loc: string): string[] {
  const current = getDeliveryLocations();
  const updated = current.filter((l) => l !== loc);
  const final = updated.length > 0 ? updated : DEFAULT_DELIVERY_LOCATIONS;
  saveDeliveryLocations(final);
  return final;
}

export function getCustomerSelectedLocation(): string {
  if (typeof window === 'undefined') return 'बैढ़न (Waidhan)';
  try {
    const saved = localStorage.getItem(CUSTOMER_SELECTED_LOCATION_KEY);
    if (saved) return saved;
    return 'बैढ़न (Waidhan)';
  } catch {
    return 'बैढ़न (Waidhan)';
  }
}

export function setCustomerSelectedLocation(location: string): void {
  if (typeof window === 'undefined' || !location) return;
  try {
    localStorage.setItem(CUSTOMER_SELECTED_LOCATION_KEY, location.trim());
    notifySync();
  } catch (e) {
    console.error('Error setting customer location:', e);
  }
}
const PRODUCTS_STORAGE_KEY = PERMANENT_CATALOG_KEY;
const ORDERS_STORAGE_KEY = 'kiranape_orders';
const LEGACY_ORDERS_STORAGE_KEY = 'chaurasia_kirana_orders_v1';
const PIN_STORAGE_KEY = 'chaurasia_kirana_admin_pin_v1';
const CART_STORAGE_KEY = 'chaurasia_kirana_cart_v1';
const LEGACY_SETTINGS_STORAGE_KEY = 'chaurasia_kirana_store_settings_v1';
const BANNERS_STORAGE_KEY = 'chaurasia_kirana_banners_v1';

// Custom event names for instant same-tab reactive updates
const SYNC_EVENT = 'chaurasia_data_sync';
export const ORDERS_UPDATED_EVENT = 'kiranape_orders_updated';

export function notifyOrdersUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ORDERS_UPDATED_EVENT));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  }
}

function notifySync() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  }
}

/**
 * Calculate final selling price based on original price and discount percent
 */
export function calculateFinalPrice(originalPrice: number, discountPercent: number): number {
  if (discountPercent <= 0) return originalPrice;
  const discounted = originalPrice * (1 - discountPercent / 100);
  return Math.max(1, Math.round(discounted));
}

// ---------------- PRODUCTS REPOSITORY (ROCK-SOLID PERMANENT STORAGE) ---------------- //

export function resetCatalogToCleanSlate(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERMANENT_CATALOG_KEY, JSON.stringify([]));
    localStorage.setItem(CLEAN_SLATE_FLAG, 'true');
    localStorage.removeItem('kirana_products');
    localStorage.removeItem('chaurasia_kirana_products_v1');
    localStorage.removeItem('chaurasia_kirana_products_v2');
    localStorage.removeItem('chaurasia_custom_products');
    localStorage.removeItem('kirana_custom_products');
    localStorage.removeItem(WHOLESALE_INJECTED_FLAG);
    notifySync();
  } catch (e) {
    console.error('Error resetting catalog to clean slate:', e);
  }
}

export function clearAllProducts(): void {
  resetCatalogToCleanSlate();
}

/**
 * Merge and inject verified wholesale catalog on explicit merchant request only.
 */
export function mergeAndInjectWholesaleCatalog(): Product[] {
  if (typeof window === 'undefined') return ALL_VERIFIED_PRODUCTS;

  try {
    const raw = localStorage.getItem(PERMANENT_CATALOG_KEY);
    let existingProducts: Product[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          existingProducts = parsed;
        }
      } catch (e) {
        console.error('Error parsing existing products for wholesale injection:', e);
      }
    }

    const existingById = new Map<string, Product>();
    const existingByName = new Map<string, Product>();

    for (const p of existingProducts) {
      if (p.id) existingById.set(p.id, p);
      if (p.name) existingByName.set(p.name.trim().toLowerCase(), p);
    }

    const mergedList: Product[] = [];
    const usedExistingIds = new Set<string>();

    // 1. Process all verified base products
    for (const baseItem of ALL_VERIFIED_PRODUCTS) {
      const match = existingById.get(baseItem.id) || existingByName.get(baseItem.name.trim().toLowerCase());
      if (match) {
        usedExistingIds.add(match.id);
        const isUnsplash = !match.imageUrl || match.imageUrl.includes('unsplash.com');
        mergedList.push({
          ...baseItem,
          ...match,
          id: baseItem.id,
          imageUrl: isUnsplash ? baseItem.imageUrl : match.imageUrl,
          originalPrice: Number(match.originalPrice) || baseItem.originalPrice,
          discountPercent: match.discountPercent !== undefined ? Number(match.discountPercent) : baseItem.discountPercent,
          finalPrice: Number(match.finalPrice) || baseItem.finalPrice,
          isAvailable: match.isAvailable !== undefined ? match.isAvailable : true,
          updatedAt: match.updatedAt || Date.now(),
        });
      } else {
        mergedList.push({
          ...baseItem,
          updatedAt: Date.now(),
        });
      }
    }

    // 2. Preserve any custom products the user added
    for (const p of existingProducts) {
      if (!usedExistingIds.has(p.id) && !existingByName.has(p.name?.trim().toLowerCase())) {
        mergedList.push(p);
      }
    }

    localStorage.setItem(PERMANENT_CATALOG_KEY, JSON.stringify(mergedList));
    localStorage.setItem(WHOLESALE_INJECTED_FLAG, 'true');
    notifySync();
    return mergedList;
  } catch (e) {
    console.error('Error merging wholesale & Fortune catalog:', e);
    return ALL_VERIFIED_PRODUCTS;
  }
}

// In-memory catalog cache for instantaneous access without localStorage serialization bottlenecks
let inMemoryProductsCache: Product[] | null = null;
let isHydratingFromIdb = false;

// Safe quota-protected LocalStorage write with automatic garbage collection
function safeSaveProductsToLocalStorage(products: Product[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PERMANENT_CATALOG_KEY, JSON.stringify(products));
  } catch (quotaError) {
    // 1. Purge obsolete keys to free up localStorage space
    const obsoleteKeys = [
      'kirana_products',
      'chaurasia_kirana_products_v1',
      'chaurasia_kirana_products_v2',
      'kiranape_wholesale_fortune_injected_v4',
      'kiranape_inventory',
      'kiranape_inventory_backup',
    ];
    for (const key of obsoleteKeys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }

    // 2. Compact parchi orders in localStorage if taking too much quota
    try {
      const rawParchi = localStorage.getItem('kiranape_parchi_orders');
      if (rawParchi) {
        const parchiList = JSON.parse(rawParchi);
        if (Array.isArray(parchiList)) {
          // Keep only top 4 orders in localStorage with pruned images
          const pruned = parchiList.slice(0, 4).map((item) => ({
            ...item,
            imageBase64: item.imageBase64 && item.imageBase64.length > 2000 ? '' : item.imageBase64,
            imageUrl: item.imageUrl && item.imageUrl.length > 2000 ? '' : item.imageUrl,
          }));
          localStorage.setItem('kiranape_parchi_orders', JSON.stringify(pruned));
        }
      }
    } catch {
      // ignore
    }

    // 3. Retry saving catalog. If any items contain massive base64 strings, sanitize for localStorage only
    try {
      const sanitized = products.map((item) => {
        if (item.imageUrl && item.imageUrl.startsWith('data:image') && item.imageUrl.length > 5000) {
          return { ...item, imageUrl: '' };
        }
        return item;
      });
      localStorage.setItem(PERMANENT_CATALOG_KEY, JSON.stringify(sanitized));
    } catch {
      // Gracefully silent: the full data is already safely stored in inMemoryProductsCache and IndexedDB!
      console.warn('LocalStorage quota limit reached; catalog is safely cached in IndexedDB and memory.');
    }
  }
}

export function getProducts(): Product[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCTS;

  // Return in-memory cache if available and populated
  if (inMemoryProductsCache !== null && inMemoryProductsCache.length > 0) {
    return inMemoryProductsCache;
  }

  try {
    const raw = localStorage.getItem(PERMANENT_CATALOG_KEY);
    let loadedProducts: Product[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedProducts = parsed;
        }
      } catch {
        loadedProducts = [];
      }
    }

    // ZERO INVENTORY DOWNTIME: Always fallback/rehydrate to bundled 162 items catalog if storage is empty or incomplete
    if (!loadedProducts || loadedProducts.length < 162) {
      const existingMap = new Map((loadedProducts || []).map((p) => [p.id, p]));
      INITIAL_PRODUCTS.forEach((item) => {
        if (!existingMap.has(item.id)) {
          existingMap.set(item.id, item);
        }
      });
      loadedProducts = Array.from(existingMap.values());
      localStorage.setItem(PERMANENT_CATALOG_KEY, JSON.stringify(loadedProducts));
    }

    // Ensure all starter stationery products are present in the catalog
    const existingStationeryMap = new Map((loadedProducts || []).map((p) => [p.id, p]));
    let hasNewStationery = false;
    STATIONERY_PRODUCTS.forEach((statItem) => {
      if (!existingStationeryMap.has(statItem.id)) {
        existingStationeryMap.set(statItem.id, statItem);
        hasNewStationery = true;
      }
    });
    if (hasNewStationery) {
      loadedProducts = Array.from(existingStationeryMap.values());
      safeSaveProductsToLocalStorage(loadedProducts);
    }

    // Merge persistent custom edits (custom images, titles, pricing) from chaurasia_custom_products
    try {
      const rawCustom = localStorage.getItem('chaurasia_custom_products');
      if (rawCustom) {
        const customOverrides: Record<string, Partial<Product>> = JSON.parse(rawCustom) || {};
        loadedProducts = loadedProducts.map((p) => {
          const override = customOverrides[p.id];
          if (override) {
            return {
              ...p,
              ...override,
              imageUrl: override.imageUrl || p.imageUrl,
            };
          }
          return p;
        });
      }
    } catch {}

    inMemoryProductsCache = loadedProducts;

    // Asynchronously hydrate from IndexedDB in case high-res images or more items are stored there
    if (!isHydratingFromIdb) {
      isHydratingFromIdb = true;
      idbGet<Product[]>(PERMANENT_CATALOG_KEY)
        .then((idbProducts) => {
          if (Array.isArray(idbProducts) && idbProducts.length > 0) {
            inMemoryProductsCache = idbProducts;
            notifySync();
          }
        })
        .catch(() => {})
        .finally(() => {
          isHydratingFromIdb = false;
        });
    }

    return inMemoryProductsCache;
  } catch (e) {
    console.warn('Notice reading products from storage, using bundled catalog:', e);
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  // Update in-memory cache instantly
  inMemoryProductsCache = products;

  // Persist to IndexedDB asynchronously (no 5MB quota limitation)
  idbSet(PERMANENT_CATALOG_KEY, products).catch(() => {});

  // Persist to LocalStorage with quota protection
  safeSaveProductsToLocalStorage(products);

  notifySync();
}

export function addProduct(
  data: Omit<Product, 'id' | 'updatedAt' | 'finalPrice'> & { id?: string }
): Product {
  const products = getProducts();
  const finalPrice = calculateFinalPrice(Number(data.originalPrice), Number(data.discountPercent) || 0);
  
  const newProduct: Product = {
    ...data,
    id: data.id || ('prod-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
    originalPrice: Number(data.originalPrice),
    discountPercent: Number(data.discountPercent) || 0,
    finalPrice,
    isAvailable: data.isAvailable ?? true,
    updatedAt: Date.now(),
  };

  const updated = [newProduct, ...products];
  saveProducts(updated);

  // Persist newly added custom product
  try {
    const raw = localStorage.getItem('chaurasia_custom_products');
    const customMap = raw ? JSON.parse(raw) : {};
    customMap[newProduct.id] = newProduct;
    localStorage.setItem('chaurasia_custom_products', JSON.stringify(customMap));
  } catch {}

  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const products = getProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const current = products[index];
  const origPrice = updates.originalPrice !== undefined ? Number(updates.originalPrice) : current.originalPrice;
  const discPercent = updates.discountPercent !== undefined ? Number(updates.discountPercent) : current.discountPercent;
  const finalPrice = calculateFinalPrice(origPrice, discPercent);

  const updatedProduct: Product = {
    ...current,
    ...updates,
    originalPrice: origPrice,
    discountPercent: discPercent,
    finalPrice,
    updatedAt: Date.now(),
  };

  products[index] = updatedProduct;
  saveProducts([...products]);

  // Persist to chaurasia_custom_products map
  try {
    const raw = localStorage.getItem('chaurasia_custom_products');
    const customMap = raw ? JSON.parse(raw) : {};
    customMap[id] = {
      ...(customMap[id] || {}),
      ...updates,
    };
    localStorage.setItem('chaurasia_custom_products', JSON.stringify(customMap));
  } catch {}

  return updatedProduct;
}

export function deleteProduct(id: string): boolean {
  const products = getProducts();
  const filtered = products.filter((p) => p.id !== id);
  if (filtered.length === products.length) return false;
  saveProducts(filtered);
  return true;
}

export function resetProductsToDefault(): Product[] {
  clearAllProducts();
  return [];
}

// ---------------- ORDERS REPOSITORY ---------------- //

export function getOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY) || localStorage.getItem(LEGACY_ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading orders:', e);
    return [];
  }
}

/**
 * Customer Order Isolation: Returns ONLY orders created by this device or matching customer phone.
 * Never exposes global order history to customers.
 */
export function getCustomerOrders(): Order[] {
  const allOrders = getOrders();
  const deviceId = getDeviceUserId();
  const phone = getSavedCustomerPhone();
  const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

  return allOrders.filter((o) => {
    // 1. Strict match on device ID
    if (o.customerDeviceId && o.customerDeviceId === deviceId) return true;

    // 2. Or strict match on customer verified phone
    if (cleanPhone) {
      const orderPhoneClean = (o.customerPhone || o.phone || '').replace(/\D/g, '').slice(-10);
      if (orderPhoneClean && orderPhoneClean === cleanPhone) return true;
    }

    return false;
  });
}

export function createOrder(
  data: Omit<Order, 'id' | 'createdAt' | 'timestamp' | 'status'> & { id?: string; orderId?: string }
): Order {
  const orders = getOrders();
  const orderId = data.id || data.orderId || ('CK-' + Math.floor(1000 + Math.random() * 9000));
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const deviceId = getDeviceUserId();
  const phone = data.phone || data.customerPhone || '';
  if (phone) {
    saveCustomerPhone(phone);
  }
  const selectedLoc = data.deliveryLocation || getCustomerSelectedLocation();

  const newOrder: Order = {
    ...data,
    id: orderId,
    customerDeviceId: data.customerDeviceId || deviceId,
    customerPhone: data.customerPhone || phone,
    deliveryLocation: selectedLoc,
    createdAt: formattedDate,
    timestamp: Date.now(),
    status: 'New Order',
    paymentMethod: 'Cash on Delivery (COD)',
  };

  const updatedOrders = [newOrder, ...orders];
  if (typeof window !== 'undefined') {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    notifyOrdersUpdated();
  }
  return newOrder;
}

export function updateOrderStatus(orderId: string, status: OrderStatus): void {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return;

  orders[index].status = status;
  if (typeof window !== 'undefined') {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([...orders]));
    notifyOrdersUpdated();
  }
}

export function deleteOrder(orderId: string): void {
  const orders = getOrders();
  const filtered = orders.filter((o) => o.id !== orderId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(filtered));
    notifyOrdersUpdated();
  }
}

export function clearAllLocalOrders(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ORDERS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_ORDERS_STORAGE_KEY);
    localStorage.removeItem('kirana_orders');
    localStorage.removeItem('admin_orders_backup');
    localStorage.removeItem('kiranape_parchi_orders');
    localStorage.removeItem('chaurasia_kirana_parchi_orders_v1');
    notifyOrdersUpdated();
  }
}

export function saveOrders(orders: Order[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    notifyOrdersUpdated();
  } catch (e) {
    console.error('Error saving orders to localStorage:', e);
  }
}

// ---------------- ADMIN PIN REPOSITORY ---------------- //

export function getAdminPin(): string {
  if (typeof window === 'undefined') return STORE_DEFAULTS.adminPin || '@2508';
  try {
    const val = localStorage.getItem(PIN_STORAGE_KEY);
    if (!val || val === '1234' || val === '9779') {
      return '@2508';
    }
    return val?.toString()?.trim() || '@2508';
  } catch {
    return '@2508';
  }
}

export function setAdminPin(newPin: string): void {
  if (typeof window === 'undefined') return;
  const safePin = (newPin?.trim() || '@2508');
  localStorage.setItem(PIN_STORAGE_KEY, safePin);
  notifySync();
}

// ---------------- CART STORAGE (Persist customer bag) ---------------- //

export function getSavedCart(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCart(cart: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Error saving cart:', e);
  }
}

// ---------------- STORE SETTINGS STORAGE ---------------- //

export function getSavedStoreSettings(): StoreSettings {
  if (typeof window === 'undefined') return STORE_DEFAULTS;
  try {
    const raw =
      localStorage.getItem(SETTINGS_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    if (!raw) return STORE_DEFAULTS;
    const parsed = JSON.parse(raw);
    const result: StoreSettings = {
      ...STORE_DEFAULTS,
      ...parsed,
      serviceArea: parsed.serviceArea || STORE_DEFAULTS.serviceArea || 'Waidhan, Singrauli',
      deliveryTagline: parsed.deliveryTagline || STORE_DEFAULTS.deliveryTagline,
      minOrderForFreeDelivery:
        parsed.minOrderForFreeDelivery !== undefined
          ? Number(parsed.minOrderForFreeDelivery)
          : 199,
      adminPin:
        !parsed.adminPin || parsed.adminPin === '1234'
          ? '9779'
          : parsed.adminPin,
    };
    // Ensure old default placeholder phone numbers are migrated to active helpline 9424316081
    if (!result.phone || result.phone.includes('98765') || result.phone === '+91 98765 43210') {
      result.phone = '9424316081';
      result.whatsapp = '9424316081';
    }
    return result;
  } catch {
    return STORE_DEFAULTS;
  }
}

export function saveStoredSettings(settings: Partial<StoreSettings>): StoreSettings {
  const current = getSavedStoreSettings();
  const updated: StoreSettings = {
    ...current,
    ...settings,
    updatedAt: Date.now(),
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(LEGACY_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      notifySync();
    } catch (e) {
      console.error('Error saving store settings to localStorage:', e);
    }
  }
  return updated;
}

// ---------------- PROMO BANNERS STORAGE ---------------- //

export function isObsoleteDeliveryBanner(b: PromoBanner): boolean {
  if (!b) return false;
  const title = (b.title || '').toLowerCase();
  const subtitle = (b.subtitle || '').toLowerCase();
  return (
    b.id === 'banner-3' ||
    title.includes('superfast doorstep delivery') ||
    title.includes('30-45') ||
    subtitle.includes('zero signup needed')
  );
}

export function getSavedBanners(): PromoBanner[] {
  if (typeof window === 'undefined') return DEFAULT_BANNERS;
  try {
    const raw = localStorage.getItem(BANNERS_STORAGE_KEY);
    if (!raw) return DEFAULT_BANNERS;
    const parsed: PromoBanner[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_BANNERS;
    const cleaned = parsed.filter((b) => !isObsoleteDeliveryBanner(b));
    if (cleaned.length !== parsed.length) {
      saveStoredBanners(cleaned);
    }
    return cleaned.length > 0 ? cleaned : DEFAULT_BANNERS;
  } catch {
    return DEFAULT_BANNERS;
  }
}

export function saveStoredBanners(banners: PromoBanner[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(banners));
    notifySync();
  } catch (e) {
    console.error('Error saving banners to localStorage:', e);
  }
}

// ---------------- DYNAMIC CUSTOM CATEGORIES STORAGE ---------------- //

export const DEFAULT_CUSTOM_CATEGORIES: CustomCategory[] = [
  { id: 'cat-all', name: 'All', hindiName: 'सब कुछ', icon: '🏪', isSystem: true, order: 0 },
  // Grocery Department Categories
  { id: 'cat-snacks', name: 'Snacks & Biscuits', hindiName: 'नमकीन और बिस्कुट', icon: '🍪', department: 'grocery', order: 1 },
  { id: 'cat-drinks', name: 'Tea, Coffee & Drinks', hindiName: 'चाय और कोल्ड ड्रिंक्स', icon: '☕', department: 'grocery', order: 2 },
  { id: 'cat-health', name: 'Health & Nutrition', hindiName: 'हेल्थ और न्यूट्रिशन', icon: '💪', department: 'grocery', order: 3 },
  { id: 'cat-personal', name: 'Personal Care', hindiName: 'पर्सनल केयर व साबुन', icon: '🧴', department: 'grocery', order: 4 },
  { id: 'cat-household', name: 'Household Essentials', hindiName: 'सफाई और घर का सामान', icon: '🧼', department: 'grocery', order: 5 },
  { id: 'cat-packaged', name: 'Packaged Foods', hindiName: 'जैम, केचप व पैकेज्ड फूड', icon: '🥫', department: 'grocery', order: 6 },
  { id: 'cat-atta', name: 'Atta & Flours', hindiName: 'आटा और मैदा', icon: '🌾', department: 'grocery', order: 7 },
  { id: 'cat-rice-dal', name: 'Rice & Dal', hindiName: 'दाल और चावल', icon: '🍚', department: 'grocery', order: 8 },
  { id: 'cat-oil-ghee', name: 'Oil & Ghee', hindiName: 'तेल और घी', icon: '🫒', department: 'grocery', order: 9 },
  { id: 'cat-spices', name: 'Spices & Salt', hindiName: 'मसाले और नमक', icon: '🌶️', department: 'grocery', order: 10 },
  { id: 'cat-dairy', name: 'Dairy & Bakery', hindiName: 'दूध, दही, ब्रेड', icon: '🥛', department: 'grocery', order: 11 },
  { id: 'cat-pooja', name: 'Pooja Samagri', hindiName: 'पूजा सामग्री', icon: '🪔', department: 'grocery', order: 12 },
  { id: 'cat-baby', name: 'Baby Care', hindiName: 'शिशु देखभाल', icon: '🍼', department: 'grocery', order: 13 },
  // Stationery Department Categories (स्टेशनरी)
  { id: 'cat-copies', name: 'Copies & Registers', hindiName: 'रजिस्टर / कॉपियां', icon: '📓', department: 'stationery', order: 14 },
  { id: 'cat-pens', name: 'Pens, Pencils & Geometry', hindiName: 'पेन / पेंसिल / बॉक्स', icon: '🖊️', department: 'stationery', order: 15 },
  { id: 'cat-craft', name: 'Art, Craft & Fevicol', hindiName: 'गोंद / चार्ट / क्राफ्ट', icon: '🎨', department: 'stationery', order: 16 },
  { id: 'cat-office', name: 'Office & Daily Stationery', hindiName: 'टेप / कैंची / स्टेपलर / लिफाफे', icon: '📎', department: 'stationery', order: 17 },
];

export function getCustomCategories(): CustomCategory[] {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_CATEGORIES;
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(DEFAULT_CUSTOM_CATEGORIES));
      return DEFAULT_CUSTOM_CATEGORIES;
    }
    const parsed: CustomCategory[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Merge any new default categories that don't exist yet
      const existingNames = new Set(parsed.map((c) => c.name.toLowerCase()));
      const missingDefaults = DEFAULT_CUSTOM_CATEGORIES.filter(
        (def) => !existingNames.has(def.name.toLowerCase())
      );
      if (missingDefaults.length > 0) {
        const mergedCats = [...parsed, ...missingDefaults].map((c, i) => ({ ...c, order: i }));
        localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(mergedCats));
        return mergedCats;
      }
      return parsed;
    }
    return DEFAULT_CUSTOM_CATEGORIES;
  } catch {
    return DEFAULT_CUSTOM_CATEGORIES;
  }
}

export function saveCustomCategories(categories: CustomCategory[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
    notifySync();
  } catch (e) {
    console.error('Error saving custom categories:', e);
  }
}

export function addCustomCategory(category: Omit<CustomCategory, 'id'>): CustomCategory {
  const current = getCustomCategories();
  const newCat: CustomCategory = {
    ...category,
    id: 'cat-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    order: current.length,
  };
  const updated = [...current, newCat];
  saveCustomCategories(updated);
  return newCat;
}

export function updateCustomCategory(id: string, updates: Partial<CustomCategory>): CustomCategory | null {
  const current = getCustomCategories();
  const idx = current.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updatedCat = { ...current[idx], ...updates };
  current[idx] = updatedCat;
  saveCustomCategories(current);
  return updatedCat;
}

export function deleteCustomCategory(id: string): void {
  const current = getCustomCategories();
  // Protect 'All' system category
  const filtered = current.filter((c) => c.id !== id || c.isSystem);
  saveCustomCategories(filtered);
}

// ---------------- IN-APP PARCHI / HANDWRITTEN LIST STORAGE ---------------- //

export function getParchiOrders(): ParchiOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('kiranape_parchi_orders') || localStorage.getItem(PARCHI_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      customerPhone: item.customerPhone || item.phone || '',
      phone: item.phone || item.customerPhone || '',
      deliveryAddress: item.deliveryAddress || item.address || '',
      address: item.address || item.deliveryAddress || '',
      imageUrl: item.imageUrl || item.imageBase64 || '',
      imageBase64: item.imageBase64 || item.imageUrl || '',
      status: item.status || 'Pending',
    }));
  } catch {
    return [];
  }
}

export function saveParchiOrder(orderData: Partial<ParchiOrder> & { customerName: string }): ParchiOrder {
  const current = getParchiOrders();
  const parchiId = orderData.id || ('#PRC-' + Date.now());
  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const deviceId = getDeviceUserId();
  const phone = orderData.phone || orderData.customerPhone || '';
  if (phone) {
    saveCustomerPhone(phone);
  }
  const selectedLoc = orderData.deliveryLocation || getCustomerSelectedLocation();
  const address = orderData.deliveryAddress || orderData.address || '';
  const img = orderData.imageBase64 || orderData.imageUrl || '';

  const newParchi: ParchiOrder = {
    ...orderData,
    id: parchiId,
    customerName: orderData.customerName,
    phone,
    customerPhone: phone,
    customerDeviceId: orderData.customerDeviceId || deviceId,
    address,
    deliveryAddress: address,
    deliveryLocation: selectedLoc,
    imageBase64: img,
    imageUrl: img,
    createdAt: formattedDate,
    timestamp: Date.now(),
    status: orderData.status || 'Pending',
  };

  // Keep full object for IndexedDB (if supported) without crashing localStorage
  try {
    const updatedOrders = [newParchi, ...current.filter((p) => p.id !== parchiId)];
    idbSet('kiranape_parchi_orders', updatedOrders).catch(() => {});
  } catch {
    // silent
  }

  if (typeof window !== 'undefined') {
    // In localStorage: Store ONLY lightweight metadata (NO heavy Base64 photo or audio blobs)
    try {
      const lightweightParchi: ParchiOrder = {
        ...newParchi,
        imageBase64: '',
        imageUrl: '',
        voiceNoteBase64: '',
      };
      const lightweightOrders = [
        lightweightParchi,
        ...current.filter((p) => p.id !== parchiId).map((o) => ({
          ...o,
          imageBase64: '',
          imageUrl: '',
          voiceNoteBase64: '',
        })).slice(0, 25),
      ];
      localStorage.setItem('kiranape_parchi_orders', JSON.stringify(lightweightOrders));
    } catch {
      // Silently catch QuotaExceededError or security restrictions
    }

    // Also register into main orders repository with lightweight metadata
    try {
      const orders = getOrders();
      const matchingOrder: Order = {
        id: parchiId,
        customerName: orderData.customerName,
        phone,
        customerPhone: phone,
        customerDeviceId: deviceId,
        address,
        deliverySlot: 'Instant Delivery (Handwritten Parchi)',
        deliveryLocation: selectedLoc,
        items: [
          {
            productId: 'parchi-list',
            name: '📸 Handwritten Grocery List (Parchi)',
            unit: orderData.notes ? `Note: ${orderData.notes}` : 'Photo Submitted',
            price: 0,
            quantity: 1,
            total: 0,
          },
        ],
        itemsCount: 1,
        subtotalOriginal: 0,
        totalSavings: 0,
        deliveryFee: 0,
        finalPayableAmount: 0,
        paymentMethod: 'Cash on Delivery (COD)',
        status: 'New Order',
        createdAt: formattedDate,
        timestamp: Date.now(),
        parchiImageUrl: '',
        voiceNoteBase64: '',
        isParchi: true,
      };
      const lightweightMainOrders = [
        matchingOrder,
        ...orders.filter((o) => o.id !== parchiId).map((o) => ({
          ...o,
          parchiImageUrl: '',
          voiceNoteBase64: '',
        })).slice(0, 25),
      ];
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(lightweightMainOrders));
    } catch {
      // Silently catch QuotaExceededError
    }
    notifyOrdersUpdated();
  } else {
    notifyOrdersUpdated();
  }

  return newParchi;
}

export function updateParchiOrderStatus(parchiId: string, status: any): void {
  const current = getParchiOrders();
  const updated = current.map((p) => (p.id === parchiId ? { ...p, status } : p));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kiranape_parchi_orders', JSON.stringify(updated));
    } catch (e) {
      console.error('Error updating parchi order status:', e);
    }
    // Also update in main orders if matching
    updateOrderStatus(parchiId, status as OrderStatus);
    notifyOrdersUpdated();
  }
}

export function deleteParchiOrder(parchiId: string): void {
  const current = getParchiOrders();
  const filtered = current.filter((p) => p.id !== parchiId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('kiranape_parchi_orders', JSON.stringify(filtered));
    } catch (e) {
      console.error('Error deleting parchi order:', e);
    }
    deleteOrder(parchiId);
    notifyOrdersUpdated();
  }
}

export function saveVoiceNoteOrder(data: {
  customerName: string;
  customerPhone: string;
  deliveryLocation: string;
  deliveryAddress: string;
  deliverySlot: string;
  items: string[];
  voiceAudio?: string;
  voiceNoteBase64?: string;
}): Order {
  const voiceId = 'VN-' + Math.floor(1000 + Math.random() * 9000);
  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const deviceId = getDeviceUserId();
  saveCustomerPhone(data.customerPhone);

  const newOrder: Order = {
    id: voiceId,
    customerName: data.customerName,
    phone: data.customerPhone,
    customerPhone: data.customerPhone,
    customerDeviceId: deviceId,
    address: data.deliveryAddress,
    deliverySlot: data.deliverySlot,
    deliveryLocation: data.deliveryLocation,
    items: data.items.map((itemStr, idx) => ({
      productId: `voice-item-${idx}`,
      name: itemStr,
      unit: 'Voice Note',
      price: 0,
      quantity: 1,
      total: 0,
    })),
    itemsCount: data.items.length,
    subtotalOriginal: 0,
    totalSavings: 0,
    deliveryFee: 0,
    finalPayableAmount: 0,
    paymentMethod: 'Cash on Delivery (COD)',
    status: 'New Order',
    createdAt: formattedDate,
    timestamp: Date.now(),
    voiceAudio: data.voiceAudio || data.voiceNoteBase64,
    voiceNoteBase64: data.voiceNoteBase64 || data.voiceAudio,
    isParchi: true,
  };

  const currentOrders = getOrders();
  if (typeof window !== 'undefined') {
    // In localStorage: Store ONLY lightweight metadata (NO heavy Base64 audio blobs)
    try {
      const lightweightOrder: Order = {
        ...newOrder,
        voiceNoteBase64: '',
      };
      const lightweightOrders = [
        lightweightOrder,
        ...currentOrders.filter((o) => o.id !== voiceId).map((o) => ({
          ...o,
          voiceNoteBase64: '',
        })).slice(0, 25),
      ];
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(lightweightOrders));
    } catch {
      // Silently catch QuotaExceededError
    }

    // Also register into parchi orders list with lightweight notes
    try {
      const currentParchi = getParchiOrders();
      const parchiEntry: ParchiOrder = {
        id: voiceId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerDeviceId: deviceId,
        deliveryLocation: data.deliveryLocation,
        deliveryAddress: data.deliveryAddress,
        notes: `🎤 Voice List (${data.items.length} items):\n` + data.items.map((it) => `• ${it}`).join('\n'),
        imageUrl: '',
        voiceNoteBase64: '',
        createdAt: formattedDate,
        timestamp: Date.now(),
        status: 'Pending Verification',
      };
      const lightweightParchi = [
        parchiEntry,
        ...currentParchi.filter((p) => p.id !== voiceId).map((p) => ({
          ...p,
          voiceNoteBase64: '',
        })).slice(0, 25),
      ];
      localStorage.setItem('kiranape_parchi_orders', JSON.stringify(lightweightParchi));
    } catch {
      // Silently catch QuotaExceededError
    }

    notifySync();
  }

  return newOrder;
}

// ---------------- REALTIME SYNC LISTENER ---------------- //

export function subscribeToSync(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomSync = () => callback();
  const handleStorageEvent = (e: StorageEvent) => {
    if (
      e.key === PRODUCTS_STORAGE_KEY ||
      e.key === ORDERS_STORAGE_KEY ||
      e.key === PIN_STORAGE_KEY ||
      e.key === SETTINGS_STORAGE_KEY ||
      e.key === BANNERS_STORAGE_KEY ||
      e.key === CUSTOM_CATEGORIES_KEY ||
      e.key === PARCHI_ORDERS_KEY
    ) {
      callback();
    }
  };

  window.addEventListener(SYNC_EVENT, handleCustomSync);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(SYNC_EVENT, handleCustomSync);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

// ---------------- 1-TAP OFFLINE DATA BACKUP & RESTORE ENGINE ---------------- //

export interface KiranapeBackupData {
  version: string;
  exportDate: string;
  timestamp: number;
  appName: string;
  storeName: string;
  stats: {
    productsCount: number;
    categoriesCount: number;
  };
  products: Product[];
  categories: CustomCategory[];
  storeSettings?: StoreSettings;
  banners?: PromoBanner[];
  kiranape_permanent_catalog?: Product[];
  kiranape_store_settings?: StoreSettings;
}

export const LAST_BACKUP_TIME_KEY = 'kiranape_last_backup_time';

export function getLastBackupTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(LAST_BACKUP_TIME_KEY);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

/**
 * Generate a complete JSON backup object containing the store catalog,
 * custom categories, store settings, and active banners.
 */
export function generateStoreBackup(): KiranapeBackupData {
  const products = getProducts();
  const categories = getCustomCategories();
  const storeSettings = getSavedStoreSettings();
  const banners = getSavedBanners();

  return {
    version: '2.0',
    exportDate: new Date().toISOString(),
    timestamp: Date.now(),
    appName: 'Kiranape Express',
    storeName: storeSettings.name || 'Kiranape Express',
    stats: {
      productsCount: products.length,
      categoriesCount: categories.length,
    },
    products,
    categories,
    storeSettings,
    banners,
    kiranape_permanent_catalog: products,
    kiranape_store_settings: storeSettings,
  };
}

/**
 * Trigger immediate browser download of the .json backup file
 * named with DD-MM-YYYY timestamp (e.g. kiranape_backup_16-09-2026.json).
 */
export function downloadStoreBackup(): { filename: string; backup: KiranapeBackupData } {
  const backup = generateStoreBackup();
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const filename = `kiranape_backup_${dd}-${mm}-${yyyy}.json`;

  if (typeof window !== 'undefined') {
    try {
      const jsonContent = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.setItem(LAST_BACKUP_TIME_KEY, String(Date.now()));
      notifySync();
    } catch (e) {
      console.error('Error downloading store backup:', e);
    }
  }

  return { filename, backup };
}

/**
 * Generate a pre-filled WhatsApp link to easily send a summary copy of the backup
 * to the store WhatsApp hotline (9424316081).
 */
export function getWhatsAppBackupUrl(backup: KiranapeBackupData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const categoriesSummary = backup.categories
    .slice(0, 8)
    .map((c) => `${c.icon || '📦'} ${c.name}${c.hindiName ? ` (${c.hindiName})` : ''}`)
    .join(', ');

  const text =
    `📦 *KIRANAPE STORE DATA BACKUP REPORT*\n` +
    `🏪 *Store:* ${backup.storeName}\n` +
    `📅 *Timestamp:* ${dateStr}, ${timeStr}\n` +
    `🛍️ *Total Products:* ${backup.stats.productsCount} items in stock\n` +
    `📂 *Custom Categories (${backup.stats.categoriesCount}):* ${categoriesSummary}\n` +
    `⚙️ *Free Delivery Min:* ₹${backup.storeSettings?.minOrderForFreeDelivery ?? 199}\n\n` +
    `💾 *Backup File:* kiranape_backup_${dateStr.replace(/\s+/g, '_')}.json\n` +
    `✅ *Status:* Complete backup downloaded to phone storage.\n` +
    `🔐 *Safe Copy:* Saved on WhatsApp for record & restore.`;

  return `https://wa.me/919424316081?text=${encodeURIComponent(text)}`;
}

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  preview?: {
    productsCount: number;
    categoriesCount: number;
    storeName?: string;
    exportDate?: string;
    timestamp?: number;
    products: Product[];
    categories: CustomCategory[];
    storeSettings?: StoreSettings;
    banners?: PromoBanner[];
  };
}

/**
 * Validate incoming JSON content before restoring.
 * Ensures the file is valid JSON and contains legitimate products or categories array.
 */
export function validateBackupFile(rawJsonString: string): BackupValidationResult {
  try {
    const data = JSON.parse(rawJsonString);

    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'The selected file does not contain valid JSON data.' };
    }

    let products: Product[] = [];
    let categories: CustomCategory[] = [];
    let storeSettings: StoreSettings | undefined;
    let banners: PromoBanner[] | undefined;
    let storeName: string | undefined;
    let exportDate: string | undefined;
    let timestamp: number | undefined;

    // Case 1: Standard KiranapeBackupData format
    if (Array.isArray(data.products) || Array.isArray(data.kiranape_permanent_catalog)) {
      products = Array.isArray(data.products) ? data.products : data.kiranape_permanent_catalog;
      if (Array.isArray(data.categories)) {
        categories = data.categories;
      }
      storeSettings = data.storeSettings || data.kiranape_store_settings;
      banners = data.banners;
      storeName = data.storeName;
      exportDate = data.exportDate;
      timestamp = data.timestamp;
    }
    // Case 2: Direct array of products
    else if (Array.isArray(data)) {
      products = data;
    }
    // Case 3: Raw localStorage dump with storage keys
    else if (data[PERMANENT_CATALOG_KEY] || data['kiranape_permanent_catalog']) {
      const rawProds = data[PERMANENT_CATALOG_KEY] || data['kiranape_permanent_catalog'];
      products = typeof rawProds === 'string' ? JSON.parse(rawProds) : rawProds;
      if (data[CUSTOM_CATEGORIES_KEY] || data['kiranape_custom_categories']) {
        const rawCats = data[CUSTOM_CATEGORIES_KEY] || data['kiranape_custom_categories'];
        categories = typeof rawCats === 'string' ? JSON.parse(rawCats) : rawCats;
      }
      if (data[SETTINGS_STORAGE_KEY] || data['kiranape_store_settings']) {
        const rawSettings = data[SETTINGS_STORAGE_KEY] || data['kiranape_store_settings'];
        storeSettings = typeof rawSettings === 'string' ? JSON.parse(rawSettings) : rawSettings;
      }
    } else {
      return {
        isValid: false,
        error: 'Unrecognized backup structure. File must contain a "products" array.',
      };
    }

    if (!Array.isArray(products) || products.length === 0) {
      return {
        isValid: false,
        error: 'No product items found in this backup file.',
      };
    }

    // Sanitize products to make sure required fields exist
    const sanitizedProducts: Product[] = products.map((item: any, index: number) => {
      const originalPrice = Number(item.originalPrice) || 10;
      const discountPercent = Number(item.discountPercent) || 0;
      const finalPrice =
        item.finalPrice !== undefined
          ? Number(item.finalPrice)
          : calculateFinalPrice(originalPrice, discountPercent);

      return {
        id: item.id || `prod-restored-${Date.now()}-${index}`,
        name: item.name || `Restored Product ${index + 1}`,
        hindiName: item.hindiName || '',
        category: item.category || 'Daily Essentials',
        originalPrice,
        discountPercent,
        finalPrice,
        unit: item.unit || '1 unit',
        imageUrl: item.imageUrl || item.image || '',
        description: item.description || '',
        isAvailable: item.isAvailable !== false,
        stock: item.stock !== undefined ? Number(item.stock) : 50,
        variants: Array.isArray(item.variants) ? item.variants : undefined,
        updatedAt: item.updatedAt || Date.now(),
      };
    });

    // If categories are missing or empty, ensure default categories exist
    if (!Array.isArray(categories) || categories.length === 0) {
      categories = getCustomCategories();
    }

    return {
      isValid: true,
      preview: {
        productsCount: sanitizedProducts.length,
        categoriesCount: categories.length,
        storeName: storeName || 'Kiranape Store',
        exportDate,
        timestamp,
        products: sanitizedProducts,
        categories,
        storeSettings,
        banners,
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Failed to parse backup file: ${err?.message || 'Invalid JSON format'}`,
    };
  }
}

/**
 * Execute the restore: cleanly overwrites local storage keys with the backup data,
 * and calls notifySync() to refresh active React components instantly.
 */
export function executeRestoreBackup(preview: NonNullable<BackupValidationResult['preview']>): {
  productsCount: number;
  categoriesCount: number;
} {
  if (typeof window === 'undefined') {
    return { productsCount: 0, categoriesCount: 0 };
  }

  try {
    // 1. Overwrite permanent products catalog cleanly
    localStorage.setItem(PERMANENT_CATALOG_KEY, JSON.stringify(preview.products));

    // 2. Overwrite custom categories cleanly
    if (preview.categories && preview.categories.length > 0) {
      localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(preview.categories));
    }

    // 3. Update store settings and banners if present in backup
    if (preview.storeSettings) {
      saveStoredSettings(preview.storeSettings);
    }
    if (preview.banners && preview.banners.length > 0) {
      saveStoredBanners(preview.banners);
    }

    // 4. Update last backup timestamp
    localStorage.setItem(LAST_BACKUP_TIME_KEY, String(Date.now()));

    // 5. Fire global sync event to update all active views immediately
    notifySync();

    return {
      productsCount: preview.products.length,
      categoriesCount: preview.categories.length,
    };
  } catch (e) {
    console.error('Error executing restore backup:', e);
    throw e;
  }
}
