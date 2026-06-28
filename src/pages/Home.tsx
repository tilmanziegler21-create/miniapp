import React from 'react';
import { useNavigate } from 'react-router-dom';
import { theme, GlassCard, PrimaryButton, ProductCard, SectionDivider } from '../ui';
import { Search } from 'lucide-react';
import { formatCurrency } from '../lib/currency';
import { useHomePage } from '../hooks/useHomePage';

import { useConfigStore } from '../store/useConfigStore';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useConfigStore();
  const {
    products,
    loading,
    loadError,
    categories,
    favorites,
    addToCart,
    toggleFavorite,
  } = useHomePage();

  const liquidPrices = config?.liquidPrices || {
    1: 18,
    2: 32,
    3: 45,
    extra: 14
  };

  const bannerUrl = `${import.meta.env.BASE_URL || '/'}assets/brand/banners/banner-1.jpg`.replace(/([^:]\/)\/+/g, '$1');

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
    heroCard: {
      position: 'relative' as const,
      overflow: 'hidden',
      borderRadius: '28px',
      border: '1px solid rgba(96,165,250,0.14)',
      minHeight: 190,
      background: `linear-gradient(180deg, rgba(6,11,22,0.16) 0%, rgba(6,11,22,0.74) 100%), url(${bannerUrl}) center/cover`,
      boxShadow: theme.shadow.card,
    },
    heroOverlay: {
      padding: theme.spacing.lg,
      minHeight: 190,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'flex-end',
      background: 'linear-gradient(180deg, rgba(4,9,20,0.12) 0%, rgba(4,9,20,0.74) 100%)',
    },
    heroEyebrow: {
      fontSize: theme.typography.fontSize.xs,
      letterSpacing: '0.18em',
      textTransform: 'uppercase' as const,
      color: theme.colors.dark.primary,
      marginBottom: theme.spacing.xs,
      fontWeight: theme.typography.fontWeight.bold,
    },
    heroTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      lineHeight: 1.05,
      maxWidth: 280,
    },
    heroText: {
      marginTop: theme.spacing.sm,
      color: theme.colors.dark.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      maxWidth: 280,
      lineHeight: 1.45,
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
    skeleton: {
      background: 'rgba(96,165,250,0.08)',
      borderRadius: theme.radius.lg,
      height: 320,
      animation: 'pulse 1.5s ease-in-out infinite',
      border: '1px solid rgba(96,165,250,0.10)',
    },
  };

  return (
    <div style={styles.container} className="gold-glow">
      <div style={styles.hero}>
        <div style={styles.heroCard}>
          <div style={styles.heroOverlay}>
            <div style={styles.heroEyebrow}>Премиум качество</div>
            <div style={styles.heroTitle}>Твой идеальный выбор</div>
            <div style={styles.heroText}>Открой для себя лучшие вкусы и бренды</div>
          </div>
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

      <SectionDivider title="Категории" />

      <div style={styles.categoryScrollerWrap}>
        <div style={styles.categoryScroller}>
          {categories.map((category) => (
            <div
              key={category.name}
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
              stock={product.qtyAvailable}
              onClick={(id) => navigate(`/product/${id}`)}
              onAddToCart={() => addToCart(product)}
              isFavorite={favorites.isFavorite(product.id)}
              onToggleFavorite={() => toggleFavorite(product)}
            />
          ))}
          <GlassCard
            padding="lg"
            variant="elevated"
            style={{
              height: 320,
              borderRadius: theme.radius.lg,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'linear-gradient(135deg, rgba(96,165,250,0.18) 0%, rgba(56,189,248,0.10) 100%)',
              border: '1px solid rgba(96,165,250,0.18)',
            }}
          >
            <div style={{ fontSize: 44, lineHeight: 1, marginBottom: theme.spacing.sm, opacity: 0.9 }}>i</div>
            <div style={{ textAlign: 'center', fontSize: theme.typography.fontSize.sm, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.9, marginBottom: theme.spacing.md }}>
              Супер цена на жидкости:
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.92)',
              color: '#000',
              borderRadius: theme.radius.md,
              padding: '12px 16px',
              fontWeight: theme.typography.fontWeight.bold,
              boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              1 шт - {formatCurrency(liquidPrices['1'] || 18)}<br/>
              2 шт - {formatCurrency(liquidPrices['2'] || 32)}<br/>
              3 шт - {formatCurrency(liquidPrices['3'] || 45)}<br/>
              Далее по {formatCurrency(liquidPrices['extra'] || 14)}
            </div>
          </GlassCard>
        </div>
      )}

      <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.xl }}>
        <PrimaryButton fullWidth onClick={() => navigate('/referral')}>
          Пригласить друга
        </PrimaryButton>
      </div>
    </div>
  );
};

export default Home;
