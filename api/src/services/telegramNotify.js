import { getCouriers } from './sheets.js';

function botToken() {
  return String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
}

async function sendTelegramMessage(chatId, text, extra = {}) {
  const token = botToken();
  const target = String(chatId || '').trim();
  if (!token || !target) return false;

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: target,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...extra,
      }),
    });
    return resp.ok;
  } catch (e) {
    console.error('Telegram notify failed:', e?.message || e);
    return false;
  }
}

function paymentLabel(method) {
  const m = String(method || '').trim().toLowerCase();
  if (m === 'card') return 'Картой';
  if (m === 'crypto') return 'Криптовалюта';
  return 'Наличные';
}

function formatItems(items = []) {
  if (!items.length) return '—';
  return items
    .map((it) => {
      const name = String(it.name || it.product_id || 'Товар');
      const qty = Number(it.quantity || it.qty || 1);
      const price = Number(it.price || it.unit_price || 0);
      return `• ${name} × ${qty}${price ? ` — ${price.toFixed(2)}` : ''}`;
    })
    .join('\n');
}

export async function notifyCouriersAboutNewOrder({ city, order, items = [] }) {
  const token = botToken();
  if (!token || !city || !order) return;

  let couriers = [];
  try {
    couriers = await getCouriers(String(city));
  } catch (e) {
    console.warn('Courier notify: failed to load couriers', e?.message || e);
    return;
  }

  const targets = new Set(
    couriers
      .filter((c) => Boolean(c?.active) && String(c?.tg_id || '').trim())
      .map((c) => String(c.tg_id).trim()),
  );

  const adminIds = String(process.env.TELEGRAM_ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const id of adminIds) targets.add(id);

  if (!targets.size) return;

  const orderId = String(order.id || order.order_id || '');
  let userName = String(order.user_name || order.username || order.user_id || 'Клиент');
  try {
    const raw = String(order.courier_data || '').trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      userName = String(parsed?.user?.username || parsed?.user?.tgId || userName);
    }
  } catch {
    // ignore
  }
  const total = Number(order.final_amount ?? order.total_amount ?? 0);
  const payment = paymentLabel(order.payment_method);
  const pickup = String(order.delivery_method || '') === 'pickup' ? 'Самовывоз' : String(order.delivery_method || 'Самовывоз');
  let comment = String(order.comment || '').trim();
  try {
    const raw = String(order.courier_data || '').trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!comment && parsed?.comment) comment = String(parsed.comment).trim();
    }
  } catch {
    // ignore
  }

  const text = [
    `📦 <b>Новый заказ #${orderId}</b>`,
    `Город: <b>${city}</b>`,
    `Получение: ${pickup}`,
    `Оплата: ${payment}`,
    `Клиент: ${userName}`,
    '',
    formatItems(items),
    '',
    `Итого: <b>${total.toFixed(2)}</b>`,
    comment ? `\nКомментарий: ${comment.slice(0, 300)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await Promise.allSettled([...targets].map((chatId) => sendTelegramMessage(chatId, text)));
}
