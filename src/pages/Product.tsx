import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { Heart, ArrowLeft, Plus } from 'lucide-react';
import { cartAPI, productAPI } from '../services/api';
import { useCartStore } from '../store/useCartStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { GlassCard, IconButton, ProductCard, SectionDivider, theme, TasteProfile, TrustIndicators } from '../ui';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../lib/currency';
import { useCityStore } from '../store/useCityStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import {
  getProductPlaceholderDataUrl,
  getStableTasteProfile,
  getStableTrustData,
} from '../lib/productPresentation';

type ProductEntity = {
  id: string;
  sku?: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  qtyAvailable: number;
  description: string;
  image: string;
  tasteProfile?: unknown;
  favorite?: boolean;
};

type SocialProof = {
  rating: number;
  reviewsCount: number;
  weeklyOrders: number;
  reviews: string[];
};

type SimilarProduct = {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  image: string;
  sku?: string;
};

const defaultFlavors = ['Cool Menthol', 'Sour Strawberry Dragonfruit', 'Berry Ice'];

const assetUrl = (p: string) => {
  const base = String(import.meta.env.BASE_URL || '/');
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  const path = p.startsWith('/') ? p : `/${p}`;
  return `${prefix}${path}`;
};

const normalizeProvidedImage = (v: string) => {
  const raw = String(v || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (['-', '—', '–', 'null', 'undefined', '0', 'нет', 'no', 'n/a', 'na'].includes(lower)) return '';
  if (lower.includes('via.placeholder.com')) return '';
  if (lower.startsWith('data:image/')) return raw;
  const base = lower.split('#')[0].split('?')[0];
  const isImageUrl = /\.(png|jpe?g|webp|gif|svg)$/.test(base);
  if (!isImageUrl) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return assetUrl(raw);
  if (raw.startsWith('images/')) return assetUrl(`/${raw}`);
  return '';
};

const getBrandImage = (brand: string, productImage: string) => {
    const normalized = normalizeProvidedImage(productImage);
    if (normalized) return normalized;

    return getProductPlaceholderDataUrl(brand || 'Product');
  };

const getBrandGradient = (brand: string) => {
  void brand;
  return 'linear-gradient(135deg, #10203b 0%, #17325f 52%, #0c1a31 100%)';
};

const FlavorRow = ({ flavor, onAdd }: { flavor: string, onAdd: (f: string) => Promise<void> }) => {
  const [added, setAdded] = React.useState(false);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'rgba(16,15,18,0.84)',
      border: '1px solid rgba(96,165,250,0.14)',
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.sm,
    }}>
      <div style={{ fontSize: '15px', color: theme.colors.dark.text, fontWeight: 500 }}>
        {flavor}
      </div>
      <button
        onClick={() => {
          if (added) return;
          try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
          onAdd(flavor); // don't await, let network run in background
        }}
        style={{
          width: 36, height: 36,
          borderRadius: '50%',
          border: 'none',
          background: added ? theme.colors.dark.accentGreen : theme.gradients.primary,
          color: '#eff6ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: added ? 'none' : '0 4px 12px rgba(96,165,250,0.3)'
        }}
        className={added ? "" : "sparkle-button"}
      >
        {added ? <span style={{ fontSize: '18px' }}>✓</span> : <Plus className="sparkle-icon" size={20} strokeWidth={2.5} />}
      </button>
    </div>
  );
};

const Product: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastStore();
  const { setCart } = useCartStore();
  const { trackProductView, trackAddToCart } = useAnalytics();
  const [product, setProduct] = React.useState<ProductEntity | null>(null);
  const [social, setSocial] = React.useState<SocialProof | null>(null);
  const [similar, setSimilar] = React.useState<SimilarProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { city } = useCityStore();
  const favorites = useFavoritesStore();

  const [addedToCart, setAddedToCart] = React.useState(false);

  const load = async () => {
    try {
      setLoading(true);
      if (!city) {
        toast.push('Выберите город', 'error');
        return;
      }
      const resp = await productAPI.getById(String(id || ''), city);
      const p: ProductEntity = resp.data.product;
      setProduct(p);
      setSocial(resp.data.social || null);
      setSimilar(resp.data.similar || []);
      trackProductView(p.id, p.name, p.category);
    } catch (e) {
      console.error('Failed to load product:', e);
      try {
        WebApp.showAlert('Ошибка загрузки товара');
      } catch {
        toast.push('Ошибка загрузки товара', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, [id, city]);

  const toggleFavorite = async () => {
    if (!product) return;
    const next = !Boolean(product.favorite);
    try {
      if (!city) {
        toast.push('Выберите город', 'error');
        return;
      }
      await favorites.toggle({
        city,
        product: {
          id: String(product.id),
          name: product.name,
          category: product.category,
          brand: product.brand,
          price: product.price,
          image: product.image,
        },
        enabled: next,
      });
      setProduct({ ...product, favorite: next });
      toast.push(next ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
    } catch {
      toast.push('Ошибка избранного', 'error');
    }
  };

  const addToCart = async (quantity: number, variant?: string) => {
    if (!product) return;
    if (!city) {
      toast.push('Выберите город', 'error');
      return;
    }
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch (err) { /* ignore */ }
    try {
      await cartAPI.addItem({ productId: product.id, quantity, city, variant: variant || defaultFlavors[0] });
      const cartResp = await cartAPI.getCart(city);
      setCart(cartResp.data.cart);
      toast.push('Добавлено в корзину', 'success');
      trackAddToCart(product.id, product.name, product.price, quantity);
    } catch (e) {
      console.error('Add to cart failed:', e);
      toast.push('Ошибка добавления в корзину', 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: theme.padding.screen }}>
        <GlassCard padding="lg" variant="elevated">
          <div style={{ height: 220 }} className="animate-pulse" />
        </GlassCard>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: theme.padding.screen }}>
        <GlassCard padding="lg" variant="elevated">
          <div style={{ textAlign: 'center', color: theme.colors.dark.textSecondary }}>Товар не найден</div>
        </GlassCard>
      </div>
    );
  }

  const posterToken = product.brand || product.name;
  const posterImage = getBrandImage(posterToken, product.image);
  const posterGradient = getBrandGradient(posterToken);

  const styles = {
    pageTitle: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.md,
    },
    poster: {
      position: 'relative' as const,
      height: 220,
      borderRadius: theme.radius.lg,
      border: '1px solid rgba(96,165,250,0.18)',
      background: posterGradient,
      boxShadow: theme.shadow.card,
      overflow: 'hidden',
      margin: `0 ${theme.padding.screen}`,
    },
    posterImg: {
      position: 'absolute' as const,
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      pointerEvents: 'none' as const,
    },
    posterScrim: {
      position: 'absolute' as const,
      inset: 0,
      background: 'linear-gradient(135deg, rgba(8,17,31,0.26) 0%, rgba(8,17,31,0.76) 100%)',
      pointerEvents: 'none' as const,
    },
    card: {
      margin: theme.spacing.md,
    },
    headerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.04em',
      lineHeight: 1.15,
    },
    pricePill: {
      background: 'rgba(191,219,254,0.18)',
      color: '#eff6ff',
      borderRadius: 999,
      padding: '6px 12px',
      fontWeight: theme.typography.fontWeight.bold,
      boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
      whiteSpace: 'nowrap' as const,
      border: '1px solid rgba(147,197,253,0.22)',
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.dark.textSecondary,
      lineHeight: '1.5',
      marginBottom: theme.spacing.md,
    },
    tasteProfileSection: {
      marginBottom: theme.spacing.md,
    },
    trustSection: {
      marginBottom: theme.spacing.md,
    },
    flavorRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      borderRadius: 999,
      border: '1px solid rgba(96,165,250,0.14)',
      background: 'rgba(16,15,18,0.84)',
      padding: '8px 12px',
      marginBottom: theme.spacing.md,
    },
    flavorPill: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      color: theme.colors.dark.text,
      fontSize: theme.typography.fontSize.sm,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    selectedPill: {
      borderRadius: 999,
      padding: '6px 12px',
      background: 'rgba(96,165,250,0.18)',
      border: '1px solid rgba(96,165,250,0.25)',
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    primaryButton: {
      width: '100%',
      borderRadius: theme.radius.md,
      border: 'none',
      background: theme.gradients.primary,
      color: '#eff6ff',
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.10em',
      textTransform: 'uppercase' as const,
      padding: '14px 16px',
      cursor: 'pointer',
      boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
      marginBottom: theme.spacing.sm,
    },
    disabledCta: {
      width: '100%',
      borderRadius: theme.radius.md,
      border: '1px solid rgba(96,165,250,0.12)',
      background: 'rgba(16,15,18,0.84)',
      color: theme.colors.dark.textSecondary,
      fontWeight: theme.typography.fontWeight.semibold,
      padding: '14px 16px',
      cursor: 'not-allowed',
      textTransform: 'none' as const,
    },
    flavorsWrap: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    chip: (active: boolean) => ({
      borderRadius: 999,
      border: '1px solid rgba(96,165,250,0.14)',
      background: active ? 'rgba(96,165,250,0.18)' : 'rgba(16,15,18,0.84)',
      color: theme.colors.dark.text,
      padding: '8px 12px',
      cursor: 'pointer',
      fontSize: theme.typography.fontSize.sm,
      maxWidth: '100%',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    }),
    reviewsSection: {
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTop: '1px solid rgba(96,165,250,0.12)',
    },
    reviewItem: {
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.sm,
      background: 'rgba(16,15,18,0.72)',
      borderRadius: theme.radius.sm,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.dark.textSecondary,
    },
    reviewAuthor: {
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.dark.text,
      marginBottom: '2px',
    },
    similarProductsGrid: {
      padding: `0 ${theme.padding.screen}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
    },
  };

  return (
    <div style={{ paddingBottom: theme.spacing.xl }} className="gold-glow">
      <div style={styles.pageTitle}>
        <IconButton icon={<ArrowLeft size={20} />} onClick={() => navigate(-1)} variant="glass" size="md" />
        <div style={{ opacity: 0.7, fontSize: theme.typography.fontSize.sm, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Товар</div>
        <IconButton icon={<Heart size={20} fill={product.favorite ? 'white' : 'none'} />} onClick={toggleFavorite} variant="glass" size="md" />
      </div>

      <SectionDivider title="Добавление товара в корзину" />

      <div style={styles.poster}>
        {posterImage ? <img src={posterImage} onError={(e) => { e.currentTarget.src = getProductPlaceholderDataUrl(product.name); }} alt="" style={styles.posterImg} /> : null}
        <div style={styles.posterScrim} />
      </div>

      <GlassCard padding="lg" variant="elevated" style={styles.card}>
        <div style={styles.headerRow}>
          <div style={{ flex: 1 }}>
            <div style={styles.title}>{product.name}</div>
            <div style={{ color: theme.colors.dark.textSecondary, marginTop: theme.spacing.xs, fontSize: theme.typography.fontSize.sm }}>
              {product.brand}
            </div>
          </div>
          <div style={styles.pricePill}>{formatCurrency(product.price)}</div>
        </div>

        {/* Taste Profile */}
        {product.tasteProfile && (
          <div style={styles.tasteProfileSection}>
            <TasteProfile {...product.tasteProfile as any} />
          </div>
        )}

        {/* Trust Indicators */}
        {social && (
          <div style={styles.trustSection}>
            <TrustIndicators
              rating={social.rating}
              reviewCount={social.reviewsCount}
              weeklyOrders={social.weeklyOrders}
              showReviewButton={true}
              onReviewClick={() => toast.push('Функция оценки скоро будет доступна!', 'info')}
            />
          </div>
        )}

        {/* Description */}
        <div style={styles.description}>
          {product.description}
        </div>

        <div style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.sm }}>
          <div style={{ fontSize: '13px', color: theme.colors.dark.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Доступные вкусы
          </div>
          {defaultFlavors.map((f) => (
            <FlavorRow key={f} flavor={f} onAdd={(flv) => addToCart(1, flv)} />
          ))}
        </div>

        <button 
          style={addedToCart ? { ...styles.primaryButton, background: theme.colors.dark.accentGreen } : styles.primaryButton} 
          onClick={() => {
            if (addedToCart) return;
            try { WebApp.HapticFeedback.impactOccurred('medium'); } catch(e){}
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
            addToCart(1); // don't await
          }}
          className={addedToCart ? "" : "sparkle-button"}
        >
          {addedToCart ? '✓ Добавлено' : 'Добавить заказ в корзину'}
        </button>

        {product.qtyAvailable === 0 && (
          <button style={styles.disabledCta} disabled>
            Нет в наличии
          </button>
        )}

      </GlassCard>

      {similar.length ? (
        <>
          <SectionDivider title="Похожие товары" />
          <div style={styles.similarProductsGrid}>
            {similar.slice(0, 6).map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={p.price}
                image={p.image}
                brand={p.brand} // Add brand prop
                tasteProfile={getStableTasteProfile(`${p.id}:${p.name}:${p.brand}`)}
                trustData={getStableTrustData(`${p.id}:${p.name}:${p.brand}`)}
                showTasteProfile={true}
                showTrustIndicators={true}
                onClick={(pid) => navigate(`/product/${pid}`)}
              onAddToCart={() => {
                if (!city) {
                  toast.push('Выберите город', 'error');
                  return;
                }
                cartAPI.addItem({ productId: p.id, quantity: 1, city, price: p.price })
                  .then(() => cartAPI.getCart(city))
                  .then((cartResp) => {
                    setCart(cartResp.data.cart);
                    toast.push('Добавлено в корзину', 'success');
                    trackAddToCart(p.id, p.name, p.price, 1);
                  })
                  .catch(() => {
                    toast.push('Ошибка добавления в корзину', 'error');
                  });
              }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Product;
