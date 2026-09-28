import { Order, StoreSettings } from '../types';
import { formatWhatsAppPhone } from './imageUtils';

/**
 * Formats a complete, well-formatted grocery bill for WhatsApp customer sharing
 */
export function generateWhatsAppBillMessage(order: Order, storeSettings?: StoreSettings): string {
  const storeName = storeSettings?.name || 'Chaurasia Kirana & General Store';
  const supportPhone = '9424316081';

  const itemsList = (order.items || [])
    .map(
      (item, idx) =>
        `${idx + 1}. *${item.name}* (${item.unit})\n   Qty: ${item.quantity} × ₹${item.price} = *₹${item.total}*`
    )
    .join('\n\n');

  const deliveryFeeDisplay = Number(order.deliveryFee) === 0 ? 'FREE (Special Offer)' : `₹${order.deliveryFee}`;
  const savingsDisplay = order.totalSavings > 0 ? `Total Discount / Savings: -₹${order.totalSavings}\n` : '';
  const subtotalDisplay = order.subtotalOriginal || order.items.reduce((sum, it) => sum + (it.total || 0), 0);

  return (
`🏪 *${storeName}*
----------------------------------------
🧾 *ORDER BILL & DETAILS*
----------------------------------------
*Order ID:* #${order.id}
*Order Date/Time:* ${order.createdAt}

👤 *CUSTOMER DETAILS:*
• *Customer Name:* ${order.customerName}
• *Phone:* ${order.phone}
• *Delivery Address:* ${order.address}
• *Delivery Slot:* ${order.deliverySlot || 'Instant Delivery (30-45 mins)'}

📦 *ORDERED ITEMS (${order.itemsCount || order.items.length}):*
${itemsList}

----------------------------------------
💵 *BILL SUMMARY:*
Subtotal: ₹${subtotalDisplay}
${savingsDisplay}Delivery Fee: ${deliveryFeeDisplay}
*Final Total Bill Amount: ₹${order.finalPayableAmount}*
*Payment Method:* 💵 Cash on Delivery (COD) / UPI on Delivery

----------------------------------------
📞 *Questions regarding your order or address change?*
*Call Store Support: ${supportPhone}*

Thank you for shopping with ${storeName}! 🙏`
  );
}

/**
 * Generates the full WhatsApp Click-to-Chat URL
 */
export function getWhatsAppBillUrl(order: Order, storeSettings?: StoreSettings): string {
  const cleanPhone = formatWhatsAppPhone(order.phone);
  const billText = generateWhatsAppBillMessage(order, storeSettings);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(billText)}`;
}

export interface StoreNotificationParams {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLocation?: string;
  deliverySlot?: string;
  orderType: 'voice' | 'parchi' | 'cart';
  textDetails?: string;
  itemsCount?: number;
  finalAmount?: number;
}

/**
 * Formats a clean, high-priority WhatsApp notification message for the Store Owner
 */
export function generateStoreOwnerOrderNotificationMessage(
  data: StoreNotificationParams,
  storeSettings?: StoreSettings
): string {
  const storeName = storeSettings?.name || 'Chaurasia Kirana Store';
  const orderTypeLabel =
    data.orderType === 'voice'
      ? '🎙️ वॉइस आर्डर (Voice Note Order)'
      : data.orderType === 'parchi'
      ? '📸 पर्ची फोटो आर्डर (Ration Slip Photo)'
      : '🛒 सामान्य कार्ट आर्डर (Cart Order)';

  let detailsBlock = '';
  if (data.orderType === 'voice') {
    detailsBlock = `🎙️ *ऑडियो स्थिति:* ग्राहक का वॉइस नोट एडमिन पैनल में सुरक्षित अपलोड है।\n${
      data.textDetails ? `📝 *पहचाने गए शब्द / सामान:*\n${data.textDetails}\n` : ''
    }`;
  } else if (data.orderType === 'parchi') {
    detailsBlock = `📸 *पर्ची स्थिति:* ग्राहक की हाथ से लिखी पर्ची की फोटो एडमिन पैनल में सुरक्षित अपलोड है।\n${
      data.textDetails ? `📝 *नोट / निर्देश:*\n${data.textDetails}\n` : ''
    }`;
  } else {
    detailsBlock = `📦 *सामान:* ${data.itemsCount || 1} आइटम्स\n💵 *कुल बिल राशि:* ₹${data.finalAmount || 0} (COD)\n${
      data.textDetails ? `📝 *सामान विवरण:*\n${data.textDetails}\n` : ''
    }`;
  }

  return (
`🔔 *नया किराना आर्डर प्राप्त हुआ!*
🏪 *${storeName} (Kiranape Express)*
━━━━━━━━━━━━━━━━━━━━
🆔 *ऑर्डर नंबर:* #${data.orderId}
📦 *आर्डर प्रकार:* ${orderTypeLabel}
━━━━━━━━━━━━━━━━━━━━
👤 *ग्राहक:* ${data.customerName}
📱 *फ़ोन:* ${data.customerPhone}
📍 *डिलीवरी पता:* ${data.deliveryAddress}
${data.deliveryLocation ? `🏘️ *इलाका:* ${data.deliveryLocation}\n` : ''}${data.deliverySlot ? `⏰ *डिलीवरी समय:* ${data.deliverySlot}\n` : ''}━━━━━━━━━━━━━━━━━━━━
${detailsBlock}━━━━━━━━━━━━━━━━━━━━
ℹ️ _ऑर्डर की पूरी जानकारी, ऑडियो क्लिप और पर्ची फोटो एडमिन डैशबोर्ड में 1-क्लिक में उपलब्ध है।_`
  );
}

/**
 * Returns WhatsApp click-to-chat URL directed to the store owner's WhatsApp number
 */
export function getStoreOwnerWhatsAppNotificationUrl(
  data: StoreNotificationParams,
  storeSettings?: StoreSettings
): string {
  const rawStorePhone = storeSettings?.whatsapp || storeSettings?.phone || '9424316081';
  const cleanPhone = formatWhatsAppPhone(rawStorePhone);
  const message = generateStoreOwnerOrderNotificationMessage(data, storeSettings);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

