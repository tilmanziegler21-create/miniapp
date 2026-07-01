import React from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { Minus, Plus, Trash2, Store } from 'lucide-react';
import { bonusesAPI, cartAPI, orderAPI } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { GlassCard, PrimaryButton, theme, CartLiquidUpsell } from '../ui';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../lib/currency';
import { useCityStore } from '../store/useCityStore';
import { useConfigStore } from '../store/useConfigStore';
import { useCatalogStore } from '../store/useCatalogStore';
import { countLiquidItems, nextLiquidBundlePrice, pickLiquidUpsellProducts } from '../lib/liquidUpsell';
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
  const scheduleSync = useCartStore((state) => state.scheduleSync);
  const syncCart = useCartStore((state) => state.syncCart);
  const { trackRemoveFromCart, trackCheckout, trackOrderComplete } = useAnalytics();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [upsellBusyId, setUpsellBusyId] = React.useState<string | null>(null);
  const { city } = useCityStore();
  const { config } = useConfigStore();
  const catalogEntry = useCatalogStore((state) => (city ? state.byCity[city] : undefined));
  const [promoCode] = React.useState('');
  const [comment] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('cash');
  const [bonusBalance, setBonusBalance] = React.useState(0);
  const [bonusWant] = React.useState<string>('');

  const idempotencyKeyRef = React.useRef<string>('');

  const cityTitle =
    config?.cities?.find((entry) => String(entry.code) === String(city || ''))?.title || city || 'Ваш город';

  const liquidPrices = config?.liquidPrices || { 1: 18, 2: 32, 3: 45, extra: 14 };

  const upsellProducts = React.useMemo(
    () => pickLiquidUpsellProducts(cart?.items || [], catalogEntry?.products || []),
    [cart?.items, catalogEntry?.products],
  );

  const bundleHint = React.useMemo(() => {
    const next = nextLiquidBundlePrice(countLiquidItems(cart?.items || []), liquidPrices);
    return next != null ? formatCurrency(next) : null;
  }, [cart?.items, liquidPrices]);

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

  const setQty = async (itemId: string, nextQty: number) => {
    if (nextQty <= 0) return;
    try {
      if (!city) {
        pushToast('Выберите город', 'error');
        return;
      }
      if (itemId.startsWith('tmp_')) {
        scheduleSync(city, 0);
        pushToast('Секунду, корзина синхронизируется', 'info');
        return;
      }
      updateQuantityOptimistic(itemId, nextQty);
      await cartAPI.updateItem(itemId, nextQty);
      scheduleSync(city);
    } catch (e) {
      console.error('Failed to update qty:', e);
      scheduleSync(city, 0);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      if (!city) {
        pushToast('Выберите город', 'error');
        return;
      }
      if (itemId.startsWith('tmp_')) {
        scheduleSync(city, 0);
        pushToast('Секунду, корзина синхронизируется', 'info');
        return;
      }
      const item = cart?.items.find((i) => i.id === itemId);
      if (item) trackRemoveFromCart(item.productId, item.name, item.price, item.quantity);
      removeItemOptimistic(itemId);
      await cartAPI.removeItem(itemId);
      scheduleSync(city);
    } catch (e) {
      console.error('Failed to remove item:', e);
      scheduleSync(city, 0);
    }
  };

  const addUpsellProduct = async (product: CatalogProduct) => {
    if (!city) {
      pushToast('Выберите город', 'error');
      return;
    }
    setUpsellBusyId(product.id);
    try {
      try { WebApp.HapticFeedback.impactOccurred('light'); } catch { /* ignore */ }
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
        source: 'upsell',
      });
      await cartAPI.addItem({ productId: product.id, quantity: 1, city, price: product.price, source: 'upsell' });
      scheduleSync(city);
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

    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { subtotal, discount: 0, total: subtotal, quantityDiscount: 0 };
  };

  const pricing = calculatePricing();

  const createOrder = async () => {
    if (!cart?.items?.length) {
      pushToast('Корзина пуста', 'error');
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

      trackCheckout(cart.items, cart.total);

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
      navigate('/orders');
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

  if (!cart || cart.items.length === 0) {
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
        {cart.items.map((item) => (
          <div key={item.id} className="cart-item">
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
                {item.id.startsWith('tmp_') ? (
                  <div className="cart-item-meta" style={{ color: theme.colors.dark.primary }}>Синхронизация...</div>
                ) : null}
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
                  disabled={item.id.startsWith('tmp_') || item.quantity <= 1}
                  aria-label="Уменьшить количество"
                >
                  <Minus size={14} />
                </button>
                <div style={{ minWidth: 18, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{item.quantity}</div>
                <button
                  type="button"
                  className="cart-qty-btn"
                  onClick={() => setQty(item.id, item.quantity + 1)}
                  disabled={item.id.startsWith('tmp_')}
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
                disabled={item.id.startsWith('tmp_')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <CartLiquidUpsell
        products={upsellProducts}
        bundleHint={bundleHint}
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
        <div
          style={{
            background: 'rgba(16,15,18,0.84)',
            border: '1px solid rgba(96,165,250,0.3)',
            padding: '8px 16px',
            borderRadius: 999,
            color: theme.colors.dark.primary,
          }}
        >
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
