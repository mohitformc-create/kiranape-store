import React, { useState } from 'react';
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  LogOut,
  Package,
  ShoppingBag,
  Search,
  CheckCircle,
  Clock,
  Phone,
  MapPin,
  RefreshCw,
  Sparkles,
  Key,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Truck,
  MessageCircle,
  Copy,
  Check,
  ChevronDown,
  Minus,
  FileText,
  Zap,
  Box,
  LayoutGrid,
  List,
  Eye,
  Camera,
  Filter,
  X,
  FolderTree,
  Printer,
  Database,
  Download,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Volume2,
  VolumeX,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { Product, Order, OrderStatus, StoreSettings, PromoBanner, ProductVariant, CustomCategory, ParchiOrder } from '../types';
import { CATEGORIES, STORE_DEFAULTS } from '../data/initialProducts';
import { ProductFormModal } from './ProductFormModal';
import { AdminStoreSettings } from './AdminStoreSettings';
import { AdminOffersAndSettings } from './AdminOffersAndSettings';
import { AdminVisualProductCard } from './AdminVisualProductCard';
import { AdminCategoryManager } from './AdminCategoryManager';
import { PrintOrderSlipModal } from './PrintOrderSlipModal';
import { AdminBackupRestore } from './AdminBackupRestore';
import { CreatorCredits } from './CreatorCredits';
import { getWhatsAppBillUrl, generateWhatsAppBillMessage } from '../utils/orderUtils';
import { playAdminNotificationChime } from '../utils/sound';
import { getCategoryFallbackSvg } from '../utils/productImageUtils';
import { API_BASE_URL } from '../config/api';
import {
  fetchCentralOrders,
  updateCentralOrderStatus,
  deleteOrderFromCentralServer,
  clearCompletedOrCancelledOrdersFromCentralServer,
  clearAllOrdersFromCentralServer,
  saveBulkProductsToCentralInventory,
} from '../services/orderApiService';
import {
  calculateFinalPrice,
  getProducts,
  saveProducts,
  getOrders,
  getCustomCategories,
  addCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
  downloadStoreBackup,
  subscribeToSync,
  mergeAndInjectWholesaleCatalog,
  getParchiOrders,
  updateParchiOrderStatus,
  deleteParchiOrder,
} from '../services/storageService';

interface AdminPanelProps {
  products: Product[];
  orders: Order[];
  onAddProduct: (data: any) => void;
  onUpdateProduct: (id: string, updates: Partial<Product>) => void;
  onDeleteProduct: (id: string) => void;
  onResetDefaultProducts: () => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  adminPin: string;
  onChangePin: (newPin: string) => void;
  onExitAdmin: () => void;
  onLogoutAdmin?: () => void;
  isFirebaseConnected?: boolean;
  onSyncToFirestore?: () => void;
  storeSettings: StoreSettings;
  banners: PromoBanner[];
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
  onSaveBanners: (banners: PromoBanner[]) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  products,
  orders,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onResetDefaultProducts,
  onUpdateOrderStatus,
  onDeleteOrder,
  adminPin,
  onChangePin,
  onExitAdmin,
  onLogoutAdmin,
  isFirebaseConnected = false,
  onSyncToFirestore,
  storeSettings,
  banners,
  onSaveSettings,
  onSaveBanners,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'parchi_orders' | 'offers_settings' | 'categories' | 'settings'>('inventory');
  const [inventoryLayoutMode, setInventoryLayoutMode] = useState<'visual' | 'table'>('visual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Custom Categories & Parchi state (synced with storage)
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => getCustomCategories());
  const [parchiOrders, setParchiOrders] = useState<ParchiOrder[]>(() => getParchiOrders());
  const [liveOrders, setLiveOrders] = useState<Order[]>(() => {
    const stored = getOrders();
    return stored.length > 0 ? stored : orders;
  });
  const [parchiSearchQuery, setParchiSearchQuery] = useState('');
  const [zoomedParchi, setZoomedParchi] = useState<ParchiOrder | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  // Real-time order notification alert
  const [isBeepAlertEnabled, setIsBeepAlertEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('kiranape_beep_alert_enabled') !== 'false';
  });

  const toggleBeepAlert = () => {
    const next = !isBeepAlertEnabled;
    setIsBeepAlertEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kiranape_beep_alert_enabled', String(next));
    }
  };

  const [newOrderAlert, setNewOrderAlert] = useState<{
    id: string;
    customerName: string;
    type: 'voice' | 'parchi' | 'cart';
    time: string;
  } | null>(null);
  const knownOrderIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialLoadRef = React.useRef(true);
  const isBeepAlertEnabledRef = React.useRef(isBeepAlertEnabled);
  isBeepAlertEnabledRef.current = isBeepAlertEnabled;

  const checkIncomingAlerts = React.useCallback((ordersList: Order[], parchisList: ParchiOrder[]) => {
    if (isInitialLoadRef.current) {
      ordersList.forEach((o) => knownOrderIdsRef.current.add(o.id));
      parchisList.forEach((p) => knownOrderIdsRef.current.add(p.id));
      isInitialLoadRef.current = false;
      return;
    }

    const brandNewParchi = parchisList.find((p) => !knownOrderIdsRef.current.has(p.id));
    const brandNewOrder = ordersList.find((o) => !knownOrderIdsRef.current.has(o.id));

    if (brandNewParchi || brandNewOrder) {
      if (isBeepAlertEnabledRef.current) {
        playAdminNotificationChime();
      }
      const target = brandNewParchi || brandNewOrder!;
      const isVoice = Boolean(
        target.voiceNoteBase64 ||
        (target as any).orderType === 'voice' ||
        (target as any).notes?.includes('वॉइस')
      );
      const isParchi = Boolean(
        (target as any).imageBase64 ||
        (target as any).parchiImageUrl ||
        (target as any).orderType === 'parchi' ||
        (target as any).isParchi
      );

      setNewOrderAlert({
        id: target.id,
        customerName: target.customerName || 'Customer',
        type: isVoice ? 'voice' : isParchi ? 'parchi' : 'cart',
        time: new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }),
      });

      ordersList.forEach((o) => knownOrderIdsRef.current.add(o.id));
      parchisList.forEach((p) => knownOrderIdsRef.current.add(p.id));
    }
  }, []);

  // Helper to map central server orders to ParchiOrder model
  const deriveParchiOrders = React.useCallback((serverOrders: Order[]): ParchiOrder[] => {
    return serverOrders
      .filter(
        (o) =>
          o.isParchi ||
          (o as any).slipPhoto ||
          (o as any).voiceAudio ||
          o.parchiImageUrl ||
          o.voiceNoteBase64 ||
          (o as any).orderType === 'parchi' ||
          (o as any).orderType === 'voice'
      )
      .map((o) => ({
        id: o.id,
        customerName: o.customerName,
        customerPhone: o.phone,
        phone: o.phone,
        deliveryAddress: o.address,
        address: o.address,
        deliveryLocation: (o as any).deliveryLocation,
        deliverySlot: o.deliverySlot,
        slipPhoto: (o as any).slipPhoto || o.parchiImageUrl || (o as any).slipImageUrl,
        parchiImageUrl: (o as any).slipPhoto || o.parchiImageUrl || (o as any).slipImageUrl,
        imageBase64: (o as any).slipPhoto || o.parchiImageUrl || (o as any).slipImageUrl,
        voiceAudio: (o as any).voiceAudio || o.voiceNoteBase64,
        voiceNoteBase64: (o as any).voiceAudio || o.voiceNoteBase64,
        voiceAudioUrl: (o as any).voiceAudio || o.voiceNoteBase64,
        notes: (o as any).notes,
        status: o.status,
        createdAt: o.createdAt,
        timestamp: (o as any).timestamp || Date.now(),
      }));
  }, []);

  // Sync liveOrders if prop orders changes only on initial mount if liveOrders is empty
  React.useEffect(() => {
    if (orders && orders.length > 0 && liveOrders.length === 0) {
      setLiveOrders(orders);
      const serverParchis = deriveParchiOrders(orders);
      setParchiOrders(serverParchis);
      checkIncomingAlerts(orders, serverParchis);
    }
  }, [orders, liveOrders.length, checkIncomingAlerts, deriveParchiOrders]);

  // Real-time polling from Central Server Database every 3 seconds (Multi-device live sync)
  React.useEffect(() => {
    let isMounted = true;

    const loadCentralOrders = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders`, {
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          const serverOrders: Order[] = Array.isArray(data) ? data : data.orders || [];
          if (isMounted) {
            // DIRECTLY updates liveOrders state from central server on every 3s poll
            setLiveOrders(serverOrders);
            const serverParchis = deriveParchiOrders(serverOrders);
            setParchiOrders(serverParchis);
            checkIncomingAlerts(serverOrders, serverParchis);
          }
        }
      } catch (err) {
        console.error('[Admin Central Sync] Polling error:', err);
      }
    };

    // Initial load
    loadCentralOrders();

    // 3-second recurring poll for live customer orders across Singrauli
    const intervalId = setInterval(loadCentralOrders, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [checkIncomingAlerts, deriveParchiOrders]);

  // Listen to external/restore sync events, custom kiranape_orders_updated event, and cross-tab storage
  React.useEffect(() => {
    const handleSync = async () => {
      const updatedCategories = getCustomCategories();
      setCustomCategories(updatedCategories);
      try {
        const serverOrders = await fetchCentralOrders();
        if (serverOrders && Array.isArray(serverOrders)) {
          setLiveOrders(serverOrders);
          const serverParchis = deriveParchiOrders(serverOrders);
          setParchiOrders(serverParchis);
          checkIncomingAlerts(serverOrders, serverParchis);
        }
      } catch (e) {
        console.warn('Sync orders notice:', e);
      }
    };

    const unsub = subscribeToSync(handleSync);
    window.addEventListener('kiranape_orders_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      unsub();
      window.removeEventListener('kiranape_orders_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [checkIncomingAlerts, deriveParchiOrders]);

  // Modal & Sync states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [catalogSyncNotice, setCatalogSyncNotice] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  const handleCreateCategory = (catData: Omit<CustomCategory, 'id'>) => {
    const created = addCustomCategory(catData);
    setCustomCategories(getCustomCategories());
    setCatalogSyncNotice(`Category "${created.name}" created and synced.`);
    setTimeout(() => setCatalogSyncNotice(null), 3000);
  };

  const handleUpdateCategoryItem = (id: string, updates: Partial<CustomCategory>) => {
    updateCustomCategory(id, updates);
    setCustomCategories(getCustomCategories());
    setCatalogSyncNotice('Category updated successfully.');
    setTimeout(() => setCatalogSyncNotice(null), 3000);
  };

  const handleDeleteCategoryItem = (id: string) => {
    deleteCustomCategory(id);
    setCustomCategories(getCustomCategories());
    setCatalogSyncNotice('Category removed.');
    setTimeout(() => setCatalogSyncNotice(null), 3000);
  };

  // In-line fast edit state
  const [inlineEdit, setInlineEdit] = useState<{
    id: string;
    field: 'originalPrice' | 'finalPrice' | 'stock';
    value: string;
    variantId?: string;
  } | null>(null);

  // Enlarged parchi preview modal
  const [viewingParchiImage, setViewingParchiImage] = useState<string | null>(null);

  // Order deletion and bulk clearing states
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [clearOrdersConfirm, setClearOrdersConfirm] = useState<'completed' | 'all' | null>(null);
  const [isClearingOrders, setIsClearingOrders] = useState(false);

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeletingOrder(true);
    try {
      const orderId = orderToDelete.id;
      await deleteOrderFromCentralServer(orderId);
      onDeleteOrder(orderId);
      setLiveOrders((prev) => prev.filter((o) => o.id !== orderId));
      setParchiOrders((prev) => prev.filter((p) => p.id !== orderId));
      setOrderToDelete(null);
    } catch (err) {
      console.error('Failed to delete order:', err);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleConfirmClearOrders = async () => {
    if (!clearOrdersConfirm) return;
    setIsClearingOrders(true);
    try {
      if (clearOrdersConfirm === 'all') {
        await clearAllOrdersFromCentralServer();
        setLiveOrders([]);
        setParchiOrders([]);
      } else {
        await clearCompletedOrCancelledOrdersFromCentralServer();
        setLiveOrders((prev) =>
          prev.filter((o) => {
            const s = (o.status || '').toLowerCase();
            return s !== 'delivered' && s !== 'cancelled';
          })
        );
        setParchiOrders((prev) =>
          prev.filter((p) => {
            const s = (p.status || '').toLowerCase();
            return s !== 'delivered' && s !== 'cancelled';
          })
        );
      }
      setClearOrdersConfirm(null);
    } catch (err) {
      console.error('Failed to clear orders:', err);
    } finally {
      setIsClearingOrders(false);
    }
  };

  // Expanded variant rows
  const [expandedProductVariants, setExpandedProductVariants] = useState<Record<string, boolean>>({});

  const handleCopyBillText = (order: Order) => {
    const text = generateWhatsAppBillMessage(order, storeSettings);
    navigator.clipboard?.writeText(text);
    setCopiedOrderId(order.id);
    setTimeout(() => setCopiedOrderId(null), 2500);
  };

  // Fast In-Line Edit Commit Handler
  const handleCommitInlineEdit = () => {
    if (!inlineEdit) return;
    const { id, field, value, variantId } = inlineEdit;
    const prod = products.find((p) => p.id === id);
    if (!prod) {
      setInlineEdit(null);
      return;
    }

    const numVal = Math.max(0, Number(value) || 0);

    // If editing a variant
    if (variantId && prod.variants) {
      const updatedVariants = prod.variants.map((v) => {
        if (v.id !== variantId) return v;
        if (field === 'finalPrice') return { ...v, price: Math.max(1, numVal) };
        if (field === 'originalPrice') return { ...v, mrp: Math.max(1, numVal) };
        if (field === 'stock') return { ...v, stock: numVal };
        return v;
      });
      onUpdateProduct(id, { variants: updatedVariants });
      setInlineEdit(null);
      return;
    }

    // Base product inline edit
    if (field === 'finalPrice') {
      const newFinalPrice = Math.max(1, numVal);
      const newDiscount =
        prod.originalPrice > newFinalPrice
          ? Math.round(((prod.originalPrice - newFinalPrice) / prod.originalPrice) * 100)
          : 0;
      onUpdateProduct(id, { finalPrice: newFinalPrice, discountPercent: newDiscount });
    } else if (field === 'originalPrice') {
      const newOriginal = Math.max(1, numVal);
      const newFinalPrice = calculateFinalPrice(newOriginal, prod.discountPercent);
      onUpdateProduct(id, { originalPrice: newOriginal, finalPrice: newFinalPrice });
    } else if (field === 'stock') {
      onUpdateProduct(id, { stock: numVal });
    }

    setInlineEdit(null);
  };

  // Stock Quick Stepper (+/- buttons)
  const handleStockStep = (prod: Product, delta: number) => {
    const currentStock = prod.stock !== undefined ? prod.stock : 50;
    const newStock = Math.max(0, currentStock + delta);
    onUpdateProduct(prod.id, { stock: newStock });
  };

  // Filter products with Category Quick Filter support (Sabji, Atta/Dal, Tel, Masala, Snacks, Dairy)
  const filteredProducts = products.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.hindiName && item.hindiName.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q);

    let matchesCategory = false;
    if (selectedCategory === 'All') {
      matchesCategory = true;
    } else if (selectedCategory === 'Sabji') {
      matchesCategory =
        item.category.toLowerCase().includes('sabji') ||
        item.category.toLowerCase().includes('fresh') ||
        item.category.toLowerCase().includes('fruit') ||
        item.category.toLowerCase().includes('vegetable');
    } else if (selectedCategory === 'Atta/Dal') {
      matchesCategory = item.category === 'Atta & Flours' || item.category === 'Rice & Dal';
    } else if (selectedCategory === 'Tel') {
      matchesCategory = item.category === 'Oil & Ghee';
    } else if (selectedCategory === 'Masala') {
      matchesCategory = item.category === 'Spices & Salt';
    } else if (selectedCategory === 'Snacks') {
      matchesCategory = item.category === 'Snacks & Biscuits';
    } else if (selectedCategory === 'Dairy') {
      matchesCategory = item.category === 'Dairy & Bakery';
    } else {
      matchesCategory = item.category === selectedCategory;
    }

    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setIsFormOpen(true);
  };

  const handleSaveProduct = (formData: any) => {
    if (editingProduct) {
      onUpdateProduct(editingProduct.id, formData);
    } else {
      onAddProduct(formData);
    }
  };

  const handleConfirmDelete = (id: string) => {
    onDeleteProduct(id);
    setDeleteConfirmId(null);
  };

  const csvFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Helper to parse RFC-4180 CSV text accounting for quotes, multiline and commas
  const parseCsvText = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      const nextChar = clean[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        lines.push(currentRow);
      }
    }

    return lines;
  };

  // 1-Click Export Inventory as Excel (CSV) with required columns:
  // id, name, hindiName, category, mrp, sellingPrice, unit, inStock, stockCount, imageUrl
  const handleDownloadInventoryCsv = () => {
    let inventoryItems: Product[] = [];
    try {
      const stored = getProducts();
      if (Array.isArray(stored) && stored.length > 0) {
        inventoryItems = stored;
      }
    } catch (e) {
      console.error('Error reading inventory for CSV export:', e);
    }

    if (inventoryItems.length === 0) {
      inventoryItems = products;
    }

    const headers = [
      'id',
      'name',
      'hindiName',
      'category',
      'mrp',
      'sellingPrice',
      'unit',
      'inStock',
      'stockCount',
      'imageUrl',
    ];

    const escapeCsvCell = (val: unknown): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = inventoryItems.map((item) => {
      const unit = item.unit || (item.variants && item.variants.length > 0 ? item.variants[0].weight_unit : '1 pc');
      const mrp = item.originalPrice !== undefined ? item.originalPrice : (item.finalPrice || 0);
      const sellingPrice = item.finalPrice !== undefined ? item.finalPrice : mrp;
      const inStock = item.isAvailable ? 'true' : 'false';
      const stockCount = item.stockCount !== undefined ? item.stockCount : (item.stock !== undefined ? item.stock : 50);

      return [
        escapeCsvCell(item.id),
        escapeCsvCell(item.name || ''),
        escapeCsvCell(item.hindiName || ''),
        escapeCsvCell(item.category || ''),
        escapeCsvCell(mrp),
        escapeCsvCell(sellingPrice),
        escapeCsvCell(unit),
        escapeCsvCell(inStock),
        escapeCsvCell(stockCount),
        escapeCsvCell(item.imageUrl || ''),
      ].join(',');
    });

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);

    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'kiranape_inventory_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCatalogSyncNotice(`Downloaded ${inventoryItems.length} products to kiranape_inventory_export.csv successfully!`);
    setTimeout(() => setCatalogSyncNotice(null), 5000);
  };

  // Download Sample CSV Template
  const handleDownloadSampleCsvTemplate = () => {
    const headers = [
      'id',
      'name',
      'hindiName',
      'category',
      'mrp',
      'sellingPrice',
      'unit',
      'inStock',
      'stockCount',
      'imageUrl',
    ];

    const sampleRows = [
      [
        '"prod_sample_1"',
        '"Aashirvaad Shudh Chakki Atta"',
        '"आशीर्वाद शुद्ध चक्की आटा"',
        '"Atta & Flours"',
        '"240"',
        '"215"',
        '"5 kg"',
        '"true"',
        '"50"',
        '"https://images.openfoodfacts.org/images/products/890/103/001/0173/front_en.24.400.jpg"',
      ].join(','),
      [
        '"prod_sample_2"',
        '"Fortune Premium Kachi Ghani Mustard Oil"',
        '"फॉर्च्यून कच्ची घानी सरसों का तेल"',
        '"Oil & Ghee"',
        '"165"',
        '"145"',
        '"1 Litre"',
        '"true"',
        '"40"',
        '"https://images.openfoodfacts.org/images/products/890/600/728/0052/front_en.8.400.jpg"',
      ].join(','),
      [
        '"prod_sample_3"',
        '"Parle-G Original Gluco Biscuits"',
        '"पारले-जी ग्लूकोज बिस्कुट"',
        '"Snacks & Biscuits"',
        '"30"',
        '"28"',
        '"250 g"',
        '"true"',
        '"100"',
        '"https://images.openfoodfacts.org/images/products/890/171/910/1012/front_en.16.400.jpg"',
      ].join(','),
      [
        '"prod_sample_4"',
        '"Tata Salt Vacuum Evaporated Iodized"',
        '"टाटा नमक देश का नमक"',
        '"Spices & Salt"',
        '"28"',
        '"26"',
        '"1 kg"',
        '"true"',
        '"60"',
        '"https://images.openfoodfacts.org/images/products/890/106/500/0117/front_en.18.400.jpg"',
      ].join(','),
    ];

    const csvContent = [headers.map((h) => `"${h}"`).join(','), ...sampleRows].join('\r\n');
    const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent('\uFEFF' + csvContent);

    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'kiranape_sample_inventory_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload Excel (CSV)
  const handleUploadInventoryCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          alert('CSV file is empty.');
          return;
        }

        const rows = parseCsvText(text);
        if (rows.length < 2) {
          alert('CSV file contains no product rows.');
          return;
        }

        const rawHeaders = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
        const colMap: Record<string, number> = {};
        rawHeaders.forEach((header, index) => {
          if (header === 'id') colMap.id = index;
          if (header === 'name' || header === 'itemname' || header === 'productname') colMap.name = index;
          if (header === 'hindiname' || header === 'hindi') colMap.hindiName = index;
          if (header === 'category') colMap.category = index;
          if (header === 'mrp' || header === 'originalprice' || header === 'originalmrp') colMap.mrp = index;
          if (header === 'sellingprice' || header === 'finalprice' || header === 'price') colMap.sellingPrice = index;
          if (header === 'unit' || header === 'packsize' || header === 'weight') colMap.unit = index;
          if (header === 'instock' || header === 'available' || header === 'isavailable') colMap.inStock = index;
          if (header === 'stockcount' || header === 'stock') colMap.stockCount = index;
          if (header === 'imageurl' || header === 'image') colMap.imageUrl = index;
        });

        if (colMap.name === undefined) {
          alert('CSV must contain a "name" column.');
          return;
        }

        const currentProducts = getProducts();
        const existingById = new Map<string, Product>(currentProducts.map((p) => [p.id, p]));
        const existingByName = new Map<string, Product>(currentProducts.map((p) => [p.name.trim().toLowerCase(), p]));

        let updatedCount = 0;
        let addedCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const name = colMap.name !== undefined ? row[colMap.name]?.trim() : '';
          if (!name) continue;

          const rawId = colMap.id !== undefined ? row[colMap.id]?.trim() : '';
          const hindiName = colMap.hindiName !== undefined ? row[colMap.hindiName]?.trim() : '';
          const category = (colMap.category !== undefined && row[colMap.category]?.trim()) || 'Household Essentials';
          const mrp = colMap.mrp !== undefined ? parseFloat(row[colMap.mrp]) || 0 : 0;
          const sellingPrice = colMap.sellingPrice !== undefined ? parseFloat(row[colMap.sellingPrice]) || mrp : mrp;
          const unit = (colMap.unit !== undefined && row[colMap.unit]?.trim()) || '1 pc';
          const rawInStock = colMap.inStock !== undefined ? row[colMap.inStock]?.trim().toLowerCase() : 'true';
          const isAvailable = rawInStock === 'true' || rawInStock === 'yes' || rawInStock === '1' || rawInStock === 'instock';
          const stockCount = colMap.stockCount !== undefined ? parseInt(row[colMap.stockCount], 10) || 50 : 50;
          const imageUrl = colMap.imageUrl !== undefined ? row[colMap.imageUrl]?.trim() : '';

          const discountPercent = mrp > sellingPrice && mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;

          let existingProduct: Product | undefined;
          if (rawId && existingById.has(rawId)) {
            existingProduct = existingById.get(rawId);
          } else if (existingByName.has(name.toLowerCase())) {
            existingProduct = existingByName.get(name.toLowerCase());
          }

          if (existingProduct) {
            existingProduct.name = name;
            if (hindiName) existingProduct.hindiName = hindiName;
            if (category) existingProduct.category = category as any;
            if (mrp > 0) existingProduct.originalPrice = mrp;
            if (sellingPrice > 0) existingProduct.finalPrice = sellingPrice;
            existingProduct.discountPercent = discountPercent;
            if (unit) existingProduct.unit = unit;
            existingProduct.isAvailable = isAvailable;
            existingProduct.stockCount = stockCount;
            if (imageUrl) existingProduct.imageUrl = imageUrl;
            existingProduct.updatedAt = Date.now();
            updatedCount++;
          } else {
            const newId = rawId || `prod_${Date.now()}_${i}`;
            const newProd: Product = {
              id: newId,
              name,
              hindiName: hindiName || undefined,
              category: category as any,
              originalPrice: mrp || sellingPrice,
              finalPrice: sellingPrice || mrp,
              discountPercent,
              unit,
              isAvailable,
              stockCount,
              imageUrl: imageUrl || getCategoryFallbackSvg(category, name),
              updatedAt: Date.now(),
            };
            existingById.set(newId, newProd);
            existingByName.set(name.toLowerCase(), newProd);
            addedCount++;
          }
        }

        const mergedList = Array.from(existingById.values());
        saveProducts(mergedList);

        // Bulk sync with central server
        await saveBulkProductsToCentralInventory(mergedList);

        setCatalogSyncNotice(`Successfully loaded ${updatedCount + addedCount} products from CSV (${updatedCount} updated, ${addedCount} added).`);
        setTimeout(() => setCatalogSyncNotice(null), 6000);
      } catch (err: any) {
        console.error('Error importing CSV:', err);
        alert(`Error importing CSV: ${err.message || 'Invalid format'}`);
      } finally {
        if (csvFileInputRef.current) {
          csvFileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPinInput.trim();
    if (clean.length >= 4) {
      onChangePin(clean);
      setNewPinInput('');
      setPinChangeSuccess(true);
      setTimeout(() => setPinChangeSuccess(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-40 bg-stone-900 text-white shadow-md border-b border-stone-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-extrabold shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-lg leading-tight">
                  Chaurasia Store Owner Panel
                </h2>
                <span className="bg-amber-400 text-stone-950 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Inventory, Discounts & COD Delivery Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audible Alert Settings: Order Beep Alert (ON/OFF) Toggle */}
            <button
              type="button"
              id="admin-header-beep-toggle-btn"
              onClick={toggleBeepAlert}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer ${
                isBeepAlertEnabled
                  ? 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border-emerald-500/50 shadow-xs'
                  : 'bg-rose-950/50 hover:bg-rose-950/70 text-rose-300 border-rose-800/60'
              }`}
              title={
                isBeepAlertEnabled
                  ? 'Order Beep Alert is ON - Audible chime will play on new orders (Click to Mute)'
                  : 'Order Beep Alert is OFF - Audio is muted (Click to Enable Beep Alert)'
              }
            >
              {isBeepAlertEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Order Beep Alert: ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span>Order Beep Alert: OFF</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="admin-header-sync-wholesale-btn"
              onClick={() => {
                const merged = mergeAndInjectWholesaleCatalog();
                setCatalogSyncNotice(`📦 105 Wholesale Catalog items synced and active in store! Total products: ${merged.length}`);
                setTimeout(() => setCatalogSyncNotice(null), 6000);
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors cursor-pointer"
              title="Merge and sync the complete 105-item wholesale FMCG catalog with brand pack-shots"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Sync 105 Wholesale</span>
            </button>

            <button
              type="button"
              id="admin-header-quick-backup-btn"
              onClick={() => {
                const { filename, backup } = downloadStoreBackup();
                setCatalogSyncNotice(`📥 Backup "${filename}" downloaded (${backup.stats.productsCount} products, ${backup.stats.categoriesCount} categories)`);
                setTimeout(() => setCatalogSyncNotice(null), 5000);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold border border-emerald-700 transition-colors cursor-pointer"
              title="1-Tap Instant JSON Catalog Backup"
            >
              <Download className="w-3.5 h-3.5 text-emerald-300" />
              <span>📥 Backup (.json)</span>
            </button>

            <button
              onClick={onExitAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
              title="Return to customer shop"
            >
              <span>Back to Storefront</span>
            </button>

            <button
              onClick={onLogoutAdmin || onExitAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900 text-rose-200 text-xs font-bold border border-rose-800 transition-colors cursor-pointer active:scale-95"
              title="Lock Admin Panel & Sign Out"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-2 border-t border-stone-800 pt-2 pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
              activeTab === 'inventory'
                ? 'bg-stone-100 text-stone-900 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 text-amber-600" />
            <span>Product Inventory ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-bold transition-colors relative ${
              activeTab === 'orders'
                ? 'bg-stone-100 text-stone-900 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <span>Incoming COD Orders ({liveOrders.length})</span>
            {liveOrders.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('parchi_orders')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-bold transition-colors relative cursor-pointer ${
              activeTab === 'parchi_orders'
                ? 'bg-stone-100 text-stone-900 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>📸 Parchi Orders ({parchiOrders.length})</span>
            {parchiOrders.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('offers_settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
              activeTab === 'offers_settings'
                ? 'bg-stone-100 text-stone-900 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>🎨 Banners, Offers & Store Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
              activeTab === 'categories'
                ? 'bg-stone-100 text-stone-900 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-4 h-4 text-emerald-400" />
            <span>Categories ({customCategories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
              activeTab === 'settings'
                ? 'bg-stone-100 text-stone-900 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Store Settings & Data</span>
          </button>
        </div>
      </header>

      {/* Admin Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
        {/* Real-time Order Alert Notification Banner */}
        {newOrderAlert && (
          <div className="mb-5 bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-700 text-white p-4 rounded-2xl shadow-xl border-2 border-white/40 flex items-center justify-between gap-3 animate-bounce">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-emerald-800 flex items-center justify-center font-black text-xl shadow-xs">
                🔔
              </div>
              <div>
                <div className="font-heading font-black text-sm sm:text-base flex items-center gap-2">
                  <span>नया आर्डर प्राप्त हुआ! (#{newOrderAlert.id})</span>
                  <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded-full font-bold">
                    {newOrderAlert.type === 'voice'
                      ? '🎙️ वॉइस नोट आर्डर'
                      : newOrderAlert.type === 'parchi'
                      ? '📸 पर्ची फोटो आर्डर'
                      : '🛒 सामान्य कार्ट आर्डर'}
                  </span>
                </div>
                <p className="text-xs text-white/95 font-medium mt-0.5">
                  ग्राहक: <span className="font-bold">{newOrderAlert.customerName}</span> • समय: {newOrderAlert.time}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (newOrderAlert.type === 'parchi') {
                    setActiveTab('parchi_orders');
                  } else {
                    setActiveTab('orders');
                  }
                  setNewOrderAlert(null);
                }}
                className="px-3.5 py-2 bg-white text-stone-900 rounded-xl font-heading font-black text-xs hover:bg-stone-100 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              >
                अभी देखें (View)
              </button>
              <button
                type="button"
                onClick={() => setNewOrderAlert(null)}
                className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 1: PRODUCT INVENTORY ================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            {/* Catalog Sync Feedback Banner */}
            {catalogSyncNotice && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-4 flex items-center justify-between shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2.5 text-xs font-semibold">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>{catalogSyncNotice}</span>
                </div>
                <button
                  onClick={() => setCatalogSyncNotice(null)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Sleek Floating / Top Admin Visual Toolbar */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs space-y-3.5">
              {/* Top Row: Visual Mode Status, View Mode Switcher, and Main Action Buttons */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <div>
                    <h3 className="font-heading font-extrabold text-stone-900 text-sm sm:text-base leading-tight">
                      Viewing as Store Admin (Live Visual Edit Active)
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      WYSIWYG on-card editing • Tap any photo, title, or price directly on the card to edit
                    </p>
                  </div>
                </div>

                {/* View Switcher & Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setInventoryLayoutMode('visual')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        inventoryLayoutMode === 'visual'
                          ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                      title="Customer-matching 2-column card grid with direct on-card editing"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Live Visual Grid</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInventoryLayoutMode('table')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        inventoryLayoutMode === 'table'
                          ? 'bg-white text-stone-900 shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                      title="Spreadsheet-style data table"
                    >
                      <List className="w-3.5 h-3.5 text-stone-500" />
                      <span>Classic Table</span>
                    </button>
                  </div>

                  {/* Download Inventory as Excel (CSV) */}
                  <button
                    type="button"
                    id="admin-export-inventory-csv-btn"
                    onClick={handleDownloadInventoryCsv}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-300 text-xs font-heading font-extrabold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    title="Export entire grocery inventory to Excel CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Download Excel (CSV)</span>
                  </button>

                  {/* Upload Inventory from Excel (CSV) */}
                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleUploadInventoryCsv}
                  />
                  <button
                    type="button"
                    id="admin-upload-inventory-csv-btn"
                    onClick={() => csvFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-800 border border-blue-300 text-xs font-heading font-extrabold shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                    title="Upload CSV spreadsheet to bulk update or add grocery products"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-700" />
                    <span>Upload Excel (CSV)</span>
                  </button>

                  {/* Download Sample CSV Template */}
                  <button
                    type="button"
                    id="admin-sample-inventory-csv-btn"
                    onClick={handleDownloadSampleCsvTemplate}
                    className="flex items-center gap-1 text-[11px] font-bold text-stone-600 hover:text-stone-900 underline cursor-pointer px-2 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                    title="Download sample format with example columns and rows"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                    <span>Download Sample CSV Template</span>
                  </button>

                  {/* Manual Add Item */}
                  <button
                    id="admin-add-product-btn"
                    onClick={handleOpenAdd}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-heading font-extrabold shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New Grocery Item</span>
                  </button>

                  {/* Exit Admin */}
                  <button
                    onClick={onExitAdmin}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer border border-stone-200"
                    title="Exit Admin and return to customer storefront"
                  >
                    <LogOut className="w-3.5 h-3.5 text-stone-500" />
                    <span className="hidden sm:inline">Exit</span>
                  </button>
                </div>
              </div>

              {/* Sticky Category Quick Filter Pills & 1-Second Search Bar */}
              <div className="sticky top-[58px] z-30 bg-white/95 backdrop-blur-md shadow-sm border border-stone-200/90 rounded-2xl p-3 space-y-2.5">
                {/* Category Quick Filter Pills Row (Sabji, Atta/Dal, Tel, Masala, Snacks, Dairy) */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-black text-stone-500 uppercase tracking-wider flex items-center gap-1 flex-shrink-0 mr-1">
                    <Filter className="w-3 h-3 text-amber-600" />
                    Categories:
                  </span>
                  {[
                    { id: 'All', label: 'All Items' },
                    { id: 'Sabji', label: '🥦 Sabji' },
                    { id: 'Atta/Dal', label: '🌾 Atta/Dal' },
                    { id: 'Tel', label: '🛢️ Tel' },
                    { id: 'Masala', label: '🌶️ Masala' },
                    { id: 'Snacks', label: '🍪 Snacks' },
                    { id: 'Dairy', label: '🥛 Dairy' },
                    { id: 'Tea, Coffee & Drinks', label: '☕ Drinks' },
                    { id: 'Household Essentials', label: '🧼 Household' },
                    { id: 'Personal Care', label: '🧴 Personal' },
                  ].map((pill) => {
                    const isSelected = selectedCategory === pill.id;
                    const count =
                      pill.id === 'All'
                        ? products.length
                        : pill.id === 'Sabji'
                        ? products.filter(
                            (p) =>
                              p.category.toLowerCase().includes('sabji') ||
                              p.category.toLowerCase().includes('fresh') ||
                              p.category.toLowerCase().includes('fruit') ||
                              p.category.toLowerCase().includes('veg')
                          ).length
                        : pill.id === 'Atta/Dal'
                        ? products.filter((p) => p.category === 'Atta & Flours' || p.category === 'Rice & Dal').length
                        : pill.id === 'Tel'
                        ? products.filter((p) => p.category === 'Oil & Ghee').length
                        : pill.id === 'Masala'
                        ? products.filter((p) => p.category === 'Spices & Salt').length
                        : pill.id === 'Snacks'
                        ? products.filter((p) => p.category === 'Snacks & Biscuits').length
                        : pill.id === 'Dairy'
                        ? products.filter((p) => p.category === 'Dairy & Bakery').length
                        : products.filter((p) => p.category === pill.id).length;

                    return (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => setSelectedCategory(pill.id)}
                        className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 active:scale-95 ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-xs font-black'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200/80'
                        }`}
                      >
                        <span>{pill.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* 1-Second Fast Search & Item Count */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-stone-100">
                  {/* Search with Clear */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Quick search any item in 1 second (English / हिंदी)..."
                      className="w-full pl-9 pr-8 py-2 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-medium"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Status Indicator & Count */}
                  <div className="flex items-center gap-3 text-xs text-stone-500 justify-between sm:justify-end">
                    <span>
                      Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> grocery items in store
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      162+ Products Catalog
                    </span>
                  </div>
                </div>
              </div>

              {/* Educational WYSIWYG Hint Bar */}
              {inventoryLayoutMode === 'visual' && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2 text-[11px] text-amber-900 flex items-center gap-2 flex-wrap">
                  <span className="font-bold flex items-center gap-1 text-amber-800 flex-shrink-0">
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    Live WYSIWYG Tips:
                  </span>
                  <span className="text-amber-800">
                    📷 Tap photo to replace with Camera/Gallery • ✏️ Tap Title / Hindi to edit • 💰 Tap Price/MRP to edit • ⚖️ Click Variant chips to edit variant prices • 🟢 1-Tap In/Out of Stock Toggle.
                  </span>
                </div>
              )}
            </div>

            {/* ================= INVENTORY VIEW MODE 1: LIVE VISUAL GRID (DEFAULT) ================= */}
            {inventoryLayoutMode === 'visual' && (
              <div>
                {products.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-stone-200 p-10 sm:p-14 text-center shadow-xs max-w-lg mx-auto my-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-2xs">
                      <Package className="w-8 h-8" />
                    </div>
                    <h4 className="font-heading font-extrabold text-stone-900 text-lg sm:text-xl">
                      Inventory is Clean & Empty
                    </h4>
                    <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto mt-2 leading-relaxed">
                      All previous dummy or scanned products have been wiped. Click below to add your genuine store products manually.
                    </p>
                    <button
                      onClick={handleOpenAdd}
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-sm font-heading font-bold shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                      <span>+ Add New Grocery Item</span>
                    </button>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
                    <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                    <h4 className="font-heading font-bold text-stone-800 text-base">No grocery items found</h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                      No items matched &quot;{searchQuery}&quot; under &quot;{selectedCategory}&quot;.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All');
                        }}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Clear Search & Category
                      </button>
                      <button
                        onClick={handleOpenAdd}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        + Add New Product
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4 pb-16">
                    {filteredProducts.map((product) => (
                      <AdminVisualProductCard
                        key={product.id}
                        product={product}
                        onUpdateProduct={onUpdateProduct}
                        onRequestDelete={(id) => setDeleteConfirmId(id)}
                        onOpenEditModal={handleOpenEdit}
                        deliveryTime={storeSettings.deliveryTime || 'Bharosemand Delivery'}
                      />
                    ))}
                  </div>
                )}

                {/* Floating Bottom Quick Action Bar for Smooth Admin Navigation */}
                <aside
                  aria-label="Admin visual floating bar"
                  className="fixed bottom-4 left-0 right-0 z-40 px-4 flex justify-center pointer-events-none"
                >
                  <div className="w-full max-w-xl bg-stone-900/95 backdrop-blur-md text-white rounded-2xl p-2.5 sm:p-3 shadow-2xl border border-stone-800 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-2 pl-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-stone-200 truncate">
                        Store Admin Active • {filteredProducts.length} Items
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleOpenAdd}
                        className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-heading font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button>
                      <button
                        onClick={onExitAdmin}
                        className="py-1.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs rounded-xl border border-stone-700 flex items-center gap-1 transition-all cursor-pointer"
                        title="Return to customer storefront"
                      >
                        <LogOut className="w-3.5 h-3.5 text-amber-400" />
                        <span>Exit</span>
                      </button>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* ================= INVENTORY VIEW MODE 2: CLASSIC TABLE ================= */}
            {inventoryLayoutMode === 'table' && (
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Item & Variants</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Pack Size</th>
                      <th className="py-3 px-3">MRP (Tap to Edit)</th>
                      <th className="py-3 px-3">Discount</th>
                      <th className="py-3 px-3">Customer Price</th>
                      <th className="py-3 px-3">Stock Qty</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-stone-400">
                          <Package className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                          <p className="font-semibold text-stone-600">No grocery items in store</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            Showing 0 of 0 grocery items in store. Tap &quot;+ Add New Grocery Item&quot; to begin adding your store catalog.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => {
                        const savings = product.originalPrice - product.finalPrice;
                        const hasVariants = Boolean(product.variants && product.variants.length > 0);
                        const isExpanded = Boolean(expandedProductVariants[product.id]);
                        const stockCount = product.stock !== undefined ? product.stock : 50;

                        return (
                          <React.Fragment key={product.id}>
                            <tr className="hover:bg-amber-50/30 transition-colors group">
                              {/* Item Thumbnail & Bilingual Name */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-stone-50 border border-stone-200 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    <img
                                      src={product.imageUrl || getCategoryFallbackSvg(product.category, product.name)}
                                      alt={product.name}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = getCategoryFallbackSvg(
                                          product.category,
                                          product.name
                                        );
                                      }}
                                      className="w-full h-full object-contain mix-blend-multiply"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-semibold text-stone-900 block line-clamp-1 max-w-xs">
                                      {product.name}
                                    </span>
                                    {product.hindiName && (
                                      <span className="text-[11px] text-stone-500 font-medium block line-clamp-1">
                                        {product.hindiName}
                                      </span>
                                    )}
                                    {hasVariants && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedProductVariants((prev) => ({
                                            ...prev,
                                            [product.id]: !prev[product.id],
                                          }))
                                        }
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded mt-0.5 border border-amber-200 cursor-pointer"
                                      >
                                        <Box className="w-2.5 h-2.5" />
                                        <span>{product.variants!.length} Variants</span>
                                        <ChevronDown
                                          className={`w-3 h-3 transition-transform ${
                                            isExpanded ? 'rotate-180' : ''
                                          }`}
                                        />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3 px-3">
                                <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap">
                                  {product.category}
                                </span>
                              </td>

                              {/* Unit / Pack size */}
                              <td className="py-3 px-3 font-medium text-stone-700 whitespace-nowrap">
                                {product.unit}
                              </td>

                              {/* In-line Fast Edit: Original MRP */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {inlineEdit?.id === product.id &&
                                inlineEdit.field === 'originalPrice' &&
                                !inlineEdit.variantId ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-stone-400 text-xs">₹</span>
                                    <input
                                      type="number"
                                      autoFocus
                                      value={inlineEdit.value}
                                      onChange={(e) =>
                                        setInlineEdit({ ...inlineEdit, value: e.target.value })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCommitInlineEdit();
                                        if (e.key === 'Escape') setInlineEdit(null);
                                      }}
                                      onBlur={handleCommitInlineEdit}
                                      className="w-16 px-1.5 py-0.5 border border-amber-500 rounded bg-white text-xs font-semibold text-stone-900 focus:outline-none"
                                    />
                                    <button
                                      onMouseDown={handleCommitInlineEdit}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInlineEdit({
                                        id: product.id,
                                        field: 'originalPrice',
                                        value: String(product.originalPrice),
                                      })
                                    }
                                    className="group/mrp inline-flex items-center gap-1 text-stone-500 line-through hover:text-stone-900 hover:no-underline cursor-pointer px-1.5 py-0.5 rounded hover:bg-stone-100"
                                    title="Click to edit MRP"
                                  >
                                    <span>₹{product.originalPrice}</span>
                                    <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/mrp:opacity-100 text-stone-400" />
                                  </button>
                                )}
                              </td>

                              {/* Discount % */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {product.discountPercent > 0 ? (
                                  <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[11px]">
                                    <Sparkles className="w-3 h-3 text-emerald-600" />
                                    {product.discountPercent}% OFF
                                  </span>
                                ) : (
                                  <span className="text-stone-400 font-medium">0%</span>
                                )}
                              </td>

                              {/* In-line Fast Edit: Final Customer Price */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {inlineEdit?.id === product.id &&
                                inlineEdit.field === 'finalPrice' &&
                                !inlineEdit.variantId ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-stone-400 text-xs">₹</span>
                                    <input
                                      type="number"
                                      autoFocus
                                      value={inlineEdit.value}
                                      onChange={(e) =>
                                        setInlineEdit({ ...inlineEdit, value: e.target.value })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCommitInlineEdit();
                                        if (e.key === 'Escape') setInlineEdit(null);
                                      }}
                                      onBlur={handleCommitInlineEdit}
                                      className="w-16 px-1.5 py-0.5 border border-emerald-500 rounded bg-white text-xs font-bold text-emerald-700 focus:outline-none"
                                    />
                                    <button
                                      onMouseDown={handleCommitInlineEdit}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInlineEdit({
                                        id: product.id,
                                        field: 'finalPrice',
                                        value: String(product.finalPrice),
                                      })
                                    }
                                    className="group/price text-left cursor-pointer px-1.5 py-0.5 rounded hover:bg-emerald-50"
                                    title="Click to edit selling price"
                                  >
                                    <div className="flex items-center gap-1">
                                      <span className="font-heading font-extrabold text-stone-900 text-sm group-hover/price:text-emerald-700">
                                        ₹{product.finalPrice}
                                      </span>
                                      <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/price:opacity-100 text-emerald-600" />
                                    </div>
                                    {savings > 0 && (
                                      <span className="text-[10px] text-emerald-600 font-semibold block">
                                        Save ₹{savings}
                                      </span>
                                    )}
                                  </button>
                                )}
                              </td>

                              {/* In-Line Fast Edit: Stock with Stepper (+/-) */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {inlineEdit?.id === product.id &&
                                inlineEdit.field === 'stock' &&
                                !inlineEdit.variantId ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      autoFocus
                                      value={inlineEdit.value}
                                      onChange={(e) =>
                                        setInlineEdit({ ...inlineEdit, value: e.target.value })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCommitInlineEdit();
                                        if (e.key === 'Escape') setInlineEdit(null);
                                      }}
                                      onBlur={handleCommitInlineEdit}
                                      className="w-14 px-1.5 py-0.5 border border-stone-300 rounded bg-white text-xs font-bold text-stone-800 focus:outline-none"
                                    />
                                    <button
                                      onMouseDown={handleCommitInlineEdit}
                                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStockStep(product, -5)}
                                      className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                                      title="Decrease stock by 5"
                                    >
                                      -
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setInlineEdit({
                                          id: product.id,
                                          field: 'stock',
                                          value: String(stockCount),
                                        })
                                      }
                                      className={`px-2 py-0.5 rounded font-semibold text-xs border cursor-pointer transition-colors ${
                                        stockCount <= 5
                                          ? 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold flex items-center gap-1'
                                          : 'bg-stone-50 hover:bg-amber-50 text-stone-800 border-stone-200'
                                      }`}
                                      title="Tap to edit exact stock"
                                    >
                                      {stockCount <= 5 && <AlertTriangle className="w-2.5 h-2.5 text-rose-600 animate-pulse" />}
                                      <span>{stockCount}</span>
                                      {stockCount <= 5 && <span className="text-[9px] uppercase font-bold text-rose-700">(Low)</span>}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStockStep(product, 5)}
                                      className="w-5 h-5 rounded bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                                      title="Increase stock by 5"
                                    >
                                      +
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Instant Status 1-Click Toggle (Prominent Green/Red Switch) */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateProduct(product.id, {
                                      isAvailable: !product.isAvailable,
                                    })
                                  }
                                  className={`h-7 px-2.5 rounded-full text-[10px] font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs border ${
                                    product.isAvailable
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-500/20'
                                      : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 ring-2 ring-rose-500/20'
                                  }`}
                                  title="1-click toggle between In Stock and Out of Stock"
                                >
                                  <span
                                    className={`w-6 h-3.5 rounded-full flex items-center p-0.5 ${
                                      product.isAvailable ? 'bg-emerald-800 justify-end' : 'bg-rose-800 justify-start'
                                    }`}
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
                                  </span>
                                  <span className="whitespace-nowrap">
                                    {product.isAvailable ? 'In Stock' : 'Out of Stock'}
                                  </span>
                                </button>
                              </td>

                              {/* Actions: Edit Modal & Delete */}
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEdit(product)}
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-800 transition-colors cursor-pointer"
                                    title="Open full product editor"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(product.id)}
                                    className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-800 transition-colors cursor-pointer"
                                    title="Delete product"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expandable Weight Variants Drawer */}
                            {hasVariants && isExpanded && (
                              <tr className="bg-amber-50/20 border-b border-amber-100">
                                <td colSpan={9} className="p-3 pl-16">
                                  <div className="bg-white rounded-xl border border-stone-200 p-3 shadow-2xs space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                                        Weight Variants for {product.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEdit(product)}
                                        className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold underline cursor-pointer"
                                      >
                                        Configure in Modal
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {product.variants!.map((variant) => {
                                        const vSavings = variant.mrp - variant.price;
                                        return (
                                          <div
                                            key={variant.id}
                                            className="p-2.5 rounded-lg border border-stone-200 bg-stone-50/60 flex items-center justify-between text-xs gap-2"
                                          >
                                            <div>
                                              <span className="font-bold text-stone-800 block">
                                                {variant.weight_unit}
                                              </span>
                                              <div className="flex items-center gap-1.5 text-[11px]">
                                                <span className="text-stone-400 line-through">
                                                  ₹{variant.mrp}
                                                </span>
                                                <span className="font-bold text-emerald-700">
                                                  ₹{variant.price}
                                                </span>
                                                {vSavings > 0 && (
                                                  <span className="text-[10px] text-emerald-600">
                                                    (Save ₹{vSavings})
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-[10px] text-stone-500 block">
                                                Stock
                                              </span>
                                              <span className="font-semibold text-stone-800 text-[11px] bg-white px-1.5 py-0.5 rounded border border-stone-200 inline-block">
                                                {variant.stock !== undefined ? variant.stock : 50} pcs
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-stone-50 border-t border-stone-200 text-xs text-stone-500 text-center font-medium">
                Showing {filteredProducts.length} of {products.length} grocery items in store
              </div>
            </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: INCOMING COD ORDERS ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-bold text-stone-900 text-base">
                  Incoming Cash on Delivery (COD) Orders
                </h3>
                <p className="text-xs text-stone-500">
                  Customer orders placed through checkout appear here in real-time.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-200">
                  {liveOrders.length} Total Orders
                </span>

                {/* Bulk Clear Completed / Cancelled Orders */}
                <button
                  type="button"
                  onClick={() => setClearOrdersConfirm('completed')}
                  disabled={!liveOrders.some((o) => {
                    const s = (o.status || '').toLowerCase();
                    return s === 'delivered' || s === 'cancelled';
                  })}
                  className="px-3 py-1.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Clear all Delivered and Cancelled orders from list"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Clear Completed</span>
                </button>

                {/* Bulk Clear All Orders */}
                <button
                  type="button"
                  onClick={() => setClearOrdersConfirm('all')}
                  disabled={liveOrders.length === 0}
                  className="px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Delete all order history permanently"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete All History</span>
                </button>
              </div>
            </div>

            {liveOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200/90 p-12 text-center shadow-xs">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                <h4 className="font-heading font-bold text-stone-800 text-base">No orders yet</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  When a customer adds items to cart and submits their Name, Phone & Address, the order will appear here immediately for packing and delivery.
                </p>
                <button
                  onClick={onExitAdmin}
                  className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Place a Test Order as Customer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    {/* Card Header */}
                    <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-extrabold text-stone-900 text-sm">
                          #{order.id}
                        </span>
                        <span className="text-[10px] text-stone-500">{order.createdAt}</span>
                      </div>

                      {/* Status Selector */}
                      <select
                        value={order.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as OrderStatus;
                          onUpdateOrderStatus(order.id, newStatus);
                          updateCentralOrderStatus(order.id, newStatus).catch(console.warn);
                          setLiveOrders((prev) =>
                            prev.map((o) => (o.id === order.id ? { ...o, status: newStatus, statusLabel: newStatus } : o))
                          );
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                          order.status === 'received' || order.status === 'New Order'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : order.status === 'processing' || order.status === 'Packed'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : order.status === 'out_for_delivery' || order.status === 'Out for Delivery'
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : order.status === 'delivered' || order.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-stone-100 text-stone-600 border-stone-300'
                        }`}
                      >
                        <option value="received">● Order Received</option>
                        <option value="processing">● Processing & Packed</option>
                        <option value="out_for_delivery">● Out for Delivery</option>
                        <option value="delivered">● Delivered (Cash Collected)</option>
                        <option value="cancelled">● Cancelled</option>
                      </select>
                    </div>

                    {/* Customer & Address Details */}
                    <div className="p-4 space-y-3 flex-1 text-xs">
                      {/* Delivery Slot Banner */}
                      <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 rounded-xl px-2.5 py-1.5 text-[11px]">
                        <span className="font-semibold text-amber-900 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" /> Slot:
                        </span>
                        <span className="font-bold text-amber-950">
                          {order.deliverySlot || 'Instant Delivery (30-45 mins)'}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-stone-900 text-sm block">
                            {order.customerName}
                          </span>
                          <a
                            href={`tel:${order.phone}`}
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold mt-0.5"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{order.phone}</span>
                          </a>
                        </div>

                        {/* Amount Due to Collect in Cash */}
                        <div className="text-right">
                          <span className="text-[10px] text-stone-400 block uppercase">
                            COD to Collect
                          </span>
                          <span className="font-heading font-extrabold text-base text-stone-900">
                            ₹{order.finalPayableAmount}
                          </span>
                        </div>
                      </div>

                      {/* Quick Status Advance Workflow Buttons */}
                      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1">
                        <button
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'received');
                            updateCentralOrderStatus(order.id, 'received').catch(console.warn);
                            setLiveOrders((prev) =>
                              prev.map((o) => (o.id === order.id ? { ...o, status: 'received', statusLabel: 'Pending Confirmation' } : o))
                            );
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            order.status === 'received' || order.status === 'New Order'
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          Received
                        </button>
                        <button
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'processing');
                            updateCentralOrderStatus(order.id, 'processing').catch(console.warn);
                            setLiveOrders((prev) =>
                              prev.map((o) => (o.id === order.id ? { ...o, status: 'processing', statusLabel: 'Packed' } : o))
                            );
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            order.status === 'processing' || order.status === 'Packed'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          Packed
                        </button>
                        <button
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'out_for_delivery');
                            updateCentralOrderStatus(order.id, 'out_for_delivery').catch(console.warn);
                            setLiveOrders((prev) =>
                              prev.map((o) => (o.id === order.id ? { ...o, status: 'out_for_delivery', statusLabel: 'Out for Delivery' } : o))
                            );
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            order.status === 'out_for_delivery' || order.status === 'Out for Delivery'
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          Out for Delivery
                        </button>
                        <button
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'delivered');
                            updateCentralOrderStatus(order.id, 'delivered').catch(console.warn);
                            setLiveOrders((prev) =>
                              prev.map((o) => (o.id === order.id ? { ...o, status: 'delivered', statusLabel: 'Delivered' } : o))
                            );
                          }}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            order.status === 'delivered' || order.status === 'Delivered'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          Delivered ✓
                        </button>
                      </div>

                      {/* Address */}
                      <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-200/80 flex items-start gap-1.5 text-stone-700">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2 leading-relaxed">{order.address}</span>
                      </div>

                      {/* Handwritten Parchi / Ration Slip Photo Preview (if uploaded) */}
                      {Boolean(order.slipPhoto || order.slipImageUrl || order.parchiImageUrl) && (
                        <div className="bg-amber-50/80 rounded-xl p-2.5 border border-amber-300/80 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-950 text-[11px] flex items-center gap-1">
                              <Camera className="w-3.5 h-3.5 text-amber-700" />
                              <span>Handwritten Parchi / Slip Photo</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingParchiImage((order.slipPhoto || order.slipImageUrl || order.parchiImageUrl)!)}
                                className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                              >
                                View Full Image ↗
                              </button>
                              <a
                                href={order.slipPhoto || order.slipImageUrl || order.parchiImageUrl}
                                download={`slip-${order.id}.jpg`}
                                className="text-[10px] font-bold text-stone-800 hover:text-stone-950 underline cursor-pointer flex items-center gap-0.5"
                                title="Download Slip"
                              >
                                <Download className="w-3 h-3 inline text-amber-600" />
                                <span>Download Slip</span>
                              </a>
                            </div>
                          </div>
                          <div
                            className="relative rounded-lg overflow-hidden border border-amber-200 bg-white cursor-pointer group"
                            onClick={() => setViewingParchiImage((order.slipPhoto || order.slipImageUrl || order.parchiImageUrl)!)}
                          >
                            <img
                              src={order.slipPhoto || order.slipImageUrl || order.parchiImageUrl}
                              alt="Customer Ration Slip"
                              className="w-full h-36 object-contain bg-stone-100 group-hover:scale-101 transition-transform"
                            />
                          </div>
                        </div>
                      )}

                      {/* Customer Recorded Voice Note Audio Player */}
                      {Boolean(order.voiceAudio || order.voiceAudioUrl || order.voiceNoteBase64) && (!order.items || order.items.length === 0) ? (
                        <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-emerald-50 rounded-2xl p-3.5 border-2 border-amber-400 space-y-2 shadow-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center animate-pulse flex-shrink-0">
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-heading font-black text-amber-950 text-xs sm:text-sm block">
                                🎙️ वॉइस रिकॉर्डिंग ऑर्डर (ऑडियो सुनकर सामान पैक करें)
                              </span>
                              <span className="text-[10px] text-stone-600 font-bold">
                                ग्राहक ने बोलकर सामान रिकॉर्ड किया है — नीचे प्ले बटन दबाकर सुनें
                              </span>
                            </div>
                          </div>
                          <audio
                            controls
                            src={order.voiceAudio || order.voiceAudioUrl || order.voiceNoteBase64}
                            preload="metadata"
                            className="w-full mt-2"
                          />
                        </div>
                      ) : (
                        Boolean(order.voiceAudio || order.voiceAudioUrl || order.voiceNoteBase64) && (
                          <div className="bg-amber-50/90 rounded-2xl p-3 border border-amber-300 space-y-1 shadow-2xs">
                            <span className="font-heading font-black text-amber-950 text-xs flex items-center gap-1.5">
                              <Volume2 className="w-4 h-4 text-emerald-700" />
                              <span>🎧 Customer Voice Note (Suniye)</span>
                            </span>
                            <audio
                              controls
                              src={order.voiceAudio || order.voiceAudioUrl || order.voiceNoteBase64}
                              preload="metadata"
                              className="w-full mt-2"
                            />
                          </div>
                        )
                      )}

                      {/* Ordered Items summary list */}
                      <div>
                        <span className="font-bold text-stone-500 uppercase text-[10px] block mb-1">
                          Items ({order.itemsCount || (order.items?.length ?? 0)})
                        </span>
                        {(!order.items || order.items.length === 0) ? (
                          order.voiceNoteBase64 ? (
                            <div className="bg-stone-50 p-2.5 rounded-xl border border-dashed border-stone-300 text-stone-600 text-xs font-semibold flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                              <span>ऑडियो सुनकर सामान तैयार करें (लिस्ट ऊपर दी गई रिकॉर्डिंग में है)</span>
                            </div>
                          ) : (
                            <div className="text-stone-400 text-xs italic">No items specified</div>
                          )
                        ) : (
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-stone-700 text-xs py-0.5"
                              >
                                <span className="line-clamp-1 pr-2">
                                  {item.name} ({item.unit})
                                </span>
                                <span className="font-semibold text-stone-900 whitespace-nowrap">
                                  {item.quantity} × ₹{item.price} = ₹{item.total}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions: Central Server Live Actions & Utilities */}
                    <div className="bg-stone-50 px-4 py-3 border-t border-stone-200 flex flex-col gap-2.5">
                      {/* Priority 1 Action Buttons (Accept Order, Mark Delivered, Direct Call Customer) */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Accept Order */}
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'processing');
                            updateCentralOrderStatus(order.id, 'processing');
                            setLiveOrders((prev) =>
                              prev.map((o) => (o.id === order.id ? { ...o, status: 'processing', statusLabel: 'Packed' } : o))
                            );
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ${
                            order.status === 'processing' || order.status === 'Packed'
                              ? 'bg-blue-700 text-white ring-2 ring-blue-300'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          title="Accept customer order and mark as Packing"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Accept Order</span>
                        </button>

                        {/* 2. Mark Delivered */}
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateOrderStatus(order.id, 'delivered');
                            updateCentralOrderStatus(order.id, 'delivered');
                            setLiveOrders((prev) =>
                              prev.map((o) => (o.id === order.id ? { ...o, status: 'delivered', statusLabel: 'Delivered' } : o))
                            );
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer ${
                            order.status === 'delivered' || order.status === 'Delivered'
                              ? 'bg-emerald-800 text-white ring-2 ring-emerald-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title="Mark order as Delivered and Cash Collected"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Delivered</span>
                        </button>

                        {/* 3. Direct Call Customer */}
                        <a
                          href={`tel:${order.phone}`}
                          className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer"
                          title="Direct call customer phone number"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>📞 Call Customer</span>
                        </a>
                      </div>

                      {/* Secondary utilities (Print Slip, WhatsApp Bill, Copy Bill, Delete) */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/80">
                        <div className="flex items-center gap-2">
                          {/* Full Itemized WhatsApp Bill */}
                          <a
                            href={getWhatsAppBillUrl(order, storeSettings)}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs active:scale-95 cursor-pointer"
                            title="Open WhatsApp with full itemized grocery bill"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp Bill</span>
                          </a>

                          {/* Copy Bill text */}
                          <button
                            type="button"
                            onClick={() => handleCopyBillText(order)}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy full itemized bill text to clipboard"
                          >
                            {copiedOrderId === order.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-stone-500" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Print Slip */}
                          <button
                            type="button"
                            onClick={() => setPrintingOrder(order)}
                            className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
                            title="Print 58mm / 80mm thermal receipt delivery slip"
                          >
                            <Printer className="w-3 h-3 text-amber-400" />
                            <span>Print Slip</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Delete this order"
                        >
                          <Trash2 className="w-3 h-3 text-rose-600" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2.5: PARCHI ORDERS (CAMERA & HANDWRITTEN LISTS) ================= */}
        {activeTab === 'parchi_orders' && (
          <div className="space-y-4">
            {/* Header & Controls */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-black text-stone-900 text-base sm:text-lg">
                    📸 Customer Parchi & Handwritten Grocery Orders
                  </h2>
                  <span className="bg-amber-100 text-amber-900 text-xs font-black px-2.5 py-0.5 rounded-full">
                    {parchiOrders.length} Total
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  Customer dwara bheji gayi parchi ki photo aur voice notes yahan surakshit save hoti hain. Call karein, WhatsApp karein ya photo download karein.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={parchiSearchQuery}
                    onChange={(e) => setParchiSearchQuery(e.target.value)}
                    placeholder="Search by customer or phone..."
                    className="w-full pl-9 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const serverOrders = await fetchCentralOrders();
                    if (Array.isArray(serverOrders)) {
                      setLiveOrders(serverOrders);
                      setParchiOrders(deriveParchiOrders(serverOrders));
                    }
                  }}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
                  title="Refresh Parchi Orders from Central Server"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Parchi Orders Grid */}
            {(() => {
              const filteredParchi = parchiOrders.filter((p) => {
                if (!parchiSearchQuery.trim()) return true;
                const q = parchiSearchQuery.toLowerCase();
                return (
                  p.customerName?.toLowerCase().includes(q) ||
                  p.customerPhone?.toLowerCase().includes(q) ||
                  p.deliveryAddress?.toLowerCase().includes(q) ||
                  p.id?.toLowerCase().includes(q)
                );
              });

              if (filteredParchi.length === 0) {
                return (
                  <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-xs max-w-lg mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-7 h-7 text-amber-600" />
                    </div>
                    <h3 className="font-heading font-black text-stone-800 text-base">
                      Koi Parchi Order Nahi Mila
                    </h3>
                    <p className="text-stone-500 text-xs mt-1">
                      Jab bhi koi customer app se handwritten parchi upload karega ya voice note bhejega, wo turant yahan dikhega.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredParchi.map((parchi) => (
                    <div
                      key={parchi.id}
                      className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                    >
                      {/* Top Bar: ID, Date, Status Selector */}
                      <div className="bg-stone-50 px-3.5 py-2.5 border-b border-stone-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-heading font-black text-stone-900 text-xs">
                            #{parchi.id}
                          </span>
                          <span className="text-[10px] text-stone-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {parchi.createdAt}
                          </span>
                        </div>

                        {/* Quick Status Dropdown */}
                        <select
                          value={parchi.status || 'Pending'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            await updateCentralOrderStatus(parchi.id, newStatus as any);
                            setLiveOrders((prev) =>
                              prev.map((o) => (o.id === parchi.id ? { ...o, status: newStatus } : o))
                            );
                            setParchiOrders((prev) =>
                              prev.map((p) => (p.id === parchi.id ? { ...p, status: newStatus } : p))
                            );
                          }}
                          className={`text-[11px] font-black rounded-lg px-2 py-0.5 border cursor-pointer ${
                            parchi.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : parchi.status === 'Order Created' || parchi.status === 'Packed'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : parchi.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          <option value="Pending">⏳ Pending</option>
                          <option value="Pending Verification">⏳ Pending Verification</option>
                          <option value="Packed">📦 Packed</option>
                          <option value="Order Created">📦 Order Created</option>
                          <option value="Delivered">✅ Delivered</option>
                          <option value="Cancelled">❌ Cancelled</option>
                        </select>
                      </div>

                      {/* Customer Info Card */}
                      <div className="p-3.5 space-y-2 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-heading font-black text-stone-900 text-sm">
                              {parchi.customerName}
                            </div>
                            <div className="text-xs text-stone-600 font-semibold flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-stone-400" />
                              <span>{parchi.customerPhone}</span>
                            </div>
                          </div>

                          {/* Quick Call and WhatsApp Action buttons */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a
                              href={`tel:${parchi.customerPhone}`}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[11px] transition-colors flex items-center gap-1"
                              title="Call customer directly"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-700" />
                              <span>📞 Call Customer</span>
                            </a>
                            <a
                              href={`https://wa.me/91${parchi.customerPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                                `Namaste ${parchi.customerName}, Kiranape Express se aapka order #${parchi.id} prapt hua hai. Hum aapka rashan pack kar rahe hain.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] transition-colors flex items-center gap-1 shadow-2xs"
                              title="Message on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>💬 Chat on WhatsApp</span>
                            </a>
                          </div>
                        </div>

                        {/* Location and Address */}
                        <div className="bg-stone-50 p-2 rounded-xl border border-stone-200/70 text-[11px] space-y-1">
                          {parchi.deliveryLocation && (
                            <div className="font-bold text-amber-950 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                              <span>{parchi.deliveryLocation}</span>
                            </div>
                          )}
                          <div className="text-stone-700 leading-snug">
                            {parchi.deliveryAddress}
                          </div>
                          {parchi.notes && (
                            <div className="pt-1 mt-1 border-t border-stone-200/80 font-medium text-stone-800 whitespace-pre-line text-[11px] bg-amber-50/50 p-1.5 rounded-lg">
                              {parchi.notes}
                            </div>
                          )}
                          {Boolean(parchi.voiceAudio || parchi.voiceNoteBase64) && (!parchi.items || parchi.items.length === 0) && !parchi.slipPhoto && !parchi.imageBase64 && !parchi.imageUrl ? (
                            <div className="pt-1 mt-1 border-t border-stone-200/80 bg-gradient-to-r from-amber-100 via-amber-50 to-emerald-50 rounded-xl p-3 border border-amber-400 space-y-1.5">
                              <span className="font-heading font-black text-amber-950 text-xs flex items-center gap-1.5">
                                <Volume2 className="w-4 h-4 text-emerald-700 animate-bounce" />
                                <span>🎙️ वॉइस रिकॉर्डिंग ऑर्डर (ऑडियो सुनकर सामान पैक करें)</span>
                              </span>
                              <audio controls src={parchi.voiceAudio || parchi.voiceNoteBase64} preload="metadata" className="w-full mt-1.5" />
                            </div>
                          ) : (
                            Boolean(parchi.voiceAudio || parchi.voiceNoteBase64) && (
                              <div className="pt-1 mt-1 border-t border-stone-200/80">
                                <span className="font-heading font-black text-amber-950 text-[11px] flex items-center gap-1">
                                  <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>🎧 Customer Voice Note (Suniye)</span>
                                </span>
                                <audio controls src={parchi.voiceAudio || parchi.voiceNoteBase64} preload="metadata" className="w-full mt-2" />
                              </div>
                            )
                          )}
                        </div>

                        {/* Parchi Photo Section */}
                        {Boolean(parchi.slipPhoto || parchi.imageBase64 || parchi.imageUrl) ? (
                          <div className="space-y-1.5 pt-1">
                            <div
                              onClick={() => {
                                setZoomedParchi(parchi);
                                setZoomScale(1);
                              }}
                              className="relative rounded-xl overflow-hidden border border-amber-300/80 bg-stone-100 h-44 cursor-pointer group shadow-2xs"
                            >
                              <img
                                src={parchi.slipPhoto || parchi.imageBase64 || parchi.imageUrl}
                                alt={`Parchi #${parchi.id}`}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-stone-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <span className="bg-stone-950/80 text-white text-xs font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs flex items-center gap-1">
                                  <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                                  <span>🔍 Badi Photo Dekhein</span>
                                </span>
                              </div>
                            </div>

                            {/* Actions under image: Full Photo View & Download */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setZoomedParchi(parchi);
                                  setZoomScale(1);
                                }}
                                className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-extrabold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                              >
                                <ZoomIn className="w-3.5 h-3.5 text-amber-700" />
                                <span>🔍 Badi Photo Dekhein</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const imgSource = parchi.imageBase64 || parchi.imageUrl;
                                  if (!imgSource) return;
                                  const link = document.createElement('a');
                                  link.href = imgSource;
                                  link.download = `parchi_${parchi.id}_${(parchi.customerName || 'customer').replace(/\s+/g, '_')}.jpg`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="py-1.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                title="Download image to device"
                              >
                                <Download className="w-3.5 h-3.5 text-amber-400" />
                                <span>⬇️ Download Parchi</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-center text-amber-900 font-medium text-xs">
                            🎤 Voice-to-Note Grocery Order (Text format above)
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="bg-stone-50 px-3.5 py-2 border-t border-stone-200 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-stone-500">
                          Cash on Delivery (COD)
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`Delete parchi record #${parchi.id}?`)) {
                              await deleteOrderFromCentralServer(parchi.id);
                              onDeleteOrder(parchi.id);
                              setLiveOrders((prev) => prev.filter((o) => o.id !== parchi.id));
                              setParchiOrders((prev) => prev.filter((p) => p.id !== parchi.id));
                            }
                          }}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
                        >
                          Delete Record
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= TAB 3: DYNAMIC OFFERS, BANNERS & STORE RULES ================= */}
        {activeTab === 'offers_settings' && (
          <AdminOffersAndSettings
            storeSettings={storeSettings}
            banners={banners}
            onSaveSettings={onSaveSettings}
            onSaveBanners={onSaveBanners}
            categories={customCategories}
          />
        )}

        {/* ================= TAB 4: DYNAMIC CATEGORY MANAGER ================= */}
        {activeTab === 'categories' && (
          <AdminCategoryManager
            categories={customCategories}
            products={products}
            onAddCategory={handleCreateCategory}
            onUpdateCategory={handleUpdateCategoryItem}
            onDeleteCategory={handleDeleteCategoryItem}
          />
        )}

        {/* ================= TAB 4: STORE SETTINGS & DATA BACKUP ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* 1-Tap Offline Data Backup & Restore Engine */}
            <AdminBackupRestore
              products={products}
              categories={customCategories}
              storeSettings={storeSettings}
              banners={banners}
              onDataRestored={() => {
                setCustomCategories(getCustomCategories());
                setCatalogSyncNotice('Store data successfully restored from backup file!');
                setTimeout(() => setCatalogSyncNotice(null), 4000);
              }}
            />

            {/* Store Details, Timing & Promo Banners */}
            <AdminStoreSettings
              storeSettings={storeSettings}
              banners={banners}
              onSaveSettings={onSaveSettings}
              onSaveBanners={onSaveBanners}
              isFirebaseConnected={isFirebaseConnected}
            />

            {/* PIN Management */}
            <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-stone-900 text-base">
                    Change Owner Password / PIN
                  </h3>
                  <p className="text-xs text-stone-500">
                    Secret password for store owner access: <strong className="font-mono text-stone-800 bg-stone-100 px-2 py-0.5 rounded">{adminPin}</strong>
                  </p>
                </div>
              </div>

              {pinChangeSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Owner password updated successfully!
                </div>
              )}

              <form onSubmit={handleSavePin} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="text"
                  maxLength={16}
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  placeholder="Enter new password (e.g. @2508)"
                  className="px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-mono tracking-widest text-stone-900 focus:bg-white focus:ring-2 focus:ring-amber-500/30 flex-1"
                />
                <button
                  type="submit"
                  disabled={newPinInput.trim().length < 4}
                  className="py-2.5 px-5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-heading font-bold transition-all cursor-pointer flex-shrink-0"
                >
                  Save Password
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Admin Panel Footer & Creator Credits */}
      <footer className="mt-auto border-t border-stone-200/90 bg-white/80 py-6 px-4 pb-20 sm:pb-8">
        <CreatorCredits />
      </footer>

      {/* Product Add/Edit Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
        categories={customCategories}
      />

      {/* 58mm/80mm Thermal Order Slip Modal */}
      <PrintOrderSlipModal
        order={printingOrder}
        onClose={() => setPrintingOrder(null)}
        storeSettings={storeSettings}
      />

      {/* Delete Product Confirmation Alert */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="font-heading font-bold text-stone-900 text-base">
              Delete this item?
            </h4>
            <p className="text-xs text-stone-500">
              This product will be immediately removed from the customer catalog.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(deleteConfirmId)}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Order Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-stone-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-heading font-extrabold text-stone-900 text-base">
              Delete Order #{orderToDelete.id}?
            </h4>
            <p className="text-xs text-stone-600">
              Customer: <span className="font-bold text-stone-800">{orderToDelete.customerName}</span> ({orderToDelete.phone})
            </p>
            <p className="text-[11px] text-stone-500">
              This order will be permanently removed from your central database and store history.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeletingOrder}
                className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                disabled={isDeletingOrder}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                {isDeletingOrder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Clear Orders Confirmation Modal */}
      {clearOrdersConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-stone-200 text-center space-y-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                clearOrdersConfirm === 'all'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {clearOrdersConfirm === 'all' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle className="w-6 h-6" />
              )}
            </div>
            <h4 className="font-heading font-extrabold text-stone-900 text-base">
              {clearOrdersConfirm === 'all'
                ? 'Delete All Order History?'
                : 'Clear Completed & Cancelled Orders?'}
            </h4>
            <p className="text-xs text-stone-600">
              {clearOrdersConfirm === 'all'
                ? '⚠️ WARNING: This will permanently wipe all customer orders from the central database and disk storage. This cannot be undone.'
                : 'All orders with status "Delivered" or "Cancelled" will be removed. Active pending and in-transit orders will remain intact.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClearOrdersConfirm(null)}
                disabled={isClearingOrders}
                className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearOrders}
                disabled={isClearingOrders}
                className={`flex-1 py-2 px-3 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  clearOrdersConfirm === 'all'
                    ? 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
                    : 'bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50'
                }`}
              >
                {isClearingOrders ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <span>
                    {clearOrdersConfirm === 'all'
                      ? 'Yes, Delete All'
                      : 'Yes, Clear Completed'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Handwritten Parchi Lightbox Modal with Zoom & Download */}
      {(zoomedParchi || viewingParchiImage) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => {
            setZoomedParchi(null);
            setViewingParchiImage(null);
          }}
        >
          <div
            className="relative max-w-4xl w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-stone-700 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Title & Zoom/Download Controls */}
            <div className="bg-stone-950 text-white px-4 py-3 flex items-center justify-between border-b border-stone-800 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-heading font-black text-amber-400 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                  <Camera className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>
                    📸 {zoomedParchi ? `Parchi #${zoomedParchi.id}` : 'Customer Handwritten Parchi'}
                  </span>
                </span>
                {zoomedParchi && (
                  <span className="text-[11px] text-stone-300 hidden sm:inline truncate">
                    • {zoomedParchi.customerName} ({zoomedParchi.customerPhone})
                  </span>
                )}
              </div>

              {/* Action Buttons: Zoom Controls, Download & Close */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.min(3, s + 0.25))}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-white cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1)}
                  className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 cursor-pointer hidden xs:block"
                  title="Reset Zoom"
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const imgUrl = zoomedParchi?.imageBase64 || zoomedParchi?.imageUrl || viewingParchiImage;
                    if (!imgUrl) return;
                    const link = document.createElement('a');
                    link.href = imgUrl;
                    link.download = `parchi_${zoomedParchi ? zoomedParchi.id : 'photo'}.jpg`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  title="Download photo"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">⬇️ Download Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomedParchi(null);
                    setViewingParchiImage(null);
                  }}
                  className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable / Scalable Image Canvas */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-stone-950/80 min-h-[50vh]">
              <img
                src={zoomedParchi?.imageBase64 || zoomedParchi?.imageUrl || viewingParchiImage || ''}
                alt="Handwritten Parchi Full View"
                style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center' }}
                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-lg transition-transform duration-150"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
