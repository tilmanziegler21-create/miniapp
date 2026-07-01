import { create } from 'zustand';
import { favoritesAPI } from '../services/api';

let favoritesLoadRequestId = 0;
let favoritesToggleInFlight = 0;

export type FavoriteItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
};

type FavoritesState = {
  city: string | null;
  items: FavoriteItem[];
  ids: Record<string, true>;
  isLoading: boolean;
  error: string | null;
  load: (city: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  toggle: (payload: { city: string; product: FavoriteItem; enabled: boolean }) => Promise<void>;
};

function mergeFavoriteState(serverItems: FavoriteItem[], localIds: Record<string, true>, localItems: FavoriteItem[]) {
  const mergedIds: Record<string, true> = {};
  const mergedItemsMap = new Map<string, FavoriteItem>();

  for (const item of serverItems) {
    mergedIds[String(item.id)] = true;
    mergedItemsMap.set(String(item.id), item);
  }

  for (const id of Object.keys(localIds)) {
    if (!mergedIds[id]) {
      mergedIds[id] = true;
      const localItem = localItems.find((x) => String(x.id) === id);
      if (localItem) mergedItemsMap.set(id, localItem);
    }
  }

  return {
    ids: mergedIds,
    items: Array.from(mergedItemsMap.values()),
  };
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  city: null,
  items: [],
  ids: {},
  isLoading: false,
  error: null,
  load: async (city) => {
    const requestId = ++favoritesLoadRequestId;
    const localIds = { ...get().ids };
    const localItems = [...get().items];
    set({ isLoading: true, error: null, city });
    try {
      const resp = await favoritesAPI.list(city);
      const serverItems: FavoriteItem[] = resp.data.favorites || resp.data.items || [];
      if (requestId !== favoritesLoadRequestId || get().city !== city) return;

      if (favoritesToggleInFlight > 0) {
        const merged = mergeFavoriteState(serverItems, localIds, localItems);
        set({ ...merged, isLoading: false, error: null, city });
        return;
      }

      const ids: Record<string, true> = {};
      for (const it of serverItems) ids[String(it.id)] = true;
      set({ items: serverItems, ids, isLoading: false, error: null, city });
    } catch (e) {
      console.error('Failed to load favorites:', e);
      if (requestId === favoritesLoadRequestId && get().city === city) {
        set({ isLoading: false, error: 'FAVORITES_LOAD_FAILED' });
      }
    }
  },
  isFavorite: (productId) => Boolean(get().ids[String(productId)]),
  toggle: async ({ city, product, enabled }) => {
    favoritesToggleInFlight += 1;
    const productId = String(product.id);
    const prevIds = get().ids;
    const prevItems = get().items;

    const nextIds = { ...prevIds };
    let nextItems = prevItems;
    if (enabled) {
      nextIds[productId] = true;
      if (!prevIds[productId]) {
        nextItems = [product, ...prevItems.filter((x) => String(x.id) !== productId)];
      }
    } else {
      delete nextIds[productId];
      nextItems = prevItems.filter((x) => String(x.id) !== productId);
    }
    set({ ids: nextIds, items: nextItems, city });

    try {
      await favoritesAPI.toggle(productId, enabled, product);
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
      set({ ids: prevIds, items: prevItems });
      throw e;
    } finally {
      favoritesToggleInFlight = Math.max(0, favoritesToggleInFlight - 1);
    }
  },
}));
