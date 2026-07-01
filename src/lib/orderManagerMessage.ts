import { formatCurrency } from './currency';
import { getOrderStatusLabel } from './orderStatus';

type OrderLine = {
  name: string;
  quantity: number;
  price: number;
  variant?: string;
};

type OrderSummary = {
  id: string;
  status?: string;
  paymentMethod?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  userPhone?: string;
  comment?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  finalAmount?: number;
  totalAmount?: number;
  bonusApplied?: number;
  createdAt?: string;
};

export function buildOrderManagerMessage(
  order: OrderSummary,
  items: OrderLine[],
  cityTitle: string,
): string {
  const finalAmount =
    Number(order.finalAmount || 0) ||
    Math.max(0, Number(order.totalAmount || 0) - Number(order.bonusApplied || 0));
  const lines = [
    'Здравствуйте! Мой заказ:',
    '',
    `№ ${order.id}`,
    `Город: ${cityTitle || '—'}`,
    `Статус: ${getOrderStatusLabel(order.status || 'pending')}`,
    `Оплата: ${order.paymentMethod || '—'}`,
    `Доставка: ${order.deliveryMethod || '—'}`,
  ];

  if (order.deliveryAddress) lines.push(`Адрес: ${order.deliveryAddress}`);
  if (order.userPhone) lines.push(`Телефон: ${order.userPhone}`);
  if (order.deliveryDate || order.deliveryTime) {
    lines.push(`Время: ${[order.deliveryDate, order.deliveryTime].filter(Boolean).join(' ')}`);
  }
  if (order.comment) lines.push(`Комментарий: ${order.comment}`);

  lines.push('', 'Состав:');
  for (const item of items) {
    const variant = item.variant ? ` (${item.variant})` : '';
    lines.push(`• ${item.name}${variant} × ${item.quantity} — ${formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}`);
  }

  lines.push('', `Итого к оплате: ${formatCurrency(finalAmount)}`);
  if (order.createdAt) {
    lines.push(`Дата: ${new Date(order.createdAt).toLocaleString()}`);
  }

  return lines.join('\n');
}

export function buildManagerTelegramUrl(username: string, message: string): string {
  const handle = String(username || '').trim().replace(/^@/, '');
  if (!handle) return '';
  return `https://t.me/${handle}?text=${encodeURIComponent(message)}`;
}
