import React from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { GlassCard, PrimaryButton, ProductCard, ProductCardSkeleton, theme } from '../ui';
import { useConfigStore } from '../store/useConfigStore';
import { useCityStore } from '../store/useCityStore';
import { useCatalogStore } from '../store/useCatalogStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { useCartStore } from '../store/useCartStore';
import { assetUrl } from '../lib/productMedia';
import { categoryFilterMatches, getCategoryLabel } from '../lib/categories';
import { cartAPI } from '../services/api';
import { useToastStore } from '../store/useToastStore';

const Categories: React.FC = () => {
  const navigate = useNavigate();
  const config = useConfigStore((state) => state.config);
  const isLoading = useConfigStore((state) => state.isLoading);
  const error = useConfigStore((state) => state.error);
  const load = useConfigStore((state) => state.load);
  const { city } = useCityStore();
  const catalogEntry = useCatalogStore((state) => (city ? state.byCity[city] : undefined));
  const favorites = useFavoritesStore();
  const addItemOptimistic = useCartStore((state) => state.addItemOptimistic);
  const scheduleSync = useCartStore((state) => state.scheduleSync);
  const pushToast = useToastStore((state) => state.push);
  const tiles = config?.categoryTiles || [];
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const productsRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (city) {
      useCatalogStore.getState().prefetch(city).catch(() => {});
      favorites.load(city);
    }
  }, [city, favorites]);

  const filteredProducts = React.useMemo(() => {
    if (!activeCategory) return [];
    return (catalogEntry?.products || [])
      .filter((product) => categoryFilterMatches(activeCategory, product.category))
      .slice(0, 12);
  }, [activeCategory, catalogEntry?.products]);

  const handleTileClick = (slug: string) => {
    const next = activeCategory === slug ? null : slug;
    setActiveCategory(next);
    try { WebApp.HapticFeedback.impactOccurred('light'); } catch { /* ignore */ }
    if (next) {
      window.setTimeout(() => {
        productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  const addToCart = async (product: (typeof filteredProducts)[number]) => {
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }
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
      await cartAPI.addItem({ productId: product.id, quantity: 1, city, variant: product.name });
      scheduleSync(city);
    } catch {
      scheduleSync(city, 0);
      pushToast('Не удалось добавить товар', 'error');
    }
  };

  return (
    <div style={{ padding: theme.padding.screen }}>
      <div
        style={{
          textAlign: 'center',
          color: theme.colors.dark.text,
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing.lg,
        }}
      >
        Категории
      </div>

      {!tiles.length && !isLoading && error ? (
        <GlassCard padding="lg" variant="elevated">
          <div style={{ textAlign: 'center', color: theme.colors.dark.textSecondary, marginBottom: theme.spacing.md }}>
            Не удалось загрузить категории
          </div>
          <PrimaryButton fullWidth onClick={() => load()}>Повторить</PrimaryButton>
        </GlassCard>
      ) : !tiles.length && !isLoading ? (
        <GlassCard padding="lg" variant="elevated">
          <div style={{ textAlign: 'center', color: theme.colors.dark.textSecondary }}>Категории скоро появятся</div>
        </GlassCard>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
        {!tiles.length ? (
          [...Array(4)].map((_, i) => (
            <GlassCard
              key={i}
              padding="md"
              variant="elevated"
              style={{ height: 140, borderRadius: theme.radius.lg, overflow: 'hidden' }}
            >
              <div style={{ height: 140 }} className="animate-pulse" />
            </GlassCard>
          ))
        ) : tiles.map((t) => (
          <GlassCard
            key={t.slug}
            padding="md"
            variant="elevated"
            className={`category-tile${activeCategory === t.slug ? ' category-tile--active' : ''}`}
            style={{
              height: 140,
              borderRadius: theme.radius.lg,
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              border: '1px solid rgba(96,165,250,0.18)',
            }}
            onClick={() => handleTileClick(t.slug)}
          >
            <img
              src={assetUrl(t.imageUrl)}
              alt={t.title}
              loading="lazy"
              decoding="async"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                padding: theme.spacing.md,
              }}
            />
            {t.badgeText ? (
              <div
                style={{
                  position: 'absolute',
                  top: theme.spacing.md,
                  right: theme.spacing.md,
                  background: 'rgba(96,165,250,0.22)',
                  color: '#fff',
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.bold,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {t.badgeText}
              </div>
            ) : null}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 50%, rgba(8,17,31,0.5) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: theme.spacing.md,
                right: theme.spacing.md,
                bottom: theme.spacing.md,
                textAlign: 'center',
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {t.title}
            </div>
          </GlassCard>
        ))}
      </div>
      )}

      {activeCategory ? (
        <div ref={productsRef} style={{ marginTop: theme.spacing.xl }}>
          <div
            style={{
              textAlign: 'center',
              fontSize: theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.bold,
              marginBottom: theme.spacing.md,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {getCategoryLabel(activeCategory)}
          </div>
          {!catalogEntry ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
              {[...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  stock={product.qtyAvailable}
                  isFavorite={favorites.isFavorite(product.id)}
                  onToggleFavorite={() => favorites.toggle({ city: city || '', product, enabled: !favorites.isFavorite(product.id) })}
                  onClick={() => navigate(`/product/${product.id}`)}
                  onAddToCart={() => addToCart(product)}
                />
              ))}
            </div>
          ) : (
            <GlassCard padding="lg" variant="elevated">
              <div style={{ textAlign: 'center', color: theme.colors.dark.textSecondary }}>В этой категории пока нет товаров</div>
            </GlassCard>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default Categories;
