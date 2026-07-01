import React, { useState, useEffect, useRef, useCallback } from 'react';
import { courierAPI } from '../services/api';
import { GlassCard, SectionDivider, PrimaryButton, theme } from '../ui';
import { useCityStore } from '../store/useCityStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../lib/currency';
import { Package, MapPin, Clock, Phone, CheckCircle2, User } from 'lucide-react';

type CourierOrder = {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  totalAmount: number;
  payoutAmount?: number;
  courierId?: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress: string;
  createdAt: string;
  itemCount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  notes?: string;
};

const REFRESH_INTERVAL_MS = 12000;

const isIssued = (status: CourierOrder['status']) => status === 'delivered';

function parseLocalDay(raw: string, fallback?: string): Date {
  const src = String(raw || '').trim() || String(fallback || '').trim();
  if (!src) return new Date();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(src);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  const d = src.includes('T') ? new Date(src) : new Date(`${src}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

const Courier: React.FC = () => {
  const toast = useToastStore();
  const city = useCityStore((state) => state.city);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow' | 'day_after'>('today');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const loadOrders = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        if (!city) {
          setOrders([]);
          return;
        }
        const resp = await courierAPI.orders(city);
        const next: CourierOrder[] = resp.data.orders || [];

        if (!isFirstLoadRef.current) {
          const prevIds = knownOrderIdsRef.current;
          const freshOnes = next.filter((o) => !prevIds.has(o.id));
          if (freshOnes.length > 0) {
            toast.push(
              freshOnes.length === 1 ? `Новый заказ #${freshOnes[0].id}` : `Новые заказы: ${freshOnes.length}`,
              'success',
            );
          }
        }
        knownOrderIdsRef.current = new Set(next.map((o) => o.id));
        isFirstLoadRef.current = false;
        setOrders(next);
      } catch (error) {
        console.error('Failed to load courier orders:', error);
        if (!silent) toast.push('Ошибка загрузки заказов', 'error');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [city, toast],
  );

  useEffect(() => {
    isFirstLoadRef.current = true;
    loadOrders(false);
  }, [city, loadOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => loadOrders(true), REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadOrders(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [loadOrders]);

  const markIssued = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await courierAPI.updateOrderStatus(orderId, 'delivered', city);
      toast.push('Заказ отмечен как выданный', 'success');
      loadOrders(true);
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.push('Ошибка обновления статуса', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: CourierOrder['status']) => {
    if (status === 'cancelled') return '#ef4444';
    return isIssued(status) ? '#22c55e' : '#f59e0b';
  };

  const getStatusText = (status: CourierOrder['status']) => {
    if (status === 'cancelled') return 'Отменён';
    return isIssued(status) ? 'Выдан' : 'Не выдан';
  };

  const filterOrdersByDate = (orders: CourierOrder[]) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    return orders.filter(order => {
      const orderDate = parseLocalDay(order.deliveryDate, order.createdAt);
      switch (selectedDate) {
        case 'today':
          return orderDate.toDateString() === today.toDateString();
        case 'tomorrow':
          return orderDate.toDateString() === tomorrow.toDateString();
        case 'day_after':
          return orderDate.toDateString() === dayAfter.toDateString();
        default:
          return true;
      }
    });
  };

  const filteredOrders = filterOrdersByDate(orders);
  const dayRevenue = filteredOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
  const dayPayout = filteredOrders.reduce((s, o) => s + Number(o.payoutAmount ?? (Math.round(Number(o.totalAmount || 0) * 0.2 * 100) / 100)), 0);

  const styles = {
    container: {
      minHeight: '100vh',
      color: theme.colors.dark.text,
      fontFamily: theme.typography.fontFamily,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    },
    dateSelector: {
      display: 'flex',
      gap: theme.spacing.sm,
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.lg,
    },
    dateButton: (active: boolean) => ({
      padding: '8px 16px',
      borderRadius: theme.radius.md,
      border: '1px solid rgba(96,165,250,0.14)',
      background: active ? 'rgba(96,165,250,0.18)' : 'rgba(16,15,18,0.82)',
      color: active ? theme.colors.dark.primary : theme.colors.dark.text,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
    orderCard: {
      marginBottom: theme.spacing.md,
      position: 'relative' as const,
    },
    orderHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    orderId: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    },
    statusBadge: (status: CourierOrder['status']) => ({
      background: getStatusColor(status),
      color: '#eff6ff',
      padding: '4px 8px',
      borderRadius: theme.radius.sm,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
    }),
    customerInfo: {
      marginBottom: theme.spacing.md,
    },
    infoRow: {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.dark.textSecondary,
    },
    address: {
      color: theme.colors.dark.text,
      fontWeight: theme.typography.fontWeight.medium,
    },
    itemsList: {
      marginBottom: theme.spacing.md,
    },
    item: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid rgba(96,165,250,0.12)',
    },
    itemName: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.dark.text,
    },
    itemQuantity: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.dark.textSecondary,
    },
    totalAmount: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTop: '1px solid rgba(96,165,250,0.12)',
    },
    totalLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.dark.textSecondary,
    },
    totalValue: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.dark.primary,
    },
    actionButtons: {
      display: 'flex',
      gap: theme.spacing.sm,
    },
    emptyState: {
      textAlign: 'center' as const,
      color: theme.colors.dark.textSecondary,
      padding: theme.spacing.xl,
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Курьер</div>
        <SectionDivider title="Мои заказы" />
        <div style={{ padding: `0 ${theme.padding.screen}` }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{...styles.orderCard, animation: 'pulse 1.5s ease-in-out infinite'}} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="gold-glow">
      <div style={styles.header}>
        <div style={styles.title}>Курьер</div>
      </div>

      <SectionDivider title="Мои заказы" />

      {/* Date Selector */}
      <div style={styles.dateSelector}>
        <button
          style={styles.dateButton(selectedDate === 'today')}
          onClick={() => setSelectedDate('today')}
        >
          Сегодня
        </button>
        <button
          style={styles.dateButton(selectedDate === 'tomorrow')}
          onClick={() => setSelectedDate('tomorrow')}
        >
          Завтра
        </button>
        <button
          style={styles.dateButton(selectedDate === 'day_after')}
          onClick={() => setSelectedDate('day_after')}
        >
          Послезавтра
        </button>
      </div>

      <div style={{ padding: `0 ${theme.padding.screen}`, marginBottom: theme.spacing.md }}>
        <GlassCard padding="md" variant="elevated">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing.md, flexWrap: 'wrap' as const }}>
            <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm }}>
              Оборот: <span style={{ color: theme.colors.dark.text, fontWeight: theme.typography.fontWeight.bold }}>{formatCurrency(dayRevenue)}</span>
            </div>
            <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm }}>
              К выплате (20%): <span style={{ color: '#37d67a', fontWeight: theme.typography.fontWeight.bold }}>{formatCurrency(dayPayout)}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Orders List */}
      <div style={{ padding: `0 ${theme.padding.screen}` }}>
        {filteredOrders.length === 0 ? (
          <GlassCard padding="lg" variant="elevated">
            <div style={styles.emptyState}>
              <Package size={48} style={{ marginBottom: theme.spacing.md, opacity: 0.5 }} />
              <div>Нет заказов на выбранную дату</div>
              <div style={{ fontSize: theme.typography.fontSize.xs, marginTop: theme.spacing.sm }}>
                Проверьте другие даты или обратитесь к менеджеру
              </div>
            </div>
          </GlassCard>
        ) : (
          filteredOrders.map((order) => (
            <GlassCard key={order.id} padding="lg" variant="elevated" style={styles.orderCard}>
              {/* Order Header */}
              <div style={styles.orderHeader}>
                <div style={styles.orderId}>Заказ #{order.id}</div>
                <div style={styles.statusBadge(order.status)}>
                  {getStatusText(order.status)}
                </div>
              </div>

              {/* Customer Info */}
              <div style={styles.customerInfo}>
                <div style={styles.infoRow}>
                  <User size={16} />
                  <span>{order.userName || `Клиент ${order.userId}`}</span>
                  {order.userPhone && (
                    <>
                      <span>•</span>
                      <Phone size={16} />
                      <span>{order.userPhone}</span>
                    </>
                  )}
                </div>
                <div style={styles.infoRow}>
                  <MapPin size={16} />
                  <span style={styles.address}>{order.deliveryAddress}</span>
                </div>
                <div style={styles.infoRow}>
                  <Clock size={16} />
                  <span>{order.deliveryTime || 'Время не указано'}</span>
                </div>
              </div>

              {/* Items List */}
              <div style={styles.itemsList}>
                {order.items?.slice(0, 3).map((item, index) => (
                  <div key={index} style={styles.item}>
                    <div style={styles.itemName}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
                      <span style={styles.itemQuantity}>x{item.quantity}</span>
                      <span style={{ fontWeight: theme.typography.fontWeight.bold }}>
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
                {order.items && order.items.length > 3 && (
                  <div style={{ textAlign: 'center', fontSize: theme.typography.fontSize.xs, color: theme.colors.dark.textSecondary, marginTop: theme.spacing.sm }}>
                    + ещё {order.items.length - 3} позиций
                  </div>
                )}
              </div>

              {/* Total Amount */}
              <div style={styles.totalAmount}>
                <span style={styles.totalLabel}>Итого:</span>
                <span style={styles.totalValue}>{formatCurrency(order.totalAmount)}</span>
              </div>
              <div style={{ ...styles.totalAmount, borderTop: 'none', paddingTop: 0 }}>
                <span style={styles.totalLabel}>К выплате (20%):</span>
                <span style={{ ...styles.totalValue, color: '#37d67a' }}>
                  {formatCurrency(order.payoutAmount ?? Math.round(order.totalAmount * 0.2 * 100) / 100)}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={styles.actionButtons}>
                {order.status === 'cancelled' ? (
                  <div style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.sm,
                    textAlign: 'center' as const,
                    color: '#ef4444',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.bold,
                    width: '100%',
                  }}>
                    Заказ отменён
                  </div>
                ) : isIssued(order.status) ? (
                  <div style={{
                    background: 'rgba(76,175,80,0.1)',
                    border: '1px solid rgba(76,175,80,0.3)',
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.sm,
                    textAlign: 'center' as const,
                    color: '#4caf50',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.bold,
                    width: '100%',
                  }}>
                    ✓ Заказ выдан
                  </div>
                ) : (
                  <PrimaryButton
                    size="sm"
                    fullWidth
                    onClick={() => markIssued(order.id)}
                    disabled={updatingId === order.id}
                  >
                    <CheckCircle2 size={16} style={{ marginRight: '6px' }} />
                    {updatingId === order.id ? 'Обновление…' : 'Отметить выданным'}
                  </PrimaryButton>
                )}
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
};

export default Courier;
