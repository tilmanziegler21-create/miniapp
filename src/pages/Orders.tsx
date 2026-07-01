import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { orderAPI } from '../services/api';
import { GlassCard, SectionDivider, PrimaryButton, theme } from '../ui';
import { formatCurrency } from '../lib/currency';
import { useCityStore } from '../store/useCityStore';
import { useConfigStore } from '../store/useConfigStore';
import { useToastStore } from '../store/useToastStore';
import { getOrderStatusLabel } from '../lib/orderStatus';
import { buildOrderManagerMessage, openCourierTelegramChat, type CourierContact } from '../lib/orderManagerMessage';

type OrderItem = {
  id: string;
  status: string;
  totalAmount: number;
  finalAmount?: number;
  bonusApplied?: number;
  deliveryMethod?: string;
  createdAt?: string;
  itemCount?: number;
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  buffer: { bg: 'rgba(96,165,250,0.10)', text: 'rgba(191,219,254,0.92)' },
  pending: { bg: 'rgba(56,189,248,0.16)', text: 'rgba(125,211,252,0.98)' },
  assigned: { bg: 'rgba(59,130,246,0.18)', text: 'rgba(147,197,253,0.98)' },
  picked_up: { bg: 'rgba(37,99,235,0.20)', text: 'rgba(191,219,254,0.98)' },
  delivered: { bg: 'rgba(34,197,94,0.14)', text: 'rgba(134,239,172,0.96)' },
  cancelled: { bg: 'rgba(239,68,68,0.16)', text: 'rgba(252,165,165,0.96)' },
};

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const city = useCityStore((state) => state.city);
  const config = useConfigStore((state) => state.config);
  const toast = useToastStore();
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<OrderItem[]>([]);
  const [managerBusyId, setManagerBusyId] = React.useState<string | null>(null);
  const freshOrderId = String((location.state as { freshOrderId?: string } | null)?.freshOrderId || '').trim();
  const cityTitle = config?.cities?.find((c) => c.code === city)?.title || city || '';

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        if (!city) {
          if (!cancelled) setOrders([]);
          return;
        }
        const resp = await orderAPI.getHistory(city);
        if (!cancelled) setOrders(resp.data.orders || []);
      } catch (e) {
        console.error('Orders load error:', e);
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [city]);

  const writeToCourier = async (orderId: string) => {
    if (!city) return;
    setManagerBusyId(orderId);
    try {
      const resp = await orderAPI.getById(orderId, city);
      const order = resp.data?.order;
      const items = Array.isArray(resp.data?.items) ? resp.data.items : [];
      const courier = (resp.data?.courier || null) as CourierContact | null;
      if (!order) {
        toast.push('Не удалось загрузить заказ', 'error');
        return;
      }
      if (!courier?.tgId && !courier?.username) {
        toast.push('Курьер не назначен', 'error');
        return;
      }
      const message = buildOrderManagerMessage(order, items, cityTitle, courier?.name);
      await openCourierTelegramChat(courier, message, toast);
    } catch (e) {
      console.error('Write to courier failed:', e);
      toast.push('Не удалось открыть чат с курьером', 'error');
    } finally {
      setManagerBusyId(null);
    }
  };

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
      marginBottom: theme.spacing.xl,
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    id: {
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
      fontSize: theme.typography.fontSize.sm,
    },
    meta: {
      color: theme.colors.dark.textSecondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.xs,
    },
    status: (s: string) => {
      const st = statusStyles[String(s || '').toLowerCase()] || statusStyles.buffer;
      return {
        borderRadius: 999,
        padding: '6px 12px',
        border: '1px solid rgba(96,165,250,0.14)',
        background: st.bg,
        color: st.text,
        fontSize: theme.typography.fontSize.xs,
        letterSpacing: '0.14em',
        textTransform: 'uppercase' as const,
        whiteSpace: 'nowrap' as const,
      };
    },
    amount: {
      fontWeight: theme.typography.fontWeight.bold,
      background: 'rgba(96,165,250,0.12)',
      color: theme.colors.dark.text,
      borderRadius: 999,
      padding: '6px 12px',
      boxShadow: '0 14px 30px rgba(0,0,0,0.35)',
      whiteSpace: 'nowrap' as const,
    },
    freshBanner: {
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.md,
    },
  };

  return (
    <div className="gold-glow">
      <div style={styles.title}>История заказов</div>

      {freshOrderId ? (
        <div style={styles.freshBanner}>
          <GlassCard padding="lg" variant="elevated">
            <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.md, lineHeight: 1.45 }}>
              Заказ <strong style={{ color: theme.colors.dark.text }}>{freshOrderId}</strong> оформлен. Напишите курьеру — мы подставим состав и детали в сообщение.
            </div>
            <PrimaryButton fullWidth disabled={managerBusyId === freshOrderId} onClick={() => writeToCourier(freshOrderId)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <MessageCircle size={18} />
                {managerBusyId === freshOrderId ? 'Открываем чат…' : 'Написать курьеру'}
              </span>
            </PrimaryButton>
          </GlassCard>
        </div>
      ) : null}

      <SectionDivider title="Последние заказы" />

      <div style={styles.list}>
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 84,
                borderRadius: theme.radius.lg,
                border: '1px solid rgba(96,165,250,0.10)',
                background: 'rgba(16,15,18,0.82)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))
        ) : orders.length ? (
          orders.slice(0, 50).map((o) => (
            <GlassCard key={o.id} padding="lg" variant="elevated">
              <button
                onClick={() => navigate(`/order/${encodeURIComponent(o.id)}`)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={styles.row}>
                  <div>
                    <div style={styles.id}>{o.id}</div>
                    <div style={styles.meta}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}{o.itemCount ? ` • ${o.itemCount} поз.` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: theme.spacing.sm }}>
                    <div style={styles.status(o.status)}>{getOrderStatusLabel(o.status)}</div>
                    <div style={styles.amount}>{formatCurrency(Number(o.finalAmount || o.totalAmount || 0))}</div>
                  </div>
                </div>
              </button>
              {o.id === freshOrderId ? (
                <div style={{ marginTop: theme.spacing.md }}>
                  <PrimaryButton fullWidth size="sm" disabled={managerBusyId === o.id} onClick={() => writeToCourier(o.id)}>
                    Написать курьеру
                  </PrimaryButton>
                </div>
              ) : null}
            </GlassCard>
          ))
        ) : (
          <GlassCard padding="lg" variant="elevated">
            <div style={{ textAlign: 'center', color: theme.colors.dark.textSecondary }}>Пока нет заказов</div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default Orders;
