import { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import { catalogAPI, cartAPI } from '../services/api';
import { useCityStore } from '../store/useCityStore';
import { useCartStore } from '../store/useCartStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useConfigStore } from '../store/useConfigStore';
import { useToastStore } from '../store/useToastStore';

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
  const { setCart } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { city } = useCityStore();
  const favorites = useFavoritesStore();
  const { config } = useConfigStore();

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
    }
  };

  const addToCart = async (product: Product) => {
    if (!city) {
      toast.push('Выберите город', 'error');
      return;
    }
    try {
      await cartAPI.addItem({ productId: product.id, quantity: 1, city, price: product.price });
      const resp = await cartAPI.getCart(city);
      setCart(resp.data.cart);
      toast.push('Товар сразу добавлен в корзину', 'success');
      
      if (product.category === 'liquids' || product.category === 'Жидкости') {
        if (Math.random() > 0.5) {
          setTimeout(() => {
            try {
              WebApp.showConfirm('Возьмите еще одну жидкость!\n1 шт - 18\n2 шт - 32\n3 шт - 45\nкаждая следующая по 14', (confirmed) => {
                if (confirmed) {
                  // navigate to liquids
                }
              });
            } catch {
              toast.push('Скидки на жидкости: 1=18, 2=32, 3=45, далее по 14!', 'info');
            }
          }, 1000);
        }
      } else if (product.category === 'pods' || product.category === 'Поды') {
        setTimeout(() => {
          try {
            WebApp.showConfirm('Собери набор!\nНабор это 1 под + 2 жидкости.\nДобавить жидкости?', (confirmed) => {
              if (confirmed) {
                // user can pick from catalog
              }
            });
          } catch {
            toast.push('Набор: 1 под + 2 жидкости. Загляни в каталог!', 'info');
          }
        }, 1000);
      }
    } catch {
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