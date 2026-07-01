import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../services/database.js';
import { getCouriers, getOrders, updateOrderRowByOrderId } from '../services/sheets.js';
import { isAllowedCourierOrderStatus, normalizeOrderStatus } from '../domain/orderStatus.js';

const router = express.Router();

function safeJson(raw, fallback) {
  try {
    return JSON.parse(String(raw || ''));
  } catch {
    return fallback;
  }
}

function parseCourierData(order, dbOrder) {
  const raw = String(order?.courier_data || '').trim() || String(dbOrder?.courier_data || '').trim();
  const cd = raw ? safeJson(raw, null) : null;
  const address = String(order?.delivery_address || '').trim() || String(cd?.address || '').trim();
  const phone = String(order?.user_phone || '').trim() || String(cd?.phone || '').trim();
  const userName = String(order?.user_name || '').trim() || String(cd?.user?.username || '').trim() || String(cd?.user?.tgId || '').trim();
  const comment = String(order?.comment || '').trim() || String(cd?.comment || '').trim();
  return { address, phone, userName, comment };
}

async function isActiveCourierInCity(city, tgId) {
  try {
    const list = await getCouriers(city);
    return list.some((c) => c.active && String(c.tg_id || '') === String(tgId));
  } catch {
    return false;
  }
}

function dbItemsForOrder(orderId) {
  const items = [];
  for (const oi of db.orderItems.values()) {
    if (String(oi.order_id) !== String(orderId)) continue;
    items.push({
      name: String(oi.name || oi.product_id || ''),
      quantity: Number(oi.quantity || 0),
      price: Number(oi.price || 0),
      productId: String(oi.product_id || ''),
      brand: String(oi.brand || ''),
      variant: oi.variant ? String(oi.variant) : '',
      category: String(oi.category || ''),
    });
  }
  return items;
}

function sheetRowFromLocalOrder(local) {
  const orderId = String(local.id || '').trim();
  const items = dbItemsForOrder(orderId);
  const cd = safeJson(local.courier_data, {});
  return {
    order_id: orderId,
    user_id: String(local.user_id || ''),
    status: String(local.status || 'pending'),
    total_amount: local.total_amount != null ? String(local.total_amount) : '',
    final_amount: local.final_amount != null ? String(local.final_amount) : '',
    delivery_method: String(local.delivery_method || ''),
    courier_id: String(local.courier_id || ''),
    delivery_date: String(local.delivery_date || ''),
    delivery_time: String(local.delivery_time || ''),
    payment_method: String(local.payment_method || ''),
    created_at: String(local.created_at || new Date().toISOString()),
    item_count: String(items.length),
    items_json: JSON.stringify(items),
    courier_data: String(local.courier_data || ''),
    user_name: String(cd?.user?.username || cd?.user?.tgId || ''),
    user_phone: String(cd?.phone || ''),
    delivery_address: String(cd?.address || ''),
    comment: String(cd?.comment || ''),
  };
}

async function getMergedOrdersForCity(city) {
  const rows = await getOrders(city);
  const byId = new Map();
  for (const row of rows) {
    const id = String(row.order_id || '').trim();
    if (id) byId.set(id, row);
  }
  for (const local of db.orders.values()) {
    if (String(local.city || '') !== String(city)) continue;
    const id = String(local.id || '').trim();
    if (!id) continue;
    const st = normalizeOrderStatus(local.status);
    if (st === 'buffer') continue;
    if (!byId.has(id)) byId.set(id, sheetRowFromLocalOrder(local));
  }
  return Array.from(byId.values());
}

function mapCourierOrderRow(o) {
  const dbOrder = db.orders.get(String(o.order_id || ''));
  const cd = parseCourierData(o, dbOrder);
  const items = Array.isArray(safeJson(o.items_json, [])) ? safeJson(o.items_json, []) : dbItemsForOrder(String(o.order_id || ''));
  const totalAmount = Number(o.final_amount || 0) > 0 ? Number(o.final_amount || 0) : Number(o.total_amount || 0);
  const payoutAmount = Math.round(totalAmount * 0.2 * 100) / 100;
  return {
    id: String(o.order_id || ''),
    userId: String(o.user_id || ''),
    userName: cd.userName,
    userPhone: cd.phone,
    deliveryAddress: cd.address,
    comment: cd.comment,
    status: normalizeOrderStatus(o.status),
    totalAmount,
    payoutAmount,
    courierId: String(o.courier_id || ''),
    deliveryDate: String(o.delivery_date || ''),
    deliveryTime: String(o.delivery_time || ''),
    createdAt: String(o.created_at || ''),
    itemCount: Number(o.item_count || (Array.isArray(items) ? items.length : 0) || 0),
    items,
  };
}

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const city = String(req.query.city || '');
    if (!city) return res.status(400).json({ error: 'City parameter is required' });

    const status = String(req.user?.status || '');
    if (status !== 'courier' && status !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (status === 'courier') {
      const active = await isActiveCourierInCity(city, req.user.tgId);
      if (!active) return res.status(403).json({ error: 'Forbidden' });
    }

    const rows = await getMergedOrdersForCity(city);
    const orders = rows
      .filter((o) => normalizeOrderStatus(o.status) !== 'cancelled')
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .map(mapCourierOrderRow);

    res.json({ orders });
  } catch (e) {
    const status = Number(e?.status) || 500;
    if (status === 503) {
      return res.status(503).json({ error: 'Sheets not configured', code: e.code, missing: e.missing || [] });
    }
    res.status(500).json({ error: 'Failed to fetch courier orders' });
  }
});

router.post('/orders/status', requireAuth, async (req, res) => {
  try {
    const city = String(req.body?.city || req.query.city || '');
    if (!city) return res.status(400).json({ error: 'City parameter is required' });
    const status = String(req.user?.status || '');
    if (status !== 'courier' && status !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const orderId = String(req.body?.orderId || '').trim();
    const next = String(req.body?.status || '').trim().toLowerCase();
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    if (!isAllowedCourierOrderStatus(next)) return res.status(400).json({ error: 'Invalid status' });
    const normalizedNext = normalizeOrderStatus(next);

    if (status === 'courier') {
      const active = await isActiveCourierInCity(city, req.user.tgId);
      if (!active) return res.status(403).json({ error: 'Forbidden' });
    }

    const rows = await getMergedOrdersForCity(city);
    const order = rows.find((o) => String(o.order_id || '') === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await updateOrderRowByOrderId(city, orderId, { status: normalizedNext });
    const local = db.orders.get(String(orderId));
    if (local) {
      local.status = normalizedNext;
      db.orders.set(String(orderId), local);
      db.persistState();
    }
    res.json({ ok: true });
  } catch (e) {
    const status = Number(e?.status) || 500;
    if (status === 503) {
      return res.status(503).json({ error: 'Sheets not configured', code: e.code, missing: e.missing || [] });
    }
    res.status(500).json({ error: 'Failed to update order' });
  }
});

export default router;
