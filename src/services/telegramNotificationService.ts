/**
 * Silent Background Telegram Bot Notification Service for Kiranape Admin
 * Zero customer interference - 100% silent asynchronous background alerts
 */

import { StoreSettings } from '../types';
import { getSavedStoreSettings } from './storageService';

export const DEFAULT_TELEGRAM_BOT_TOKEN = '9114137658:AAGUWLhcv_ihDIRhZz_F4BrMjI_i3CpdT8M';
export const DEFAULT_TELEGRAM_CHAT_ID = '6229341464';

// In-memory cache of dispatched order IDs to prevent duplicate alerts
const dispatchedOrderIds = new Set<string>();

/**
 * Sanitize user-provided text so it won't break Telegram standard Markdown v1 parser
 */
function sanitizeForMarkdown(text: any): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  // Replace characters that conflict with Telegram Markdown delimiters (*, _, `, [)
  return str.replace(/[*_`\[]/g, ' ');
}

export interface TelegramOrderNotificationPayload {
  id?: string;
  orderId?: string;
  customerName?: string;
  fullName?: string;
  phone?: string;
  customerPhone?: string;
  phoneNumber?: string;
  address?: string;
  fullAddress?: string;
  deliveryAddress?: string;
  deliveryLocation?: string;
  deliverySlot?: string;
  items?: any[];
  itemsCount?: number;
  subtotalOriginal?: number;
  totalSavings?: number;
  deliveryFee?: number;
  finalPayableAmount?: number;
  finalTotal?: number;
  total?: number;
  paymentMethod?: string;
  isParchi?: boolean;
  orderType?: 'voice' | 'parchi' | 'cart' | string;
  notes?: string;
  slipPhoto?: string;
  parchiImageUrl?: string;
  voiceAudio?: string;
  voiceNoteBase64?: string;
}

/**
 * Format official Telegram Order Alert according to Kiranape specifications
 */
export function buildOrderTelegramMessage(payload: TelegramOrderNotificationPayload): string {
  const rawId = (payload.id || payload.orderId || 'NEW').replace(/^#+/, '');
  const customerName = sanitizeForMarkdown(payload.customerName || payload.fullName || 'Customer');
  const phone = sanitizeForMarkdown(payload.phone || payload.customerPhone || payload.phoneNumber || 'Not provided');
  
  let address = sanitizeForMarkdown(payload.address || payload.fullAddress || payload.deliveryAddress || 'Store Pickup');
  if (payload.deliveryLocation && !address.toLowerCase().includes(payload.deliveryLocation.toLowerCase())) {
    address += ` (${sanitizeForMarkdown(payload.deliveryLocation)})`;
  }

  // Determine Notes / Parchi line
  let notesDetails = '';
  if (payload.notes) {
    notesDetails = sanitizeForMarkdown(payload.notes);
  } else if (payload.orderType === 'voice' || payload.voiceAudio || payload.voiceNoteBase64) {
    notesDetails = 'Voice recording attached in admin panel';
  } else if (payload.isParchi || payload.orderType === 'parchi' || payload.slipPhoto || payload.parchiImageUrl) {
    notesDetails = 'Handwritten parchi photo attached in admin panel';
  } else if (payload.deliverySlot) {
    notesDetails = `Slot: ${sanitizeForMarkdown(payload.deliverySlot)}`;
  } else {
    notesDetails = 'Standard Doorstep Delivery';
  }

  // Build items listing
  const itemsList: string[] = [];
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    payload.items.forEach((item: any) => {
      const name = sanitizeForMarkdown(item.name || item.title || 'Item');
      const qty = item.quantity || item.qty || 1;
      const unit = item.unit ? ` (${sanitizeForMarkdown(item.unit)})` : '';
      const price = item.total !== undefined ? item.total : (Number(item.price) || 0) * qty;
      itemsList.push(`• ${name}${unit} x ${qty} - ₹${price}`);
    });
  } else if (payload.orderType === 'voice' || payload.voiceAudio || payload.voiceNoteBase64) {
    itemsList.push('• 🎙️ Voice Grocery Recording Order');
  } else if (payload.isParchi || payload.orderType === 'parchi' || payload.slipPhoto || payload.parchiImageUrl) {
    itemsList.push('• 📸 Handwritten Grocery List (Parchi)');
  } else {
    itemsList.push('• Standard Grocery Order');
  }

  const itemsFormatted = itemsList.join('\n');

  // Calculate bill total
  const totalAmount =
    payload.finalPayableAmount !== undefined
      ? payload.finalPayableAmount
      : payload.finalTotal !== undefined
      ? payload.finalTotal
      : payload.total !== undefined
      ? payload.total
      : 0;

  const totalBillStr =
    totalAmount > 0
      ? `₹${totalAmount}`
      : '₹0 (Parchi / Price to be confirmed)';

  const paymentMode = sanitizeForMarkdown(payload.paymentMethod || 'Cash on Delivery (COD)');

  return `🚨 *NEW ORDER RECEIVED - KIRANAPE!* 🚨

📦 *Order ID:* #${rawId}
👤 *Customer:* ${customerName}
📞 *Mobile:* ${phone}
📍 *Address:* ${address}
📝 *Notes / Parchi:* ${notesDetails}
------------------------------------
🛒 *Items:*
${itemsFormatted}
------------------------------------
💰 *Total Bill:* ${totalBillStr}
💳 *Payment Mode:* ${paymentMode}`;
}

/**
 * Dispatch Telegram Order Notification silently in the background.
 * Never throws errors, never blocks customer UI, zero popups or redirects.
 */
export async function sendTelegramOrderNotification(
  payload: TelegramOrderNotificationPayload,
  customSettings?: Partial<StoreSettings>
): Promise<boolean> {
  const orderId = payload.id || payload.orderId;
  if (orderId && dispatchedOrderIds.has(orderId)) {
    // Avoid duplicate telegram alerts for the same order within session
    return true;
  }

  try {
    const saved = getSavedStoreSettings();
    const botToken = (customSettings?.telegramBotToken || saved?.telegramBotToken || DEFAULT_TELEGRAM_BOT_TOKEN).trim();
    const chatId = (customSettings?.telegramChatId || saved?.telegramChatId || DEFAULT_TELEGRAM_CHAT_ID).trim();

    if (!botToken || !chatId) {
      console.warn('[Telegram Alert] Bot Token or Chat ID not configured. Skipping alert.');
      return false;
    }

    const messageText = buildOrderTelegramMessage(payload);

    // Asynchronous non-blocking fetch with 8s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      if (orderId) {
        dispatchedOrderIds.add(orderId);
      }
      console.log(`[Telegram Alert] Successfully sent alert for Order #${orderId || 'NEW'}`);
      return true;
    }

    // If Markdown parsing failed (e.g., status 400 bad entity), retry once in plain text
    if (response.status === 400) {
      console.warn('[Telegram Alert] Markdown formatting issue, retrying in plain text...');
      const plainText = messageText.replace(/[*_`]/g, '');
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: plainText,
        }),
      });
      if (retryRes.ok) {
        if (orderId) dispatchedOrderIds.add(orderId);
        return true;
      }
    }

    const errText = await response.text().catch(() => '');
    console.warn(`[Telegram Alert] Telegram API returned status ${response.status}:`, errText);
    return false;
  } catch (err: any) {
    // Silent catch - network failure, offline status, or abort
    console.warn('[Telegram Alert] Silent catch (order was not affected):', err?.message || err);
    return false;
  }
}

/**
 * Send Test Alert from Admin Panel to verify Bot Token and Chat ID
 */
export async function sendTelegramTestNotification(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  const cleanToken = (botToken || '').trim();
  const cleanChatId = (chatId || '').trim();

  if (!cleanToken) {
    return { success: false, message: 'Please provide a valid Telegram Bot Token.' };
  }
  if (!cleanChatId) {
    return { success: false, message: 'Please provide a valid Admin Chat ID.' };
  }

  const testMessage = `🚨 *KIRANAPE STORE - TELEGRAM ALERT TEST* 🚨

✅ *Status:* Connection Successful!
🏪 *Store:* Kiranape Express
⏰ *Time:* ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}

⚡ *Alerts Active:* You will now receive instant silent alerts on this chat whenever a customer places an order (Cart checkout, Handwritten Parchi, or Voice grocery)!`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: testMessage,
        parse_mode: 'Markdown',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { success: true, message: 'Test message sent successfully to your Telegram chat!' };
    }

    const errorData = await response.json().catch(() => null);
    const description = errorData?.description || `HTTP ${response.status}`;

    return {
      success: false,
      message: `Telegram Error: ${description}. Please verify your Bot Token and Chat ID (make sure you pressed 'Start' on the bot).`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.name === 'AbortError' ? 'Connection timed out. Check your internet connection.' : `Network Error: ${err?.message || 'Failed to reach Telegram API.'}`,
    };
  }
}
