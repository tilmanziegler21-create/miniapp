import React from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { Minus, Plus, Trash2, Store } from 'lucide-react';
import { bonusesAPI, cartAPI, orderAPI } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { GlassCard, PrimaryButton, theme, CartLiquidUpsell, CartLiquidTierBanner, CartLiquidFlavorPicker } from '../ui';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../lib/currency';
import { triggerCartFly } from '../lib/cartFeedback';
import { useCityStore } from '../store/useCityStore';
import { useConfigStore } from '../store/useConfigStore';
import { useCatalogStore } from '../store/useCatalogStore';
import { countLiquidItems, getLiquidUpsellStage, pickLiquidUpsellProducts } from '../lib/liquidUpsell';
import type { CatalogProduct } from '../store/useCatalogStore';

type PaymentMethod = 'cash' | 'card' | 'crypto';

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; title: string; desc: string; icon: string }> = [
  { id: 'cash', title: 'Наличные', desc: 'Оплата при получении', icon: '💵' },
  { id: 'card', title: 'Картой', desc: 'Перевод или терминал', icon: '💳' },
  { id: 'crypto', title: 'Криптовалюта', desc: 'USDT / BTC по договорённости', icon: '₿' },
];

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const pushToast = useToastStore((state) => state.push);
  const { user } = useAuthStore();
  const cart = useCartStore((state) => state.cart);
  const addItemOptimistic = useCartStore((state) => state.addItemOptimistic);
  const updateQuantityOptimistic = useCartStore((state) => state.updateQuantityOptimistic);
  const removeItemOptimistic = useCartStore((state) => state.removeItemOptimistic);
  const restoreCart = useCartStore((state) => state.restoreCart);
  const scheduleSync = useCartStore((state) => state.scheduleSync);
  const syncCart = useCartStore((state) => state.syncCart);
  const storeLiquidPrices = useCartStore((state) => state.liquidPrices);
  const promoCode = useCartStore((state) => state.promoCode);
  const promoDiscount = useCartStore((state) => state.promoDiscount);
  const promoMessage = useCartStore((state) => state.promoMessage);
  const setPromo = useCartStore((state) => state.setPromo);
  const clearPromo = useCartStore((state) => state.clearPromo);
  const { trackRemoveFromCart, trackCheckout, trackOrderComplete } = useAnalytics();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [upsellBusyId, setUpsellBusyId] = React.useState<string | null>(null);
  const { city } = useCityStore();
  const { config } = useConfigStore();
  const catalogEntry = useCatalogStore((state) => (city ? state.byCity[city] : undefined));
  const [promoInput, setPromoInput] = React.useState('');
  const [promoBusy, setPromoBusy] = React.useState(false);
  const [comment] = React.useState('');
  const [priceDrop, setPriceDrop] = React.useState(false);
  const prevTotalRef = React.useRef<number | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [bonusBalance, setBonusBalance] = React.useState(0);
  const [bonusWant] = React.useState<string>('');

  const idempotencyKeyRef = React.useRef<string>('');

  const cityTitle =
    config?.cities?.find((entry) => String(entry.code) === String(city || ''))?.title || city || 'Ваш город';

  const liquidPrices =
    storeLiquidPrices && Object.keys(storeLiquidPrices).length
      ? storeLiquidPrices
      : (config?.liquidPrices || { 1: 18, 2: 16, 3: 15, extra: 15 });
  const liquidQty = countLiquidItems(cart?.items || []);

  const upsellProducts = React.useMemo(
    () => pickLiquidUpsellProducts(cart?.items || [], catalogEntry?.products || []),
    [cart?.items, catalogEntry?.products],
  );

  const upsellStage = React.useMemo(
    () => getLiquidUpsellStage(liquidQty, liquidPrices),
    [liquidQty, liquidPrices],
  );

  React.useEffect(() => {
    if (city) useCatalogStore.getState().prefetch(city).catch(() => {});
  }, [city]);

  React.useEffect(() => {
    if (!city) {
      setLoading(false);
      return;
    }

    const currentCart = useCartStore.getState().cart;
    const hasCartForCity = Boolean(currentCart && currentCart.city === city);
    if (hasCartForCity) {
      setLoading(false);
      syncCart(city).catch(() => {});
      return;
    }

    setLoading(true);
    syncCart(city)
      .catch((e) => {
        console.error('Failed to load cart:', e);
        try {
          WebApp.showAlert('Ошибка загрузки корзины');
        } catch {
          pushToast('Ошибка загрузки корзины', 'error');
        }
      })
      .finally(() => setLoading(false));
  }, [city, pushToast, syncCart]);

  React.useEffect(() => {
    (async () => {
      try {
        const resp = await bonusesAPI.balance();
        setBonusBalance(Number(resp.data.balance || 0));
      } catch {
        setBonusBalance(0);
      }
    })();
  }, []);

  React.useEffect(() => {
    if (promoCode) setPromoInput(promoCode);
  }, [promoCode]);

  const setQty = async (itemId: string, nextQty: number) => {
    if (nextQty <= 0) {
      await removeItem(itemId);
      return;
    }
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }

    const snapshot = updateQuantityOptimistic(itemId, nextQty);
    if (itemId.startsWith('tmp_')) {
      scheduleSync(city, 280);
      return;
    }

    try {
      await cartAPI.updateItem(itemId, nextQty);
      scheduleSync(city);
    } catch (e) {
      console.error('Failed to update qty:', e);
      restoreCart(snapshot);
      scheduleSync(city, 0);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }

    const item = cart?.items.find((i) => i.id === itemId);
    if (item) trackRemoveFromCart(item.productId, item.name, item.price, item.quantity);

    const snapshot = removeItemOptimistic(itemId);
    if (itemId.startsWith('tmp_')) {
      scheduleSync(city, 280);
      return;
    }

    try {
      await cartAPI.removeItem(itemId);
      scheduleSync(city);
    } catch (e) {
      console.error('Failed to remove item:', e);
      restoreCart(snapshot);
      pushToast('Не удалось удалить товар', 'error');
      scheduleSync(city, 0);
    }
  };

  const applyPromo = async () => {
    const code = String(promoInput || '').trim();
    if (!code) {
      clearPromo();
      return;
    }
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }

    setPromoBusy(true);
    try {
      const resp = await cartAPI.validatePromo(code, city);
      const data = resp.data || {};
      if (data.valid) {
        setPromo({ code, discount: Number(data.discount || 0), message: String(data.message || 'Промокод применён') });
        pushToast(String(data.message || 'Промокод применён'), 'success');
      } else {
        clearPromo();
        pushToast(String(data.message || 'Промокод недействителен'), 'error');
      }
    } catch {
      pushToast('Не удалось проверить промокод', 'error');
    } finally {
      setPromoBusy(false);
    }
  };

  const addUpsellProduct = async (product: CatalogProduct, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }
    setUpsellBusyId(product.id);
    const prevTotal = cart?.pricing?.total ?? cart?.total ?? 0;

    try {
      try { WebApp.HapticFeedback.impactOccurred('light'); } catch { /* ignore */ }

      if (event?.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        triggerCartFly({
          startX: rect.left + rect.width / 2,
          startY: rect.top + rect.height / 2,
          image: product.image,
          label: product.name,
        });
      }

      addItemOptimistic({
        city,
        quantity: 1,
        variant: product.name,
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          brand: product.brand,
          price: product.price,
          image: product.image,
        },
        source: 'upsell',
      });

      await cartAPI.addItem({
        productId: product.id,
        quantity: 1,
        city,
        price: product.price,
        source: 'upsell',
        variant: product.name,
      });
      scheduleSync(city);

      const nextTotal = useCartStore.getState().cart?.pricing?.total ?? useCartStore.getState().cart?.total ?? prevTotal;
      if (nextTotal < prevTotal) {
        setPriceDrop(true);
        window.setTimeout(() => setPriceDrop(false), 900);
      }
    } catch {
      scheduleSync(city, 0);
      pushToast('Не удалось добавить товар', 'error');
    } finally {
      setUpsellBusyId(null);
    }
  };

  const calculatePricing = () => {
    if (!cart) return { subtotal: 0, discount: 0, total: 0, quantityDiscount: 0 };
    const serverPricing = (cart as { pricing?: { subtotal?: number; discount?: number; total?: number } }).pricing;
    if (serverPricing && typeof serverPricing.total === 'number') {
      return {
        subtotal: Number(serverPricing.subtotal || 0),
        discount: Number(serverPricing.discount || 0),
        total: Number(serverPricing.total || 0),
        quantityDiscount: Number(serverPricing.discount || 0),
      };
    }

    const subtotal = (cart.items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { subtotal, discount: 0, total: subtotal, quantityDiscount: 0 };
  };

  const pricing = calculatePricing();

  React.useEffect(() => {
    const total = pricing.total;
    if (prevTotalRef.current !== null && total < prevTotalRef.current) {
      setPriceDrop(true);
      const timer = window.setTimeout(() => setPriceDrop(false), 900);
      prevTotalRef.current = total;
      return () => window.clearTimeout(timer);
    }
    prevTotalRef.current = total;
  }, [pricing.total]);

  const createOrder = async () => {
    if (!cart?.items?.length) {
      pushToast('Корзина пуста', 'error');
      return;
    }
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }

    const errors: string[] = [];
    const bonusInputValue = Number(String(bonusWant || '').replace(',', '.')) || 0;
    const bonusApplyLimit = Math.max(0, Math.min(bonusBalance, pricing.total * 0.5));

    if (bonusInputValue > bonusBalance) errors.push('Бонусов больше, чем на балансе');
    if (bonusInputValue > bonusApplyLimit) errors.push('Бонусами можно оплатить до 50% заказа');
    if (errors.length) {
      pushToast(errors.join(' • '), 'error');
      return;
    }

    setBusy(true);
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      }

      trackCheckout(cart.items, pricing.total);

      const orderData = {
        city,
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          variant: item.variant || '',
          source: item.source || 'self',
        })),
        promoCode,
      };

      const createResp = await orderAPI.createOrder(orderData, idempotencyKeyRef.current);
      const { orderId, totalAmount } = createResp.data;

      let applied = 0;
      try {
        const want = Math.max(0, Math.min(bonusInputValue, bonusApplyLimit));
        if (want > 0) {
          const resp = await bonusesAPI.apply(want, Number(totalAmount || pricing.total));
          applied = Number(resp.data.applied || 0);
        }
      } catch (e) {
        console.error('Bonuses apply failed:', e);
        pushToast('Не удалось применить бонусы', 'error');
      }

      await orderAPI.confirmOrder({
        orderId,
        deliveryMethod: 'pickup',
        city,
        promoCode,
        courier_id: '',
        delivery_date: '',
        delivery_time: '',
        courierData: {
          address: `Самовывоз · ${cityTitle}`,
          comment: String(comment || '').slice(0, 500),
          user: {
            tgId: user?.tgId || '',
            username: user?.username || '',
          },
        },
      });

      await orderAPI.processPayment({ orderId, paymentMethod, city, bonusApplied: applied });
      syncCart(city).catch(() => {});

      trackOrderComplete(orderId, Number(totalAmount || cart.total), cart.items);
      pushToast(`Заказ ${orderId} оформлен`, 'success');
      navigate('/orders', { state: { freshOrderId: orderId } });
    } catch (e) {
      console.error('Failed to create order:', e);
      try {
        WebApp.showAlert('Ошибка создания заказа');
      } catch {
        pushToast('Ошибка создания заказа', 'error');
      }
    } finally {
      setBusy(false);
      idempotencyKeyRef.current = '';
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

  if (!cart || !cart.items?.length) {
    return (
      <div style={{ padding: theme.padding.screen }}>
        <GlassCard padding="lg" variant="elevated">
          <div style={{ textAlign: 'center', color: theme.colors.dark.textSecondary, marginBottom: theme.spacing.md }}>
            Корзина пуста
          </div>
          <PrimaryButton fullWidth onClick={() => navigate('/catalog')}>
            Перейти в каталог
          </PrimaryButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="gold-glow cart-page">
      <div
        style={{
          textAlign: 'center',
          padding: `0 ${theme.padding.screen}`,
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.md,
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Корзина
      </div>

      <div style={{ padding: `0 ${theme.padding.screen}`, display: 'grid', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
        {(cart.items || []).map((item) => (
          <div key={item.id} className="cart-item cart-item--instant">
            <div className="cart-item-top">
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: theme.radius.md,
                  border: '1px solid rgba(96,165,250,0.14)',
                  background: item.image
                    ? `url(${item.image}) center/cover`
                    : 'linear-gradient(135deg, #10203b 0%, #17325f 52%, #0c1a31 100%)',
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div className="cart-item-name">{item.name}</div>
                {item.variant ? <div className="cart-item-meta">{item.variant}</div> : null}
              </div>
              <div className="cart-item-price">
                {formatCurrency(item.total ?? (item.effectivePrice ?? item.price) * item.quantity)}
              </div>
            </div>

            <div className="cart-item-controls">
              <div className="cart-qty-wrap">
                <button
                  type="button"
                  className="cart-qty-btn"
                  onClick={() => setQty(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  aria-label="Уменьшить количество"
                >
                  <Minus size={14} />
                </button>
                <div style={{ minWidth: 18, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{item.quantity}</div>
                <button
                  type="button"
                  className="cart-qty-btn"
                  onClick={() => setQty(item.id, item.quantity + 1)}
                  aria-label="Увеличить количество"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button
                type="button"
                className="cart-remove-btn"
                onClick={() => removeItem(item.id)}
                aria-label={`Удалить ${item.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <CartLiquidFlavorPicker
              item={item}
              catalog={catalogEntry?.products || []}
              busyId={upsellBusyId}
              onAddFlavor={(product) => addUpsellProduct(product)}
            />
          </div>
        ))}
      </div>

      <CartLiquidTierBanner liquidQty={liquidQty} liquidPrices={liquidPrices} discount={pricing.discount} />

      <CartLiquidUpsell
        products={upsellProducts}
        catalog={catalogEntry?.products || []}
        stage={upsellStage}
        busyId={upsellBusyId}
        onAdd={addUpsellProduct}
      />

      <div
        style={{
          fontSize: 12,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: theme.colors.dark.textSecondary,
          padding: `0 ${theme.padding.screen}`,
          marginBottom: theme.spacing.sm,
        }}
      >
        Получение
      </div>
      <div
        style={{
          margin: `0 ${theme.padding.screen} ${theme.spacing.md}`,
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          border: '1px solid rgba(96,165,250,0.35)',
          background: 'rgba(16,15,18,0.84)',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
        }}
      >
        <Store size={20} color={theme.colors.dark.primary} />
        <div>
          <div style={{ fontSize: 15, fontWeight: theme.typography.fontWeight.bold }}>Самовывоз</div>
          <div style={{ fontSize: 12, color: theme.colors.dark.textSecondary, marginTop: 2 }}>
            Город: {cityTitle}. Адрес и детали пришлём в личные сообщения.
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: theme.colors.dark.textSecondary,
          padding: `0 ${theme.padding.screen}`,
          marginBottom: theme.spacing.sm,
        }}
      >
        Способ оплаты
      </div>
      <div className="cart-payment-grid">
        {PAYMENT_OPTIONS.map((option) => {
          const active = paymentMethod === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`cart-payment-option${active ? ' cart-payment-option--active' : ''}`}
              onClick={() => setPaymentMethod(option.id)}
            >
              <span style={{ fontSize: 20 }}>{option.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.dark.text }}>
                  {option.title}
                </div>
                <div style={{ fontSize: 12, color: theme.colors.dark.textSecondary, marginTop: 2 }}>{option.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: `0 ${theme.padding.screen}`,
          marginBottom: theme.spacing.sm,
          fontSize: 14,
          color: theme.colors.dark.textSecondary,
        }}
      >
        <span>Сумма</span>
        <span>{formatCurrency(pricing.subtotal)}</span>
      </div>
      {pricing.discount > 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: `0 ${theme.padding.screen}`,
            marginBottom: theme.spacing.sm,
            fontSize: 14,
            color: theme.colors.dark.primary,
          }}
        >
          <span>Скидка</span>
          <span>-{formatCurrency(pricing.discount)}</span>
        </div>
      ) : null}
      {promoDiscount > 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: `0 ${theme.padding.screen}`,
            marginBottom: theme.spacing.sm,
            fontSize: 14,
            color: theme.colors.dark.primary,
          }}
        >
          <span>Промокод</span>
          <span>-{formatCurrency(promoDiscount)}</span>
        </div>
      ) : null}

      <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.lg }}>
        <div className="cart-promo-row">
          <input
            className="cart-promo-input"
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="Промокод"
          />
          <button type="button" className="cart-promo-btn" onClick={applyPromo} disabled={promoBusy}>
            {promoBusy ? '…' : 'Применить'}
          </button>
        </div>
        {promoMessage ? (
          <div className="cart-promo-hint">{promoMessage}</div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `0 ${theme.padding.screen}`,
          marginBottom: theme.spacing.xl,
          fontSize: 18,
          fontWeight: theme.typography.fontWeight.bold,
        }}
      >
        <span>Итого</span>
        <div className={`cart-total-pill${priceDrop ? ' cart-price-drop' : ''}`}>
          {formatCurrency(pricing.total)}
        </div>
      </div>

      <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.xl }}>
        <PrimaryButton fullWidth onClick={createOrder} disabled={busy}>
          {busy ? 'Оформление...' : 'Оформить заказ'}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default Cart;
