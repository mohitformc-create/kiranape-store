/**
 * Resilient Background Order Dispatch & Offline Auto-Retry Queue
 *
 * Implements Optimistic Zero-Latency UI:
 * 1. Immediate local order persistence in IndexedDB / LocalStorage
 * 2. Non-blocking background dispatch to central server (/api/orders)
 * 3. Automatic queueing and silent retry on network failures or dropped connection
 */

import { CreateOrderPayload } from './orderApiService';
import { idbGet, idbSet } from './idbStorage';

const QUEUE_STORAGE_KEY = 'kiranape_pending_orders_queue_v1';
const IDB_QUEUE_KEY = 'kiranape_idb_pending_order_queue';

let inMemoryQueue: CreateOrderPayload[] = [];
let isQueueProcessing = false;
let retryTimer: any = null;

// Initialize queue from storage
export async function initializeOrderQueue(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Try IndexedDB first (large capacity)
    const idbQueue = await idbGet<CreateOrderPayload[]>(IDB_QUEUE_KEY);
    if (Array.isArray(idbQueue) && idbQueue.length > 0) {
      inMemoryQueue = idbQueue;
      processPendingOrdersQueue();
      return;
    }

    // 2. Fallback to localStorage
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryQueue = parsed;
        processPendingOrdersQueue();
      }
    }
  } catch (err) {
    console.warn('[Order Queue] Init error:', err);
  }
}

// Persist queue to storage (IndexedDB + localStorage)
async function persistQueue(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // Save to IndexedDB (unlimited quota for heavy photos/audio)
    await idbSet(IDB_QUEUE_KEY, inMemoryQueue);
  } catch (err) {
    console.warn('[Order Queue] Failed saving to IndexedDB:', err);
  }

  try {
    // Also save light copy to localStorage (omit massive base64 if needed to avoid quota)
    const sanitized = inMemoryQueue.map((item) => {
      const isBigSlip = item.slipPhoto && item.slipPhoto.length > 200000;
      const isBigVoice = item.voiceAudio && item.voiceAudio.length > 200000;
      if (isBigSlip || isBigVoice) {
        return {
          ...item,
          slipPhoto: isBigSlip ? '[IndexedDB]' : item.slipPhoto,
          slipImageUrl: isBigSlip ? '[IndexedDB]' : item.slipImageUrl,
          parchiBase64: isBigSlip ? '[IndexedDB]' : item.parchiBase64,
          voiceAudio: isBigVoice ? '[IndexedDB]' : item.voiceAudio,
          voiceNoteBase64: isBigVoice ? '[IndexedDB]' : item.voiceNoteBase64,
        };
      }
      return item;
    });
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    console.warn('[Order Queue] LocalStorage quota limit reached, queue safely preserved in IndexedDB.');
  }
}

/**
 * Enqueue order for resilient background delivery
 */
export async function enqueueOrder(payload: CreateOrderPayload): Promise<void> {
  const exists = inMemoryQueue.some((o) => o.id === payload.id);
  if (!exists) {
    inMemoryQueue.push(payload);
    await persistQueue();
  }
}

/**
 * Remove order from queue upon successful server synchronization
 */
export async function dequeueOrder(orderId: string): Promise<void> {
  inMemoryQueue = inMemoryQueue.filter((o) => o.id !== orderId);
  await persistQueue();
}

/**
 * Dispatch an order in the background with zero latency to the customer UI.
 * Does NOT throw errors. Automatically retries if offline.
 */
export function dispatchOrderInBackground(payload: CreateOrderPayload): void {
  // 1. Immediately enqueue into resilient queue
  enqueueOrder(payload)
    .then(() => {
      // 2. Trigger background delivery immediately
      processPendingOrdersQueue();
    })
    .catch((err) => {
      console.warn('[Order Queue] Background enqueue warning:', err);
    });
}

/**
 * Process all queued orders silently in the background
 */
export async function processPendingOrdersQueue(): Promise<void> {
  if (isQueueProcessing || inMemoryQueue.length === 0) return;
  if (typeof window !== 'undefined' && !navigator.onLine) {
    scheduleNextRetry();
    return;
  }

  isQueueProcessing = true;

  try {
    const toProcess = [...inMemoryQueue];

    for (const item of toProcess) {
      try {
        const payloadToSend = {
          id: item.id || (item as any).orderId,
          customerName: item.customerName || (item as any).fullName || 'Valued Customer',
          phone: item.phone || (item as any).phoneNumber || (item as any).customerPhone || 'Walk-in / Voice Order',
          address: item.address || (item as any).fullAddress || (item as any).deliveryAddress || 'Address via Slip / Counter',
          deliverySlot: item.deliverySlot || 'Standard Delivery',
          deliveryLocation: item.deliveryLocation || 'Waidhan, Singrauli',
          items: item.items || (item as any).cartItems || [],
          itemsCount: item.itemsCount || (item.items ? item.items.length : 1),
          subtotalOriginal: item.subtotalOriginal || item.finalPayableAmount || 0,
          totalSavings: item.totalSavings || 0,
          deliveryFee: item.deliveryFee || 0,
          finalPayableAmount: item.finalPayableAmount || (item as any).finalTotal || 0,
          paymentMethod: 'Cash on Delivery (COD)',
          isParchi: Boolean(item.isParchi),
          orderType: item.orderType || (item.voiceAudio || item.voiceNoteBase64 ? 'voice' : (item.slipPhoto || item.parchiImageUrl || item.isParchi ? 'parchi' : 'cart')),
          voiceAudio: item.voiceAudio || item.voiceNoteBase64 || (item as any).voiceAudioUrl,
          voiceNoteBase64: item.voiceNoteBase64 || item.voiceAudio,
          slipPhoto: item.slipPhoto || item.slipImageUrl || item.parchiImageUrl || item.parchiBase64 || (item as any).imageBase64,
          parchiImageUrl: item.slipPhoto || item.slipImageUrl || item.parchiImageUrl || item.parchiBase64 || (item as any).imageBase64,
          notes: item.notes,
          createdAt: item.createdAt || new Date().toISOString(),
          timestamp: item.timestamp || Date.now(),
        };

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadToSend),
        });

        if (res.ok) {
          console.log(`[Order Queue] Order #${item.id} synced with central server successfully.`);
          await dequeueOrder(item.id || '');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('kiranape_orders_updated'));
          }
        } else {
          const errBody = await res.text().catch(() => '');
          console.error(`[Order Queue] Server rejected Order #${item.id} (Status: ${res.status}): ${errBody}`);
        }
      } catch (networkErr) {
        console.error(`[Order Queue] Network error dispatching Order #${item.id}:`, networkErr);
        // Break loop if connection dropped
        break;
      }
    }
  } finally {
    isQueueProcessing = false;
    if (inMemoryQueue.length > 0) {
      scheduleNextRetry();
    }
  }
}

function scheduleNextRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    processPendingOrdersQueue();
  }, 10000); // auto-retry every 10 seconds
}

// Auto-retry when connection comes back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Order Queue] Online connection detected. Processing pending queue...');
    processPendingOrdersQueue();
  });

  // Periodic queue sweep every 30 seconds
  setInterval(() => {
    if (inMemoryQueue.length > 0) {
      processPendingOrdersQueue();
    }
  }, 30000);

  // Initialize on module load
  initializeOrderQueue();
}
