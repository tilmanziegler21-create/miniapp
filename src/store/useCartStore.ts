import { create } from 'zustand';
import { cartAPI } from '../services/api';
import { useCityStore } from './useCityStore';
import { calculateClientCartPricing } from '../lib/cartPricing';

export interface CartItem {
  id: string;
  productId: string;
  variant?: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  quantity: number;
  image: string;
  total?: number;
  effectivePrice?: number;
  source?: 'self' | 'upsell';
}

export interface CartPricing {
  subtotal: number;
  discount: number;
  total: number;
  promoDiscount?: number;
}

export interface Cart {
  id: string;
  city: string;
  items: CartItem[];
  total: number;
  pricing?: CartPricing;
}

type OptimisticCartProduct = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
};

type OptimisticAddPayload = {
  city: string;
  product: OptimisticCartProduct;
  quantity?: number;
  variant?: string;
  source?: 'self' | 'upsell';
};

type OptimisticRollbackPayload = {
  city: string;
  productId: string;
  quantity?: number;
  variant?: string;
};

const DEFAULT_LIQUID_PRICES = { 1: 18, 2: 16, 3: 15, extra: 15 };

const scheduledSyncs = new Map<string, number>();
const inFlightSyncs = new Map<string, Promise<void>>();

const createCartId = () => `cart_${Math.random().toString(36).slice(2, 10)}`;
const createTempItemId = () => `tmp_${Math.random().toString(36).slice(2, 10)}`;

function recalculateCart(
  cart: Cart,
  liquidPrices: Record<string, number>,
  promoDiscount = 0,
): Cart {
  const result = calculateClientCartPricing(cart.items, liquidPrices, promoDiscount);
  return {
    ...cart,
    items: result.items,
    total: result.total,
    pricing: result.pricing,
  };
}

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  liquidPrices: Record<string, number>;
  promoCode: string;
  promoDiscount: number;
  promoMessage: string;
  lastTotal: number | null;
  setCart: (cart: Cart) => void;
  setLoading: (loading: boolean) => void;
  setLiquidPrices: (prices: Record<string, number>) => void;
  setPromo: (payload: { code: string; discount: number; message: string }) => void;
  clearPromo: () => void;
  addItemOptimistic: (payload: OptimisticAddPayload) => void;
  rollbackOptimisticAdd: (payload: OptimisticRollbackPayload) => void;
  updateQuantityOptimistic: (itemId: string, quantity: number) => Cart | null;
  removeItemOptimistic: (itemId: string) => Cart | null;
  restoreCart: (cart: Cart | null) => void;
  syncCart: (city: string) => Promise<void>;
  scheduleSync: (city: string, delay?: number) => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  liquidPrices: DEFAULT_LIQUID_PRICES,
  promoCode: '',
  promoDiscount: 0,
  promoMessage: '',
  lastTotal: null,
  setCart: (cart) => {
    const { liquidPrices, promoDiscount } = get();
    const next = cart ? recalculateCart(cart, liquidPrices, promoDiscount) : null;
    set((state) => ({
      cart: next,
      lastTotal: next ? state.lastTotal ?? next.total : null,
    }));
  },
  setLoading: (loading) => set({ isLoading: loading }),
  setLiquidPrices: (prices) =>
    set((state) => {
      const liquidPrices = prices && Object.keys(prices).length ? prices : DEFAULT_LIQUID_PRICES;
      const cart = state.cart ? recalculateCart(state.cart, liquidPrices, state.promoDiscount) : state.cart;
      return { liquidPrices, cart };
    }),
  setPromo: ({ code, discount, message }) =>
    set((state) => ({
      promoCode: code,
      promoDiscount: discount,
      promoMessage: message,
      cart: state.cart ? recalculateCart(state.cart, state.liquidPrices, discount) : state.cart,
    })),
  clearPromo: () =>
    set((state) => ({
      promoCode: '',
      promoDiscount: 0,
      promoMessage: '',
      cart: state.cart ? recalculateCart(state.cart, state.liquidPrices, 0) : state.cart,
    })),
  addItemOptimistic: ({ city, product, quantity = 1, variant = '', source = 'self' }) =>
    set((state) => {
      const baseCart =
        state.cart && state.cart.city === city
          ? state.cart
          : {
              id: state.cart?.id && state.cart.city === city ? state.cart.id : createCartId(),
              city,
              items: [],
              total: 0,
            };

      const normalizedVariant = String(variant || '');
      const existingItem = baseCart.items.find(
        (item) => String(item.productId) === String(product.id) && String(item.variant || '') === normalizedVariant,
      );

      const items = existingItem
        ? baseCart.items.map((item) =>
            item.id === existingItem.id
              ? {
                  ...item,
                  quantity: Number(item.quantity || 0) + Number(quantity || 1),
                  price: Number(product.price || item.price || 0),
                  image: product.image || item.image,
                  source: source === 'upsell' ? 'upsell' : item.source || 'self',
                }
              : item,
          )
        : [
            ...baseCart.items,
            {
              id: createTempItemId(),
              productId: String(product.id),
              variant: normalizedVariant,
              name: product.name,
              category: product.category,
              brand: product.brand,
              price: Number(product.price || 0),
              quantity: Number(quantity || 1),
              image: product.image || '',
              source,
            },
          ];

      const nextCart = recalculateCart({ ...baseCart, items }, state.liquidPrices, state.promoDiscount);
      return { cart: nextCart, lastTotal: state.lastTotal ?? nextCart.total };
    }),
  rollbackOptimisticAdd: ({ city, productId, quantity = 1, variant = '' }) =>
    set((state) => {
      if (!state.cart || state.cart.city !== city) return state;

      const normalizedVariant = String(variant || '');
      const target = state.cart.items.find(
        (item) => String(item.productId) === String(productId) && String(item.variant || '') === normalizedVariant,
      );
      if (!target) return state;

      const remainingQuantity = Number(target.quantity || 0) - Number(quantity || 1);
      const nextItems =
        remainingQuantity > 0
          ? state.cart.items.map((item) =>
              item.id === target.id ? { ...item, quantity: remainingQuantity } : item,
            )
          : state.cart.items.filter((item) => item.id !== target.id);

      return {
        cart: recalculateCart({ ...state.cart, items: nextItems }, state.liquidPrices, state.promoDiscount),
      };
    }),
  updateQuantityOptimistic: (itemId, quantity) => {
    let snapshot: Cart | null = null;
    set((state) => {
      if (!state.cart) return state;
      snapshot = state.cart;
      const nextItems =
        quantity <= 0
          ? state.cart.items.filter((item) => item.id !== itemId)
          : state.cart.items.map((item) =>
              item.id === itemId ? { ...item, quantity: Number(quantity || 0) } : item,
            );
      const nextCart = recalculateCart({ ...state.cart, items: nextItems }, state.liquidPrices, state.promoDiscount);
      return { cart: nextCart };
    });
    return snapshot;
  },
  removeItemOptimistic: (itemId) => {
    let snapshot: Cart | null = null;
    set((state) => {
      if (!state.cart) return state;
      snapshot = state.cart;
      const nextCart = recalculateCart(
        { ...state.cart, items: state.cart.items.filter((item) => item.id !== itemId) },
        state.liquidPrices,
        state.promoDiscount,
      );
      return { cart: nextCart };
    });
    return snapshot;
  },
  restoreCart: (cart) =>
    set((state) => ({
      cart: cart ? recalculateCart(cart, state.liquidPrices, state.promoDiscount) : null,
    })),
  syncCart: async (city) => {
    const normalizedCity = String(city || '').trim();
    if (!normalizedCity) return;

    const existing = inFlightSyncs.get(normalizedCity);
    if (existing) return existing;

    const promise = (async () => {
      set({ isLoading: true });
      try {
        const resp = await cartAPI.getCart(normalizedCity);
        if (useCityStore.getState().city === normalizedCity) {
          const rawCart = resp.data?.cart;
          const liquidPrices = resp.data?.liquidPrices || get().liquidPrices;
          const safeCart = rawCart
            ? { ...rawCart, items: Array.isArray(rawCart.items) ? rawCart.items : [] }
            : rawCart;
          const prevTotal = get().cart?.pricing?.total ?? get().cart?.total ?? null;
          const promoDiscount = get().promoDiscount;
          const nextCart = safeCart
            ? recalculateCart(safeCart, liquidPrices, promoDiscount)
            : safeCart;
          set({
            cart: nextCart,
            liquidPrices,
            lastTotal: prevTotal,
            isLoading: false,
          });
        }
      } finally {
        inFlightSyncs.delete(normalizedCity);
        set({ isLoading: false });
      }
    })();

    inFlightSyncs.set(normalizedCity, promise);
    return promise;
  },
  scheduleSync: (city, delay = 220) => {
    const normalizedCity = String(city || '').trim();
    if (!normalizedCity) return;

    const existingTimer = scheduledSyncs.get(normalizedCity);
    if (existingTimer) window.clearTimeout(existingTimer);

    const timer = window.setTimeout(() => {
      scheduledSyncs.delete(normalizedCity);
      useCartStore.getState().syncCart(normalizedCity).catch(() => {});
    }, delay);

    scheduledSyncs.set(normalizedCity, timer);
  },
}));
