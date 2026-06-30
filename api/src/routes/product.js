import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../services/database.js';
import { getProducts } from '../services/sheets.js';

const router = express.Router();

function normalizeCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const map = {
    liquids: 'liquids',
    'жидкости': 'liquids',
    electronics: 'electronics',
    'электронки': 'electronics',
    disposables: 'disposables',
    'одноразки': 'disposables',
    pods: 'pods',
    'поды': 'pods',
    cartridges: 'cartridges',
    'картриджи': 'cartridges',
  };
  return map[raw] || raw;
}

function normalizeTasteProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  return {
    sweetness: Number(profile.sweetness || profile.sweet || 0),
    sourness: Number(profile.sourness || profile.sour || 0),
    fruitiness: Number(profile.fruitiness || profile.fruit || 0),
    coolness: Number(profile.coolness || profile.cool || profile.ice || 0),
    strength: Number(profile.strength || profile.hit || 0),
  };
}

function socialProof(seed) {
  const s = String(seed || '0');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  const rating = 4.3 + (h % 51) / 100;
  const reviewsCount = 12 + (h % 240);
  const weeklyOrders = 24 + (h % 90);
  const snippets = [
    'Вкус топ, доставка быстро.',
    'Брал второй раз — все ок.',
    'Качество отличное, рекомендую.',
    'Хороший вкус, не горчит.',
    'Пришло вовремя, упаковано отлично.',
  ];
  const pick = (i) => snippets[(h + i) % snippets.length];
  return {
    rating: Math.round(rating * 10) / 10,
    reviewsCount,
    weeklyOrders,
    reviews: [pick(1), pick(2), pick(3)],
  };
}

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const city = String(req.query.city || '');
    const sku = String(req.params.id || '');
    const products = await getProducts(city);
    const p = products.find((x) => String(x.sku) === sku);
    if (!p || !p.active) return res.status(404).json({ error: 'Product not found' });

    const reserved = db.getActiveReservationsByProduct(sku).reduce((s, r) => s + r.qty, 0);
    const qtyAvailable = Math.max(0, Number(p.stock) - reserved);

    const similar = products
      .filter((x) => x.active && String(x.sku) !== sku)
      .filter((x) => (p.category && normalizeCategory(x.category) === normalizeCategory(p.category)) || (p.brand && x.brand === p.brand))
      .slice(0, 6)
      .map((x) => ({
        id: x.sku,
        name: x.name,
        category: normalizeCategory(x.category),
        brand: x.brand,
        price: x.price,
        image: x.image || '',
      }));

    const fav = db.getFavorites(req.user.tgId).some((f) => String(f.product_id) === sku);

    res.json({
      product: {
        id: p.sku,
        sku: p.sku,
        name: p.name,
        category: normalizeCategory(p.category),
        brand: p.brand,
        price: p.price,
        qtyAvailable,
        description: p.description || '',
        image: p.image || '',
        tasteProfile: normalizeTasteProfile(p.tasteProfile),
        favorite: fav,
      },
      social: socialProof(sku),
      similar,
    });
  } catch (e) {
    console.error('Product error:', e);
    const status = Number(e?.status) || 500;
    if (status === 503) {
      return res.status(503).json({ error: 'Sheets not configured', code: e.code, missing: e.missing || [] });
    }
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

export default router;
