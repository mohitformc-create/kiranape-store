import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Generous body limit for high-res audio voice notes and compressed Parchi photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==========================================
// CENTRAL SERVER ORDERS DATABASE (Blinkit/Zepto Style)
// ==========================================
const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'central_orders.json');
const SERVER_ORDERS_PATH = path.join(process.cwd(), 'server', 'data', 'orders.json');

interface CentralOrder {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  deliverySlot?: string;
  deliveryLocation?: string;
  items: Array<{
    productId: string;
    variantId?: string;
    name: string;
    unit: string;
    price: number;
    quantity: number;
    total: number;
  }>;
  itemsCount: number;
  subtotalOriginal: number;
  totalSavings: number;
  deliveryFee: number;
  finalPayableAmount: number;
  paymentMethod: 'Cash on Delivery (COD)';
  status: string;
  statusLabel?: string;
  createdAt: string;
  timestamp: number;
  slipPhoto?: string;
  slipImageUrl?: string;
  parchiImageUrl?: string;
  voiceAudio?: string;
  voiceNoteBase64?: string;
  voiceAudioUrl?: string;
  isParchi?: boolean;
  orderType?: 'voice' | 'parchi' | 'cart';
  notes?: string;
}

// In-memory cache synced with central_orders.json
let centralOrders: CentralOrder[] = [];

// ==========================================
// CENTRAL SERVER INVENTORY (Persistent 162 Items)
// ==========================================
const INVENTORY_FILE_PATH = path.join(process.cwd(), 'data', 'central_inventory.json');
const SERVER_PRODUCTS_PATH = path.join(process.cwd(), 'server', 'data', 'products.json');
const DEFAULT_CATALOG_PATH = path.join(process.cwd(), 'src', 'data', 'defaultCatalog.json');
const BACKUP_INVENTORY_PATH = path.join(process.cwd(), 'data', 'master162Backup.json');
const STATIC_SEED_PATH = path.join(process.cwd(), 'src', 'data', 'initialProducts.json');

let centralInventory: any[] = [];

const persistCentralInventory = () => {
  try {
    fs.mkdirSync(path.dirname(INVENTORY_FILE_PATH), { recursive: true });
    fs.writeFileSync(INVENTORY_FILE_PATH, JSON.stringify(centralInventory, null, 2));

    // Also persist in server/data/products.json for Render/Cloud survival
    fs.mkdirSync(path.dirname(SERVER_PRODUCTS_PATH), { recursive: true });
    fs.writeFileSync(SERVER_PRODUCTS_PATH, JSON.stringify(centralInventory, null, 2));
  } catch (err) {
    console.error('[Central DB] Failed persisting inventory to disk:', err);
  }
};

try {
  if (fs.existsSync(SERVER_PRODUCTS_PATH)) {
    const rawInv = fs.readFileSync(SERVER_PRODUCTS_PATH, 'utf-8');
    centralInventory = JSON.parse(rawInv);
    console.log(`[Central DB] Loaded ${centralInventory.length} products from server/data/products.json`);
  } else if (fs.existsSync(INVENTORY_FILE_PATH)) {
    const rawInv = fs.readFileSync(INVENTORY_FILE_PATH, 'utf-8');
    centralInventory = JSON.parse(rawInv);
    console.log(`[Central DB] Loaded ${centralInventory.length} products from central_inventory.json`);
  }
} catch (err) {
  console.warn('[Central DB] Failed to load inventory file:', err);
  centralInventory = [];
}

// Auto-recovery / seed: Ensure all 162 verified items are preserved across restarts/sleep cycles
if (!Array.isArray(centralInventory) || centralInventory.length < 162) {
  console.log(`[Central DB] Inventory count (${centralInventory ? centralInventory.length : 0}) is below 162. Seeding full 162 master products...`);
  let backupCatalog: any[] = [];
  try {
    if (fs.existsSync(DEFAULT_CATALOG_PATH)) {
      backupCatalog = JSON.parse(fs.readFileSync(DEFAULT_CATALOG_PATH, 'utf-8'));
    } else if (fs.existsSync(BACKUP_INVENTORY_PATH)) {
      backupCatalog = JSON.parse(fs.readFileSync(BACKUP_INVENTORY_PATH, 'utf-8'));
    } else if (fs.existsSync(STATIC_SEED_PATH)) {
      backupCatalog = JSON.parse(fs.readFileSync(STATIC_SEED_PATH, 'utf-8'));
    } else if (fs.existsSync(INVENTORY_FILE_PATH)) {
      backupCatalog = JSON.parse(fs.readFileSync(INVENTORY_FILE_PATH, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Central DB] Failed to load backup inventory catalog:', err);
  }
  const existingMap = new Map((centralInventory || []).map((p: any) => [p.id, p]));
  backupCatalog.forEach((item) => {
    if (item && item.id && !existingMap.has(item.id)) {
      existingMap.set(item.id, item);
    }
  });
  centralInventory = Array.from(existingMap.values());
  persistCentralInventory();
  console.log(`[Central DB] Inventory ready with ${centralInventory.length} products.`);
}

// ==========================================
// CENTRAL CATEGORIES PERSISTENCE
// ==========================================
const CATEGORIES_FILE_PATH = path.join(process.cwd(), 'data', 'central_categories.json');
const DEFAULT_CATEGORIES = [
  'All',
  'Snacks & Biscuits',
  'Tea, Coffee & Drinks',
  'Health & Nutrition',
  'Personal Care',
  'Household Essentials',
  'Packaged Foods',
  'Atta & Flours',
  'Rice & Dal',
  'Oil & Ghee',
  'Spices & Salt',
  'Dairy & Bakery',
];

let centralCategories: string[] = DEFAULT_CATEGORIES;
try {
  if (fs.existsSync(CATEGORIES_FILE_PATH)) {
    centralCategories = JSON.parse(fs.readFileSync(CATEGORIES_FILE_PATH, 'utf-8'));
  } else {
    fs.mkdirSync(path.dirname(CATEGORIES_FILE_PATH), { recursive: true });
    fs.writeFileSync(CATEGORIES_FILE_PATH, JSON.stringify(DEFAULT_CATEGORIES, null, 2));
  }
} catch (e) {
  centralCategories = DEFAULT_CATEGORIES;
}

// Load existing orders on startup
try {
  if (fs.existsSync(SERVER_ORDERS_PATH)) {
    const rawData = fs.readFileSync(SERVER_ORDERS_PATH, 'utf-8');
    centralOrders = JSON.parse(rawData);
    console.log(`[Central DB] Loaded ${centralOrders.length} existing orders from server/data/orders.json`);
  } else if (fs.existsSync(ORDERS_FILE_PATH)) {
    const rawData = fs.readFileSync(ORDERS_FILE_PATH, 'utf-8');
    centralOrders = JSON.parse(rawData);
    console.log(`[Central DB] Loaded ${centralOrders.length} existing orders from central_orders.json`);
  } else {
    fs.mkdirSync(path.dirname(SERVER_ORDERS_PATH), { recursive: true });
    fs.writeFileSync(SERVER_ORDERS_PATH, JSON.stringify([], null, 2));
    fs.mkdirSync(path.dirname(ORDERS_FILE_PATH), { recursive: true });
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify([], null, 2));
  }
} catch (err) {
  console.warn('[Central DB] Failed to load existing orders file, initializing fresh:', err);
  centralOrders = [];
}

const persistCentralOrders = () => {
  try {
    fs.mkdirSync(path.dirname(ORDERS_FILE_PATH), { recursive: true });
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(centralOrders, null, 2));

    fs.mkdirSync(path.dirname(SERVER_ORDERS_PATH), { recursive: true });
    fs.writeFileSync(SERVER_ORDERS_PATH, JSON.stringify(centralOrders, null, 2));
  } catch (err) {
    console.error('[Central DB] Failed persisting orders to disk:', err);
  }
};

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Kiranape Express API',
    uptime: process.uptime(),
    ordersCount: centralOrders.length,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// STATIC ASSETS & WEB APP MANIFEST
// ==========================================
const PUBLIC_DIR = path.join(process.cwd(), 'public');

// Dedicated /manifest.json endpoint ensuring status 200 and application/manifest+json
app.get('/manifest.json', (_req, res) => {
  const manifestPath = path.join(PUBLIC_DIR, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).sendFile(manifestPath);
  }
  return res.status(404).json({ error: 'manifest.json not found' });
});

// Statically serve all assets from the 'public' directory
app.use(
  express.static(PUBLIC_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('manifest.json')) {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
      }
    },
  })
);

// ==========================================
// CENTRAL ORDERS API ENDPOINTS
// ==========================================

// 1. POST /api/orders: Ingest new Cart or Parchi Order
app.post('/api/orders', (req, res) => {
  try {
    const body = req.body;

    // Check if it's a Parchi Photo Order
    const isParchi = Boolean(
      body.isParchi ||
      body.slipPhoto ||
      body.slipImageUrl ||
      body.parchiImageUrl ||
      body.parchiBase64 ||
      body.imageBase64
    );

    const customerName = (body.customerName || body.fullName || 'Valued Customer').trim();
    const phone = (body.phone || body.phoneNumber || body.customerPhone || '').trim();
    const address = (body.address || body.fullAddress || body.deliveryAddress || '').trim();

    if (!phone) {
      return res.status(400).json({ success: false, error: 'Mobile phone number is required.' });
    }
    if (!address) {
      return res.status(400).json({ success: false, error: 'Delivery address is required.' });
    }

    const orderId =
      body.id ||
      body.orderId ||
      (isParchi
        ? `PRC-${Math.floor(10000 + Math.random() * 90000)}`
        : `ORD-${Math.floor(10000 + Math.random() * 90000)}`);

    const now = Date.now();
    const slipPhoto = body.slipPhoto || body.slipImageUrl || body.parchiBase64 || body.imageBase64 || body.parchiImageUrl || body.imageUrl;
    const voiceAudio = body.voiceAudio || body.voiceAudioUrl || body.voiceNoteBase64 || body.audioBase64 || undefined;

    const newOrder: CentralOrder = {
      id: orderId,
      customerName,
      phone,
      address,
      deliverySlot: body.deliverySlot || 'Standard Delivery',
      deliveryLocation: body.deliveryLocation || 'Waidhan, Singrauli',
      items: Array.isArray(body.items) ? body.items : (Array.isArray(body.cartItems) ? body.cartItems : []),
      itemsCount: Number(body.itemsCount) || (Array.isArray(body.items) ? body.items.length : 1),
      subtotalOriginal: Number(body.subtotalOriginal) || Number(body.finalPayableAmount) || Number(body.finalTotal) || 0,
      totalSavings: Number(body.totalSavings) || 0,
      deliveryFee: Number(body.deliveryFee) || 0,
      finalPayableAmount: Number(body.finalPayableAmount) || Number(body.finalTotal) || 0,
      paymentMethod: 'Cash on Delivery (COD)',
      status: 'Pending',
      statusLabel: 'Pending Confirmation',
      createdAt: body.createdAt || new Date().toISOString(),
      timestamp: body.timestamp || now,
      isParchi,
      orderType: body.orderType || (voiceAudio ? 'voice' : (isParchi ? 'parchi' : 'cart')),
      slipPhoto: slipPhoto || undefined,
      parchiImageUrl: slipPhoto || undefined,
      slipImageUrl: slipPhoto || undefined,
      voiceAudio: voiceAudio || undefined,
      voiceNoteBase64: voiceAudio,
      voiceAudioUrl: voiceAudio,
      notes: body.notes || undefined,
    };

    // Prepend new order (latest first)
    centralOrders.unshift(newOrder);
    persistCentralOrders();

    console.log(`[Central DB] New order registered: #${newOrder.id} from ${newOrder.customerName} (${newOrder.phone}) - Type: ${isParchi ? 'PARCHI PHOTO' : 'CART ITEMS'}`);

    return res.status(201).json({
      success: true,
      orderId: newOrder.id,
      order: newOrder,
      message: 'Aapka Order Darz Ho Gaya Hai! Kiranape Express jald hi aapke pate par deliver karega.',
    });
  } catch (error: any) {
    console.error('[Central DB] Error processing order:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while saving order.',
    });
  }
});

// 2. GET /api/orders: Fetch all orders (latest first)
app.get('/api/orders', (_req, res) => {
  // Sort descending by timestamp
  const sorted = [...centralOrders].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  res.json(sorted);
});

// 3. GET /api/orders/:id: Fetch single order
app.get('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const found = centralOrders.find((o) => o.id === id);
  if (!found) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }
  res.json({ success: true, order: found });
});

// Helper to normalize status strings ('ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PENDING', etc.)
const normalizeOrderStatus = (raw: string): { status: string; statusLabel: string } => {
  const clean = (raw || '').trim();
  const lower = clean.toLowerCase().replace(/[\s_-]+/g, '');

  if (lower === 'pending' || lower === 'received' || lower === 'neworder') {
    return { status: 'Pending', statusLabel: 'Pending Confirmation' };
  }
  if (lower === 'accepted' || lower === 'processing' || lower === 'packed') {
    return { status: 'Accepted', statusLabel: 'Order Accepted & Packed' };
  }
  if (lower === 'outfordelivery') {
    return { status: 'Out for Delivery', statusLabel: 'Out for Delivery' };
  }
  if (lower === 'delivered') {
    return { status: 'Delivered', statusLabel: 'Delivered Successfully' };
  }
  if (lower === 'cancelled' || lower === 'canceled') {
    return { status: 'Cancelled', statusLabel: 'Cancelled' };
  }
  return { status: clean || 'Pending', statusLabel: clean || 'Pending Confirmation' };
};

// 4. PATCH & PUT /api/orders/:id: Update status or order fields
app.patch(['/api/orders/:id/status', '/api/orders/:id'], (req, res) => {
  const { id } = req.params;
  const { status, ...updates } = req.body || {};

  const orderIndex = centralOrders.findIndex((o) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  if (status) {
    const normalized = normalizeOrderStatus(status);
    centralOrders[orderIndex].status = normalized.status;
    centralOrders[orderIndex].statusLabel = normalized.statusLabel;
  }

  if (Object.keys(updates).length > 0) {
    centralOrders[orderIndex] = {
      ...centralOrders[orderIndex],
      ...updates,
      id, // Preserve ID
    };
  }

  persistCentralOrders();
  console.log(`[Central DB] Order #${id} status updated to: ${centralOrders[orderIndex].status} (${centralOrders[orderIndex].statusLabel})`);

  res.json({
    success: true,
    order: centralOrders[orderIndex],
  });
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const orderIndex = centralOrders.findIndex((o) => o.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  const { status, ...rest } = req.body || {};
  let normalized = status ? normalizeOrderStatus(status) : null;

  centralOrders[orderIndex] = {
    ...centralOrders[orderIndex],
    ...rest,
    ...(normalized ? { status: normalized.status, statusLabel: normalized.statusLabel } : {}),
    id,
  };

  persistCentralOrders();
  res.json({ success: true, order: centralOrders[orderIndex] });
});

// 5. DELETE & POST /api/orders/clear: Bulk Purge Orders (Must be defined BEFORE /:id route)
app.delete('/api/orders/clear', (req, res) => {
  const filter = (req.query.filter as string) || (req.query.status as string) || req.body?.filter || 'completed_or_cancelled';
  if (filter === 'all' || req.query.all === 'true') {
    const deletedCount = centralOrders.length;
    centralOrders = [];
    persistCentralOrders();
    console.log(`[Central DB] All order history cleared (${deletedCount} orders deleted).`);
    return res.json({ success: true, message: 'All order history deleted successfully.', deletedCount });
  }

  const initialCount = centralOrders.length;
  centralOrders = centralOrders.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s !== 'delivered' && s !== 'cancelled';
  });
  const deletedCount = initialCount - centralOrders.length;
  persistCentralOrders();
  console.log(`[Central DB] Cleared ${deletedCount} completed/cancelled orders.`);
  return res.json({
    success: true,
    message: `Cleared ${deletedCount} completed/cancelled orders.`,
    deletedCount,
    remainingCount: centralOrders.length,
  });
});

app.post('/api/orders/clear', (req, res) => {
  const filter = req.body?.filter || req.body?.status || (req.query.filter as string) || 'completed_or_cancelled';
  if (filter === 'all' || req.query.all === 'true') {
    const deletedCount = centralOrders.length;
    centralOrders = [];
    persistCentralOrders();
    return res.json({ success: true, message: 'All orders cleared.', deletedCount });
  }

  const initialCount = centralOrders.length;
  centralOrders = centralOrders.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s !== 'delivered' && s !== 'cancelled';
  });
  const deletedCount = initialCount - centralOrders.length;
  persistCentralOrders();
  return res.json({ success: true, message: `Cleared ${deletedCount} completed/cancelled orders.`, deletedCount, remainingCount: centralOrders.length });
});

// 5b. DELETE /api/orders: Query-based Bulk Clear Orders
app.delete('/api/orders', (req, res) => {
  const statusFilter = (req.query.status as string) || (req.query.filter as string) || '';
  const isAll = req.query.all === 'true' || statusFilter === 'all';

  if (isAll) {
    const deletedCount = centralOrders.length;
    centralOrders = [];
    persistCentralOrders();
    return res.json({ success: true, message: 'All order history deleted successfully.', deletedCount });
  }

  const initialCount = centralOrders.length;
  centralOrders = centralOrders.filter((o) => {
    const s = (o.status || '').toLowerCase();
    return s !== 'delivered' && s !== 'cancelled';
  });
  const deletedCount = initialCount - centralOrders.length;
  persistCentralOrders();
  return res.json({
    success: true,
    message: `Cleared ${deletedCount} completed/cancelled orders.`,
    deletedCount,
    remainingCount: centralOrders.length,
  });
});

// 5c. DELETE /api/orders/:id: Remove an individual order
app.delete('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = centralOrders.length;
  centralOrders = centralOrders.filter((o) => o.id !== id);

  if (centralOrders.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }

  persistCentralOrders();
  console.log(`[Central DB] Order #${id} deleted permanently.`);
  res.json({ success: true, message: `Order #${id} deleted successfully.`, remainingCount: centralOrders.length });
});

// ==========================================
// CATEGORIES REST API ENDPOINTS
// ==========================================
app.get('/api/categories', (_req, res) => {
  res.json({ success: true, categories: centralCategories });
});

app.post('/api/categories', (req, res) => {
  if (Array.isArray(req.body.categories)) {
    centralCategories = req.body.categories;
    try {
      fs.writeFileSync(CATEGORIES_FILE_PATH, JSON.stringify(centralCategories, null, 2));
    } catch (e) {}
    return res.json({ success: true, categories: centralCategories });
  }
  res.status(400).json({ success: false, error: 'Expected categories array' });
});

// ==========================================
// CENTRAL INVENTORY REST API ENDPOINTS
// ==========================================

// 6. GET /api/inventory & GET /api/products: Fetch all products
app.get(['/api/inventory', '/api/products'], (_req, res) => {
  res.json(centralInventory);
});

// 7. GET /api/inventory/:id: Fetch single product
app.get(['/api/inventory/:id', '/api/products/:id'], (req, res) => {
  const { id } = req.params;
  const item = centralInventory.find((p) => p.id === id);
  if (!item) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }
  res.json({ success: true, product: item });
});

// 8. POST /api/inventory: Add or upsert product
app.post(['/api/inventory', '/api/products'], (req, res) => {
  try {
    const product = req.body;
    if (!product || !product.name) {
      return res.status(400).json({ success: false, error: 'Product name is required.' });
    }

    const productId = product.id || `prod_${Date.now()}`;
    const newProduct = {
      ...product,
      id: productId,
      updatedAt: Date.now(),
    };

    const existingIdx = centralInventory.findIndex((p) => p.id === productId);
    if (existingIdx !== -1) {
      centralInventory[existingIdx] = newProduct;
    } else {
      centralInventory.push(newProduct);
    }

    persistCentralInventory();
    console.log(`[Central DB] Inventory item saved: ${newProduct.name} (#${productId})`);

    res.status(201).json({ success: true, product: newProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8b. POST /api/inventory/bulk: Bulk Upsert/Replace items from CSV Import or Backup
app.post(['/api/inventory/bulk', '/api/products/bulk'], (req, res) => {
  try {
    const rawItems = Array.isArray(req.body) ? req.body : req.body?.products;
    if (!Array.isArray(rawItems)) {
      return res.status(400).json({ success: false, error: 'Expected products array' });
    }

    const existingMap = new Map(centralInventory.map((p) => [p.id, p]));
    let updatedCount = 0;
    let addedCount = 0;

    rawItems.forEach((item: any, idx: number) => {
      if (!item || !item.name) return;
      const id = item.id || `prod_${Date.now()}_${idx}`;
      const existing = existingMap.get(id);
      const merged = {
        ...(existing || {}),
        ...item,
        id,
        updatedAt: Date.now(),
      };
      if (existing) {
        updatedCount++;
      } else {
        addedCount++;
      }
      existingMap.set(id, merged);
    });

    centralInventory = Array.from(existingMap.values());
    persistCentralInventory();
    console.log(`[Central DB] Bulk inventory updated: ${updatedCount} updated, ${addedCount} added. Total: ${centralInventory.length}`);

    res.json({
      success: true,
      totalCount: centralInventory.length,
      updatedCount,
      addedCount,
      products: centralInventory,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. PUT /api/inventory/:id: Update product
app.put(['/api/inventory/:id', '/api/products/:id'], (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const idx = centralInventory.findIndex((p) => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  centralInventory[idx] = {
    ...centralInventory[idx],
    ...updates,
    id,
    updatedAt: Date.now(),
  };

  persistCentralInventory();
  res.json({ success: true, product: centralInventory[idx] });
});

// 10. DELETE /api/inventory/:id: Delete product
app.delete(['/api/inventory/:id', '/api/products/:id'], (req, res) => {
  const { id } = req.params;
  const prevLen = centralInventory.length;
  centralInventory = centralInventory.filter((p) => p.id !== id);

  if (centralInventory.length === prevLen) {
    return res.status(404).json({ success: false, error: 'Product not found.' });
  }

  persistCentralInventory();
  res.json({ success: true, message: `Product #${id} deleted.` });
});

// Setup Vite middleware for dev or static server for production
async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  const isProduction =
    (process.env.NODE_ENV === 'production' ||
      Boolean(process.env.K_SERVICE) ||
      Boolean(process.env.PORT && process.env.PORT !== '3000')) &&
    hasDist;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
      next();
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kiranape Express server running on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
