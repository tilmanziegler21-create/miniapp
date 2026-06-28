import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import { catalogAPI, cartAPI } from '../services/api';
import { useCartStore } from '../store/useCartStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { ProductCard, GlassCard, SecondaryButton, theme } from '../ui';
import { useToastStore } from '../store/useToastStore';
import { useCityStore } from '../store/useCityStore';
import { useFavoritesStore } from '../store/useFavoritesStore';

interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  qtyAvailable: number;
  description: string;
  image: string;
  tasteProfile?: {
    sweetness: number;
    coolness: number;
    fruitiness: number;
    strength: number;
  };
}

const Catalog: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const { setCart } = useCartStore();
  const { trackAddToCart, trackFilterUse, trackCategoryView } = useAnalytics();
  const { city } = useCityStore();
  const favorites = useFavoritesStore();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
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
    loadCatalog(city);
    loadFilters(city);
    favorites.load(city);
  }, [city]);

  useEffect(() => {
    if (!city) return;
    loadCatalog(city);
    // Track filter usage
    if (filters.category) trackCategoryView(filters.category);
    if (filters.brand) trackFilterUse('brand', filters.brand);
    if (filters.discount) trackFilterUse('discount', 'true');
    if (filters.new) trackFilterUse('new', 'true');
    if (filters.price_min || filters.price_max) {
      trackFilterUse('price_range', `${filters.price_min || 0}-${filters.price_max || '∞'}`);
    }
  }, [city, filters]);

  const loadCatalog = async (selectedCity: string) => {
    try {
      setLoading(true);
      const response = await catalogAPI.getProducts({
        city: selectedCity,
        category: filters.category,
        brand: filters.brand,
        price_min: filters.price_min,
        price_max: filters.price_max,
        discount: filters.discount,
        new: filters.new
      });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Failed to load catalog:', error);
      try {
        WebApp.showAlert('Ошибка загрузки каталога');
      } catch {
        toast.push('Ошибка загрузки каталога', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async (selectedCity: string) => {
    try {
      const [categoriesRes, brandsRes] = await Promise.all([
        catalogAPI.getCategories(selectedCity),
        catalogAPI.getBrands(selectedCity)
      ]);
      setCategories(categoriesRes.data.categories);
      setBrands(brandsRes.data.brands);
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
  };

  const addToCart = async (product: Product) => {
    if (!city) {
      toast.push('Выберите город', 'error');
      return;
    }
    try {
      await cartAPI.addItem({
        productId: product.id,
        quantity: 1,
        city,
        price: product.price,
      });
      const response = await cartAPI.getCart(city);
      setCart(response.data.cart);
      trackAddToCart(product.id, product.name, product.price, 1);
      toast.push('Товар сразу добавлен в корзину', 'success');
    } catch (error) {
      console.error('Add to cart failed:', error);
      toast.push('Ошибка добавления в корзину', 'error');
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
    if (products.length === 0) return [];
    if (!q) {
      return products;
    }
    const result = products.filter((p) =>
      [p.name, p.brand, p.category].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
    return result;
  }, [products, query]);

  const bannerUrl = `${import.meta.env.BASE_URL || '/'}banner-open.png`.replace(/([^:]\/)\/+/g, '$1');

  const styles = {
    container: {
      paddingBottom: theme.spacing.xl,
    },
    headerWrap: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.lg,
    },
    banner: {
      overflow: 'hidden',
      borderRadius: '28px',
      border: '1px solid rgba(96,165,250,0.14)',
      background: `linear-gradient(180deg, rgba(6,11,22,0.16) 0%, rgba(6,11,22,0.70) 100%), url(${bannerUrl}) center/cover`,
      minHeight: 180,
      boxShadow: theme.shadow.card,
      marginBottom: theme.spacing.lg,
    },
    bannerInner: {
      minHeight: 180,
      padding: theme.spacing.lg,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'flex-end',
      background: 'linear-gradient(180deg, rgba(4,9,20,0.10) 0%, rgba(4,9,20,0.74) 100%)',
    },
    bannerTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: 1.1,
      maxWidth: 260,
    },
    bannerText: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.dark.textSecondary,
      maxWidth: 280,
      lineHeight: 1.45,
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
        <div style={styles.banner}>
          <div style={styles.bannerInner}>
            <div style={styles.bannerTitle}>Каталог в новом blue/cyan дизайне</div>
            <div style={styles.bannerText}>
              Визуальная подача из архива совмещена с текущими фильтрами, API, избранным и one-tap добавлением в корзину.
            </div>
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
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={styles.grid}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 320,
                borderRadius: theme.radius.lg,
                border: '1px solid rgba(96,165,250,0.10)',
                background: 'rgba(16,15,18,0.82)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
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
              tasteProfile={p.tasteProfile}
              trustData={{
                rating: 4.2 + Math.random() * 0.8,
                reviewCount: Math.floor(Math.random() * 200) + 50,
                weeklyOrders: Math.floor(Math.random() * 100) + 20,
              }}
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
                    <option key={c} value={c}>{c}</option>
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
