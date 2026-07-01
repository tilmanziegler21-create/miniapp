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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function userLink({ username, tgId, fallback }) {
  const cleanUsername = String(username || '').replace(/^@/, '').trim();
  if (cleanUsername) {
    return `<a href="https://t.me/${escapeHtml(cleanUsername)}">@${escapeHtml(cleanUsername)}</a>`;
  }
  const cleanTgId = String(tgId || '').trim();
  if (cleanTgId) {
    return `<a href="tg://user?id=${escapeHtml(cleanTgId)}">${escapeHtml(fallback || cleanTgId)}</a>`;
  }
  return escapeHtml(fallback || 'Клиент');
}

function formatDateLabel(rawDate) {
  const value = String(rawDate || '').trim();
  if (!value) return 'сегодня';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = diffDays === 0 ? 'сегодня' : diffDays === 1 ? 'завтра' : diffDays === 2 ? 'послезавтра' : value;
  return `${prefix} (${day}.${month})`;
}

function formatItems(items = []) {
  if (!items.length) return '—';
  return items
    .map((it) => {
      const name = String(it.name || it.product_id || 'Товар');
      const brand = String(it.brand || '').trim();
      const variant = String(it.variant || '').trim();
      const qty = Number(it.quantity || it.qty || 1);
      const title = brand
        ? `${brand}${variant ? ` - ${variant}` : ` - ${name}`}`
        : `${name}${variant ? ` - ${variant}` : ''}`;
      const source = String(it.source || '').trim() === 'upsell' ? ' (апсел из приложения)' : ' (сам)';
      return `• ${escapeHtml(title)}${source}${qty > 1 ? ` × ${qty}` : ''}`;
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

  const assignedCourierId = String(order.courier_id || '').trim();
  const assignedCourier = assignedCourierId
    ? couriers.find((c) => String(c?.courier_id || '') === assignedCourierId || String(c?.tg_id || '') === assignedCourierId)
    : null;

  const targetCouriers = assignedCourier
    ? [assignedCourier]
    : couriers.filter((c) => Boolean(c?.active));

  const targets = new Set(
    targetCouriers
      .filter((c) => String(c?.tg_id || '').trim())
      .map((c) => String(c.tg_id).trim()),
  );

  const adminIds = String(process.env.TELEGRAM_ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const id of adminIds) targets.add(id);

  if (!targets.size) return;

  const botUsername = String(process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
  const replyMarkup = botUsername
    ? { inline_keyboard: [[{ text: '📦 Открыть заказ', url: `https://t.me/${botUsername}?startapp=courier` }]] }
    : undefined;

  const orderId = String(order.id || order.order_id || '');
  let userName = String(order.user_name || order.username || order.user_id || 'Клиент');
  let username = String(order.username || '').trim();
  let tgId = String(order.user_id || '').trim();
  try {
    const raw = String(order.courier_data || '').trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      userName = String(parsed?.user?.username || parsed?.user?.tgId || userName);
      username = String(parsed?.user?.username || username).trim();
      tgId = String(parsed?.user?.tgId || tgId).trim();
    }
  } catch {
    // ignore
  }
  const total = Number(order.final_amount ?? order.total_amount ?? 0);
  const payment = paymentLabel(order.payment_method);
  const when = formatDateLabel(order.delivery_date);
  const time = String(order.delivery_time || '').trim() || 'по графику курьера';
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
    `🚀 <b>Новый заказ #${escapeHtml(orderId)}</b>`,
    `Оплата: <b>${escapeHtml(payment)}</b>`,
    `Клиент: ${userLink({ username, tgId, fallback: userName })}`,
    `Когда: ${when}`,
    `Время: ${escapeHtml(time)}`,
    '',
    formatItems(items),
    '',
    `Итого: <b>${total.toFixed(2)}</b>`,
    comment ? `\nКомментарий: ${comment.slice(0, 300)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  await Promise.allSettled(
    [...targets].map((chatId) => sendTelegramMessage(chatId, text, replyMarkup ? { reply_markup: replyMarkup } : {})),
  );
}
