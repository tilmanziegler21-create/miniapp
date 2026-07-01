import { create } from 'zustand';
import { catalogAPI } from '../services/api';
import { withRetry } from '../lib/withRetry';
import { readCatalogCache, writeCatalogCache } from '../lib/catalogCache';

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
  qtyAvailable: number;
  isNew?: boolean;
  discount?: number;
  description?: string;
  tasteProfile?: {
    sweetness: number;
    sourness?: number;
    fruitiness?: number;
    coolness?: number;
    strength?: number;
  };
};

type CatalogEntry = {
  products: CatalogProduct[];
  fetchedAt: number;
};

const MEMORY_TTL_MS = 3 * 60 * 1000;

function mapApiProduct(p: Record<string, unknown>): CatalogProduct {
  return {
    id: String(p.id || ''),
    name: String(p.name || ''),
    category: String(p.category || ''),
    brand: String(p.brand || ''),
    price: Number(p.price || 0),
    image: String(p.image || ''),
    qtyAvailable: Number(p.qtyAvailable || 0),
    isNew: Boolean(p.isNew),
    discount: Number(p.discount || 0),
    description: String(p.description || ''),
    tasteProfile: p.tasteProfile as CatalogProduct['tasteProfile'],
  };
}

type CatalogState = {
  byCity: Record<string, CatalogEntry>;
  loadingCity: string | null;
  getProducts: (city: string) => CatalogProduct[] | null;
  isFresh: (city: string) => boolean;
  hydrateFromDisk: (city: string) => boolean;
  prefetch: (city: string, force?: boolean) => Promise<CatalogProduct[]>;
};

export const useCatalogStore = create<CatalogState>((set, get) => ({
  byCity: {},
  loadingCity: null,

  getProducts(city) {
    return get().byCity[city]?.products ?? null;
  },

  isFresh(city) {
    const entry = get().byCity[city];
    if (!entry) return false;
    return Date.now() - entry.fetchedAt < MEMORY_TTL_MS;
  },

  hydrateFromDisk(city) {
    const cached = readCatalogCache(city);
    if (!cached?.products?.length) return false;
    set((state) => ({
      byCity: { ...state.byCity, [city]: cached },
    }));
    return true;
  },

  async prefetch(city, force = false) {
    if (!city) return [];
    if (!force && get().isFresh(city)) {
      return get().byCity[city].products;
    }

    if (!force) get().hydrateFromDisk(city);

    set({ loadingCity: city });
    try {
      const response = await withRetry(() => catalogAPI.getProducts({ city }), { retries: 2 });
      const products = (response.data.products || []).map((p: Record<string, unknown>) => mapApiProduct(p));
      const entry: CatalogEntry = { products, fetchedAt: Date.now() };
      set((state) => ({
        byCity: { ...state.byCity, [city]: entry },
        loadingCity: null,
      }));
      writeCatalogCache(city, entry);
      return products;
    } catch (e) {
      set({ loadingCity: null });
      const stale = get().byCity[city]?.products;
      if (stale?.length) return stale;
      throw e;
    }
  },
}));
