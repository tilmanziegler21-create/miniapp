export type CustomerOrderStatus = 'buffer' | 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled' | string;

const LABELS: Record<string, string> = {
  buffer: 'Оформление',
  pending: 'Заказ принят',
  assigned: 'Готовится к выдаче',
  picked_up: 'В пути',
  delivered: 'Выдан',
  cancelled: 'Отменён',
};

export function getOrderStatusLabel(status: CustomerOrderStatus): string {
  const key = String(status || '').trim().toLowerCase();
  return LABELS[key] || 'В обработке';
}

const DELIVERY_LABELS: Record<string, string> = {
  pickup: 'Самовывоз',
  mail: 'Почта',
  courier: 'Курьер',
};

export function getDeliveryMethodLabel(method?: string): string {
  const key = String(method || '').trim().toLowerCase();
  return DELIVERY_LABELS[key] || String(method || '—');
}
