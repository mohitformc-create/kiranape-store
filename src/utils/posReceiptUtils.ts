/**
 * Counter POS Billing & Supermarket Thermal Receipt Utilities
 * Handles sequential Bill No. persistence, Indian currency amount-in-words,
 * barcode memory mapping, WhatsApp receipt formatting, and PNG thermal receipt export.
 */

export type PosPaymentMode = 'Cash' | 'UPI';

export interface PosBillItem {
  id: string;
  productId?: string;
  barcode?: string;
  name: string;
  qty: number;
  mrp: number;
  rate: number;
}

export interface PosSavedBarcodeProduct {
  barcode: string;
  productId?: string;
  name: string;
  mrp: number;
  rate: number;
  updatedAt: string;
}

export interface PosBillRecord {
  billNo: string;
  dateStr: string;
  timeStr: string;
  createdAtIso: string;
  customerName: string;
  customerPhone: string;
  paymentMode: PosPaymentMode;
  extraDiscount: number;
  items: PosBillItem[];
  mrpTotal: number;
  subTotal: number;
  itemSavings: number;
  totalSavings: number;
  grandTotal: number;
  totalQty: number;
}

export const POS_BILL_COUNTER_KEY = 'kiranape_pos_bill_counter_v1';
export const POS_BARCODE_MAP_KEY = 'kiranape_pos_barcode_map_v1';
export const POS_RECENT_BILLS_KEY = 'kiranape_pos_recent_bills_v1';

export const POS_STORE_HEADER = {
  title: 'KIRANAPĖ',
  address: 'Bus Stand, Waidhan, Distt. Singrauli (M.P.)',
  phone: '9424316081',
  terms: [
    'Goods once sold can be exchanged within 3 days with bill',
    'Shop Timing: 8:00 AM - 9:30 PM',
  ],
} as const;

export function formatBillNumber(seq: number): string {
  const safe = Math.max(1, Math.floor(Number(seq) || 1));
  return `KRP-${String(safe).padStart(3, '0')}`;
}

export function getCurrentBillCounter(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(POS_BILL_COUNTER_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
  } catch {
    return 1;
  }
}

export function saveBillCounter(nextSeq: number): number {
  const safe = Math.max(1, Math.floor(Number(nextSeq) || 1));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(POS_BILL_COUNTER_KEY, String(safe));
    } catch {}
  }
  return safe;
}

export function advanceBillCounterFromBillNo(billNo: string): number {
  const current = getCurrentBillCounter();
  const match = billNo.match(/(\d+)$/);
  const parsedFromBill = match ? parseInt(match[1], 10) : current;
  const next = Math.max(current, parsedFromBill) + 1;
  return saveBillCounter(next);
}

export function getSavedBarcodeMap(): Record<string, PosSavedBarcodeProduct> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(POS_BARCODE_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveBarcodeMapping(entry: Omit<PosSavedBarcodeProduct, 'updatedAt'>): Record<string, PosSavedBarcodeProduct> {
  const cleanCode = entry.barcode.trim();
  const map = getSavedBarcodeMap();
  if (!cleanCode) return map;

  map[cleanCode] = {
    ...entry,
    barcode: cleanCode,
    mrp: Math.max(0, Number(entry.mrp) || 0),
    rate: Math.max(0, Number(entry.rate) || 0),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(POS_BARCODE_MAP_KEY, JSON.stringify(map));
    } catch {}
  }
  return map;
}

export function getRecentPosBills(): PosBillRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(POS_RECENT_BILLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePosBillRecord(record: PosBillRecord): PosBillRecord[] {
  const existing = getRecentPosBills();
  const filtered = existing.filter((b) => b.billNo !== record.billNo);
  const updated = [record, ...filtered].slice(0, 40);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(POS_RECENT_BILLS_KEY, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

export function formatPosDate(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatPosTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function calculatePosTotals(items: PosBillItem[], extraDiscountRaw: number) {
  let mrpTotal = 0;
  let subTotal = 0;
  let totalQty = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.qty) || 0);
    const rate = Math.max(0, Number(item.rate) || 0);
    const mrp = Math.max(rate, Number(item.mrp) || rate);

    totalQty += qty;
    subTotal += qty * rate;
    mrpTotal += qty * mrp;
  }

  mrpTotal = Math.round(mrpTotal * 100) / 100;
  subTotal = Math.round(subTotal * 100) / 100;
  totalQty = Math.round(totalQty * 100) / 100;

  const itemSavings = Math.max(0, Math.round((mrpTotal - subTotal) * 100) / 100);
  const extraDiscount = Math.min(subTotal, Math.max(0, Math.round((Number(extraDiscountRaw) || 0) * 100) / 100));
  const grandTotal = Math.max(0, Math.round((subTotal - extraDiscount) * 100) / 100);
  const totalSavings = Math.round((itemSavings + extraDiscount) * 100) / 100;

  return {
    mrpTotal,
    subTotal,
    itemSavings,
    extraDiscount,
    totalSavings,
    grandTotal,
    totalQty,
  };
}

/**
 * Converts a numeric rupee amount into clean Indian English receipt words.
 * Example: 485 -> "Rs. Four Hundred Eighty Five Only"
 */
export function numberToIndianWords(amount: number): string {
  const clean = Math.max(0, Math.round((Number(amount) || 0) * 100) / 100);
  const rupees = Math.floor(clean);
  const paise = Math.round((clean - rupees) * 100);

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const convertTwoDigits = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o > 0 ? ' ' + ones[o] : ''}`;
  };

  const convertInteger = (num: number): string => {
    if (num === 0) return 'Zero';
    const parts: string[] = [];

    const crore = Math.floor(num / 10000000);
    num %= 10000000;
    const lakh = Math.floor(num / 100000);
    num %= 100000;
    const thousand = Math.floor(num / 1000);
    num %= 1000;
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;

    if (crore > 0) parts.push(`${convertInteger(crore)} Crore`);
    if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
    if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
    if (hundred > 0) parts.push(`${ones[hundred]} Hundred`);
    if (remainder > 0) parts.push(convertTwoDigits(remainder));

    return parts.join(' ').trim();
  };

  const rupeeWords = convertInteger(rupees);
  if (paise > 0) {
    return `Rs. ${rupeeWords} and ${convertTwoDigits(paise)} Paise Only`;
  }
  return `Rs. ${rupeeWords} Only`;
}

export function playPosScanBeep(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 200);
  } catch {}
}

export function generatePosWhatsAppReceiptText(bill: PosBillRecord): string {
  const lines: string[] = [
    `*${POS_STORE_HEADER.title}*`,
    `${POS_STORE_HEADER.address}`,
    `Ph: ${POS_STORE_HEADER.phone}`,
    `--------------------------------`,
    `Bill No: *${bill.billNo}*`,
    `Date: ${bill.dateStr}  Time: ${bill.timeStr}`,
    `Customer: *${bill.customerName || 'CASH'}*`,
  ];

  if (bill.customerPhone) {
    lines.push(`Mobile: ${bill.customerPhone}`);
  }
  lines.push(`Pay Mode: ${bill.paymentMode}`);
  lines.push(`--------------------------------`);
  lines.push(`*SN | Item | Qty x Rate | Amt*`);

  bill.items.forEach((item, idx) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const mrp = Math.max(rate, Number(item.mrp) || rate);
    const amt = Math.round(qty * rate * 100) / 100;
    const bnf = Math.max(0, Math.round((mrp - rate) * qty * 100) / 100);
    const bnfStr = bnf > 0 ? ` (MRP ₹${mrp} | Save ₹${bnf.toFixed(0)})` : '';
    lines.push(`${idx + 1}. ${item.name}`);
    lines.push(`   ${qty} x ₹${rate.toFixed(2)} = *₹${amt.toFixed(2)}*${bnfStr}`);
  });

  lines.push(`--------------------------------`);
  lines.push(`Item Qty: ${bill.items.length} Items / ${bill.totalQty} Qty`);
  lines.push(`MRP Total: ₹${bill.mrpTotal.toFixed(2)}`);
  if (bill.extraDiscount > 0) {
    lines.push(`Extra Bill Discount: -₹${bill.extraDiscount.toFixed(2)}`);
  }
  if (bill.totalSavings > 0) {
    lines.push(`*Total Benefit / Savings: ₹${bill.totalSavings.toFixed(2)}*`);
  }
  lines.push(`*G. TOTAL: ₹${bill.grandTotal.toFixed(2)}*`);
  lines.push(`(${numberToIndianWords(bill.grandTotal)})`);
  lines.push(`--------------------------------`);
  POS_STORE_HEADER.terms.forEach((t) => lines.push(`• ${t}`));
  lines.push(`Thank you for shopping at *KIRANAPĖ*!`);

  return lines.join('\n');
}

export function getPosWhatsAppShareUrl(bill: PosBillRecord): string {
  const text = encodeURIComponent(generatePosWhatsAppReceiptText(bill));
  const cleanDigits = (bill.customerPhone || '').replace(/\D/g, '').slice(-10);
  if (cleanDigits.length === 10) {
    return `https://wa.me/91${cleanDigits}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

/**
 * Renders a crisp high-DPI thermal supermarket receipt PNG via Canvas and downloads it.
 */
export function downloadPosReceiptImage(bill: PosBillRecord): void {
  if (typeof document === 'undefined') return;

  const width = 560;
  const paddingX = 24;
  const lineH = 22;

  // Estimate height dynamically based on item count
  const estimatedHeight = 470 + bill.items.length * 46;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = estimatedHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);
  ctx.fillStyle = '#111111';
  ctx.textBaseline = 'top';

  let y = 24;

  const drawDashedLine = () => {
    ctx.save();
    ctx.strokeStyle = '#333333';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(width - paddingX, y);
    ctx.stroke();
    ctx.restore();
    y += 12;
  };

  // Header
  ctx.font = '900 28px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(POS_STORE_HEADER.title, width / 2, y);
  y += 34;

  ctx.font = '600 14px "Courier New", monospace';
  ctx.fillText(POS_STORE_HEADER.address, width / 2, y);
  y += 20;
  ctx.fillText(`Ph: ${POS_STORE_HEADER.phone}`, width / 2, y);
  y += 24;

  drawDashedLine();

  // Meta rows
  ctx.font = '600 13px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Customer: ${bill.customerName || 'CASH'}`, paddingX, y);
  ctx.textAlign = 'right';
  ctx.fillText(`Bill No: ${bill.billNo}`, width - paddingX, y);
  y += 20;

  ctx.textAlign = 'left';
  ctx.fillText(`Mobile: ${bill.customerPhone || '-'}`, paddingX, y);
  ctx.textAlign = 'right';
  ctx.fillText(`Date: ${bill.dateStr}`, width - paddingX, y);
  y += 20;

  ctx.textAlign = 'left';
  ctx.fillText(`Pay Mode: ${bill.paymentMode}`, paddingX, y);
  ctx.textAlign = 'right';
  ctx.fillText(`Time: ${bill.timeStr}`, width - paddingX, y);
  y += 24;

  drawDashedLine();

  // Table header
  ctx.font = '700 12px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SN  Description', paddingX, y);
  ctx.textAlign = 'right';
  ctx.fillText('Qty   Rate   MRP   Bnf    Amt', width - paddingX, y);
  y += 20;
  drawDashedLine();

  // Items
  ctx.font = '600 13px "Courier New", monospace';
  bill.items.forEach((item, idx) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const mrp = Math.max(rate, Number(item.mrp) || rate);
    const amt = qty * rate;
    const bnf = Math.max(0, (mrp - rate) * qty);

    ctx.textAlign = 'left';
    const snStr = String(idx + 1).padStart(2, '0');
    const cleanName = item.name.length > 44 ? `${item.name.slice(0, 42)}..` : item.name;
    ctx.fillText(`${snStr}. ${cleanName}`, paddingX, y);
    y += 18;

    ctx.textAlign = 'right';
    const qtyStr = String(qty).padStart(4, ' ');
    const rateStr = rate.toFixed(0).padStart(6, ' ');
    const mrpStr = mrp.toFixed(0).padStart(6, ' ');
    const bnfStr = bnf.toFixed(0).padStart(5, ' ');
    const amtStr = amt.toFixed(2).padStart(8, ' ');
    ctx.fillText(`${qtyStr}${rateStr}${mrpStr}${bnfStr}${amtStr}`, width - paddingX, y);
    y += 22;
  });

  drawDashedLine();

  // Footer Summary
  ctx.font = '600 14px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Item Qty: ${bill.items.length} / ${bill.totalQty}`, paddingX, y);
  ctx.textAlign = 'right';
  ctx.fillText(`MRP Total: Rs.${bill.mrpTotal.toFixed(2)}`, width - paddingX, y);
  y += lineH;

  if (bill.extraDiscount > 0) {
    ctx.textAlign = 'left';
    ctx.fillText('Extra Bill Discount:', paddingX, y);
    ctx.textAlign = 'right';
    ctx.fillText(`-Rs.${bill.extraDiscount.toFixed(2)}`, width - paddingX, y);
    y += lineH;
  }

  ctx.textAlign = 'left';
  ctx.fillText('Total Benefit (Savings):', paddingX, y);
  ctx.textAlign = 'right';
  ctx.fillText(`Rs.${bill.totalSavings.toFixed(2)}`, width - paddingX, y);
  y += 26;

  drawDashedLine();

  ctx.font = '900 22px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('G. TOTAL:', paddingX, y);
  ctx.textAlign = 'right';
  ctx.fillText(`Rs.${bill.grandTotal.toFixed(2)}`, width - paddingX, y);
  y += 30;

  ctx.font = '600 12px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(numberToIndianWords(bill.grandTotal), paddingX, y);
  y += 24;

  drawDashedLine();

  // Terms
  ctx.font = '500 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  POS_STORE_HEADER.terms.forEach((term) => {
    ctx.fillText(term, width / 2, y);
    y += 17;
  });
  y += 6;
  ctx.font = '700 13px "Courier New", monospace';
  ctx.fillText('Thank You! Visit Again — KIRANAPĖ', width / 2, y);

  // Crop canvas tightly to final content height
  const finalH = Math.min(canvas.height, y + 32);
  const cropped = document.createElement('canvas');
  cropped.width = width;
  cropped.height = finalH;
  const croppedCtx = cropped.getContext('2d');
  if (croppedCtx) {
    croppedCtx.drawImage(canvas, 0, 0, width, finalH, 0, 0, width, finalH);
    const link = document.createElement('a');
    link.download = `${bill.billNo}_KIRANAPE_Receipt.png`;
    link.href = cropped.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
