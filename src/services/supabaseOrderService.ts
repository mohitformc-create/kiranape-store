import { supabase } from '../config/supabase';
import { Order, OrderStatus } from '../types';

export interface SupabaseOrderRow {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  items: any;
  total: number;
  order_type: 'cart' | 'voice' | 'parchi';
  voice_url: string | null;
  parchi_url: string | null;
  status: string;
  created_at: string;
}

/**
 * Maps a Supabase row back to the internal frontend Order model
 */
export function mapSupabaseRowToOrder(row: any): Order {
  const isParchi = row.order_type === 'parchi';
  const isVoice = row.order_type === 'voice';
  const rawItems = Array.isArray(row.items) ? row.items : [];

  const createdDate = row.created_at ? new Date(row.created_at) : new Date();
  const formattedDate = createdDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: row.id,
    customerName: row.customer_name || 'Customer',
    phone: row.phone || '',
    customerPhone: row.phone || '',
    address: row.address || '',
    deliveryLocation: 'Waidhan, Singrauli',
    deliverySlot: row.delivery_slot || 'Instant Delivery (30-45 mins)',
    items: rawItems,
    itemsCount: rawItems.length || 1,
    subtotalOriginal: Number(row.total) || 0,
    totalSavings: 0,
    deliveryFee: 0,
    finalPayableAmount: Number(row.total) || 0,
    paymentMethod: 'Cash on Delivery (COD)',
    status: (row.status || 'Pending') as OrderStatus,
    statusLabel: row.status || 'Pending Confirmation',
    createdAt: formattedDate,
    timestamp: createdDate.getTime() || Date.now(),
    isParchi: isParchi || Boolean(row.parchi_url),
    orderType: (row.order_type as 'cart' | 'voice' | 'parchi') || (isVoice ? 'voice' : (isParchi ? 'parchi' : 'cart')),
    slipPhoto: row.parchi_url || undefined,
    parchiImageUrl: row.parchi_url || undefined,
    slipImageUrl: row.parchi_url || undefined,
    voiceAudio: row.voice_url || undefined,
    voiceNoteBase64: row.voice_url || undefined,
    voiceAudioUrl: row.voice_url || undefined,
  };
}

/**
 * Inserts an order directly into the Supabase 'orders' table
 */
export async function insertSupabaseOrder(payload: {
  id: string;
  customerName?: string;
  phone?: string;
  address?: string;
  items?: any[];
  total?: number;
  orderType: 'cart' | 'voice' | 'parchi';
  voiceData?: string | null;
  parchiData?: string | null;
  status?: string;
}) {
  try {
    const rowToInsert: SupabaseOrderRow = {
      id: payload.id,
      customer_name: payload.customerName || 'Customer',
      phone: payload.phone || 'Not provided',
      address: payload.address || 'Store Pickup',
      items: payload.items || [],
      total: Number(payload.total) || 0,
      order_type: payload.orderType,
      voice_url: payload.voiceData || null,
      parchi_url: payload.parchiData || null,
      status: payload.status || 'Pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('orders').insert([rowToInsert]).select();

    if (error) {
      console.warn('[Supabase Insert Error]:', error.message, error.details || '');
      return { success: false, error };
    }

    console.log(`[Supabase] Order #${payload.id} successfully saved to cloud PostgreSQL.`);
    return { success: true, data };
  } catch (err: any) {
    console.error('[Supabase Insert Exception]:', err);
    return { success: false, error: err };
  }
}

/**
 * Fetches all orders from Supabase PostgreSQL cloud table
 */
export async function fetchSupabaseOrders(): Promise<Order[] | null> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase Fetch Error]:', error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(mapSupabaseRowToOrder);
    }
    return [];
  } catch (err) {
    console.warn('[Supabase Fetch Exception]:', err);
    return null;
  }
}

/**
 * Updates order status in Supabase
 */
export async function updateSupabaseOrderStatus(orderId: string, newStatus: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.warn(`[Supabase Update Error for #${orderId}]:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Supabase Update Exception for #${orderId}]:`, err);
    return false;
  }
}

/**
 * Deletes an order from Supabase
 */
export async function deleteSupabaseOrder(orderId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.warn(`[Supabase Delete Error for #${orderId}]:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Supabase Delete Exception for #${orderId}]:`, err);
    return false;
  }
}
