import { create } from 'zustand';
import { cartAPI } from '../services/api';
import { useCityStore } from './useCityStore';

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

const scheduledSyncs = new Map<string, number>();
const inFlightSyncs = new Map<string, Promise<void>>();

const createCartId = () => `cart_${Math.random().toString(36).slice(2, 10)}`;
const createTempItemId = () => `tmp_${Math.random().toString(36).slice(2, 10)}`;

const recalculateCart = (cart: Cart): Cart => {
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const roundedSubtotal = Math.round(subtotal * 100) / 100;

  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      total: Math.round(Number(item.price || 0) * Number(item.quantity || 0) * 100) / 100,
      effectivePrice: Number(item.price || 0),
    })),
    total: roundedSubtotal,
    pricing: {
      subtotal: roundedSubtotal,
      discount: 0,
      total: roundedSubtotal,
    },
  };
};

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  setCart: (cart: Cart) => void;
  setLoading: (loading: boolean) => void;
  addItemOptimistic: (payload: OptimisticAddPayload) => void;
  rollbackOptimisticAdd: (payload: OptimisticRollbackPayload) => void;
  updateQuantityOptimistic: (itemId: string, quantity: number) => void;
  removeItemOptimistic: (itemId: string) => void;
  syncCart: (city: string) => Promise<void>;
  scheduleSync: (city: string, delay?: number) => void;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  isLoading: false,
  setCart: (cart) => set({ cart }),
  setLoading: (loading) => set({ isLoading: loading }),
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

      return {
        cart: recalculateCart({
          ...baseCart,
          items,
        }),
      };
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
        cart: recalculateCart({
          ...state.cart,
          items: nextItems,
        }),
      };
    }),
  updateQuantityOptimistic: (itemId, quantity) =>
    set((state) => {
      if (!state.cart) return state;
      const nextItems = quantity <= 0
        ? state.cart.items.filter((item) => item.id !== itemId)
        : state.cart.items.map((item) =>
            item.id === itemId ? { ...item, quantity: Number(quantity || 0) } : item,
          );

      return {
        cart: recalculateCart({
          ...state.cart,
          items: nextItems,
        }),
      };
    }),
  removeItemOptimistic: (itemId) =>
    set((state) => {
      if (!state.cart) return state;
      return {
        cart: recalculateCart({
          ...state.cart,
          items: state.cart.items.filter((item) => item.id !== itemId),
        }),
      };
    }),
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
          set({ cart: resp.data.cart, isLoading: false });
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
