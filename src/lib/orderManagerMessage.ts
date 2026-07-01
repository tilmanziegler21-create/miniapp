import WebApp from '@twa-dev/sdk';
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

export type CourierContact = {
  courierId?: string;
  tgId?: string;
  username?: string;
  name?: string;
};

export function buildOrderManagerMessage(
  order: OrderSummary,
  items: OrderLine[],
  cityTitle: string,
  courierName?: string,
): string {
  const finalAmount =
    Number(order.finalAmount || 0) ||
    Math.max(0, Number(order.totalAmount || 0) - Number(order.bonusApplied || 0));
  const lines = [
    courierName ? `Здравствуйте, ${courierName}!` : 'Здравствуйте!',
    'Мой заказ:',
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

function openTelegramUrl(url: string) {
  try {
    if (WebApp.openTelegramLink) {
      WebApp.openTelegramLink(url);
      return;
    }
  } catch (e) {
    console.error('Open telegram link failed:', e);
  }
  window.open(url, '_blank');
}

export async function openCourierTelegramChat(
  contact: CourierContact | null | undefined,
  message: string,
  toast?: { push: (msg: string, type?: 'success' | 'error' | 'info') => void },
) {
  const username = String(contact?.username || '').trim().replace(/^@/, '');
  if (username) {
    openTelegramUrl(`https://t.me/${username}?text=${encodeURIComponent(message)}`);
    return;
  }

  const tgId = String(contact?.tgId || '').trim();
  if (!tgId) {
    toast?.push('Курьер не назначен', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(message);
    toast?.push('Текст заказа скопирован — вставьте в чат курьеру', 'success');
  } catch {
    toast?.push('Откройте чат и отправьте текст заказа', 'info');
  }

  openTelegramUrl(`tg://user?id=${tgId}`);
}
