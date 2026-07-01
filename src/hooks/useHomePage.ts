import { useState, useEffect, useRef, useCallback } from 'react';
import WebApp from '@twa-dev/sdk';
import { cartAPI } from '../services/api';
import { useCityStore } from '../store/useCityStore';
import { useCartStore } from '../store/useCartStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useConfigStore } from '../store/useConfigStore';
import { useToastStore } from '../store/useToastStore';
import { useCatalogStore, type CatalogProduct } from '../store/useCatalogStore';

export function useHomePage() {
  const { city } = useCityStore();
  const pushToast = useToastStore((state) => state.push);
  const addItemOptimistic = useCartStore((state) => state.addItemOptimistic);
  const rollbackOptimisticAdd = useCartStore((state) => state.rollbackOptimisticAdd);
  const scheduleSync = useCartStore((state) => state.scheduleSync);
  const catalogProducts = useCatalogStore((state) => (city ? state.byCity[city] : undefined));
  const prefetchCatalog = useCatalogStore((state) => state.prefetch);
  const favorites = useFavoritesStore();
  const { config } = useConfigStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);

  const categories = (config?.categoryTiles || []).map((t) => ({
    slug: t.slug,
    name: t.title,
    image: t.imageUrl,
    badgeText: t.badgeText || '',
  }));

  const entry = catalogProducts;
  const products: CatalogProduct[] = entry ? entry.products.slice(0, 4) : [];
  const loading = Boolean(city) && !entry && !loadError;

  const loadProducts = useCallback(async (force = false) => {
    const requestId = ++requestRef.current;
    if (!city) {
      setLoadError('Выберите город');
      return;
    }
    try {
      setRefreshing(true);
      setLoadError(null);
      await prefetchCatalog(city, force);
    } catch (error) {
      console.error('Failed to load products:', error);
      if (requestId !== requestRef.current) return;
      const status = (error as { response?: { status?: number; data?: { missing?: string[] } } })?.response?.status;
      if (status === 503) {
        const missing = (error as { response?: { data?: { missing?: string[] } } })?.response?.data?.missing || [];
        setLoadError(`Sheets не настроен. Добавь env: ${missing.join(', ')}`);
      } else {
        setLoadError('Не удалось загрузить каталог');
      }
    } finally {
      if (requestId === requestRef.current) {
        setRefreshing(false);
      }
    }
  }, [city, prefetchCatalog]);

  useEffect(() => {
    if (!city) return;
    useFavoritesStore.getState().load(city);
    if (!useCatalogStore.getState().byCity[city]) {
      loadProducts(false);
    }
  }, [city, loadProducts]);

  const addToCart = async (product: CatalogProduct) => {
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch { /* ignore */ }
    addItemOptimistic({
      city,
      quantity: 1,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        brand: product.brand,
        price: product.price,
        image: product.image,
      },
    });
    try {
      await cartAPI.addItem({ productId: product.id, quantity: 1, city, price: product.price });
      scheduleSync(city);
      pushToast('Добавлено в корзину', 'success');
    } catch {
      rollbackOptimisticAdd({ city, productId: product.id, quantity: 1 });
      scheduleSync(city, 0);
    }
  };

  const toggleFavorite = async (product: CatalogProduct) => {
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }
    const enabled = !favorites.isFavorite(product.id);
    try {
      await favorites.toggle({
        city,
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand,
          price: product.price,
          image: product.image,
        },
        enabled,
      });
      pushToast(enabled ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
    } catch {
      pushToast('Ошибка избранного', 'error');
    }
  };

  return {
    products,
    loading: loading || refreshing,
    loadError,
    categories,
    city,
    favorites,
    addToCart,
    toggleFavorite,
    reload: () => loadProducts(true),
  };
}
