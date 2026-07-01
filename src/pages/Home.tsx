import React from 'react';
import { useNavigate } from 'react-router-dom';
import { theme, GlassCard, PrimaryButton, ProductCard, ProductCardSkeleton, SectionDivider } from '../ui';
import { Search } from 'lucide-react';
import { formatCurrency } from '../lib/currency';
import { useHomePage } from '../hooks/useHomePage';

import { useConfigStore } from '../store/useConfigStore';
import { useBranding } from '../hooks/useBranding';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const config = useConfigStore((state) => state.config);
  const branding = useBranding();
  const {
    products,
    loading,
    loadError,
    categories,
    favorites,
    addToCart,
    toggleFavorite,
    reload,
  } = useHomePage();

  const liquidPrices = config?.liquidPrices || {
    1: 18,
    2: 16,
    3: 15,
    extra: 15,
  };

  const liquidTierOne = Number(liquidPrices['1'] || 18);
  const liquidTierTwo = Number(liquidPrices['2'] || 16);
  const liquidTierThree = Number(liquidPrices['3'] || 15);

  const styles = {
    container: {
      minHeight: '100vh',
      color: theme.colors.dark.text,
      fontFamily: theme.typography.fontFamily,
    },
    hero: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.xl,
    },
    searchSection: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.lg,
    },
    searchButton: {
      background: 'rgba(16,15,18,0.82)',
      border: '1px solid rgba(96,165,250,0.14)',
      borderRadius: '18px',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      color: theme.colors.dark.textSecondary,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: theme.shadow.card,
    },
    categoryScrollerWrap: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.xl,
    },
    categoryScroller: {
      display: 'flex',
      gap: theme.spacing.sm,
      overflowX: 'auto' as const,
      paddingBottom: 6,
      scrollbarWidth: 'none' as const,
      msOverflowStyle: 'none' as const,
    },
    categoryCard: {
      minWidth: 136,
      width: 136,
      minHeight: 46,
      flex: '0 0 auto' as const,
      borderRadius: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
      background: 'rgba(16,15,18,0.82)',
      border: '1px solid rgba(96,165,250,0.16)',
      cursor: 'pointer',
      boxShadow: theme.shadow.card,
    },
    categoryTitle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      textAlign: 'center' as const,
      color: theme.colors.dark.text,
    },
    categoryHint: {
      padding: `0 ${theme.padding.screen}`,
      marginTop: -12,
      marginBottom: theme.spacing.lg,
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.dark.textSecondary,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    },
    productGrid: {
      padding: `0 ${theme.padding.screen}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.xl,
    },
  };

  return (
    <div style={styles.container} className="gold-glow">
      <div className="stagger-item" style={{ ...styles.hero, ['--stagger-i' as string]: 0 }}>
        <div className="home-hero-banner">
          <div className="home-hero-banner__mesh" aria-hidden />
          <div className="home-hero-banner__shimmer" aria-hidden />
          <div className="home-hero-banner__content">
            <div className="home-hero-banner__eyebrow">Premium · 24/7</div>
            <div className="home-hero-banner__title">{branding.name}</div>
            <div className="home-hero-banner__subtitle">
              {branding.subtitle || 'Открой для себя лучшие вкусы и бренды'}
            </div>
            <div className="home-hero-banner__chips">
              <span className="home-hero-banner__chip">Быстрая выдача</span>
              <span className="home-hero-banner__chip">Бонусы за заказ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="stagger-item" style={{ ...styles.searchSection, ['--stagger-i' as string]: 1 }}>
        <div
          style={styles.searchButton}
          onClick={() => navigate('/catalog')}
          role="button"
        >
          <Search size={18} color={theme.colors.dark.textSecondary} />
          <span>Поиск по вкусам, брендам и названиям...</span>
        </div>
      </div>

      <div className="stagger-item" style={{ ['--stagger-i' as string]: 2 }}>
        <SectionDivider title="Категории" />
      </div>

      <div className="stagger-item" style={{ ...styles.categoryScrollerWrap, ['--stagger-i' as string]: 3 }}>
        <div style={styles.categoryScroller}>
          {categories.map((category, index) => (
            <div
              key={category.slug || `cat_${index}`}
              style={styles.categoryCard}
              onClick={() => navigate(`/catalog?category=${encodeURIComponent(category.slug)}`)}
              role="button"
            >
              <div style={styles.categoryTitle}>{category.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.categoryHint}>Листай категории влево и вправо</div>

      <div className="stagger-item" style={{ ['--stagger-i' as string]: 4 }}>
        <SectionDivider title="Наш каталог" />
      </div>

      {loadError ? (
        <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.lg }}>
          <GlassCard padding="lg" variant="elevated">
            <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm, lineHeight: '1.4', marginBottom: theme.spacing.md }}>{loadError}</div>
            <PrimaryButton fullWidth onClick={() => reload()}>Повторить загрузку</PrimaryButton>
          </GlassCard>
        </div>
      ) : null}

      {loading ? (
        <div style={styles.productGrid}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stagger-item" style={{ ['--stagger-i' as string]: 5 + i }}>
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.productGrid}>
          {products.map((product, index) => (
            <div key={product.id} className="stagger-item" style={{ ['--stagger-i' as string]: 5 + index }}>
            <ProductCard
              {...product}
              stock={product.qtyAvailable}
              onClick={(id) => navigate(`/product/${id}`)}
              onAddToCart={() => addToCart(product)}
              isFavorite={favorites.isFavorite(product.id)}
              onToggleFavorite={() => toggleFavorite(product)}
            />
            </div>
          ))}
          <div className="stagger-item liquid-deal-card" style={{ ['--stagger-i' as string]: 9, padding: theme.spacing.lg, minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="liquid-deal-badge">Premium offer</div>
              <div style={{ marginTop: theme.spacing.md, fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, lineHeight: 1.15 }}>
                Супер цена на жидкости
              </div>
              <div style={{ marginTop: theme.spacing.sm, color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm, lineHeight: 1.45 }}>
                Чем больше берёте — тем выгоднее по таблице цен
              </div>
            </div>
            <div className="liquid-deal-grid" style={{ marginTop: theme.spacing.lg }}>
              <div className="liquid-deal-tier">
                <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.colors.dark.textSecondary }}>1 шт</span>
                <strong>{formatCurrency(liquidTierOne)}</strong>
              </div>
              <div className="liquid-deal-tier">
                <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.colors.dark.textSecondary }}>от 2 шт</span>
                <strong>{formatCurrency(liquidTierTwo)}/шт</strong>
              </div>
              <div className="liquid-deal-tier">
                <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.colors.dark.textSecondary }}>от 3 шт</span>
                <strong>{formatCurrency(liquidTierThree)}/шт</strong>
              </div>
              <div className="liquid-deal-tier">
                <span style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.colors.dark.textSecondary }}>Далее</span>
                <strong>{formatCurrency(liquidTierThree)}/шт</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="stagger-item" style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.xl, ['--stagger-i' as string]: 10 }}>
        <PrimaryButton fullWidth onClick={() => navigate('/referral')}>
          Пригласить друга
        </PrimaryButton>
        <div style={{ marginTop: theme.spacing.xl, textAlign: 'center', color: theme.colors.dark.textSecondary, fontSize: '11px', opacity: 0.7 }}>
          Информация в данном приложении предназначена исключительно для лиц старше 18 лет.
        </div>
      </div>
    </div>
  );
};

export default Home;
