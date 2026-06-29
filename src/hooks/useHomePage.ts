import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { catalogAPI, cartAPI } from '../services/api';
import { useCityStore } from '../store/useCityStore';
import { useCartStore } from '../store/useCartStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useConfigStore } from '../store/useConfigStore';
import { useToastStore } from '../store/useToastStore';
import { useSplashStore } from '../store/useSplashStore';

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
  const toast = useToastStore();
  const { addItemOptimistic, scheduleSync, setCart } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    try {
      setLoading(true);
      setLoadError(null);
      if (!city) {
        setLoadError('Выберите город');
        return;
      }
      const response = await catalogAPI.getProducts({ city });
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
      setProducts(featured);
    } catch (error) {
      console.error('Failed to load products:', error);
      const status = (error as any)?.response?.status;
      if (status === 503) {
        const missing = (error as any)?.response?.data?.missing || [];
        setLoadError(`Sheets не настроен. Добавь env: ${missing.join(', ')}`);
      } else {
        setLoadError('Не удалось загрузить каталог');
      }
    } finally {
      setLoading(false);
      setReady(true);
    }
  };

  const addToCart = async (product: Product) => {
    if (!city) {
      toast.push('Выберите город', 'error');
      return;
    }
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch (err) { /* ignore */ }
    const previousCart = useCartStore.getState().cart;
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
      toast.push('Добавлено в корзину', 'success');
    } catch {
      if (previousCart) {
        setCart(previousCart);
      } else {
        setCart({ id: '', city, items: [], total: 0 });
      }
      toast.push('Ошибка добавления в корзину', 'error');
    }
  };

  const toggleFavorite = async (product: Product) => {
    if (!city) {
      toast.push('Выберите город', 'error');
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
      toast.push(enabled ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
    } catch {
      toast.push('Ошибка избранного', 'error');
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
  };
}
