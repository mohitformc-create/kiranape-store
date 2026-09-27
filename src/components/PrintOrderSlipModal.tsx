import React, { useRef } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  Store,
  Phone,
  Clock,
  Calendar,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Order, StoreSettings } from '../types';
import { STORE_DEFAULTS } from '../data/initialProducts';

interface PrintOrderSlipModalProps {
  order: Order | null;
  onClose: () => void;
  storeSettings?: StoreSettings;
}

export const PrintOrderSlipModal: React.FC<PrintOrderSlipModalProps> = ({
  order,
  onClose,
  storeSettings = STORE_DEFAULTS,
}) => {
  const [copied, setCopied] = React.useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    if (!receiptRef.current) return;
    const text = receiptRef.current.innerText;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = order.deliveryFee ?? (order.totalAmount > subtotal ? order.totalAmount - subtotal : 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Thermal Print Media Styling */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #kirana-thermal-receipt-wrap,
          #kirana-thermal-receipt-wrap * {
            visibility: visible !important;
          }
          #kirana-thermal-receipt-wrap {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-md bg-stone-100 rounded-3xl shadow-2xl border border-stone-300 overflow-hidden max-h-[94vh] flex flex-col my-auto animate-zoomIn">
        {/* Modal Top Toolbar (Hidden during actual print) */}
        <div className="bg-stone-900 text-white px-5 py-3.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-sm leading-tight">
                Order Delivery Slip (58/80mm)
              </h3>
              <p className="text-[10px] text-stone-400">Order #{order.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons Top Bar */}
        <div className="p-3 bg-white border-b border-stone-200 flex items-center justify-between gap-2 no-print">
          <button
            type="button"
            onClick={handleCopyText}
            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Receipt' : 'Copy Text'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-heading font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>🖨️ Print Slip / PDF</span>
          </button>
        </div>

        {/* Scrollable Receipt Preview Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex justify-center bg-stone-200/60">
          {/* Thermal Paper Slip Layout */}
          <div
            id="kirana-thermal-receipt-wrap"
            ref={receiptRef}
            className="w-full max-w-[320px] bg-white text-stone-950 p-5 rounded-2xl shadow-md border border-stone-300 font-mono text-xs leading-tight space-y-2.5"
          >
            {/* Store Header */}
            <div className="text-center space-y-0.5 border-b border-dashed border-stone-400 pb-3">
              <h2 className="font-bold text-base tracking-tight uppercase">
                {storeSettings.name || 'CHAURASIA KIRANA STORE'}
              </h2>
              <p className="text-[11px] font-medium text-stone-700">
                KIRANAPE EXPRESS • DOORSTEP DELIVERY
              </p>
              <p className="text-[10px] text-stone-600 leading-snug">
                {storeSettings.address || 'Shop No. 4, Main Market'}
              </p>
              <p className="text-[10px] font-bold text-stone-800">
                Helpline / WhatsApp: {storeSettings.phone || '9424316081'}
              </p>
            </div>

            {/* Order & Delivery Info */}
            <div className="text-[11px] space-y-1 border-b border-dashed border-stone-400 pb-2.5">
              <div className="flex justify-between">
                <span className="text-stone-600">ORDER NO:</span>
                <span className="font-bold">#{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">DATE/TIME:</span>
                <span>{order.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">SLOT:</span>
                <span className="font-bold text-stone-900">{order.deliverySlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-600">PAYMENT:</span>
                <span className="font-bold">Cash on Delivery (COD)</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="text-[11px] space-y-1 border-b border-dashed border-stone-400 pb-2.5">
              <div className="font-bold text-[10px] uppercase text-stone-500">
                CUSTOMER DELIVERY DETAILS:
              </div>
              <div className="font-bold text-xs">{order.customerName}</div>
              <div>Mobile: <strong>{order.customerPhone || order.phone}</strong></div>
              {order.deliveryLocation && (
                <div>Area / Zone: <strong>{order.deliveryLocation}</strong></div>
              )}
              <div className="leading-snug text-stone-800">
                Address: {order.deliveryAddress || order.address}
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1 border-b border-dashed border-stone-400 pb-2.5">
              <div className="flex justify-between font-bold text-[10px] uppercase text-stone-500 pb-1">
                <span>ITEM & PACK</span>
                <span>QTY x PRICE = AMT</span>
              </div>

              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-1 text-[11px]">
                  <div className="flex-1 min-w-0 pr-1">
                    <span className="font-semibold block truncate">{item.name}</span>
                    <span className="text-[10px] text-stone-600">({item.unit})</span>
                  </div>
                  <div className="text-right flex-shrink-0 font-medium">
                    {item.quantity} x ₹{item.price} = <strong className="font-bold">₹{item.total}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Summary */}
            <div className="space-y-1 text-xs border-b border-dashed border-stone-400 pb-2.5">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge:</span>
                <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-stone-200">
                <span>TOTAL PAYABLE (COD):</span>
                <span>₹{order.finalPayableAmount || order.totalAmount}</span>
              </div>
            </div>

            {/* Footer Slip Notice */}
            <div className="text-center pt-2 space-y-1 text-[10px] text-stone-600">
              <p className="font-bold text-[11px] text-stone-800">
                *** THANK YOU FOR SHOPPING LOCAL ***
              </p>
              <p>Ghar par delivery ke baad cash ya UPI dein.</p>
              <p className="text-[9px] text-stone-400">Printed via Kiranape Express</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="p-3 bg-white border-t border-stone-200 flex justify-end no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
