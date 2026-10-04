/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Truck,
  ShieldCheck,
  PhoneCall,
  MapPin,
  Clock,
  Store,
  ChevronRight,
  Search,
  Filter,
  MessageCircle,
} from 'lucide-react';
import { Product, ProductVariant, CartItem, ProductCategory, Order, OrderStatus, AppUser, DeliverySlot, StoreSettings, PromoBanner, CustomCategory } from './types';
import {
  getProducts,
  saveProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  resetProductsToDefault,
  clearAllProducts,
  getOrders,
  createOrder,
  updateOrderStatus,
  deleteOrder,
  getAdminPin,
  setAdminPin,
  getSavedCart,
  saveCart,
  subscribeToSync,
  getSavedStoreSettings,
  saveStoredSettings,
  getSavedBanners,
  saveStoredBanners,
  getCustomCategories,
  getCustomerSelectedLocation,
} from './services/storageService';
import {
  sendOrderToCentralServer,
  fetchCentralOrders,
  fetchCentralInventory,
  updateCentralOrderStatus,
  saveProductToCentralInventory,
  deleteProductFromCentralInventory,
} from './services/orderApiService';
import { dispatchOrderInBackground } from './services/orderQueueService';
import {
  isFirebaseConfigured,
  subscribeToAuth,
  getStoredUser,
  logoutUser,
  signInAdminDirectly,
  subscribeToStoreConfig,
  saveStoreSettingsToFirestore,
  saveBannersToFirestore,
} from './services/firebase';
import { STORE_DEFAULTS, DEFAULT_BANNERS, INITIAL_PRODUCTS } from './data/initialProducts';
import { CustomerHeader } from './components/CustomerHeader';
import { HeroBanner } from './components/HeroBanner';
import { PromoCarousel } from './components/PromoCarousel';
import { ProductCard } from './components/ProductCard';
import { CategoryTileGrid } from './components/CategoryTileGrid';
import { MostShoppedSlider } from './components/MostShoppedSlider';
import { CategoryDetailView } from './components/CategoryDetailView';
import { BottomNavBar } from './components/BottomNavBar';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { SplashScreen } from './components/SplashScreen';
import { ParchiUploadModal } from './components/ParchiUploadModal';
import { VoiceGroceryModal } from './components/VoiceGroceryModal';
import { QuickOrderActionBar } from './components/QuickOrderActionBar';
import { CreatorCredits } from './components/CreatorCredits';
import { AdminPinModal } from './components/AdminPinModal';
import { playOrderChime } from './utils/sound';
import { deleteOrderFromCentralServer } from './services/orderApiService';
import { API_BASE_URL } from './config/api';
import { filterProductsUniversally } from './utils/universalSearch';
import { insertSupabaseOrder } from './services/supabaseOrderService';

export default function App() {
  // Navigation View: 'customer' (default) vs 'admin'
  const [currentView, setCurrentView] = useState<'customer' | 'admin'>(() => {
    if (typeof window === 'undefined') return 'customer';
    const isAuthed =
      sessionStorage.getItem('kiranape_admin_auth') === 'true' ||
      sessionStorage.getItem('kiranape_admin_authenticated') === 'true';
    if (isAuthed && (window.location.hash === '#admin' || window.location.search.includes('view=admin'))) {
      return 'admin';
    }
    return 'customer';
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => getStoredUser());

  // Store Settings & Promotional Banners State
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getSavedStoreSettings());
  const [banners, setBanners] = useState<PromoBanner[]>(() => getSavedBanners());

  // Custom Categories State (Dynamic Super-Store)
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(() => getCustomCategories());

  // Core Data State - Rock-Solid Permanent Storage for Kiranape Catalog (105 Wholesale Catalog)
  const [products, setProducts] = useState<Product[]>(() => getProducts());
  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [adminPin, setAdminPinState] = useState<string>(() => getAdminPin());

  // Customer UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('All');
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>(() => getSavedCart());

  // Auto-sync products state safely to permanent storage on state changes
  useEffect(() => {
    if (typeof window !== 'undefined' && products) {
      saveProducts(products);
    }
  }, [products]);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isParchiModalOpen, setIsParchiModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Admin PIN verification and Direct Link (#admin) state
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [isAdminPinVerified, setIsAdminPinVerified] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return (
        sessionStorage.getItem('kiranape_admin_auth') === 'true' ||
        sessionStorage.getItem('kiranape_admin_authenticated') === 'true'
      );
    } catch {
      return false;
    }
  });
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Toast listener for network connection status updates
  useEffect(() => {
    const handleToast = (e: any) => {
      const msg = e.detail?.message || 'Connecting to store server... please wait 10 seconds.';
      setToastBanner(msg);
      setTimeout(() => {
        setToastBanner((prev) => (prev === msg ? null : prev));
      }, 7000);
    };
    window.addEventListener('kiranape_toast', handleToast);
    return () => window.removeEventListener('kiranape_toast', handleToast);
  }, []);

  const handleOpenPrivacy = useCallback(() => {
    setIsPrivacyOpen(true);
    window.location.hash = '#privacy';
  }, []);

  const handleClosePrivacy = useCallback(() => {
    setIsPrivacyOpen(false);
    if (window.location.hash === '#privacy' || window.location.hash === '#/privacy') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const handleAdminPinSuccess = useCallback(async () => {
    setIsAdminPinVerified(true);
    setIsAdminPinModalOpen(false);
    try {
      sessionStorage.setItem('kiranape_admin_auth', 'true');
      sessionStorage.setItem('kiranape_admin_authenticated', 'true');
    } catch {
      // ignore
    }
    try {
      const adminUser = await signInAdminDirectly();
      setCurrentUser(adminUser);
    } catch {
      const fallbackAdmin: AppUser = {
        uid: 'admin-store-owner',
        displayName: 'Store Owner (Admin)',
        email: 'admin@chaurasiakirana.local',
        phone: '+91 98765 43210',
        role: 'admin',
      };
      setCurrentUser(fallbackAdmin);
    }
    setCurrentView('admin');
    window.location.hash = '#admin';
  }, []);

  const handleLogoutAdmin = useCallback(() => {
    setIsAdminPinVerified(false);
    try {
      sessionStorage.removeItem('kiranape_admin_auth');
      sessionStorage.removeItem('kiranape_admin_authenticated');
      localStorage.removeItem('kiranape_admin_authenticated');
    } catch {
      // ignore
    }
    setCurrentView('customer');
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const handleCloseAdminPin = useCallback(() => {
    setIsAdminPinModalOpen(false);
    if (!isAdminPinVerified) {
      setCurrentView('customer');
      if (window.location.hash === '#admin') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [isAdminPinVerified]);

  // Secret direct access via search bar keyword "9779"
  const handleSecretAdminAccess = useCallback(async () => {
    setSearchQuery('');
    setIsAdminPinModalOpen(true);
  }, []);

  // URL route listener for #admin or ?view=admin, #tracker, #privacy
  useEffect(() => {
    const handleRoute = async () => {
      const hash = window.location.hash;
      const search = window.location.search;

      if (hash === '#admin' || search.includes('view=admin')) {
        // Direct Admin URL (https://kiranape-store.onrender.com/#admin):
        // Keep 4-digit Store Owner PIN modal intact before revealing admin controls
        if (isAdminPinVerified) {
          setCurrentView('admin');
        } else {
          setIsAdminPinModalOpen(true);
        }
      } else if (hash === '#tracker') {
        setIsTrackerOpen(true);
      } else if (hash === '#privacy' || hash === '#/privacy' || search.includes('view=privacy')) {
        setIsPrivacyOpen(true);
      } else {
        // For regular customer visits (without the #admin hash), always show normal customer storefront
        setCurrentView('customer');
      }
    };

    handleRoute();
    window.addEventListener('hashchange', handleRoute);
    return () => window.removeEventListener('hashchange', handleRoute);
  }, [isAdminPinVerified]);

  // Android Back Button Interceptor (Prevents WebIntoApp Exit Interstitial Ad)
  useEffect(() => {
    // Keep an internal history state active so WebIntoApp webview has history to go back to
    window.history.pushState({ app: 'kiranape', page: 'home' }, '');

    const handlePopState = () => {
      // 1. If any drawer/modal is open, close it cleanly and prevent exiting
      if (isCartOpen) {
        setIsCartOpen(false);
        window.history.pushState({ app: 'kiranape', page: 'home' }, '');
        return;
      }
      if (isCheckoutOpen) {
        setIsCheckoutOpen(false);
        window.history.pushState({ app: 'kiranape', page: 'home' }, '');
        return;
      }
      if (isTrackerOpen) {
        setIsTrackerOpen(false);
        window.history.pushState({ app: 'kiranape', page: 'home' }, '');
        return;
      }
      if (isPrivacyOpen) {
        handleClosePrivacy();
        window.history.pushState({ app: 'kiranape', page: 'home' }, '');
        return;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        window.history.pushState({ app: 'kiranape', page: 'home' }, '');
        return;
      }
      if (isParchiModalOpen) {
        setIsParchiModalOpen(false);
        window.history.pushState({ app: 'kiranape', page: 'home' }, '');
        return;
      }
      if (placedOrder) {
        setPlacedOrder(null);
        window.history.pushState({ app: 'kiranape', page: 'home' }, '');
        return;
      }
      if (currentView === 'admin') {
        setCurrentView('customer');
        window.history.pushState({ app: 'kiranape', page: 'home' }, '');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    isCartOpen,
    isCheckoutOpen,
    isTrackerOpen,
    isPrivacyOpen,
    isAuthModalOpen,
    isParchiModalOpen,
    placedOrder,
    currentView,
    handleClosePrivacy,
  ]);

  // Listen to Auth State
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Sync state reactively across any admin changes, storage events, and Firestore
  useEffect(() => {
    // 1. Local storage sync listener (always active as fallback)
    const unsubscribeLocal = subscribeToSync(() => {
      const currentStored = getProducts();
      setProducts(currentStored || []);
      setOrders(getOrders());
      setAdminPinState(getAdminPin());
      setStoreSettings(getSavedStoreSettings());
      setBanners(getSavedBanners());
      setCustomCategories(getCustomCategories());
    });

    // 2. Real-time store settings & promo banners listener (local store settings)
    const unsubscribeStoreConfig = subscribeToStoreConfig(({ settings, banners: newBanners }) => {
      setStoreSettings(settings);
      setBanners(newBanners);
    });

    // 3. Initial load of orders and products from Central Server Database with custom edits preservation
    fetchCentralOrders().then((serverOrders) => {
      if (serverOrders && serverOrders.length > 0) {
        setOrders(serverOrders);
      }
    }).catch(console.warn);

    fetchCentralInventory().then((serverInventory) => {
      // Check for persistent client-side custom edits backup
      let localCustomProducts: Record<string, Partial<Product>> = {};
      try {
        const storedCustom = localStorage.getItem('chaurasia_custom_products');
        if (storedCustom) {
          localCustomProducts = JSON.parse(storedCustom) || {};
        }
      } catch {}

      const baseList = (Array.isArray(serverInventory) && serverInventory.length > 0)
        ? serverInventory
        : getProducts();

      // Merge: Custom uploaded image and fields always take top priority
      const merged = baseList.map((p) => {
        const customOverride = localCustomProducts[p.id];
        if (customOverride) {
          return {
            ...p,
            ...customOverride,
            imageUrl: customOverride.imageUrl || p.imageUrl,
          };
        }
        return p;
      });

      setProducts(merged);
      saveProducts(merged);
    }).catch(() => {
      const current = getProducts();
      setProducts(current);
    });

    const handleOrdersUpdated = () => {
      setOrders(getOrders());
    };
    window.addEventListener('kiranape_orders_updated', handleOrdersUpdated);

    return () => {
      unsubscribeLocal();
      unsubscribeStoreConfig();
      window.removeEventListener('kiranape_orders_updated', handleOrdersUpdated);
    };
  }, []);

  // Save cart whenever it changes
  useEffect(() => {
    saveCart(cartQuantities);
  }, [cartQuantities]);

  // Derived Cart Items with current products data & variants
  const cartItems: CartItem[] = useMemo(() => {
    const items: CartItem[] = [];
    const productMap = new Map<string, Product>();
    products.forEach((p) => productMap.set(p.id, p));

    for (const [key, qty] of Object.entries(cartQuantities)) {
      const quantity = Number(qty);
      if (quantity > 0) {
        if (key.includes('::')) {
          const [productId, variantId] = key.split('::');
          const product = productMap.get(productId);
          if (product) {
            const variant = product.variants?.find((v) => v.id === variantId);
            items.push({
              product,
              quantity,
              selectedVariant: variant,
              itemKey: key,
            });
          }
        } else {
          const product = productMap.get(key);
          if (product) {
            items.push({
              product,
              quantity,
              itemKey: key,
            });
          }
        }
      }
    }
    return items;
  }, [products, cartQuantities]);

  const totalCartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const cartTotalAmount = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const price = item.selectedVariant ? item.selectedVariant.price : item.product.finalPrice;
        return sum + price * item.quantity;
      }, 0),
    [cartItems]
  );

  // Cart Handlers
  const handleAddToCart = useCallback((product: Product, variant?: ProductVariant) => {
    const itemKey = variant ? `${product.id}::${variant.id}` : product.id;
    setCartQuantities((prev) => ({
      ...prev,
      [itemKey]: (prev[itemKey] || 0) + 1,
    }));
  }, []);

  const handleUpdateQuantity = useCallback((itemKey: string, newQuantity: number) => {
    setCartQuantities((prev) => {
      const next = { ...prev };
      if (newQuantity <= 0) {
        delete next[itemKey];
      } else {
        next[itemKey] = newQuantity;
      }
      return next;
    });
  }, []);

  const handleClearCart = useCallback(() => {
    setCartQuantities({});
  }, []);

  const handleRepeatOrder = useCallback(
    (orderToRepeat: Order) => {
      const nextQuantities = { ...cartQuantities };
      orderToRepeat.items.forEach((item) => {
        const prod = products.find(
          (p) => p.id === item.productId || p.name.toLowerCase() === item.name.toLowerCase()
        );
        if (prod) {
          const itemKey = prod.id;
          nextQuantities[itemKey] = (nextQuantities[itemKey] || 0) + (item.quantity || 1);
        }
      });
      setCartQuantities(nextQuantities);
      setIsCartOpen(true);
    },
    [products, cartQuantities]
  );

  // Checkout & Order Placement Handler:
  // Pushes customer details, cart items, delivery slot, total amount, and order ID to 'orders' collection in Firestore
  // BEFORE showing the success message
  const handleCheckoutSubmit = useCallback(
    async (customerDetails: {
      fullName: string;
      phoneNumber: string;
      fullAddress: string;
      deliverySlot: DeliverySlot;
    }) => {
      const subtotalOriginal = cartItems.reduce((sum, item) => {
        const mrp = item.selectedVariant ? item.selectedVariant.mrp : item.product.originalPrice;
        return sum + mrp * item.quantity;
      }, 0);
      const subtotalFinal = cartItems.reduce((sum, item) => {
        const price = item.selectedVariant ? item.selectedVariant.price : item.product.finalPrice;
        return sum + price * item.quantity;
      }, 0);
      const totalSavings = Math.max(0, subtotalOriginal - subtotalFinal);
      const freeDeliveryThreshold = storeSettings.minOrderForFreeDelivery ?? STORE_DEFAULTS.minOrderForFreeDelivery;
      const standardDeliveryFee = storeSettings.deliveryCharge ?? STORE_DEFAULTS.deliveryCharge;
      const isFreeDelivery = subtotalFinal >= freeDeliveryThreshold;
      const deliveryFee = isFreeDelivery ? 0 : standardDeliveryFee;
      const finalPayableAmount = subtotalFinal + deliveryFee;

      const orderItems = cartItems.map((item) => {
        const price = item.selectedVariant ? item.selectedVariant.price : item.product.finalPrice;
        const unit = item.selectedVariant ? item.selectedVariant.weight_unit : item.product.unit;
        return {
          productId: item.product.id,
          variantId: item.selectedVariant?.id,
          name: item.product.name,
          unit,
          price,
          quantity: item.quantity,
          total: price * item.quantity,
        };
      });

      // Generate the official unique Order ID
      const orderId = 'CK-' + Math.floor(1000 + Math.random() * 9000);
      const selectedLoc = getCustomerSelectedLocation() || storeSettings.serviceArea || 'Waidhan, Singrauli';

      // 1. Instant Haptic Feedback & Audio Chime (0 milliseconds feedback)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([50, 50, 50]);
        } catch {
          // ignore if unsupported
        }
      }
      playOrderChime();

      // 2. Register in local storage engine for instant offline fallback
      const localOrder = createOrder({
        id: orderId,
        customerName: customerDetails.fullName,
        phone: customerDetails.phoneNumber,
        address: customerDetails.fullAddress,
        deliverySlot: customerDetails.deliverySlot,
        deliveryLocation: selectedLoc,
        items: orderItems,
        itemsCount: totalCartCount,
        subtotalOriginal,
        totalSavings,
        deliveryFee,
        finalPayableAmount,
        paymentMethod: 'Cash on Delivery (COD)',
      });

      // 3. OPTIMISTIC CONFIRMATION: Instantly clear Cart, close checkout modal, and display the Order Placed Successfully screen (0ms)
      setCartQuantities({});
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setPlacedOrder(localOrder);
      setOrders(getOrders());

      // 4. Asynchronous Background Dispatch to Supabase Cloud & Central Server
      insertSupabaseOrder({
        id: orderId,
        customerName: customerDetails.fullName || 'Customer',
        phone: customerDetails.phoneNumber || 'Not provided',
        address: customerDetails.fullAddress || 'Store Pickup',
        items: orderItems || [],
        total: finalPayableAmount || 0,
        orderType: 'cart',
        voiceData: null,
        parchiData: null,
        status: 'Pending',
      }).catch((err) => {
        console.warn('[Supabase Cart Order Error]:', err);
      });

      dispatchOrderInBackground({
        id: orderId,
        customerName: customerDetails.fullName,
        phone: customerDetails.phoneNumber,
        address: customerDetails.fullAddress,
        deliverySlot: customerDetails.deliverySlot,
        deliveryLocation: selectedLoc,
        items: orderItems,
        itemsCount: totalCartCount,
        subtotalOriginal,
        totalSavings,
        deliveryFee,
        finalPayableAmount,
        isParchi: false,
      });
    },
    [cartItems, totalCartCount, storeSettings]
  );

  // Admin Operations with Central Server synchronization
  const handleAddProduct = useCallback((data: any) => {
    const created = addProduct(data);
    setProducts(getProducts());
    saveProductToCentralInventory(created).catch((err) => {
      console.warn('Could not add product to central inventory:', err);
    });
  }, []);

  const handleUpdateProduct = useCallback((id: string, updates: Partial<Product>) => {
    updateProduct(id, updates);
    const updatedList = getProducts();
    setProducts(updatedList);
    const updatedItem = updatedList.find((p) => p.id === id);

    // Save persistent backup to localStorage.chaurasia_custom_products
    try {
      const stored = localStorage.getItem('chaurasia_custom_products');
      const customMap = stored ? JSON.parse(stored) : {};
      customMap[id] = {
        ...(customMap[id] || {}),
        ...updates,
      };
      localStorage.setItem('chaurasia_custom_products', JSON.stringify(customMap));
    } catch (e) {
      console.warn('Notice saving custom products backup:', e);
    }

    if (updatedItem) {
      saveProductToCentralInventory(updatedItem).catch((err) => {
        console.warn('Could not update product in central inventory:', err);
      });
    }
  }, []);

  const handleDeleteProduct = useCallback((id: string) => {
    deleteProduct(id);
    setProducts(getProducts());
    deleteProductFromCentralInventory(id).catch((err) => {
      console.warn('Could not delete product from central inventory:', err);
    });

    // Also remove from cart if present
    setCartQuantities((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return prev;
    });
  }, []);

  const handleResetDefaults = useCallback(async () => {
    try {
      localStorage.removeItem('kirana_products');
      localStorage.removeItem('chaurasia_kirana_products_v1');
      clearAllProducts();
      setProducts([]);
      setCartQuantities({});
    } catch (err) {
      console.warn('Error wiping catalog:', err);
    }
  }, []);

  const handleSyncToFirestore = useCallback(async () => {
    try {
      for (const p of products) {
        await saveProductToCentralInventory(p);
      }
      alert(`Success! ${products.length} grocery items have been synchronized to your Central Server database.`);
    } catch (err: any) {
      alert(`Error syncing to central inventory: ${err?.message || 'Unknown error'}`);
    }
  }, [products]);

  const handleUpdateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    setOrders(getOrders());
    updateCentralOrderStatus(orderId, status).catch(console.warn);
  }, []);

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    deleteOrder(orderId);
    setOrders(getOrders());
    try {
      await deleteOrderFromCentralServer(orderId);
    } catch (e) {
      console.warn('Central server delete order error:', e);
    }
  }, []);

  const handleChangePin = useCallback((newPin: string) => {
    setAdminPin(newPin);
    setAdminPinState(newPin);
  }, []);

  const handleSaveStoreSettings = useCallback(async (updates: Partial<StoreSettings>) => {
    const updated = await saveStoreSettingsToFirestore(updates);
    setStoreSettings(updated);
  }, []);

  const handleSaveBanners = useCallback(async (newBanners: PromoBanner[]) => {
    setBanners(newBanners);
    await saveBannersToFirestore(newBanners);
  }, []);

  // Filter products for customer catalog using Universal Bilingual Search Engine
  const filteredProducts = useMemo(() => {
    return filterProductsUniversally(products, searchQuery, selectedCategory);
  }, [products, searchQuery, selectedCategory]);

  // If currently in Admin View, render Store Owner Panel ONLY if authenticated
  if (currentView === 'admin' && isAdminPinVerified) {
    return (
      <AdminPanel
        products={products}
        orders={orders}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onResetDefaultProducts={handleResetDefaults}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onDeleteOrder={handleDeleteOrder}
        adminPin={adminPin}
        onChangePin={handleChangePin}
        onExitAdmin={() => {
          setCurrentView('customer');
          if (window.location.hash === '#admin') {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        }}
        onLogoutAdmin={handleLogoutAdmin}
        isFirebaseConnected={isFirebaseConfigured()}
        onSyncToFirestore={handleSyncToFirestore}
        storeSettings={storeSettings}
        banners={banners}
        onSaveSettings={handleSaveStoreSettings}
        onSaveBanners={handleSaveBanners}
      />
    );
  }

  // Otherwise, render Customer View (Default App)
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col selection:bg-emerald-600 selection:text-white pb-28 sm:pb-32 w-full max-w-full overflow-x-hidden">
      {/* Customer Header with brand, search, category pills */}
      <CustomerHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        totalCartItems={totalCartCount}
        cartTotalAmount={cartTotalAmount}
        onOpenCart={() => setIsCartOpen(true)}
        onSecretAdminTrigger={handleSecretAdminAccess}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={async () => {
          await logoutUser();
          setCurrentUser(null);
        }}
        onOpenTracker={() => setIsTrackerOpen(true)}
        hasActiveOrders={orders.some(
          (o) => o.status !== 'delivered' && o.status !== 'Delivered' && o.status !== 'cancelled' && o.status !== 'Cancelled'
        )}
        storeSettings={storeSettings}
        categories={customCategories}
        onOpenParchiModal={() => setIsParchiModalOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-2.5 sm:px-4 pt-3 sm:pt-4 flex-1">
        {/* 5 Dedicated Promotional Hero Carousel Banners */}
        <HeroBanner
          onOpenParchiModal={() => setIsParchiModalOpen(true)}
          onSelectCategory={(cat) => setSelectedCategory(cat as ProductCategory)}
        />

        {/* CONSOLIDATED MASTER ACTION BAR: 📸 Parchi Ki Photo Bhejo & 🎙️ Bol Kar Saman Likhein */}
        <QuickOrderActionBar
          onOpenParchiModal={() => setIsParchiModalOpen(true)}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        />

        {/* CONDITIONAL RENDERING: 
            1. Search Results (if user entered search text)
            2. Dedicated Category View (if customer tapped a category tile)
            3. Strict Category-First Home Experience (if selectedCategory === 'All')
        */}

        {/* 1. SEARCH RESULTS VIEW */}
        {searchQuery ? (
          <div className="pb-8">
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-extrabold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                  <span>Search Results</span>
                  <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                    {filteredProducts.length} items
                  </span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Showing matches for: <span className="font-semibold text-stone-800">"{searchQuery}"</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all cursor-pointer"
              >
                <span>✕ Clear Search & Back to Home</span>
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-stone-200 shadow-xs my-4">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400">
                  <Search className="w-7 h-7" />
                </div>
                <h4 className="font-heading font-bold text-stone-800 text-base sm:text-lg">No items match "{searchQuery}"</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  Try searching for biscuits, tea, atta, oil, soap, shampoo, or browse through categories below.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {['Snacks & Biscuits', 'Tea, Coffee & Drinks', 'Household Essentials', 'Personal Care'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory(cat as ProductCategory);
                      }}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-5 px-5 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantityInCart={cartQuantities[product.id] || 0}
                    cartQuantities={cartQuantities}
                    onAddToCart={handleAddToCart}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                ))}
              </div>
            )}
          </div>
        ) : selectedCategory !== 'All' ? (
          /* 2. DEDICATED CATEGORY PRODUCT VIEW (DRILL-DOWN) */
          <CategoryDetailView
            categoryName={selectedCategory}
            categories={customCategories}
            products={products}
            cartQuantities={cartQuantities}
            onBackToCategories={() => setSelectedCategory('All')}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateQuantity}
            onSelectCategory={(cat) => setSelectedCategory(cat as ProductCategory)}
          />
        ) : (
          /* 3. STRICT CATEGORY-FIRST HOME EXPERIENCE (ZERO RAW PRODUCT DUMP) */
          <div className="pb-6">
            {/* Bestsellers & Curated Category Hub (4-column pastel cards with 2x2 brand packshots) */}
            <div id="category-grid-section">
              <CategoryTileGrid
                categories={customCategories}
                products={products}
                onSelectCategory={(catName) => {
                  setSelectedCategory(catName as ProductCategory);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>

            {/* Most Shopped Essentials (Clean, compact single-row horizontal slider of top 5 items only) */}
            <MostShoppedSlider
              products={products}
              cartQuantities={cartQuantities}
              onAddToCart={handleAddToCart}
              onUpdateQuantity={handleUpdateQuantity}
            />
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar: Home | Order Again | Categories | 📸 Order via Parchi */}
      <BottomNavBar
        currentCategory={selectedCategory}
        isSearching={Boolean(searchQuery.trim())}
        cartItemCount={totalCartCount}
        cartTotalAmount={cartTotalAmount}
        cartItems={cartItems}
        isOrderAgainActive={isTrackerOpen}
        onGoHome={() => {
          setSelectedCategory('All');
          setSearchQuery('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOrderAgain={() => {
          setIsTrackerOpen(true);
        }}
        onOpenCategories={() => {
          if (selectedCategory !== 'All') {
            setSelectedCategory('All');
          }
          setSearchQuery('');
          setTimeout(() => {
            const el = document.getElementById('category-grid-section');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 50);
        }}
        onOpenParchi={() => setIsParchiModalOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Customer Footer with dynamic store settings */}
      <footer className="mt-16 bg-white border-t border-stone-200 pt-8 pb-24 sm:pb-12 px-4 text-xs text-stone-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-stone-900 font-heading font-extrabold text-base">
              <Store className="w-5 h-5 text-emerald-700" />
              <span>{storeSettings.name || 'Chaurasia Kirana Store'}</span>
            </div>
            <p className="mt-1 text-stone-500 text-xs max-w-lg">
              {storeSettings.address || STORE_DEFAULTS.address} • Daily Timings: 6:30 AM - 10:30 PM
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-stone-600 text-xs">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Cash on Delivery ONLY
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" /> {storeSettings.deliveryTime || 'Bharosemand Delivery'}
            </span>
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-[#c62828]" /> Free delivery above ₹{storeSettings.minOrderForFreeDelivery}
            </span>
            <a
              href={`tel:${storeSettings.phone || STORE_DEFAULTS.phone}`}
              className="flex items-center gap-1 text-[#c62828] hover:text-[#b71c1c] font-semibold"
            >
              <PhoneCall className="w-3.5 h-3.5" /> Call Store: {storeSettings.phone || STORE_DEFAULTS.phone}
            </a>
          </div>
        </div>

        {/* Play Store Compliance / Legal Links & Copyright */}
        <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-400 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Chaurasia Kirana (Kiranape) • Fresh Groceries Delivered in Waidhan & Singrauli</p>
          <div className="flex items-center justify-center gap-3">
            <button
              id="footer-privacy-policy-btn"
              onClick={handleOpenPrivacy}
              className="text-stone-600 hover:text-[#c62828] font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <a
              href={`tel:${storeSettings.phone || '9424316081'}`}
              className="text-stone-500 hover:text-stone-800 transition-colors"
            >
              Support: {storeSettings.phone || '9424316081'}
            </a>
          </div>
        </div>

        {/* Official Creator & Branding Credits */}
        <div className="max-w-6xl mx-auto mt-6 pt-5 border-t border-stone-100">
          <CreatorCredits />
        </div>
      </footer>

      {/* MODALS */}

      {/* 1. Customer Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* 3. Live Order Tracker Modal */}
      <OrderTrackerModal
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        recentOrders={orders}
        initialOrderId={placedOrder?.id}
        storeSettings={storeSettings}
      />

      {/* 4. Cart Drawer / Page */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        storeSettings={storeSettings}
        orders={orders}
        onRepeatOrder={handleRepeatOrder}
      />

      {/* 4.5. Handwritten Grocery List / Parchi Photo Upload Modal */}
      <ParchiUploadModal
        isOpen={isParchiModalOpen}
        onClose={() => setIsParchiModalOpen(false)}
        storeSettings={storeSettings}
      />

      {/* 4.6. Smart Voice-to-Note Grocery Ordering Modal */}
      <VoiceGroceryModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        storeSettings={storeSettings}
      />

      {/* 5. Checkout Modal with initial customer info if signed in */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onSubmitOrder={handleCheckoutSubmit}
        storeSettings={storeSettings}
        initialCustomer={
          currentUser
            ? {
                fullName: currentUser.displayName || '',
                phoneNumber: currentUser.phone || '',
                fullAddress: currentUser.address || '',
              }
            : undefined
        }
      />

      {/* 6. Order Confirmation Modal with Live Firestore Status Tracking */}
      <OrderConfirmationModal
        order={placedOrder}
        onClose={() => setPlacedOrder(null)}
      />

      {/* 7. Play Store Compliant Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={handleClosePrivacy}
        storeSettings={storeSettings}
      />

      {/* 7.5. Store Owner Admin Password Gate Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={handleCloseAdminPin}
        onSuccess={handleAdminPinSuccess}
      />

      {/* 8. PWA Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* 9. Instant Brand Splash Screen */}
      <SplashScreen />
    </div>
  );
}
