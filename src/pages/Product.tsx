import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { Heart, ArrowLeft } from 'lucide-react';
import { cartAPI, productAPI } from '../services/api';
import { useCartStore } from '../store/useCartStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { GlassCard, IconButton, ProductCard, SectionDivider, theme, TasteProfile, TrustIndicators, FlavorSelectField } from '../ui';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../lib/currency';
import { useCityStore } from '../store/useCityStore';
import { useFavoritesStore } from '../store/useFavoritesStore';
import { isLiquidCategory } from '../lib/liquidUpsell';
import {
  getStableTasteProfile,
  getStableTrustData,
} from '../lib/productPresentation';
import { triggerCartFly } from '../lib/cartFeedback';
import { normalizeTasteProfile, resolveProductImage } from '../lib/productMedia';

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

type BrandFlavor = {
  id: string;
  name: string;
  price: number;
  qtyAvailable: number;
  image?: string;
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

const NAVY = {
  bg: 'linear-gradient(180deg, #1e3a8a 0%, #172554 100%)',
  bgSoft: 'rgba(23, 37, 84, 0.92)',
  border: 'rgba(147, 197, 253, 0.34)',
  text: '#eff6ff',
  muted: 'rgba(219, 234, 254, 0.78)',
};

const getBrandGradient = (brand: string) => {
  void brand;
  return 'linear-gradient(135deg, #10203b 0%, #17325f 52%, #0c1a31 100%)';
};

const Product: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);
  const addItemOptimistic = useCartStore((state) => state.addItemOptimistic);
  const scheduleSync = useCartStore((state) => state.scheduleSync);
  const { trackProductView, trackAddToCart } = useAnalytics();
  const [product, setProduct] = React.useState<ProductEntity | null>(null);
  const [brandFlavors, setBrandFlavors] = React.useState<BrandFlavor[]>([]);
  const [selectedFlavorId, setSelectedFlavorId] = React.useState('');
  const [social, setSocial] = React.useState<SocialProof | null>(null);
  const [similar, setSimilar] = React.useState<SimilarProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { city } = useCityStore();
  const favorites = useFavoritesStore();
  const rollbackOptimisticAdd = useCartStore((state) => state.rollbackOptimisticAdd);

  const [addedToCart, setAddedToCart] = React.useState(false);
  const requestRef = React.useRef(0);

  const selectedFlavor = React.useMemo(() => {
    if (!brandFlavors.length) return null;
    return brandFlavors.find((f) => String(f.id) === String(selectedFlavorId)) || brandFlavors[0];
  }, [brandFlavors, selectedFlavorId]);

  const isLiquid = product ? isLiquidCategory(product.category) : false;
  const activeProduct = React.useMemo(() => {
    if (!product) return null;
    if (!isLiquid || !selectedFlavor) return product;
    return {
      ...product,
      id: selectedFlavor.id,
      name: selectedFlavor.name,
      price: selectedFlavor.price,
      qtyAvailable: selectedFlavor.qtyAvailable,
      image: selectedFlavor.image || product.image,
    };
  }, [product, isLiquid, selectedFlavor]);

  const canAddToCart = activeProduct ? Number(activeProduct.qtyAvailable || 0) > 0 : false;
  const allFlavorsSoldOut = brandFlavors.length > 0 && brandFlavors.every((f) => Number(f.qtyAvailable || 0) <= 0);
  const selectedSoldOut = selectedFlavor ? Number(selectedFlavor.qtyAvailable || 0) <= 0 : false;

  React.useEffect(() => {
    if (!brandFlavors.length) return;
    const current = brandFlavors.find((f) => String(f.id) === String(selectedFlavorId));
    if (current && Number(current.qtyAvailable || 0) > 0) return;
    const firstAvailable = brandFlavors.find((f) => Number(f.qtyAvailable || 0) > 0);
    if (firstAvailable) setSelectedFlavorId(String(firstAvailable.id));
  }, [brandFlavors, selectedFlavorId]);
  const normalizedTasteProfile = React.useMemo(
    () => (product ? normalizeTasteProfile(product.tasteProfile) : null),
    [product],
  );

  const load = async () => {
    const requestId = ++requestRef.current;
    try {
      setLoading(true);
      setProduct(null);
      setBrandFlavors([]);
      setSocial(null);
      setSimilar([]);
      if (!city) {
        pushToast('Выберите город', 'error');
        return;
      }
      const resp = await productAPI.getById(String(id || ''), city);
      if (requestId !== requestRef.current) return;
      const p: ProductEntity | undefined = resp.data?.product;
      if (!p || !p.id) {
        setProduct(null);
        return;
      }
      const flavors: BrandFlavor[] = Array.isArray(resp.data?.brandFlavors) ? resp.data.brandFlavors : [];
      setProduct(p);
      setBrandFlavors(flavors.length ? flavors : [{ id: p.id, name: p.name, price: p.price, qtyAvailable: p.qtyAvailable, image: p.image }]);
      setSelectedFlavorId(String(p.id));
      setSocial(resp.data?.social || null);
      setSimilar(Array.isArray(resp.data?.similar) ? resp.data.similar : []);
      trackProductView(p.id, p.name, p.category);
    } catch (e) {
      console.error('Failed to load product:', e);
      if (requestId !== requestRef.current) return;
      setProduct(null);
      try {
        WebApp.showAlert('Ошибка загрузки товара');
      } catch {
        pushToast('Ошибка загрузки товара', 'error');
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
    if (city) favorites.load(city);
  }, [id, city]);

  const isFavorite = product ? favorites.isFavorite(String(activeProduct?.id || product.id)) : false;

  const toggleFavorite = async () => {
    if (!activeProduct || !product) return;
    const next = !isFavorite;
    try {
      if (!city) {
        pushToast('Выберите город', 'error');
        return;
      }
      await favorites.toggle({
        city,
        product: {
          id: String(activeProduct.id),
          name: activeProduct.name,
          category: product.category,
          brand: product.brand,
          price: activeProduct.price,
          image: activeProduct.image,
        },
        enabled: next,
      });
      pushToast(next ? 'Добавлено в избранное' : 'Удалено из избранного', 'success');
    } catch {
      pushToast('Ошибка избранного', 'error');
    }
  };

  const addToCart = async (quantity: number, variantName?: string) => {
    if (!activeProduct || !product) return;
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }
    if (Number(activeProduct.qtyAvailable || 0) <= 0) {
      pushToast('Товар закончился', 'info');
      return;
    }
    const variant = variantName || activeProduct.name;
    try { WebApp.HapticFeedback.impactOccurred('medium'); } catch { /* ignore */ }
    addItemOptimistic({
      city,
      quantity,
      variant,
      product: {
        id: activeProduct.id,
        name: activeProduct.name,
        category: product.category,
        brand: product.brand,
        price: activeProduct.price,
        image: activeProduct.image,
      },
    });
    try {
      await cartAPI.addItem({ productId: activeProduct.id, quantity, city, variant });
      scheduleSync(city);
      trackAddToCart(activeProduct.id, activeProduct.name, activeProduct.price, quantity);
    } catch (e) {
      console.error('Add to cart failed:', e);
      rollbackOptimisticAdd({
        city,
        quantity,
        variant,
        productId: activeProduct.id,
      });
      scheduleSync(city, 0);
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

  if (!product || !activeProduct) {
    return (
      <div style={{ padding: theme.padding.screen }}>
        <GlassCard padding="lg" variant="elevated">
          <div style={{ textAlign: 'center', color: theme.colors.dark.textSecondary }}>Товар не найден</div>
        </GlassCard>
      </div>
    );
  }

  const posterToken = product.brand || product.name;
  const posterImage = resolveProductImage(posterToken, activeProduct.image || product.image);
  const posterGradient = getBrandGradient(posterToken);

  return (
    <div style={{ paddingBottom: theme.spacing.xl }} className="gold-glow product-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.md }}>
        <IconButton icon={<ArrowLeft size={20} />} onClick={() => navigate(-1)} variant="glass" size="md" />
        <div style={{ opacity: 0.7, fontSize: theme.typography.fontSize.sm, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Товар</div>
        <IconButton icon={<Heart size={20} fill={isFavorite ? 'white' : 'none'} />} onClick={toggleFavorite} variant="glass" size="md" />
      </div>

      <SectionDivider title="Добавление в корзину" />

      <div style={{ position: 'relative', height: 220, borderRadius: theme.radius.lg, border: `1px solid ${NAVY.border}`, background: posterGradient, boxShadow: theme.shadow.card, overflow: 'hidden', margin: `0 ${theme.padding.screen}` }}>
        {posterImage ? <img src={posterImage} loading="eager" decoding="async" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} /> : null}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(8,17,31,0.26) 0%, rgba(8,17,31,0.76) 100%)', pointerEvents: 'none' }} />
      </div>

      <GlassCard padding="lg" variant="elevated" style={{ margin: theme.spacing.md }} className="product-cart-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, alignItems: 'flex-start', marginBottom: theme.spacing.md }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.15, color: NAVY.text }}>
              {isLiquid ? product.brand : activeProduct.name}
            </div>
            <div style={{ color: NAVY.muted, marginTop: theme.spacing.xs, fontSize: theme.typography.fontSize.sm }}>
              {isLiquid ? activeProduct.name : product.brand}
            </div>
          </div>
          <div className="product-price-pill">{formatCurrency(activeProduct.price)}</div>
        </div>

        {normalizedTasteProfile ? (
          <div style={{ marginBottom: theme.spacing.md }}>
            <TasteProfile {...normalizedTasteProfile} />
          </div>
        ) : null}

        {social ? (
          <div style={{ marginBottom: theme.spacing.md }}>
            <TrustIndicators
              rating={social.rating}
              reviewCount={social.reviewsCount}
              weeklyOrders={social.weeklyOrders}
              showReviewButton={true}
              onReviewClick={() => pushToast('Функция оценки скоро будет доступна!', 'info')}
            />
          </div>
        ) : null}

        <div style={{ fontSize: theme.typography.fontSize.sm, color: NAVY.muted, lineHeight: '1.5', marginBottom: theme.spacing.md }}>
          {product.description}
        </div>

        {isLiquid && brandFlavors.length > 0 ? (
          <div style={{ marginBottom: theme.spacing.md }}>
            {(selectedSoldOut || allFlavorsSoldOut) ? (
              <div className="product-stock-warning">Нет в наличии — выберите другое</div>
            ) : null}
            <FlavorSelectField
              fullWidth
              label="Выберите вкус"
              hint="Нажмите, чтобы открыть список"
              value={selectedFlavorId}
              onChange={setSelectedFlavorId}
              options={brandFlavors.map((flavor) => {
                const soldOut = Number(flavor.qtyAvailable || 0) <= 0;
                return {
                  id: String(flavor.id),
                  label: `${flavor.name} — ${formatCurrency(flavor.price)}${soldOut ? ' (нет в наличии)' : ''}`,
                  disabled: soldOut,
                };
              })}
            />
          </div>
        ) : null}

        <button
          className={`product-add-btn${addedToCart ? ' product-add-btn--success' : ''}${!canAddToCart ? ' product-add-btn--disabled' : ''}`}
          onClick={(e) => {
            if (addedToCart || !canAddToCart) return;
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            try { WebApp.HapticFeedback.impactOccurred('medium'); } catch { /* ignore */ }
            triggerCartFly({
              startX: rect.left + rect.width / 2,
              startY: rect.top + rect.height / 2,
              image: posterImage,
              label: activeProduct.name,
            });
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
            addToCart(1, activeProduct.name);
          }}
          disabled={!canAddToCart}
        >
          {!canAddToCart ? 'Нет в наличии — выберите другое' : addedToCart ? '✓ Добавлено' : 'Добавить в корзину'}
        </button>
      </GlassCard>

      {similar.length ? (
        <>
          <SectionDivider title="Похожие товары" />
          <div style={{ padding: `0 ${theme.padding.screen}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
            {similar.slice(0, 6).map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={p.price}
                image={p.image}
                brand={p.brand}
                tasteProfile={getStableTasteProfile(`${p.id}:${p.name}:${p.brand}`)}
                trustData={getStableTrustData(`${p.id}:${p.name}:${p.brand}`)}
                showTasteProfile={true}
                showTrustIndicators={true}
                onClick={(pid) => navigate(`/product/${pid}`)}
                onAddToCart={() => {
                  if (!city) {
                    pushToast('Выберите город', 'error');
                    return;
                  }
                  addItemOptimistic({
                    city,
                    quantity: 1,
                    variant: p.name,
                    product: {
                      id: p.id,
                      name: p.name,
                      category: p.category,
                      brand: p.brand,
                      price: p.price,
                      image: p.image,
                    },
                  });
                  cartAPI.addItem({ productId: p.id, quantity: 1, city, price: p.price, variant: p.name })
                    .then(() => scheduleSync(city))
                    .catch(() => {
                      rollbackOptimisticAdd({ city, productId: p.id, quantity: 1, variant: p.name });
                      scheduleSync(city, 0);
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
