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
