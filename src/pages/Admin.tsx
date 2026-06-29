import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { GlassCard, SectionDivider, PrimaryButton, SecondaryButton, theme } from '../ui';
import { useCityStore } from '../store/useCityStore';
import { useToastStore } from '../store/useToastStore';
import { formatCurrency } from '../lib/currency';
import { Plus, Edit, Trash2, Users, Package, TrendingUp, Gift, Calendar, Clock, MapPin, Phone } from 'lucide-react';

type AdminOrder = {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  totalAmount: number;
  courierId?: string;
  courierName?: string;
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

type CourierRow = {
  courier_id: string;
  name: string;
  tg_id: string;
  active: boolean;
  time_from: string;
  time_to: string;
  phone?: string;
  orders_today?: number;
};

type Promo = {
  id: string;
  title: string;
  description: string;
  discount: number;
  type: 'percentage' | 'fixed' | 'gift';
  validUntil: string;
  isActive: boolean;
  terms: string[];
  minOrderAmount?: number;
  maxUses?: number;
  currentUses?: number;
};

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToastStore();
  const { city } = useCityStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [couriers, setCouriers] = useState<CourierRow[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'couriers' | 'promos' | 'stats'>('stats');
  const [selectedDate, setSelectedDate] = useState<'today' | 'week' | 'month'>('today');
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    activeOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    activeCouriers: 0,
    activePromos: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      if (!city) {
        toast.push('Выберите город', 'error');
        return;
      }
      
      const [ordersRes, couriersRes, promosRes, statsRes] = await Promise.all([
        adminAPI.orders(city),
        adminAPI.couriers(city),
        adminAPI.promos(city),
        adminAPI.stats(city, selectedDate)
      ]);
      
      setOrders(ordersRes.data.orders || []);
      setCouriers(couriersRes.data.couriers || []);
      setPromos(promosRes.data.promos || []);
      setStats(statsRes.data.stats || stats);
    } catch (error) {
      console.error('Failed to load admin data:', error);
      toast.push('Ошибка загрузки данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [city, selectedDate]);

  const updateOrderStatus = async (orderId: string, newStatus: AdminOrder['status']) => {
    try {
      await adminAPI.updateOrderStatus(orderId, newStatus, city);
      toast.push('Статус заказа обновлен', 'success');
      loadData();
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.push('Ошибка обновления статуса', 'error');
    }
  };

  const toggleCourierStatus = async (courierId: string, active: boolean) => {
    try {
      await adminAPI.toggleCourierStatus(courierId, active, city);
      toast.push(`Курьер ${active ? 'активирован' : 'деактивирован'}`, 'success');
      loadData();
    } catch (error) {
      console.error('Failed to toggle courier status:', error);
      toast.push('Ошибка обновления статуса курьера', 'error');
    }
  };

  const togglePromoStatus = async (promoId: string, active: boolean) => {
    try {
      await adminAPI.togglePromoStatus(promoId, active);
      toast.push(`Акция ${active ? 'активирована' : 'деактивирована'}`, 'success');
      loadData();
    } catch (error) {
      console.error('Failed to toggle promo status:', error);
      toast.push('Ошибка обновления статуса акции', 'error');
    }
  };

  const openCourierEdit = () => {
    toast.push('Редактирование курьера будет доступно в следующем обновлении', 'info');
  };

  const openPromoEditor = () => {
    toast.push('Редактор акций пока недоступен. Используйте переключение активности ниже.', 'info');
  };

  const getStatusColor = (status: AdminOrder['status']) => {
    switch (status) {
      case 'pending': return '#38bdf8';
      case 'assigned': return '#60a5fa';
      case 'picked_up': return '#2563eb';
      case 'delivered': return '#22c55e';
      case 'cancelled': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getStatusText = (status: AdminOrder['status']) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'assigned': return 'Назначен';
      case 'picked_up': return 'В пути';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменен';
      default: return 'Неизвестно';
    }
  };

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
    tabBar: {
      display: 'flex',
      gap: theme.spacing.sm,
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.lg,
      overflowX: 'auto' as const,
    },
    tabButton: (active: boolean) => ({
      padding: '8px 16px',
      borderRadius: theme.radius.md,
      border: '1px solid rgba(96,165,250,0.14)',
      background: active ? 'rgba(96,165,250,0.18)' : 'rgba(16,15,18,0.82)',
      color: active ? theme.colors.dark.primary : theme.colors.dark.text,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap' as const,
    }),
    dateSelector: {
      display: 'flex',
      gap: theme.spacing.sm,
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.lg,
    },
    dateButton: (active: boolean) => ({
      padding: '6px 12px',
      borderRadius: theme.radius.sm,
      border: '1px solid rgba(96,165,250,0.14)',
      background: active ? 'rgba(96,165,250,0.18)' : 'rgba(16,15,18,0.82)',
      color: active ? theme.colors.dark.primary : theme.colors.dark.text,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.medium,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }),
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: theme.spacing.md,
      padding: `0 ${theme.padding.screen}`,
      marginBottom: theme.spacing.lg,
    },
    statCard: {
      background: 'rgba(16,15,18,0.82)',
      borderRadius: theme.radius.lg,
      padding: theme.spacing.lg,
      border: '1px solid rgba(96,165,250,0.12)',
    },
    statValue: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.dark.primary,
      marginBottom: theme.spacing.xs,
    },
    statLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.dark.textSecondary,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
    },
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
    statusBadge: (status: AdminOrder['status']) => ({
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
      flexWrap: 'wrap' as const,
    },
    courierCard: {
      marginBottom: theme.spacing.md,
      position: 'relative' as const,
    },
    courierHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    courierName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    },
    courierStatus: (active: boolean) => ({
      padding: '4px 8px',
      borderRadius: theme.radius.sm,
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      background: active ? 'rgba(56,189,248,0.18)' : 'rgba(239,68,68,0.16)',
      color: active ? '#7dd3fc' : '#fca5a5',
      border: `1px solid ${active ? 'rgba(56,189,248,0.24)' : 'rgba(239,68,68,0.24)'}`,
    }),
    promoCard: {
      marginBottom: theme.spacing.md,
      position: 'relative' as const,
    },
    promoHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.md,
    },
    promoTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: '0.06em',
      textTransform: 'uppercase' as const,
    },
    promoDiscount: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.dark.primary,
      marginBottom: theme.spacing.xs,
    },
    promoDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.dark.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    promoTerms: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.dark.textSecondary,
      opacity: 0.8,
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
        <div style={styles.header}>
          <div style={styles.title}>Админ-панель</div>
        </div>
        <SectionDivider title="Загрузка..." />
        <div style={{ padding: `0 ${theme.padding.screen}` }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{...styles.statCard, animation: 'pulse 1.5s ease-in-out infinite'}} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="gold-glow">
      <div style={styles.header}>
        <div style={styles.title}>Админ-панель</div>
        <div style={{ color: theme.colors.dark.textSecondary, fontSize: theme.typography.fontSize.sm }}>
          {city || 'Выберите город'}
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        <button style={styles.tabButton(activeTab === 'stats')} onClick={() => setActiveTab('stats')}>
          <TrendingUp size={16} style={{ marginRight: '4px' }} />
          Статистика
        </button>
        <button style={styles.tabButton(activeTab === 'orders')} onClick={() => setActiveTab('orders')}>
          <Package size={16} style={{ marginRight: '4px' }} />
          Заказы
        </button>
        <button style={styles.tabButton(activeTab === 'couriers')} onClick={() => setActiveTab('couriers')}>
          <Users size={16} style={{ marginRight: '4px' }} />
          Курьеры
        </button>
        <button style={styles.tabButton(activeTab === 'promos')} onClick={() => setActiveTab('promos')}>
          <Gift size={16} style={{ marginRight: '4px' }} />
          Акции
        </button>
      </div>

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <>
          <SectionDivider title="Статистика" />
          
          {/* Date Selector */}
          <div style={styles.dateSelector}>
            <button style={styles.dateButton(selectedDate === 'today')} onClick={() => setSelectedDate('today')}>
              Сегодня
            </button>
            <button style={styles.dateButton(selectedDate === 'week')} onClick={() => setSelectedDate('week')}>
              Неделя
            </button>
            <button style={styles.dateButton(selectedDate === 'month')} onClick={() => setSelectedDate('month')}>
              Месяц
            </button>
          </div>

          <div style={styles.statsGrid}>
            <GlassCard padding="lg" variant="elevated">
              <div style={styles.statValue}>{stats.totalOrders}</div>
              <div style={styles.statLabel}>Всего заказов</div>
            </GlassCard>
            <GlassCard padding="lg" variant="elevated">
              <div style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</div>
              <div style={styles.statLabel}>Общая выручка</div>
            </GlassCard>
            <GlassCard padding="lg" variant="elevated">
              <div style={styles.statValue}>{stats.activeOrders}</div>
              <div style={styles.statLabel}>Активных заказов</div>
            </GlassCard>
            <GlassCard padding="lg" variant="elevated">
              <div style={styles.statValue}>{stats.deliveredOrders}</div>
              <div style={styles.statLabel}>Доставлено</div>
            </GlassCard>
            <GlassCard padding="lg" variant="elevated">
              <div style={styles.statValue}>{stats.activeCouriers}</div>
              <div style={styles.statLabel}>Активных курьеров</div>
            </GlassCard>
            <GlassCard padding="lg" variant="elevated">
              <div style={styles.statValue}>{stats.activePromos}</div>
              <div style={styles.statLabel}>Активных акций</div>
            </GlassCard>
          </div>
        </>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <>
          <SectionDivider title="Заказы" />
          <div style={{ padding: `0 ${theme.padding.screen}` }}>
            {orders.length === 0 ? (
              <GlassCard padding="lg" variant="elevated">
                <div style={styles.emptyState}>
                  <Package size={48} style={{ marginBottom: theme.spacing.md, opacity: 0.5 }} />
                  <div>Нет заказов</div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, marginTop: theme.spacing.sm }}>
                    Заказы будут отображаться здесь
                  </div>
                </div>
              </GlassCard>
            ) : (
              orders.slice(0, 20).map((order) => (
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
                      <Users size={16} />
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
                      <Calendar size={16} />
                      <span>{order.deliveryDate} {order.deliveryTime}</span>
                    </div>
                    {order.courierName && (
                      <div style={styles.infoRow}>
                        <Users size={16} />
                        <span>Курьер: {order.courierName}</span>
                      </div>
                    )}
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

                  {/* Action Buttons */}
                  <div style={styles.actionButtons}>
                    {order.status === 'pending' && (
                      <PrimaryButton
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'assigned')}
                      >
                        Назначить курьера
                      </PrimaryButton>
                    )}
                    {order.status === 'assigned' && (
                      <PrimaryButton
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'picked_up')}
                      >
                        В пути
                      </PrimaryButton>
                    )}
                    {order.status === 'picked_up' && (
                      <PrimaryButton
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        Доставлено
                      </PrimaryButton>
                    )}
                    {(order.status === 'pending' || order.status === 'assigned') && (
                      <SecondaryButton
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      >
                        Отменить
                      </SecondaryButton>
                    )}
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </>
      )}

      {/* Couriers Tab */}
      {activeTab === 'couriers' && (
        <>
          <SectionDivider title="Курьеры" />
          <div style={{ padding: `0 ${theme.padding.screen}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <div style={styles.statLabel}>Активных курьеров: {stats.activeCouriers}</div>
              <PrimaryButton size="sm" onClick={() => navigate('/courier-registration')}>
                <Plus size={16} style={{ marginRight: '4px' }} />
                Добавить курьера
              </PrimaryButton>
            </div>
            
            {couriers.length === 0 ? (
              <GlassCard padding="lg" variant="elevated">
                <div style={styles.emptyState}>
                  <Users size={48} style={{ marginBottom: theme.spacing.md, opacity: 0.5 }} />
                  <div>Нет курьеров</div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, marginTop: theme.spacing.sm }}>
                    Добавьте первого курьера
                  </div>
                </div>
              </GlassCard>
            ) : (
              couriers.slice(0, 20).map((courier) => (
                <GlassCard key={courier.courier_id} padding="lg" variant="elevated" style={styles.courierCard}>
                  <div style={styles.courierHeader}>
                    <div>
                      <div style={styles.courierName}>{courier.name}</div>
                      <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.dark.textSecondary }}>
                        ID: {courier.courier_id} • TG: {courier.tg_id}
                      </div>
                      {courier.phone && (
                        <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.dark.textSecondary }}>
                          📞 {courier.phone}
                        </div>
                      )}
                      {(courier.time_from || courier.time_to) && (
                        <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.dark.textSecondary }}>
                          <Clock size={14} style={{ marginRight: '4px' }} />
                          {courier.time_from || '—'} - {courier.time_to || '—'}
                        </div>
                      )}
                      {courier.orders_today && (
                        <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.dark.textSecondary }}>
                          📦 {courier.orders_today} заказов сегодня
                        </div>
                      )}
                    </div>
                    <div style={styles.courierStatus(courier.active)}>
                      {courier.active ? 'Активен' : 'Неактивен'}
                    </div>
                  </div>
                  <div style={styles.actionButtons}>
                    <PrimaryButton
                      size="sm"
                      onClick={() => toggleCourierStatus(courier.courier_id, !courier.active)}
                    >
                      {courier.active ? 'Деактивировать' : 'Активировать'}
                    </PrimaryButton>
                    <SecondaryButton
                      size="sm"
                      onClick={openCourierEdit}
                    >
                      <Edit size={16} style={{ marginRight: '4px' }} />
                      Редактировать
                    </SecondaryButton>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </>
      )}

      {/* Promos Tab */}
      {activeTab === 'promos' && (
        <>
          <SectionDivider title="Акции и промокоды" />
          <div style={{ padding: `0 ${theme.padding.screen}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
              <div style={styles.statLabel}>Активных акций: {stats.activePromos}</div>
              <PrimaryButton size="sm" onClick={openPromoEditor}>
                <Plus size={16} style={{ marginRight: '4px' }} />
                Создать акцию
              </PrimaryButton>
            </div>
            
            {promos.length === 0 ? (
              <GlassCard padding="lg" variant="elevated">
                <div style={styles.emptyState}>
                  <Gift size={48} style={{ marginBottom: theme.spacing.md, opacity: 0.5 }} />
                  <div>Нет акций</div>
                  <div style={{ fontSize: theme.typography.fontSize.xs, marginTop: theme.spacing.sm }}>
                    Создайте первую акцию
                  </div>
                </div>
              </GlassCard>
            ) : (
              promos.slice(0, 20).map((promo) => (
                <GlassCard key={promo.id} padding="lg" variant="elevated" style={styles.promoCard}>
                  <div style={styles.promoHeader}>
                    <div>
                      <div style={styles.promoTitle}>{promo.title}</div>
                      <div style={styles.promoDiscount}>
                        {promo.type === 'percentage' ? `-${promo.discount}%` :
                         promo.type === 'fixed' ? `-${formatCurrency(promo.discount)}` :
                         'ПОДАРОК'}
                      </div>
                      <div style={styles.promoDescription}>{promo.description}</div>
                    </div>
                    <div style={{
                      background: promo.isActive ? 'rgba(76,175,80,0.2)' : 'rgba(158,158,158,0.2)',
                      color: promo.isActive ? '#4caf50' : '#9e9e9e',
                      padding: '4px 8px',
                      borderRadius: theme.radius.sm,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.bold,
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.08em',
                      border: `1px solid ${promo.isActive ? 'rgba(76,175,80,0.3)' : 'rgba(158,158,158,0.3)'}`,
                    }}>
                      {promo.isActive ? 'Активна' : 'Неактивна'}
                    </div>
                  </div>
                  
                  <div style={styles.promoTerms}>
                    <strong>Действует до:</strong> {new Date(promo.validUntil).toLocaleDateString()}
                    {promo.minOrderAmount && (
                      <div><strong>Минимальный заказ:</strong> {formatCurrency(promo.minOrderAmount)}</div>
                    )}
                    {promo.maxUses && (
                      <div><strong>Использовано:</strong> {promo.currentUses || 0} / {promo.maxUses}</div>
                    )}
                    {promo.terms && promo.terms.length > 0 && (
                      <div style={{ marginTop: theme.spacing.xs }}>
                        <strong>Условия:</strong>
                        <ul style={{ margin: 0, paddingLeft: theme.spacing.md, marginTop: theme.spacing.xs }}>
                          {promo.terms.map((term, index) => (
                            <li key={index}>{term}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div style={styles.actionButtons}>
                    <PrimaryButton
                      size="sm"
                      onClick={() => togglePromoStatus(promo.id, !promo.isActive)}
                    >
                      {promo.isActive ? 'Деактивировать' : 'Активировать'}
                    </PrimaryButton>
                    <SecondaryButton
                      size="sm"
                      onClick={openPromoEditor}
                    >
                      <Edit size={16} style={{ marginRight: '4px' }} />
                      Редактировать
                    </SecondaryButton>
                    <SecondaryButton
                      size="sm"
                      onClick={() => toast.push('Удаление акции пока недоступно', 'info')}
                      style={{ background: 'rgba(15,23,42,0.82)', color: theme.colors.dark.textSecondary, borderColor: 'rgba(96,165,250,0.14)' }}
                    >
                      <Trash2 size={16} style={{ marginRight: '4px' }} />
                      Удалить
                    </SecondaryButton>
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Admin;
