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
 * Maps a Supabase row back to the internal frontend Order model (with full dual snake_case/camelCase support)
 */
export function mapSupabaseRowToOrder(row: any): Order {
  if (!row) return row;
  const isParchi = row.order_type === 'parchi' || row.isParchi || Boolean(row.parchi_url || row.parchiImageUrl || row.slipPhoto);
  const isVoice = row.order_type === 'voice' || row.orderType === 'voice' || Boolean(row.voice_url || row.voiceNoteBase64 || row.voiceAudio);
  const rawItems = Array.isArray(row.items) ? row.items : [];

  const createdDate = row.created_at
    ? new Date(row.created_at)
    : (row.timestamp ? new Date(row.timestamp) : new Date());
  const formattedDate = !isNaN(createdDate.getTime())
    ? createdDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : String(row.createdAt || 'Just now');

  const total = Number(row.total ?? row.finalPayableAmount ?? row.subtotalFinal ?? 0);
  const customerName = row.customer_name || row.customerName || 'Customer';
  const phone = row.phone || row.customerPhone || '';
  const address = row.address || row.deliveryAddress || 'Store Pickup';
  const status = (row.status || 'received') as OrderStatus;
  const deliverySlot = row.delivery_slot || row.deliverySlot || 'Instant Delivery (30-45 mins)';
  const deliveryLocation = row.delivery_location || row.deliveryLocation || 'Waidhan, Singrauli';

  return {
    ...row,
    id: String(row.id),
    customer_name: customerName,
    customerName: customerName,
    phone: phone,
    customerPhone: phone,
    address: address,
    deliveryAddress: address,
    deliveryLocation: deliveryLocation,
    deliverySlot: deliverySlot,
    items: rawItems,
    itemsCount: rawItems.length || Number(row.itemsCount) || 1,
    subtotalOriginal: Number(row.subtotalOriginal) || total,
    totalSavings: Number(row.totalSavings) || 0,
    deliveryFee: Number(row.deliveryFee) || 0,
    total: total,
    finalPayableAmount: total,
    paymentMethod: row.paymentMethod || 'Cash on Delivery (COD)',
    status: status,
    statusLabel: row.statusLabel || status,
    createdAt: formattedDate,
    created_at: row.created_at || (!isNaN(createdDate.getTime()) ? createdDate.toISOString() : new Date().toISOString()),
    timestamp: !isNaN(createdDate.getTime()) ? createdDate.getTime() : Date.now(),
    isParchi: isParchi,
    orderType: isVoice ? 'voice' : (isParchi ? 'parchi' : 'cart'),
    order_type: isVoice ? 'voice' : (isParchi ? 'parchi' : 'cart'),
    slipPhoto: row.parchi_url || row.slipPhoto || row.parchiImageUrl || undefined,
    parchiImageUrl: row.parchi_url || row.parchiImageUrl || row.slipPhoto || undefined,
    slipImageUrl: row.parchi_url || row.slipImageUrl || row.slipPhoto || undefined,
    voiceAudio: row.voice_url || row.voiceAudio || row.voiceNoteBase64 || undefined,
    voiceNoteBase64: row.voice_url || row.voiceNoteBase64 || row.voiceAudio || undefined,
    voiceAudioUrl: row.voice_url || row.voiceAudioUrl || row.voiceNoteBase64 || undefined,
  };
}

export const normalizeOrder = mapSupabaseRowToOrder;

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

/**
 * True Cloud-Persistent Purge: Deletes ALL orders from Supabase PostgreSQL database
 */
export async function deleteAllSupabaseOrders(): Promise<boolean> {
  try {
    // Delete all records where id is not empty ('0')
    const { error } = await supabase
      .from('orders')
      .delete()
      .neq('id', '0');

    if (error) {
      console.warn('[Supabase Delete All Error]:', error.message);
      return false;
    }
    console.log('[Supabase] All orders wiped permanently from cloud database.');
    return true;
  } catch (err) {
    console.error('[Supabase Delete All Exception]:', err);
    return false;
  }
}

/**
 * Deletes completed or cancelled orders from Supabase
 */
export async function deleteCompletedSupabaseOrders(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .in('status', ['delivered', 'Delivered', 'cancelled', 'Cancelled']);

    if (error) {
      console.warn('[Supabase Delete Completed Error]:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Delete Completed Exception]:', err);
    return false;
  }
}

