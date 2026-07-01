import { useState, useEffect, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { catalogAPI, cartAPI } from '../services/api';
import { useCityStore } from '../store/useCityStore';
import { useCartStore } from '../store/useCartStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useConfigStore } from '../store/useConfigStore';
import { useToastStore } from '../store/useToastStore';
import { useSplashStore } from '../store/useSplashStore';
import { withRetry } from '../lib/withRetry';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
  isNew?: boolean;
  qtyAvailable?: number;
}

export function useHomePage() {
  const pushToast = useToastStore((state) => state.push);
  const addItemOptimistic = useCartStore((state) => state.addItemOptimistic);
  const rollbackOptimisticAdd = useCartStore((state) => state.rollbackOptimisticAdd);
  const scheduleSync = useCartStore((state) => state.scheduleSync);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const { city } = useCityStore();
  const favorites = useFavoritesStore();
  const { config } = useConfigStore();
  const { setReady } = useSplashStore();

  const categories = (config?.categoryTiles || []).map((t) => ({
    slug: t.slug,
    name: t.title,
    image: t.imageUrl,
    badgeText: t.badgeText || '',
  }));

  useEffect(() => {
    loadProducts();
    if (city) favorites.load(city);
  }, [city]);

  const loadProducts = async () => {
    const requestId = ++requestRef.current;
    try {
      setLoading(true);
      setLoadError(null);
      if (!city) {
        if (requestId === requestRef.current) setLoadError('Выберите город');
        return;
      }
      const response = await withRetry(() => catalogAPI.getProducts({ city }), { retries: 2 });
      const featured: Product[] = response.data.products.slice(0, 4).map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        brand: p.brand,
        price: p.price,
        image: p.image || '',
        isNew: Boolean(p.isNew),
        qtyAvailable: Number(p.qtyAvailable || 0),
      }));
      if (requestId === requestRef.current && useCityStore.getState().city === city) {
        setProducts(featured);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      const status = (error as any)?.response?.status;
      if (requestId !== requestRef.current) return;
      if (status === 503) {
        const missing = (error as any)?.response?.data?.missing || [];
        setLoadError(`Sheets не настроен. Добавь env: ${missing.join(', ')}`);
      } else {
        setLoadError('Не удалось загрузить каталог');
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setReady(true);
      }
    }
  };

  const addToCart = async (product: Product) => {
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch (err) { /* ignore */ }
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
      rollbackOptimisticAdd({
        city,
        productId: product.id,
        quantity: 1,
      });
      scheduleSync(city, 0);
    }
  };

  const toggleFavorite = async (product: Product) => {
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
    loading,
    loadError,
    categories,
    city,
    favorites,
    addToCart,
    toggleFavorite,
    reload: loadProducts,
  };
}
