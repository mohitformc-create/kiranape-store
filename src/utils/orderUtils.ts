import { Order, StoreSettings } from '../types';
import { formatWhatsAppPhone } from './imageUtils';

/**
 * Formats a complete, well-formatted grocery bill for WhatsApp customer sharing
 */
export function generateWhatsAppBillMessage(order: Order, storeSettings?: StoreSettings): string {
  const storeName = storeSettings?.name || 'Chaurasia Kirana & General Store';
  const supportPhone = '9424316081';

  const items = order.items || [];
  const itemsList = items
    .map((item, idx) => {
      if (item.isFreeGift || Number(item.price) === 0) {
        return `${idx + 1}. *${item.name}* [FREE GIFT 🎁] (${item.unit})\n   Qty: ${item.quantity} = *FREE (₹0)*`;
      }
      return `${idx + 1}. *${item.name}* (${item.unit})\n   Qty: ${item.quantity} × ₹${item.price} = *₹${item.total}*`;
    })
    .join('\n\n');

  const rawSubtotal = order.subtotal !== undefined
    ? Number(order.subtotal)
    : items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity)), 0);
  const subtotal = Math.round(Number(rawSubtotal) * 100) / 100;
  const recordedDelivery =
    order.deliveryMode === 'pickup'
      ? 0
      : order.deliveryFee !== undefined
      ? Math.max(0, Number(order.deliveryFee) || 0)
      : order.deliveryCharge !== undefined
      ? Math.max(0, Number(order.deliveryCharge) || 0)
      : subtotal >= 499
      ? 0
      : 29;
  const deliveryCharge = Math.round(recordedDelivery * 100) / 100;
  const couponDisc = Math.max(0, Number(order.couponDiscount) || 0);
  const finalPayable =
    order.finalPayableAmount !== undefined && Number(order.finalPayableAmount) >= 0
      ? Number(order.finalPayableAmount)
      : Math.max(0, Math.round((subtotal + deliveryCharge - couponDisc) * 100) / 100);
  const deliveryFeeDisplay =
    deliveryCharge === 0
      ? order.deliveryMode === 'pickup'
        ? 'FREE (₹0 - Store Pickup)'
        : 'FREE (₹0)'
      : `₹${deliveryCharge}`;
  const savingsDisplay = order.totalSavings > 0 ? `Total Discount / Savings: -₹${order.totalSavings}\n` : '';
  const areaDisplay = order.deliveryLocation ? `\n• *Area / Locality:* ${order.deliveryLocation}` : '';

  return (
`🏪 *${storeName}*
----------------------------------------
🧾 *ORDER BILL & DETAILS*
----------------------------------------
*Order ID:* #${order.id}
*Order Date/Time:* ${order.createdAt}

👤 *CUSTOMER DETAILS:*
• *Customer Name:* ${order.customerName}
• *Phone:* ${order.phone}${areaDisplay}
• *Delivery Address:* ${order.address}
• *Delivery Slot:* ${order.deliverySlot || 'Bharosemand Doorstep Delivery'}

📦 *ORDERED ITEMS (${order.itemsCount || items.length}):*
${itemsList}

----------------------------------------
💵 *BILL SUMMARY:*
Items Subtotal: ₹${subtotal}
${savingsDisplay}Delivery Charge${order.deliveryLocation ? ` (${order.deliveryLocation})` : ''}: ${deliveryFeeDisplay}
*TOTAL PAYABLE (COD): ₹${finalPayable}*
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
  deliveryCharge?: number;
  deliveryMode?: 'delivery' | 'pickup';
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

  const deliveryFeeLine =
    data.deliveryCharge !== undefined
      ? `🚚 *डिलीवरी चार्ज:* ${
          Number(data.deliveryCharge) === 0
            ? data.deliveryMode === 'pickup'
              ? '₹0 (FREE - Store Pickup)'
              : '₹0 (FREE)'
            : `₹${data.deliveryCharge}`
        }\n`
      : '';

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
    detailsBlock = `📦 *सामान:* ${data.itemsCount || 1} आइटम्स\n${deliveryFeeLine}💵 *कुल बिल राशि:* ₹${data.finalAmount || 0} (COD)\n${
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
${data.deliveryLocation ? `🏘️ *एरिया / इलाका:* ${data.deliveryLocation}\n` : ''}📍 *डिलीवरी पता:* ${data.deliveryAddress}
${data.deliverySlot ? `⏰ *डिलीवरी समय:* ${data.deliverySlot}\n` : ''}━━━━━━━━━━━━━━━━━━━━
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

