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
