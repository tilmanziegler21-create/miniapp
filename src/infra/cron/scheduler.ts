import cron from "node-cron";
import { getDb } from "../db/sqlite";
import { expireOrder } from "../../domain/orders/OrderService";
import { computeDailyMetrics, writeDailyMetricsRow } from "../../domain/metrics/MetricsService";
import { formatDate } from "../../core/time";
import { logger } from "../logger";
import { getBot } from "../../bot/Bot";
import { updateUser } from "../data";
import { getBackend, getDefaultCity } from "../backend";
import { purgeNotIssuedOlderThan } from "../../domain/orders/OrderService";
import { NOT_ISSUED_DELETE_AFTER_MINUTES } from "../../core/constants";
import { shopConfig } from "../../config/shopConfig";
import { ReportService } from "../../services/ReportService";
import { batchGet } from "../sheets/SheetsClient";
import { getProducts } from "../data";
import { getProductsMap, normalizeProductId, formatProductName } from "../../utils/products";

export async function generateDailySummaryText(dateOverride?: string): Promise<string> {
  const db = getDb();
  const tz = process.env.TIMEZONE || "Europe/Berlin";
  const today = (dateOverride && /^\d{4}-\d{2}-\d{2}$/.test(dateOverride))
    ? dateOverride
    : new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(new Date());
  const start = Date.parse(`${today}T00:00:00.000Z`);
  const end = start + 86400000;
  const sheetCity = shopConfig.cityCode;
  const sheetName = (process.env.GOOGLE_SHEETS_MODE === "TABS_PER_CITY") ? `orders_${sheetCity}` : "orders";
  const vrOrders = await batchGet([`${sheetName}!A:Z`]);
  const valuesOrders = vrOrders[0]?.values || [];
  const headersOrders = valuesOrders[0] || [];
  const rowsOrders = valuesOrders.slice(1);
  const idxO = (n: string) => headersOrders.indexOf(n);
  const idxOCI = (...names: string[]) => {
    const lowered = names.map((n) => n.toLowerCase());
    for (let i = 0; i < headersOrders.length; i++) {
      const h = String(headersOrders[i] || "").toLowerCase();
      if (lowered.includes(h)) return i;
    }
    return -1;
  };
  console.log("📋 HEADERS:", headersOrders);
  const idIdxO = idxOCI("order_id","order id","orderid","id");
  const statusIdxO = idxOCI("status");
  const deliveredAtIdxO = idxOCI("delivered_at","delivered timestamp");
  const totalIdxO = idxOCI("total_amount","total");
  const itemsIdxO = (() => {
    let i = idxOCI("items_json","items (json)","items");
    if (i >= 0) return i;
    for (let j = 0; j < headersOrders.length; j++) {
      const h = String(headersOrders[j] || "").toLowerCase();
      if (h.includes("items")) return j;
    }
    return -1;
  })();
  const paymentIdxO = idxOCI("payment_method","payment");
  console.log(`📋 Индекс колонки items: ${itemsIdxO}`);
  const deliveredSheetRows = rowsOrders.filter(r => {
    const st = String(statusIdxO>=0 ? r[statusIdxO]||"" : "").toLowerCase();
    const d = String(deliveredAtIdxO>=0 ? r[deliveredAtIdxO]||"" : "");
    const dayPart = d.slice(0,10);
    return st==="delivered" && dayPart===today;
  });
  let ordersCount = deliveredSheetRows.length;
  let revenueSum = 0;
  let cashSum = 0, cardSum = 0;
  for (const r of deliveredSheetRows) {
    const total = Number(totalIdxO>=0 ? r[totalIdxO]||0 : 0);
    revenueSum += total;
    const pm = String(paymentIdxO>=0 ? r[paymentIdxO]||"" : "").toLowerCase();
    if (pm === "card") cardSum += total; else cashSum += total;
  }
  let upsellOffered = 0,
    upsellAccepted = 0,
    upsellRerolls = 0,
    upsellRevenue = 0;
  try {
    const offeredRows = db
      .prepare(
        "SELECT COUNT(1) AS c FROM upsell_events WHERE event_type='offered' AND timestamp >= ? AND timestamp < ?"
      )
      .get(start, end) as any;
    const acceptedRows = db
      .prepare(
        "SELECT COUNT(1) AS c FROM upsell_events WHERE event_type='accepted' AND timestamp >= ? AND timestamp < ?"
      )
      .get(start, end) as any;
    const rerollRows = db
      .prepare(
        "SELECT COUNT(1) AS c FROM upsell_events WHERE event_type='reroll' AND timestamp >= ? AND timestamp < ?"
      )
      .get(start, end) as any;
    upsellOffered = Number(offeredRows?.c || 0);
    upsellAccepted = Number(acceptedRows?.c || 0);
    upsellRerolls = Number(rerollRows?.c || 0);
    const rows = db
      .prepare(
        "SELECT items_json FROM orders WHERE status='delivered' AND ((delivered_at_ms >= ? AND delivered_at_ms < ?) OR (delivered_at_ms IS NULL AND substr(delivered_timestamp,1,10)=?))"
      )
      .all(start, end, today) as any[];
    for (const r of rows) {
      const items = JSON.parse(String(r.items_json || "[]"));
      for (const i of items) if (i.is_upsell) upsellRevenue += Number(i.price) * Number(i.qty || 1);
    }
  } catch {}
  const effectiveOffers = Math.max(upsellOffered - upsellRerolls, 1);
  const conv = Math.round((upsellAccepted / effectiveOffers) * 1000) / 10;
  console.log("═══════════════════════════════");
  console.log(`📊 Delivered из Sheets (${sheetName}) за ${today}: ${ordersCount}`);
  console.log("═══════════════════════════════");

  // Recompute items block and totals based on delivered orders
  const deliveredOrders = deliveredSheetRows.map(r => ({
    order_id: String(idIdxO>=0 ? r[idIdxO]||"" : ""),
    items_json: String(itemsIdxO>=0 ? r[itemsIdxO]||"[]" : "[]"),
    total_with_discount: Number(totalIdxO>=0 ? r[totalIdxO]||0 : 0)
  }));
  const allProdMap = await getProductsMap(sheetCity);
  try {
    console.log(`📦 Товаров загружено: ${allProdMap.size}`);
    let shown = 0;
    for (const [key, product] of allProdMap.entries()) {
      if (shown < 5) {
        console.log(`  Ключ: ${String(key)} (${typeof key}) → ${formatProductName(product as any)}`);
        shown++;
      } else {
        break;
      }
    }
    const testIds = [3204076806, 2655319381, 3204076800];
    for (const tid of testIds) {
      const foundNum = allProdMap.get(tid as any);
      const foundStr = allProdMap.get(String(tid));
      console.log(`🔍 ID ${tid}: get(${tid})=${!!foundNum} get("${tid}")=${!!foundStr}`);
    }
  } catch {}
  const stats: Map<string, number> = new Map();
  let itemsTotal = 0;
  console.log("\n═══ ПАРСИНГ ТОВАРОВ ═══");
  for (const r of deliveredOrders) {
    try {
      let items: any[] = [];
      try {
        const parsed = JSON.parse(String(r.items_json || "[]"));
        if (Array.isArray(parsed)) items = parsed;
      } catch {}
      console.log(`\n📦 Заказ #${r.order_id}:`);
      console.log(`  items_json длина: ${String(r.items_json||"").length} символов`);
      console.log(`  items_json: ${String(r.items_json||"").substring(0,100)}...`);
      console.log(`  ✅ Парсинг OK`);
      console.log(`  Тип: ${Array.isArray(items) ? "массив" : typeof items}`);
      console.log(`  Товаров в массиве: ${items.length}`);
      if (!Array.isArray(items)) {
        console.log(`  ❌ Не массив - пропускаю`);
        continue;
      }
      for (const it of items) {
        const pid = normalizeProductId(it.product_id ?? it.id);
        const keysToTry = [pid, String(pid), String(Number(pid)), String(String(pid)).toLowerCase()];
        let prod: any = null;
        for (const k of keysToTry) {
          const cand = allProdMap.get(k);
          if (cand) { prod = cand; break; }
        }
        console.log(`      В карте (${allProdMap.size} товаров): ${!!prod}`);
        let name: string;
        if (prod) {
          name = formatProductName(prod as any);
        } else if (it.name) {
          const brandPart = it.brand ? `${String(it.brand).toUpperCase()} · ` : "";
          name = `${brandPart}${String(it.name)}`;
        } else {
          name = `#${pid}`;
        }
        const qty = Number(it.qty ?? it.quantity ?? 0);
        console.log(`\n    Товар:`);
        console.log(`      raw item:`, it);
        console.log(`      normalized_id: ${pid}`);
        console.log(`      В карте (${allProdMap.size} товаров): ${!!prod}`);
        console.log(`      Название: ${name}`);
        console.log(`      Количество: ${qty}`);
        stats.set(name, (stats.get(name) || 0) + qty);
        itemsTotal += qty;
        if (stats.has(name)) {
          const cur = stats.get(name)!;
          console.log(`      Добавлено к существующему: ${cur}`);
        } else {
          console.log(`      Создана новая запись`);
        }
      }
    } catch {}
  }
  console.log('\n═══════════════════════════════');
  console.log(`📊 ИТОГО товаров в статистике: ${stats.size}`);
  if (stats.size > 0) {
    console.log('📋 Список:');
    for (const [name, count] of stats.entries()) {
      console.log(`  ${name}: ${count} шт`);
    }
  } else {
    console.log('⚠️ НЕТ ТОВАРОВ!');
  }
  console.log('═══════════════════════════════\n');
  const itemsBlock =
    Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `• ${name}: ${count} шт`)
      .join("\n") || "(нет данных)";
  const summary = [
    `📊 Отчёт за сегодня (${today})`,
    ``,
    `🏪 Магазин: ${shopConfig.shopName}`,
    `🏙 Город: ${shopConfig.cityCode}`,
    `📦 Заказов: ${ordersCount}`,
    `💰 Выручка: ${revenueSum.toFixed(2)}€`,
    ``,
    `💳 Способы оплаты:`,
    `Cash: ${cashSum.toFixed(2)}€`,
    `Card: ${cardSum.toFixed(2)}€`,
    ``,
    `🎲 Upsell (геймификация):`,
    `Предложено: ${upsellOffered}`,
    `Рероллов: ${upsellRerolls}`,
    `Принято: ${upsellAccepted}`,
    `Конверсия: ${conv}%`,
    `Доп. выручка: ${upsellRevenue.toFixed(2)}€`,
    ``,
    `📦 Продано товаров:`,
    `${itemsBlock}`,
  ].join("\n");
  return summary;
}

export async function sendDailySummary() {
  try {
    const bot = getBot();
    const summary = await generateDailySummaryText();
    const adminIds = (process.env.TELEGRAM_ADMIN_IDS || "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((x) => x);
    for (const id of adminIds) {
      try {
        await bot.sendMessage(id, summary);
      } catch {}
    }
    try {
      const city = shopConfig.cityCode;
      const sheet = (process.env.GOOGLE_SHEETS_MODE === "TABS_PER_CITY") ? `orders_${city}` : "orders";
      const vr = await batchGet([`${sheet}!A:Z`]);
      const values = vr[0]?.values || [];
      const headers = values[0] || [];
      const rows = values.slice(1);
      const idx = (name: string) => headers.indexOf(name);
      const deliveredAtIdx = (idx("delivered_at") >= 0 ? idx("delivered_at") : idx("delivered_timestamp"));
      const statusIdx = idx("status");
      const itemsIdx = idx("items_json");
      const today = new Date().toISOString().slice(0,10);
      const deliveredRows = rows.filter(r => {
        const d = String(deliveredAtIdx>=0 ? r[deliveredAtIdx]||"" : "").slice(0,10);
        const st = String(statusIdx>=0 ? r[statusIdx]||"" : "").toLowerCase();
        return d===today && st==="delivered";
      });
      const cityCodes = (process.env.CITY_CODES || shopConfig.cityCode || "FFM").split(",").map(s=>s.trim()).filter(Boolean);
      const prodGlobal = new Map<string, any>();
      for (const code of cityCodes) {
        try {
          const m = await getProductsMap(code);
          for (const [k, v] of m.entries()) if (!prodGlobal.has(k)) prodGlobal.set(k, v);
        } catch {}
      }
      const map: Record<string, { qty: number; sum: number; title: string; brand: string }> = {};
      for (const r of deliveredRows) {
        const itemsJson = String(itemsIdx>=0 ? r[itemsIdx]||"[]" : "[]");
        try {
          const items = JSON.parse(itemsJson) as Array<{ product_id: number; qty: number; price: number }>;
          for (const it of items) {
            const key = normalizeProductId(it.product_id);
            const p = prodGlobal.get(key);
            const title = p ? formatProductName(p) : `#${key}`;
            const cur = map[key] || { qty: 0, sum: 0, title, brand: p?.brand || "" };
            cur.qty += Number(it.qty||0);
            cur.sum += Number(it.price||0) * Number(it.qty||0);
            map[key] = cur;
          }
        } catch {}
      }
      const sorted = Object.entries(map).sort((a,b)=>b[1].qty - a[1].qty);
      const lines: string[] = [];
      lines.push("📦 Продажи (доставленные)");
      lines.push("");
      for (const [, v] of sorted.slice(0, 20)) {
        const brandPart = v.brand ? `${v.brand} · ` : "";
        lines.push(`• ${brandPart}${v.title} — ${v.qty} шт · ${(v.sum).toFixed(2)}€`);
      }
      if (sorted.length) {
        const top = sorted[0][1];
        const brandPart = top.brand ? `${top.brand} · ` : "";
        lines.push("");
        lines.push(`🔥 Топ вкус: ${brandPart}${top.title} — ${top.qty} шт`);
      }
      const detail = lines.join("\n");
      for (const id of adminIds) {
        try { await bot.sendMessage(id, detail); } catch {}
      }
    } catch (e) {
      logger.warn("Daily detail summary error", { error: String(e) });
    }
  } catch (e) {
    logger.error("Admin daily report error", { error: String(e) });
  }
}

export async function registerCron() {
  const timezone = "Europe/Berlin";
  cron.schedule("*/1 * * * *", async () => {
    const db = getDb();
    const nowIso = new Date().toISOString();
    const rows = db.prepare("SELECT order_id FROM orders WHERE status='buffer' AND expiry_timestamp < ?").all(nowIso) as any[];
    for (const r of rows) await expireOrder(Number(r.order_id));
  }, { timezone });

  cron.schedule("0 10 * * *", async () => {
    const db = getDb();
    const users = db.prepare("SELECT user_id FROM users WHERE next_reminder_date = ?").all(formatDate(new Date())) as any[];
    const bot = getBot();
    for (const u of users) {
      try {
        db.prepare("UPDATE users SET segment = ? WHERE user_id = ?").run("sale10", Number(u.user_id));
        try { await updateUser(Number(u.user_id), { segment: "sale10" } as any); } catch {}
        await bot.sendMessage(Number(u.user_id), "🔔 Напоминание: время повторить заказ! Скидка 10% на все жидкости по ссылке ниже. Нажмите, чтобы начать.");
      } catch {}
    }
  }, { timezone });

  cron.schedule("5 10 * * *", async () => {
    const db = getDb();
    const bot = getBot();
    const target = formatDate(new Date(Date.now() - 3 * 86400000));
    const rows = db.prepare("SELECT user_id FROM users WHERE last_purchase_date IS NULL AND first_seen = ?").all(target) as any[];
    for (const r of rows) {
      try { await bot.sendMessage(Number(r.user_id), "👋 Возвращайтесь — посмотрите каталог и соберите заказ. Жидкости ELFIC/CHASER и электроника. Нажмите /start или кнопку ниже."); } catch {}
    }
  }, { timezone });

  cron.schedule("0 22 * * *", async () => {
    await sendDailySummary();
  }, { timezone });

  cron.schedule("0 0 * * *", async () => {
    try {
      const date = formatDate(new Date());
      const row = await computeDailyMetrics(date);
      await writeDailyMetricsRow(row);
      const backend = getBackend();
      for (const city of (process.env.CITY_CODES || "FFM").split(",")) {
        await backend.upsertDailyMetrics(date, city.trim(), row);
      }
      logger.info("Metrics written", { date });
    } catch (e) {
      logger.error("Metrics error", { error: String(e) });
    }
  }, { timezone });

  cron.schedule("0 0 * * *", async () => {
    const db = getDb();
    try {
      db.prepare("UPDATE orders SET delivery_exact_time = NULL WHERE status <> 'delivered'").run();
      logger.info("Daily slot cleanup done");
    } catch (e) {
      logger.error("Daily slot cleanup error", { error: String(e) });
    }
  }, { timezone });

  cron.schedule("*/5 * * * *", async () => {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT order_id FROM orders WHERE status='delivered' AND sheets_committed=0").all() as any[];
      const backend = getBackend();
      logger.info("Repair job", { pending: rows.length });
      for (const r of rows) {
        try {
          await backend.commitDelivery(Number(r.order_id));
          db.prepare("UPDATE orders SET sheets_committed=1 WHERE order_id = ?").run(Number(r.order_id));
        } catch (e) {
          logger.warn("Repair commit failed", { order_id: r.order_id, error: String(e) });
        }
      }
    } catch (e) {
      logger.error("Repair job error", { error: String(e) });
    }
  }, { timezone });

  cron.schedule("*/10 * * * *", async () => {
    try {
      const n = await purgeNotIssuedOlderThan(NOT_ISSUED_DELETE_AFTER_MINUTES);
      if (n > 0) logger.info("Purged not_issued orders", { count: n });
    } catch (e) {
      logger.error("Purge not_issued error", { error: String(e) });
    }
  }, { timezone });

  cron.schedule("0 * * * *", async () => {
    try {
      const db = getDb();
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const rows = db.prepare("SELECT order_id FROM orders WHERE status='pending' AND reserve_timestamp < ?").all(cutoff) as any[];
      const sheet = (process.env.GOOGLE_SHEETS_MODE === "TABS_PER_CITY") ? `orders_${shopConfig.cityCode}` : "orders";
      const { batchGet } = await import("../sheets/SheetsClient");
      const { google } = await import("googleapis");
      const api = google.sheets({ version: "v4" });
      const values = (await batchGet([`${sheet}!A:Z`]))[0]?.values || [];
      const headers = values[0] || [];
      const idx = (n: string) => headers.indexOf(n);
      const idIdx = idx("order_id"), statusIdx = idx("status"), cancelledAtIdx = idx("cancelled_at"), cancelledReasonIdx = idx("cancelled_reason");
      const updated: number[] = [];
      const tx = db.transaction(() => {
        for (const r of rows) {
          db.prepare("UPDATE orders SET status='cancelled' WHERE order_id=?").run(Number(r.order_id));
          updated.push(Number(r.order_id));
        }
      });
      tx();
      if (updated.length && idIdx >= 0) {
        for (let i = 1; i < values.length; i++) {
          const oid = Number(values[i][idIdx]);
          if (updated.includes(oid)) {
            const row = [...values[i]];
            if (statusIdx >= 0) row[statusIdx] = "cancelled";
            if (cancelledAtIdx >= 0) row[cancelledAtIdx] = new Date().toISOString();
            if (cancelledReasonIdx >= 0) row[cancelledReasonIdx] = "auto_expired";
            await api.spreadsheets.values.update({
              spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
              range: `${sheet}!A${i + 1}:Z${i + 1}`,
              valueInputOption: "RAW",
              requestBody: { values: [row] }
            });
          }
        }
      }
      if (updated.length) logger.info("Auto-cancelled expired pending orders", { count: updated.length });
    } catch (e) {
      logger.error("Auto-cancel expired error", { error: String(e) });
    }
  }, { timezone });

  cron.schedule("*/15 * * * *", async () => {
    try {
      const db = getDb();
      const backend = getBackend();
      const today = new Date().toISOString().slice(0,10);
      const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().slice(0,10);
      const rows = db.prepare("SELECT order_id, items_json FROM orders WHERE status IN ('pending','confirmed','courier_assigned') AND delivery_date >= ? AND delivery_date <= ?").all(today, dayAfter) as any[];
      for (const r of rows) {
        try {
          await backend.updateOrderDetails?.(Number(r.order_id), { items: String(r.items_json || "[]") } as any);
        } catch (e) {
          logger.warn("Update items to Sheets failed", { order_id: r.order_id, error: String(e) });
        }
      }
      logger.info("Synced items to Sheets for upcoming orders", { count: rows.length });
    } catch (e) {
      logger.error("Items sync to Sheets error", { error: String(e) });
    }
  }, { timezone });
  cron.schedule("*/2 * * * *", async () => {
    try {
      const db = getDb();
      const rows = db.prepare("SELECT id, order_id, updates_json, city_code, attempts FROM sheets_repair_queue ORDER BY id ASC LIMIT 20").all() as any[];
      if (!rows.length) return;
      const { getBot } = await import("../../bot/Bot");
      for (const r of rows) {
        try {
          const updates = JSON.parse(String(r.updates_json || "{}"));
          const ok = await (await import("../../bot/flows/courierFlow")).updateOrderInSheets(Number(r.order_id), updates, String(r.city_code));
          if (ok) {
            db.prepare("DELETE FROM sheets_repair_queue WHERE id = ?").run(Number(r.id));
          } else {
            db.prepare("UPDATE sheets_repair_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?").run("retry_failed", Number(r.id));
          }
        } catch (e) {
          db.prepare("UPDATE sheets_repair_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?").run(String(e), Number(r.id));
        }
      }
      logger.info("Sheets repair queue processed", { count: rows.length });
    } catch (e) {
      logger.error("Sheets repair queue error", { error: String(e) });
    }
  }, { timezone });
}
