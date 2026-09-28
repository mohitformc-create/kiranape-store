/**
 * Chaurasia Kirana App - Core Data Models
 */

export interface ProductVariant {
  id: string;
  weight_unit: string; // e.g. "500ml", "1L", "1kg", "5kg"
  price: number; // selling price
  mrp: number; // original price (MRP)
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  hindiName?: string; // Bilingual Hindi Product Name (e.g. आशीर्वाद आटा)
  category: string;
  unit: string; // e.g., '1 kg', '5 kg', '1 Litre', '500 g', 'Pack of 4'
  originalPrice: number; // MRP in ₹
  discountPercent: number; // e.g., 15 for 15%
  finalPrice: number; // Calculated discounted selling price in ₹
  imageUrl: string;
  isAvailable: boolean;
  stock?: number; // In-stock unit count
  description?: string;
  variants?: ProductVariant[];
  updatedAt: number;
}

export interface ScannedBillItem {
  id: string;
  name: string;
  hindiName?: string;
  packSize: string;
  category: string;
  mrp: number;
  nrate: number; // Landed rate / purchase cost with GST
  autoSellingPrice: number; // Smart discounted selling price strictly lower than MRP
  quantity: number; // Packs received
  imageUrl: string;
  isExistingProduct?: boolean;
  existingProductId?: string;
  selected: boolean; // whether admin chooses to import it
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
  itemKey: string;
}

export interface OrderItemSummary {
  productId: string;
  variantId?: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  total: number;
}

export type OrderStatus =
  | 'received'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'New Order'
  | 'Packed'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type DeliverySlot =
  | 'Morning (10:00 AM - 2:00 PM)'
  | 'Evening (7:00 PM - 9:00 PM)'
  | 'Instant Delivery (30-45 mins)'
  | 'Today Evening (5:00 PM - 8:00 PM)'
  | 'Tomorrow Morning (7:30 AM - 10:30 AM)'
  | 'Tomorrow Evening (5:00 PM - 8:00 PM)'
  | (string & {});

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  customerPhone?: string;
  customerDeviceId?: string;
  address: string;
  deliverySlot?: string;
  deliveryLocation?: string;
  items: OrderItemSummary[];
  itemsCount: number;
  subtotalOriginal: number;
  totalSavings: number;
  deliveryFee: number;
  finalPayableAmount: number;
  paymentMethod: 'Cash on Delivery (COD)';
  status: OrderStatus;
  statusLabel?: string;
  createdAt: string;
  timestamp: number;
  userId?: string;
  parchiImageUrl?: string; // Handwritten parchi photo preview if order placed via Parchi
  slipImageUrl?: string; // Alias for ration slip photo preview
  voiceNoteBase64?: string; // Recorded voice note audio (base64 data URI)
  voiceAudioUrl?: string; // Alias for recorded voice note audio
  isParchi?: boolean;
  orderType?: 'voice' | 'parchi' | 'cart';
  notes?: string;
}

export type UserRole = 'customer' | 'admin';

export interface AppUser {
  uid: string;
  email?: string;
  displayName?: string;
  phone?: string;
  address?: string;
  role: UserRole;
  isAnonymous?: boolean;
}

export type ProductCategory =
  | 'All'
  | 'Atta & Flours'
  | 'Rice & Dal'
  | 'Oil & Ghee'
  | 'Spices & Salt'
  | 'Dairy & Bakery'
  | 'Snacks & Biscuits'
  | 'Tea, Coffee & Drinks'
  | 'Household Essentials'
  | (string & {});

export interface CustomCategory {
  id: string;
  name: string; // English Name (e.g. "Pooja Samagri", "Baby Care", "Cold Drinks")
  hindiName?: string; // Hindi Name (e.g. "पूजा सामग्री")
  icon?: string; // Emoji or Icon identifier (e.g. "🪔", "🍼", "🥤")
  isSystem?: boolean;
  order?: number;
}

export interface ParchiOrder {
  id: string;
  customerName: string;
  phone?: string;
  customerPhone?: string;
  customerDeviceId?: string;
  address?: string;
  deliveryAddress?: string;
  deliveryLocation?: string;
  notes?: string;
  items?: string[];
  imageUrl?: string;
  imageBase64?: string;
  voiceNoteBase64?: string;
  createdAt: string;
  timestamp: number;
  status: 'Pending' | 'Pending Verification' | 'Order Created' | 'Packed' | 'Delivered' | 'Cancelled' | string;
}

export interface StoreSettings {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  address: string;
  serviceArea?: string; // Store Service Area / City (default: "Waidhan, Singrauli")
  deliveryTime: string;
  deliveryTagline?: string; // e.g. "Shuddh Samaan, Bharosemand Delivery - Waidhan Store"
  minOrderForFreeDelivery: number;
  deliveryCharge: number;
  adminPin: string;
  updatedAt?: number;
}

export interface PromoBanner {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  imageUrl: string;
  linkCategory?: string;
  isActive: boolean;
  order?: number;
  createdAt?: number;
}

export type StoreInfo = StoreSettings;

