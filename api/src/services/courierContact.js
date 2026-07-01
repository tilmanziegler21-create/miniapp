import db from './database.js';
import { getCouriers } from './sheets.js';

export async function resolveCourierContact(city, courierRef) {
  const cityStr = String(city || '').trim();
  if (!cityStr) return null;

  const ref = String(courierRef || '').trim();
  let couriers = [];
  try {
    couriers = await getCouriers(cityStr);
  } catch {
    return null;
  }

  const active = couriers.filter((c) => Boolean(c?.active));
  if (!active.length) return null;

  let courier =
    active.find((c) => String(c.courier_id || '') === ref || String(c.tg_id || '') === ref) ||
    null;
  if (!courier) courier = active[0];

  const tgId = String(courier.tg_id || '').trim();
  if (!tgId && ref && /^\d+$/.test(ref)) {
    return resolveCourierContactByTgId(ref, courier);
  }
  if (!tgId) return null;

  const fromSheet = String(courier.username || '').trim().replace(/^@/, '');
  const fromDb = String(db.getUser(tgId)?.username || '').trim().replace(/^@/, '');

  return {
    courierId: String(courier.courier_id || '').trim(),
    tgId,
    username: fromSheet || fromDb,
    name: String(courier.name || '').trim() || 'Курьер',
  };
}

function resolveCourierContactByTgId(tgId, fallbackCourier) {
  const fromDb = String(db.getUser(tgId)?.username || '').trim().replace(/^@/, '');
  return {
    courierId: String(fallbackCourier?.courier_id || '').trim(),
    tgId: String(tgId),
    username: fromDb || String(fallbackCourier?.username || '').trim().replace(/^@/, ''),
    name: String(fallbackCourier?.name || '').trim() || 'Курьер',
  };
}
