import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { cartAPI } from '../services/api';
import { useCartStore } from '../store/useCartStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { ProductCard, GlassCard, SecondaryButton, ProductCardSkeleton, theme } from '../ui';
import { useCatalogStore, type CatalogProduct } from '../store/useCatalogStore';
import { useToastStore } from '../store/useToastStore';
import { useCityStore } from '../store/useCityStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { resolveBrandAssetUrl, useBranding } from '../hooks/useBranding';
import { getStableTrustData } from '../lib/productPresentation';
import { normalizeTasteProfile } from '../lib/productMedia';

const Catalog: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const addItemOptimistic = useCartStore((state) => state.addItemOptimistic);
  const rollbackOptimisticAdd = useCartStore((state) => state.rollbackOptimisticAdd);
  const scheduleSync = useCartStore((state) => state.scheduleSync);
  const { trackAddToCart, trackFilterUse, trackCategoryView } = useAnalytics();
  const { city } = useCityStore();
  const branding = useBranding();
  const favorites = useFavoritesStore();
  const [searchParams] = useSearchParams();
  const catalogByCity = useCatalogStore((state) => state.byCity);
  const prefetchCatalog = useCatalogStore((state) => state.prefetch);
  const catalogEntry = city ? catalogByCity[city] : undefined;
  const products: CatalogProduct[] = catalogEntry?.products || [];
  const [loadError, setLoadError] = useState<string | null>(null);
  const loading = Boolean(city) && !catalogEntry && !loadError;
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const catalogRequestRef = React.useRef(0);
  const [filters, setFilters] = useState({
    category: '',
    brand: '',
    price_min: '',
    price_max: '',
    discount: false,
    new: false,
    taste_sweetness_min: '',
    taste_sweetness_max: '',
    taste_coolness_min: '',
    taste_fruitiness_min: '',
  });

  useEffect(() => {
    const qCategory = searchParams.get('category');
    if (qCategory) {
      setFilters((s) => ({ ...s, category: qCategory }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!city) return;
    favorites.load(city);
    loadCatalog(city);
  }, [city]);

  useEffect(() => {
    if (filters.category) trackCategoryView(filters.category);
    if (filters.brand) trackFilterUse('brand', filters.brand);
    if (filters.discount) trackFilterUse('discount', 'true');
    if (filters.new) trackFilterUse('new', 'true');
    if (filters.price_min || filters.price_max) {
      trackFilterUse('price_range', `${filters.price_min || 0}-${filters.price_max || '∞'}`);
    }
  }, [filters.category, filters.brand, filters.price_min, filters.price_max, filters.discount, filters.new, trackCategoryView, trackFilterUse]);

  const loadCatalog = async (selectedCity: string) => {
    const requestId = ++catalogRequestRef.current;
    try {
      setLoadError(null);
      await prefetchCatalog(selectedCity);
    } catch (error) {
      console.error('Failed to load catalog:', error);
      if (requestId === catalogRequestRef.current) {
        setLoadError('Не удалось загрузить каталог');
      }
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  );

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort(),
    [products],
  );

  const getCategoryName = (slug: string) => {
    const map: Record<string, string> = {
      liquids: 'Жидкости',
      electronics: 'Электронки',
      pods: 'Поды',
      cartridges: 'Картриджи',
      disposables: 'Одноразки'
    };
    return map[slug] || slug;
  };

  const addToCart = async (product: CatalogProduct) => {
    if (!city) {
      toast.push('Выберите город', 'error');
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
      await cartAPI.addItem({
        productId: product.id,
        quantity: 1,
        city,
        price: product.price,
      });
      scheduleSync(city);
      trackAddToCart(product.id, product.name, product.price, 1);
    } catch (error) {
      console.error('Add to cart failed:', error);
      rollbackOptimisticAdd({
        city,
        productId: product.id,
        quantity: 1,
      });
      scheduleSync(city, 0);
    }
  };

  const resetFilters = () => {
    setFilters({
      category: '',
      brand: '',
      price_min: '',
      price_max: '',
      discount: false,
      new: false,
      taste_sweetness_min: '',
      taste_sweetness_max: '',
      taste_coolness_min: '',
      taste_fruitiness_min: '',
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minSweetness = Number(filters.taste_sweetness_min || 0);
    const maxSweetness = Number(filters.taste_sweetness_max || 0);
    const minCoolness = Number(filters.taste_coolness_min || 0);
    const minFruitiness = Number(filters.taste_fruitiness_min || 0);

    return products.filter((p) => {
      if (filters.category && p.category !== filters.category) return false;
      if (filters.brand && p.brand !== filters.brand) return false;
      if (filters.price_min && p.price < parseFloat(filters.price_min)) return false;
      if (filters.price_max && p.price > parseFloat(filters.price_max)) return false;
      if (filters.discount && Number(p.discount || 0) <= 0) return false;
      if (filters.new && !p.isNew) return false;

      const matchesQuery = !q || [p.name, p.brand, p.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
      if (!matchesQuery) return false;

      const taste = p.tasteProfile;
      if (minSweetness && (!taste?.sweetness || Number(taste.sweetness) < minSweetness)) return false;
      if (maxSweetness && taste?.sweetness && Number(taste.sweetness) > maxSweetness) return false;
      if (minCoolness && (!taste?.coolness || Number(taste.coolness) < minCoolness)) return false;
      if (minFruitiness && (!taste?.fruitiness || Number(taste.fruitiness) < minFruitiness)) return false;

      return true;
    });
  }, [products, query, filters.category, filters.brand, filters.price_min, filters.price_max, filters.discount, filters.new, filters.taste_sweetness_min, filters.taste_sweetness_max, filters.taste_coolness_min, filters.taste_fruitiness_min]);

  const bannerUrl = resolveBrandAssetUrl('banners/banner-1.jpg', branding.assetBasePath);

  const styles = {
    container: {
      paddingBottom: theme.spacing.xl,
    },
    headerWrap: {
      padding: `0 ${theme.padding.screen}`,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    introCard: {
      margin: `0 ${theme.padding.screen} ${theme.spacing.md}`,
      borderRadius: theme.radius.lg,
      minHeight: 132,
      overflow: 'hidden' as const,
      border: '1px solid rgba(96,165,250,0.16)',
      background: `linear-gradient(135deg, rgba(6,11,22,0.26) 0%, rgba(6,11,22,0.82) 100%), url(${bannerUrl}) center/cover`,
      boxShadow: theme.shadow.card,
    },
    introOverlay: {
      minHeight: 132,
      padding: theme.spacing.lg,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'space-between',
      background: 'linear-gradient(180deg, rgba(8,17,31,0.06) 0%, rgba(8,17,31,0.82) 100%)',
    },
    introEyebrow: {
      fontSize: theme.typography.fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.14em',
      color: theme.colors.dark.primary,
      opacity: 0.9,
    },
    introTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: 1.15,
      maxWidth: 260,
    },
    introMeta: {
      display: 'flex',
      gap: theme.spacing.sm,
      flexWrap: 'wrap' as const,
      marginTop: theme.spacing.md,
    },
    introPill: {
      borderRadius: 999,
      padding: '6px 10px',
      background: 'rgba(8,17,31,0.54)',
      border: '1px solid rgba(96,165,250,0.18)',
      color: theme.colors.dark.textSecondary,
      fontSize: theme.typography.fontSize.xs,
      letterSpacing: '0.04em',
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      color: theme.colors.dark.text,
      textAlign: 'center' as const,
    },
    searchRow: {
      padding: `0 ${theme.padding.screen}`,
      display: 'flex',
      gap: theme.spacing.sm,
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    searchBox: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderRadius: 18,
      border: '1px solid rgba(96,165,250,0.14)',
      background: 'rgba(16,15,18,0.82)',
      backdropFilter: `blur(${theme.blur.glass})`,
      padding: '14px 16px',
      boxShadow: theme.shadow.card,
    },
    input: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: theme.colors.dark.text,
      fontSize: theme.typography.fontSize.sm,
    },
    grid: {
      padding: `${theme.spacing.lg} ${theme.padding.screen}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
    },
    categoryScrollerWrap: {
      padding: `0 ${theme.padding.screen}`,
    },
    categoryScroller: {
      display: 'flex',
      gap: theme.spacing.sm,
      overflowX: 'auto' as const,
      paddingBottom: 6,
      scrollbarWidth: 'none' as const,
      msOverflowStyle: 'none' as const,
    },
    categoryPill: (active: boolean) => ({
      minWidth: 120,
      minHeight: 44,
      padding: '0 16px',
      borderRadius: 999,
      border: `1px solid ${active ? 'rgba(96,165,250,0.32)' : 'rgba(96,165,250,0.14)'}`,
      background: active ? 'rgba(96,165,250,0.16)' : 'rgba(16,15,18,0.82)',
      color: active ? theme.colors.dark.primary : theme.colors.dark.text,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      cursor: 'pointer',
      boxShadow: theme.shadow.card,
      whiteSpace: 'nowrap' as const,
    }),
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      background: 'rgba(0,0,0,0.72)',
      zIndex: 1200,
      display: 'flex',
      alignItems: 'flex-end',
      padding: theme.padding.screen,
      paddingBottom: `calc(${theme.padding.screen} + var(--safe-area-bottom, 0px))`,
    },
    sheet: {
      width: '100%',
      borderRadius: theme.radius.lg,
      border: '1px solid rgba(96,165,250,0.14)',
      background: 'rgba(16,15,18,0.92)',
      backdropFilter: `blur(${theme.blur.glass})`,
      boxShadow: theme.shadow.card,
      padding: theme.spacing.lg,
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      color: theme.colors.dark.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    select: {
      width: '100%',
      borderRadius: theme.radius.md,
      border: '1px solid rgba(96,165,250,0.14)',
      background: 'rgba(16,15,18,0.84)',
      color: theme.colors.dark.text,
      padding: '10px 12px',
      outline: 'none',
    },
    checkboxRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    check: {
      display: 'flex',
      gap: theme.spacing.sm,
      alignItems: 'center',
      color: theme.colors.dark.text,
      fontSize: theme.typography.fontSize.sm,
    },
  };

  return (
    <div style={styles.container} className="gold-glow">
      <div style={styles.headerWrap}>
        <div style={styles.title}>Каталог</div>
      </div>

      <div style={styles.introCard}>
        <div style={styles.introOverlay}>
          <div>
            <div style={styles.introEyebrow}>{branding.name}</div>
            <div style={styles.introTitle}>
              {filters.category ? getCategoryName(filters.category) : 'Подборка вкусов и устройств'}
            </div>
          </div>
          <div style={styles.introMeta}>
            <div style={styles.introPill}>{city ? `Город: ${city}` : 'Город не выбран'}</div>
            <div style={styles.introPill}>{filtered.length} товаров</div>
            {filters.brand ? <div style={styles.introPill}>{filters.brand}</div> : null}
          </div>
        </div>
      </div>

      <div style={styles.searchRow}>
        <div style={styles.searchBox}>
          <Search size={18} color={theme.colors.dark.textSecondary} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск"
            style={styles.input}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'transparent', border: 'none', color: theme.colors.dark.text, cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <SecondaryButton
          onClick={() => setShowFilters(true)}
          style={{ borderRadius: 999, padding: '10px 14px' }}
        >
          <SlidersHorizontal size={18} />
        </SecondaryButton>
      </div>

      <div style={styles.categoryScrollerWrap}>
        <div style={styles.categoryScroller} className="no-scrollbar">
          <button
            type="button"
            onClick={() => setFilters({ ...filters, category: '' })}
            style={styles.categoryPill(!filters.category)}
          >
            Все
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilters({ ...filters, category: c })}
              style={styles.categoryPill(filters.category === c)}
            >
              {getCategoryName(c)}
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.lg }}>
          <GlassCard padding="lg" variant="elevated">
            <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm, lineHeight: 1.4, marginBottom: theme.spacing.md }}>
              {loadError}
            </div>
            <SecondaryButton fullWidth onClick={() => city && loadCatalog(city)}>
              Повторить загрузку
            </SecondaryButton>
          </GlassCard>
        </div>
      ) : null}

      {loading ? (
        <div style={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              price={p.price}
              image={p.image || ''}
              brand={p.brand}
              isNew={Boolean((p as any).isNew)}
              stock={(p as any).qtyAvailable || 0}
              tasteProfile={normalizeTasteProfile(p.tasteProfile)}
              trustData={getStableTrustData(`${p.id}:${p.name}:${p.brand}`)}
              showTasteProfile={true}
              showTrustIndicators={true}
              onClick={(id) => navigate(`/product/${id}`)}
              onAddToCart={() => addToCart(p)}
              isFavorite={favorites.isFavorite(p.id)}
              onToggleFavorite={async () => {
                if (!city) {
                  toast.push('Выберите город', 'error');
                  return;
                }
                const enabled = !favorites.isFavorite(p.id);
                try {
                  await favorites.toggle({
                    city,
                    product: {
                      id: p.id,
                      name: p.name,
                      category: p.category,
                      brand: p.brand,
                      price: p.price,
                      image: p.image,
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
        </div>
      )}

      {showFilters ? (
        <div style={styles.overlay} onClick={() => setShowFilters(false)}>
          <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold }}>Фильтры</div>
              <button
                onClick={() => setShowFilters(false)}
                style={{ background: 'transparent', border: 'none', color: theme.colors.dark.text, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: theme.spacing.md }}>
              <div>
                <div style={styles.label}>Категория</div>
                <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} style={styles.select}>
                  <option value="">Все</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{getCategoryName(c)}</option>
                  ))}
                </select>
              </div>

              <div>
                <div style={styles.label}>Бренд</div>
                <select value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })} style={styles.select}>
                  <option value="">Все</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
                <div>
                  <div style={styles.label}>Цена от</div>
                  <input value={filters.price_min} onChange={(e) => setFilters({ ...filters, price_min: e.target.value })} style={styles.select} inputMode="numeric" />
                </div>
                <div>
                  <div style={styles.label}>Цена до</div>
                  <input value={filters.price_max} onChange={(e) => setFilters({ ...filters, price_max: e.target.value })} style={styles.select} inputMode="numeric" />
                </div>
              </div>

              <div>
                <div style={styles.label}>Сладость (1-5)</div>
                <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                  <input 
                    value={filters.taste_sweetness_min} 
                    onChange={(e) => setFilters({ ...filters, taste_sweetness_min: e.target.value })} 
                    style={styles.select} 
                    inputMode="numeric" 
                    placeholder="От"
                  />
                  <input 
                    value={filters.taste_sweetness_max} 
                    onChange={(e) => setFilters({ ...filters, taste_sweetness_max: e.target.value })} 
                    style={styles.select} 
                    inputMode="numeric" 
                    placeholder="До"
                  />
                </div>
              </div>

              <div>
                <div style={styles.label}>Холодность (1-5)</div>
                <input 
                  value={filters.taste_coolness_min} 
                  onChange={(e) => setFilters({ ...filters, taste_coolness_min: e.target.value })} 
                  style={styles.select} 
                  inputMode="numeric" 
                  placeholder="Минимум"
                />
              </div>

              <div>
                <div style={styles.label}>Фруктовость (1-5)</div>
                <input 
                  value={filters.taste_fruitiness_min} 
                  onChange={(e) => setFilters({ ...filters, taste_fruitiness_min: e.target.value })} 
                  style={styles.select} 
                  inputMode="numeric" 
                  placeholder="Минимум"
                />
              </div>

              <div style={styles.checkboxRow}>
                <label style={styles.check}>
                  <input type="checkbox" checked={filters.discount} onChange={(e) => setFilters({ ...filters, discount: e.target.checked })} />
                  Скидки
                </label>
                <label style={styles.check}>
                  <input type="checkbox" checked={filters.new} onChange={(e) => setFilters({ ...filters, new: e.target.checked })} />
                  Новинки
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                <SecondaryButton fullWidth onClick={resetFilters}>
                  Сбросить
                </SecondaryButton>
                <SecondaryButton fullWidth onClick={() => setShowFilters(false)}>
                  Применить
                </SecondaryButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 && !loading ? (
        <div style={{ padding: theme.padding.screen }}>
          <GlassCard padding="lg" variant="elevated">
            <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm, textAlign: 'center' }}>
              Товары не найдены
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
};

export default Catalog;
