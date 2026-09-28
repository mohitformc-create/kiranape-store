import { Order, OrderStatus } from '../types';
import { getOrders, saveOrders } from './storageService';

function cacheOrderLocally(order: Order) {
  try {
    const existing = getOrders();
    const filtered = existing.filter((o) => o.id !== order.id);
    saveOrders([order, ...filtered]);
  } catch (err) {
    console.warn('Failed caching order locally:', err);
  }
}

export interface CreateOrderPayload {
  id?: string;
  orderId?: string;
  customerName?: string;
  fullName?: string;
  phone?: string;
  phoneNumber?: string;
  customerPhone?: string;
  address?: string;
  fullAddress?: string;
  deliveryAddress?: string;
  deliverySlot?: string;
  deliveryLocation?: string;
  items?: any[];
  cartItems?: any[];
  itemsCount?: number;
  subtotalOriginal?: number;
  totalSavings?: number;
  deliveryFee?: number;
  finalPayableAmount?: number;
  finalTotal?: number;
  isParchi?: boolean;
  orderType?: 'voice' | 'parchi' | 'cart';
  parchiBase64?: string;
  parchiImageUrl?: string;
  slipImageUrl?: string;
  voiceNoteBase64?: string;
  voiceAudioUrl?: string;
  imageBase64?: string;
  imageUrl?: string;
  notes?: string;
  createdAt?: string;
  timestamp?: number;
}

/**
 * Send Order to Central Server Database (POST /api/orders)
 * Works for both Cart item orders and Parchi photo orders.
 */
export async function sendOrderToCentralServer(payload: CreateOrderPayload): Promise<{
  success: boolean;
  orderId: string;
  order: Order;
  message?: string;
}> {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();

    // Cache locally for instant access & offline support
    if (data.order) {
      cacheOrderLocally(data.order);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('kiranape_orders_updated'));
      }
    }

    return data;
  } catch (error) {
    console.warn('[Order API] Network/Central server request failed, saving to local resilient storage:', error);

    // Fallback: create local order so user order is NEVER lost
    const fallbackId =
      payload.id ||
      payload.orderId ||
      (payload.isParchi ? `PRC-${Math.floor(10000 + Math.random() * 90000)}` : `ORD-${Math.floor(10000 + Math.random() * 90000)}`);

    const fallbackOrder: Order = {
      id: fallbackId,
      customerName: payload.customerName || payload.fullName || 'Valued Customer',
      phone: payload.phone || payload.phoneNumber || payload.customerPhone || '',
      address: payload.address || payload.fullAddress || payload.deliveryAddress || '',
      deliverySlot: payload.deliverySlot || 'Standard Delivery',
      deliveryLocation: payload.deliveryLocation || 'Waidhan, Singrauli',
      items: payload.items || payload.cartItems || [],
      itemsCount: payload.itemsCount || 1,
      subtotalOriginal: payload.subtotalOriginal || payload.finalPayableAmount || 0,
      totalSavings: payload.totalSavings || 0,
      deliveryFee: payload.deliveryFee || 0,
      finalPayableAmount: payload.finalPayableAmount || payload.finalTotal || 0,
      paymentMethod: 'Cash on Delivery (COD)',
      status: 'received',
      statusLabel: 'Pending Confirmation',
      createdAt: payload.createdAt || new Date().toISOString(),
      timestamp: payload.timestamp || Date.now(),
      isParchi: Boolean(payload.isParchi),
      parchiImageUrl: payload.parchiBase64 || payload.imageBase64 || payload.parchiImageUrl,
      voiceNoteBase64: payload.voiceNoteBase64,
    };

    cacheOrderLocally(fallbackOrder);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
    }

    return {
      success: true,
      orderId: fallbackId,
      order: fallbackOrder,
      message: 'Aapka Order Darz Ho Gaya Hai! Kiranape Express jald hi aapke pate par deliver karega.',
    };
  }
}

/**
 * Fetch All Orders from Central Server (GET /api/orders)
 */
export async function fetchCentralOrders(): Promise<Order[]> {
  try {
    const response = await fetch('/api/orders', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch central orders (status: ${response.status})`);
    }

    const data = await response.json();
    const serverOrders: Order[] = Array.isArray(data) ? data : (data.orders || []);

    if (serverOrders.length > 0) {
      // Sync local cache with central server
      saveOrders(serverOrders);
      return serverOrders;
    }

    return getOrders();
  } catch (error) {
    console.warn('[Order API] Error fetching central orders, falling back to local storage:', error);
    return getOrders();
  }
}

/**
 * Update Order Status on Central Server (PATCH /api/orders/:id/status)
 */
export async function updateCentralOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<boolean> {
  try {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.order) {
      // Update local storage
      const currentOrders = getOrders();
      const updated = currentOrders.map((o) => (o.id === orderId ? { ...o, status, statusLabel: data.order.statusLabel || status } : o));
      saveOrders(updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('kiranape_orders_updated'));
      }
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[Order API] Failed to update status on server, updating locally:', error);
    const currentOrders = getOrders();
    const updated = currentOrders.map((o) => (o.id === orderId ? { ...o, status, statusLabel: status } : o));
    saveOrders(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
    }
    return true;
  }
}

/**
 * Fetch a single order by ID from Central Server (GET /api/orders/:id)
 */
export async function fetchOrderById(orderId: string): Promise<Order | null> {
  try {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) {
      const data = await res.json();
      return data.order || null;
    }
  } catch (err) {
    console.warn('[Order API] Failed fetching single order from server:', err);
  }

  // Fallback to local storage
  const localOrders = getOrders();
  return localOrders.find((o) => o.id === orderId) || null;
}

/**
 * Fetch Product Catalog from Central Server (GET /api/inventory)
 */
export async function fetchCentralInventory() {
  try {
    const res = await fetch('/api/inventory');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.warn('[Inventory API] Failed fetching central inventory:', err);
  }
  return null;
}

/**
 * Save or update product in Central Server Inventory (POST /api/inventory)
 */
export async function saveProductToCentralInventory(product: any) {
  try {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Inventory API] Failed saving product to central inventory:', err);
    return false;
  }
}

/**
 * Delete product from Central Server Inventory (DELETE /api/inventory/:id)
 */
export async function deleteProductFromCentralInventory(productId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/inventory/${productId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn('[Inventory API] Failed deleting product from central inventory:', err);
    return false;
  }
}

/**
 * Delete single order from Central Server (DELETE /api/orders/:id)
 */
export async function deleteOrderFromCentralServer(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'DELETE',
    });

    // Update local storage regardless so UI is immediate
    const currentOrders = getOrders();
    const updated = currentOrders.filter((o) => o.id !== orderId);
    saveOrders(updated);

    // Also clean up local parchi orders if matching
    try {
      const rawParchi = localStorage.getItem('kiranape_parchi_orders');
      if (rawParchi) {
        const parsed = JSON.parse(rawParchi);
        const filteredParchi = parsed.filter((p: any) => p.id !== orderId);
        localStorage.setItem('kiranape_parchi_orders', JSON.stringify(filteredParchi));
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return res.ok;
  } catch (err) {
    console.warn('[Order API] Failed deleting order on server, deleted locally:', err);
    const currentOrders = getOrders();
    saveOrders(currentOrders.filter((o) => o.id !== orderId));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }
    return true;
  }
}

/**
 * Clear Completed and Cancelled Orders from Central Server (DELETE /api/orders?status=completed_or_cancelled)
 */
export async function clearCompletedOrCancelledOrdersFromCentralServer(): Promise<{
  success: boolean;
  deletedCount: number;
}> {
  try {
    const res = await fetch('/api/orders?status=completed_or_cancelled', {
      method: 'DELETE',
    });

    const data = await res.json().catch(() => ({ deletedCount: 0 }));

    // Clean up local cache
    const currentOrders = getOrders();
    const activeOnly = currentOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s !== 'delivered' && s !== 'cancelled';
    });
    saveOrders(activeOnly);

    try {
      const rawParchi = localStorage.getItem('kiranape_parchi_orders');
      if (rawParchi) {
        const parsed = JSON.parse(rawParchi);
        const activeParchi = parsed.filter((p: any) => {
          const s = (p.status || '').toLowerCase();
          return s !== 'delivered' && s !== 'cancelled';
        });
        localStorage.setItem('kiranape_parchi_orders', JSON.stringify(activeParchi));
      }
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return {
      success: true,
      deletedCount: data.deletedCount || (currentOrders.length - activeOnly.length),
    };
  } catch (err) {
    console.warn('[Order API] Failed clearing completed orders on server, cleared locally:', err);
    const currentOrders = getOrders();
    const activeOnly = currentOrders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s !== 'delivered' && s !== 'cancelled';
    });
    saveOrders(activeOnly);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
    }
    return { success: true, deletedCount: currentOrders.length - activeOnly.length };
  }
}

/**
 * Clear ALL Order History from Central Server (DELETE /api/orders?all=true)
 */
export async function clearAllOrdersFromCentralServer(): Promise<{
  success: boolean;
  deletedCount: number;
}> {
  try {
    const res = await fetch('/api/orders?all=true', {
      method: 'DELETE',
    });

    const data = await res.json().catch(() => ({ deletedCount: 0 }));

    // Clear local orders cache
    const currentCount = getOrders().length;
    saveOrders([]);

    try {
      localStorage.setItem('kiranape_parchi_orders', JSON.stringify([]));
      localStorage.setItem('kiranape_voice_orders', JSON.stringify([]));
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    return {
      success: true,
      deletedCount: data.deletedCount || currentCount,
    };
  } catch (err) {
    console.warn('[Order API] Failed clearing all orders on server, cleared locally:', err);
    const currentCount = getOrders().length;
    saveOrders([]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kiranape_orders_updated'));
    }
    return { success: true, deletedCount: currentCount };
  }
}


