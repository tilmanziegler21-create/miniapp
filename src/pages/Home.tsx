import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { theme, GlassCard, PrimaryButton, ChipBadge, ProductCard, SectionDivider, AddToCartModal } from '../ui';
import { useCartStore } from '../store/useCartStore';
import { cartAPI, catalogAPI } from '../services/api';
import { Grid, Gift, Star, Search, Phone } from 'lucide-react';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../lib/currency';
import { useCityStore } from '../store/useCityStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useConfigStore } from '../store/useConfigStore';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
  isNew?: boolean;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const { setCart } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addProduct, setAddProduct] = useState<Product | null>(null);
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

  const styles = {
    container: {
      minHeight: '100vh',
      color: theme.colors.dark.text,
      fontFamily: theme.typography.fontFamily,
    },
    quickActionsGrid: {
      padding: `0 ${theme.padding.screen}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    quickActionButton: {
      height: 100,
      borderRadius: theme.radius.lg,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      background: 'linear-gradient(135deg, rgba(96,165,250,0.16) 0%, rgba(30,64,175,0.12) 100%)',
      border: '1px solid rgba(96,165,250,0.24)',
      color: theme.colors.dark.text,
      textDecoration: 'none',
      transition: 'all 0.2s ease',
    },
    quickActionIcon: {
      width: 32,
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickActionText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
      textAlign: 'center' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
    },
    searchSection: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.lg,
    },
    searchButton: {
      background: 'rgba(96,165,250,0.08)',
      border: '1px solid rgba(96,165,250,0.18)',
      borderRadius: theme.radius.lg,
      padding: theme.spacing.md,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      color: theme.colors.dark.textSecondary,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    categoryGrid: {
      padding: `0 ${theme.padding.screen}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    categoryCard: {
      height: 160,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      position: 'relative' as const,
      boxShadow: theme.shadow.card,
      border: '1px solid rgba(255,255,255,0.14)',
    },
    categoryTitle: {
      position: 'absolute' as const,
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.14em',
      textShadow: '0 10px 30px rgba(0,0,0,0.55)',
    },
    productGrid: {
      padding: `0 ${theme.padding.screen}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
    skeleton: {
      background: 'rgba(96,165,250,0.08)',
      borderRadius: theme.radius.lg,
      height: 280,
      animation: 'pulse 1.5s ease-in-out infinite',
      border: '1px solid rgba(255,255,255,0.10)',
    },
  };

  return (
    <div style={styles.container}>
      <SectionDivider title="Быстрые действия" />

      {/* Quick Action Buttons */}
      <div style={styles.quickActionsGrid}>
        <div
          style={styles.quickActionButton}
          onClick={() => navigate('/catalog')}
          role="button"
        >
          <div style={styles.quickActionIcon}>
            <Grid size={24} color={theme.colors.dark.primary} />
          </div>
          <div style={styles.quickActionText}>Каталог</div>
        </div>
        <div
          style={styles.quickActionButton}
          onClick={() => navigate('/promotions')}
          role="button"
        >
          <div style={styles.quickActionIcon}>
            <Gift size={24} color={theme.colors.dark.primary} />
          </div>
          <div style={styles.quickActionText}>Акции</div>
        </div>
        <div
          style={styles.quickActionButton}
          onClick={() => navigate('/bonuses')}
          role="button"
        >
          <div style={styles.quickActionIcon}>
            <Star size={24} color={theme.colors.dark.primary} />
          </div>
          <div style={styles.quickActionText}>Бонусы</div>
        </div>
        <div
          style={styles.quickActionButton}
          onClick={() => navigate('/support')}
          role="button"
        >
          <div style={styles.quickActionIcon}>
            <Phone size={24} color={theme.colors.dark.primary} />
          </div>
          <div style={styles.quickActionText}>Поддержка</div>
        </div>
      </div>

      {/* Search Section */}
      <div style={styles.searchSection}>
        <div
          style={styles.searchButton}
          onClick={() => navigate('/catalog')}
          role="button"
        >
          <Search size={18} color={theme.colors.dark.textSecondary} />
          <span>Поиск по вкусам, брендам и названиям...</span>
        </div>
      </div>

      <div style={styles.categoryGrid}>
        {categories.map((category) => (
          <div
            key={category.name}
            style={{
              ...styles.categoryCard,
              background: 'linear-gradient(135deg, rgba(14,27,51,0.92) 0%, rgba(11,20,36,0.96) 100%)',
            }}
            onClick={() => navigate(`/catalog?category=${encodeURIComponent(category.slug)}`)}
            role="button"
          >
            {category.image ? (
              <img
                src={category.image}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(8,17,31,0.30) 0%, rgba(8,17,31,0.76) 100%)' }} />
            {category.badgeText ? (
              <div style={{ position: 'absolute', top: theme.spacing.md, right: theme.spacing.md }}>
                <ChipBadge variant="new" size="sm">{category.badgeText}</ChipBadge>
              </div>
            ) : null}
            <div style={styles.categoryTitle}>{category.name}</div>
          </div>
        ))}
      </div>

      <SectionDivider title="Наш каталог" />

      {loadError ? (
        <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.lg }}>
          <GlassCard padding="lg" variant="elevated">
            <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm, lineHeight: '1.4' }}>{loadError}</div>
          </GlassCard>
        </div>
      ) : null}

      {loading ? (
        <div style={styles.productGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={styles.skeleton} />
          ))}
        </div>
      ) : (
        <div style={styles.productGrid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onClick={(id) => navigate(`/product/${id}`)}
              onAddToCart={() => {
                setAddProduct(product);
                setAddOpen(true);
              }}
                isFavorite={favorites.isFavorite(product.id)}
                onToggleFavorite={async () => {
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
                }}
            />
          ))}
          <GlassCard
            padding="lg"
            variant="elevated"
            style={{
              height: 280,
              borderRadius: theme.radius.lg,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(96,165,250,0.18) 0%, rgba(30,64,175,0.16) 100%)',
              border: '1px solid rgba(96,165,250,0.18)',
            }}
          >
            <div style={{ fontSize: 44, lineHeight: 1, marginBottom: theme.spacing.sm, opacity: 0.9 }}>i</div>
            <div style={{ textAlign: 'center', fontSize: theme.typography.fontSize.sm, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9, marginBottom: theme.spacing.md }}>
              При покупке 3 шт. цена за 1 шт. составит
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.92)',
              color: '#000',
              borderRadius: 999,
              padding: '8px 14px',
              fontWeight: theme.typography.fontWeight.bold,
              boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
            }}>
              {formatCurrency(50)}
            </div>
          </GlassCard>
        </div>
      )}

      <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.xl }}>
        <PrimaryButton fullWidth onClick={() => navigate('/referral')}>
          Пригласить друга
        </PrimaryButton>
      </div>

      <AddToCartModal
        open={addOpen}
        product={addProduct ? { id: addProduct.id, name: addProduct.name, price: addProduct.price, image: addProduct.image, variants: ['Cool Menthol', 'Sour Strawberry Dragonfruit', 'Berry Ice'] } : null}
        onClose={() => setAddOpen(false)}
        onConfirm={async ({ quantity, variant }) => {
          if (!addProduct) return;
          if (!city) {
            toast.push('Выберите город', 'error');
            return;
          }
          try {
            await cartAPI.addItem({ productId: addProduct.id, quantity, city, price: addProduct.price, variant });
            const resp = await cartAPI.getCart(city);
            setCart(resp.data.cart);
            toast.push('Товар добавлен в корзину', 'success');
          } catch {
            toast.push('Ошибка добавления в корзину', 'error');
          }
        }}
      />
    </div>
  );
};

export default Home;
