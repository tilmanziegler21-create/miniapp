import React from 'react';
import { useNavigate } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { Minus, Plus, Trash2, Truck, Store } from 'lucide-react';
import { bonusesAPI, cartAPI, couriersAPI, orderAPI } from '../services/api';

import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { useAnalytics } from '../hooks/useAnalytics';
import { GlassCard, PrimaryButton, theme } from '../ui';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../lib/currency';
import { useCityStore } from '../store/useCityStore';
import { useConfigStore } from '../store/useConfigStore';
import { useBranding, resolveBrandAssetUrl } from '../hooks/useBranding';

type Fulfillment = 'delivery' | 'pickup';
type PaymentMethod = 'cash' | 'card';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const { user } = useAuthStore();
  const { cart, setCart, updateQuantityOptimistic, removeItemOptimistic, scheduleSync, syncCart } = useCartStore();
  const { trackRemoveFromCart, trackCheckout, trackOrderComplete } = useAnalytics();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const { city } = useCityStore();
  const { config } = useConfigStore();
  const branding = useBranding();
  const pickupPoints = (config?.pickupPoints || []).map((p) => p.address);
  const [promoCode] = React.useState('');
  const [fulfillment, setFulfillment] = React.useState<Fulfillment>('pickup');
  const [pickup, setPickup] = React.useState('');

  const idempotencyKeyRef = React.useRef<string>('');
  const [comment] = React.useState('');
  const [paymentMethod] = React.useState<PaymentMethod>('cash');
  const [address, setAddress] = React.useState('');
  const [couriers, setCouriers] = React.useState<Array<{ courier_id: string; name: string; tg_id: string; time_from?: string; time_to?: string; address?: string }>>([]);
  const [courierId] = React.useState('');
  const [deliveryDate] = React.useState('');
  const [deliveryTime] = React.useState('');
  const [bonusBalance, setBonusBalance] = React.useState(0);
  const [bonusWant] = React.useState<string>('');

  React.useEffect(() => {
    if (!pickup && pickupPoints.length) setPickup(pickupPoints[0]);
  }, [pickup, pickupPoints.join('|')]);

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
          toast.push('Ошибка загрузки корзины', 'error');
        }
      })
      .finally(() => setLoading(false));
  }, [city, syncCart, toast]);

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
    (async () => {
      try {
        if (!city) return;
        const resp = await couriersAPI.list(city);
        setCouriers(resp.data.couriers || []);
      } catch {
        setCouriers([]);
      }
    })();
  }, [city]);

  React.useEffect(() => {
    if (fulfillment !== 'delivery') return;
    const selectedCourier = couriers.find((x) => x.courier_id === courierId);
    const courierAddress = String(selectedCourier?.address || '').trim();
    if (courierAddress) {
      setAddress(courierAddress);
    } else if (courierId) {
      setAddress('');
    }
  }, [courierId, couriers, fulfillment]);

  const setQty = async (itemId: string, nextQty: number) => {
    if (nextQty <= 0) return;
    const previousCart = useCartStore.getState().cart;
    try {
      if (!city) {
        toast.push('Выберите город', 'error');
        return;
      }
      updateQuantityOptimistic(itemId, nextQty);
      await cartAPI.updateItem(itemId, nextQty);
      scheduleSync(city);
    } catch (e) {
      console.error('Failed to update qty:', e);
      if (previousCart) setCart(previousCart);
      const status = (e as any)?.response?.status;
      if (status === 409) toast.push('Недостаточно товара на складе', 'error');
      else toast.push('Ошибка изменения количества', 'error');
    }
  };

  const removeItem = async (itemId: string) => {
    const previousCart = useCartStore.getState().cart;
    try {
      if (!city) {
        toast.push('Выберите город', 'error');
        return;
      }
      const item = cart?.items.find((i) => i.id === itemId);
      if (item) trackRemoveFromCart(item.productId, item.name, item.price, item.quantity);
      removeItemOptimistic(itemId);
      await cartAPI.removeItem(itemId);
      scheduleSync(city);
      toast.push('Товар удалён', 'success');
    } catch (e) {
      console.error('Failed to remove item:', e);
      if (previousCart) setCart(previousCart);
      toast.push('Ошибка удаления товара', 'error');
    }
  };

  const createOrder = async () => {
    if (!cart?.items?.length) {
      toast.push('Корзина пуста', 'error');
      return;
    }

    const errors: string[] = [];
    if (fulfillment === 'delivery') {
      if (!address.trim()) errors.push('Для курьера не указан адрес в таблице');
      if (!courierId) errors.push('Выбери курьера');
      if (!deliveryDate) errors.push('Выбери дату');
      if (!deliveryTime) errors.push('Выбери время');
    } else if (!pickup.trim()) {
      errors.push('Выбери точку самовывоза');
    }

    const bonusInputValue = Number(String(bonusWant || '').replace(',', '.')) || 0;
    const bonusApplyLimit = Math.max(0, Math.min(bonusBalance, pricing.total * 0.5));

    if (bonusInputValue > bonusBalance) {
      errors.push('Бонусов больше, чем на балансе');
    }
    if (bonusInputValue > bonusApplyLimit) {
      errors.push('Бонусами можно оплатить до 50% заказа');
    }

    if (errors.length) {
      toast.push(errors.join(' • '), 'error');
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
        items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity, variant: item.variant || '' })),
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
        toast.push('Не удалось применить бонусы', 'error');
      }

      await orderAPI.confirmOrder({
        orderId,
        deliveryMethod: fulfillment === 'delivery' ? 'courier' : 'pickup',
        city,
        promoCode,
        courier_id: fulfillment === 'delivery' ? courierId : '',
        delivery_date: fulfillment === 'delivery' ? deliveryDate : '',
        delivery_time: fulfillment === 'delivery' ? deliveryTime : '',
        courierData: {
          address: fulfillment === 'delivery' ? address : pickup,
          comment: String(comment || '').slice(0, 500),
          user: {
            tgId: user?.tgId || '',
            username: user?.username || '',
          },
        },
      });

      await orderAPI.processPayment({ orderId, paymentMethod, city, bonusApplied: applied });
      cartAPI.clear(city).catch(() => {});
      
      setCart({ id: String(cart.id || ''), city, items: [], total: 0 });
      trackOrderComplete(orderId, Number(totalAmount || cart.total), cart.items);

      toast.push(`Заказ ${orderId} оформлен`, 'success');

      navigate('/orders');
    } catch (e) {
      console.error('Failed to create order:', e);
      try {
        WebApp.showAlert('Ошибка создания заказа');
      } catch {
        toast.push('Ошибка создания заказа', 'error');
      }
    } finally {
      setBusy(false);
      idempotencyKeyRef.current = '';
    }
  };

  // Calculate pricing with quantity discounts
  const calculatePricing = () => {
    if (!cart) return { subtotal: 0, discount: 0, total: 0, quantityDiscount: 0 };
    const serverPricing = (cart as any).pricing;
    if (serverPricing && typeof serverPricing.total === 'number') {
      return {
        subtotal: Number(serverPricing.subtotal || 0),
        discount: Number(serverPricing.discount || 0),
        total: Number(serverPricing.total || 0),
        quantityDiscount: Number(serverPricing.discount || 0),
      };
    }
    
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return { subtotal, discount: 0, total: subtotal, quantityDiscount: 0 };
  };

  const pricing = calculatePricing();

  const styles = {
    title: {
      textAlign: 'center' as const,
      padding: `0 ${theme.padding.screen}`,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    },
    list: {
      padding: `0 ${theme.padding.screen}`,
      display: 'grid',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    itemCard: {
      borderRadius: theme.radius.lg,
      border: '1px solid rgba(96,165,250,0.14)',
      background: 'rgba(16,15,18,0.84)',
      backdropFilter: `blur(${theme.blur.glass})`,
      boxShadow: theme.shadow.card,
      padding: theme.spacing.md,
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    avatar: (img: string) => ({
      width: 50,
      height: 50,
      borderRadius: theme.radius.md,
      border: '1px solid rgba(96,165,250,0.14)',
      background: `linear-gradient(135deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.65) 100%), url(${img}) center/cover`,
      flex: '0 0 auto',
      boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
    }),
    itemInfo: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
    },
    name: {
      fontSize: '15px',
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.dark.text,
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    flavor: {
      fontSize: '12px',
      color: theme.colors.dark.textSecondary,
      marginTop: 2,
    },
    controlsRight: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    qtyWrap: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    qtyBtn: {
      width: 24,
      height: 24,
      borderRadius: 999,
      background: 'transparent',
      border: '1px solid rgba(96,165,250,0.3)',
      color: theme.colors.dark.text,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
    itemPrice: {
      fontSize: '15px',
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.dark.primary,
      whiteSpace: 'nowrap' as const,
    },
    removeButton: {
      width: 28,
      height: 28,
      borderRadius: 999,
      border: '1px solid rgba(248,113,113,0.24)',
      background: 'rgba(127,29,29,0.22)',
      color: '#fecaca',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    },
    sectionTitle: {
      fontSize: '12px',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      color: theme.colors.dark.textSecondary,
      padding: `0 ${theme.padding.screen}`,
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.sm,
    },
    radioCard: (active: boolean) => ({
      margin: `0 ${theme.padding.screen} ${theme.spacing.sm}`,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      border: `1px solid ${active ? 'rgba(96,165,250,0.6)' : 'rgba(96,165,250,0.14)'}`,
      background: 'rgba(16,15,18,0.84)',
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.md,
      cursor: 'pointer',
    }),
    radioCircle: (active: boolean) => ({
      width: 20,
      height: 20,
      borderRadius: '50%',
      border: `2px solid ${active ? theme.colors.dark.primary : 'rgba(255,255,255,0.3)'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto',
    }),
    radioInner: (active: boolean) => ({
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: active ? theme.colors.dark.primary : 'transparent',
    }),
    radioTextWrap: {
      flex: 1,
    },
    radioTitle: {
      fontSize: '15px',
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.dark.text,
      marginBottom: 2,
    },
    radioDesc: {
      fontSize: '12px',
      color: theme.colors.dark.textSecondary,
    },
    summaryRowPhoto: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.sm,
      fontSize: '14px',
      color: theme.colors.dark.textSecondary,
    },
    totalRowPhoto: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.xl,
      fontSize: '18px',
      fontWeight: theme.typography.fontWeight.bold,
    },
    totalPricePill: {
      background: 'rgba(16,15,18,0.84)',
      border: '1px solid rgba(96,165,250,0.3)',
      padding: '8px 16px',
      borderRadius: 999,
      color: theme.colors.dark.primary,
    },
    edit: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.md,
    },
    toggles: {
      padding: `0 ${theme.padding.screen}`,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    promoRow: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.md,
    },
    promoBox: {
      borderRadius: theme.radius.lg,
      border: '1px solid rgba(96,165,250,0.14)',
      background: 'rgba(16,15,18,0.84)',
      backdropFilter: `blur(${theme.blur.glass})`,
      boxShadow: theme.shadow.card,
      padding: theme.spacing.md,
      display: 'grid',
      gap: theme.spacing.sm,
    },
    promoLabel: {
      fontSize: theme.typography.fontSize.xs,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      color: theme.colors.dark.textSecondary,
    },
    promoInput: {
      width: '100%',
      borderRadius: 999,
      border: '1px solid rgba(96,165,250,0.14)',
      background: 'rgba(0,0,0,0.25)',
      color: theme.colors.dark.text,
      padding: '10px 14px',
      outline: 'none',
    },
    pickupCard: {
      margin: `0 ${theme.padding.screen} ${theme.spacing.md}`,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.14)',
      background: `linear-gradient(135deg, rgba(96,165,250,0.14) 0%, rgba(30,64,175,0.18) 100%), url(${resolveBrandAssetUrl('banners/banner-1.jpg', branding.assetBasePath)}) center/cover`,
      boxShadow: theme.shadow.card,
    },
    pickupInner: {
      padding: theme.spacing.lg,
      background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.70) 100%)',
      backdropFilter: `blur(${theme.blur.glass})`,
    },
    pickupTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      marginBottom: theme.spacing.sm,
    },
    pickupSelect: {
      width: '100%',
      borderRadius: theme.radius.md,
      border: '1px solid rgba(96,165,250,0.14)',
      background: 'rgba(16,15,18,0.84)',
      color: theme.colors.dark.text,
      padding: '10px 12px',
      outline: 'none',
      marginBottom: theme.spacing.md,
    },
    checkout: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.xl,
    },
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
          <div style={{ textAlign: 'center', color: theme.colors.dark.textSecondary, marginBottom: theme.spacing.md }}>Корзина пуста</div>
          <PrimaryButton fullWidth onClick={() => navigate('/catalog')}>
            Перейти в каталог
          </PrimaryButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="gold-glow">
      <div style={styles.title}>Корзина</div>

      <div style={styles.list}>
        {cart.items.map((item) => (
          <div key={item.id} style={styles.itemCard}>
            <div style={styles.avatar(item.image)} />
            <div style={styles.itemInfo}>
              <div style={styles.name}>{item.name}</div>
              {item.variant && <div style={styles.flavor}>{item.variant}</div>}
            </div>
            <div style={styles.controlsRight}>
              <div style={styles.qtyWrap}>
                <button style={styles.qtyBtn} onClick={() => setQty(item.id, item.quantity - 1)}>
                  <Minus size={14} />
                </button>
                <div style={{ width: 14, textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>{item.quantity}</div>
                <button style={styles.qtyBtn} onClick={() => setQty(item.id, item.quantity + 1)}>
                  <Plus size={14} />
                </button>
              </div>
              <div style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</div>
              <button type="button" style={styles.removeButton} onClick={() => removeItem(item.id)} aria-label={`Удалить ${item.name} из корзины`}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.sectionTitle}>Способ получения</div>
      <div style={styles.radioCard(fulfillment === 'pickup')} onClick={() => setFulfillment('pickup')}>
        <div style={styles.radioCircle(fulfillment === 'pickup')}>
          <div style={styles.radioInner(fulfillment === 'pickup')} />
        </div>
        <Store size={20} color={fulfillment === 'pickup' ? theme.colors.dark.primary : theme.colors.dark.textSecondary} />
        <div style={styles.radioTextWrap}>
          <div style={styles.radioTitle}>Самовывоз — Кассель</div>
          <div style={styles.radioDesc}>Заберите в нашем магазине, адрес сообщим в личку</div>
        </div>
      </div>
      <div style={styles.radioCard(fulfillment === 'delivery')} onClick={() => setFulfillment('delivery')}>
        <div style={styles.radioCircle(fulfillment === 'delivery')}>
          <div style={styles.radioInner(fulfillment === 'delivery')} />
        </div>
        <Truck size={20} color={fulfillment === 'delivery' ? theme.colors.dark.primary : theme.colors.dark.textSecondary} />
        <div style={styles.radioTextWrap}>
          <div style={styles.radioTitle}>Доставка DHL</div>
          <div style={styles.radioDesc}>Доставим по Германии</div>
        </div>
      </div>

      <div style={styles.sectionTitle}>Способ оплаты</div>
      <div style={styles.radioCard(true)}>
        <div style={styles.radioCircle(true)}>
          <div style={styles.radioInner(true)} />
        </div>
        <span style={{ fontSize: '20px' }}>💵</span>
        <div style={styles.radioTextWrap}>
          <div style={styles.radioTitle}>Наличные</div>
          <div style={styles.radioDesc}>Оплата при получении</div>
        </div>
      </div>

      <div style={{ marginTop: theme.spacing.xl }} />

      <div style={styles.summaryRowPhoto}>
        <span>Сумма</span>
        <span>{formatCurrency(pricing.subtotal)}</span>
      </div>
      <div style={styles.totalRowPhoto}>
        <span>Итого</span>
        <div style={styles.totalPricePill}>{formatCurrency(pricing.total)}</div>
      </div>

      <div style={styles.checkout}>
        <PrimaryButton fullWidth onClick={createOrder} disabled={busy}>
          {busy ? 'Оформление...' : 'ОФОРМИТЬ ЗАКАЗ'}
        </PrimaryButton>
      </div>
    </div>
  );
};

export default Cart;
