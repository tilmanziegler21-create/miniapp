import express from 'express';
import db from '../services/database.js';
import { buildBrandAssetUrl, getBranding } from '../branding.js';
import { getLiquidPrices } from '../services/sheets.js';

const router = express.Router();

function listCities() {
  const raw = String(process.env.CITY_CODES || '').trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function currencySymbol() {
  const fromEnv = String(process.env.CURRENCY_SYMBOL || '').trim();
  if (fromEnv) return fromEnv;
  const c = String(process.env.CURRENCY || '').trim().toUpperCase();
  if (c === 'EUR') return '€';
  if (c === 'PLN') return 'zł';
  if (c === 'USD') return '$';
  if (c === 'GBP') return '£';
  return '₽';
}

router.get('/', async (req, res) => {
  const codes = listCities();
  const supportUrl = process.env.GROUP_URL || '';
  const promos = db.getPromos().filter((p) => Boolean(p.active));
  const branding = getBranding();
  
  // Try to fetch dynamic liquid prices for the first city (as a fallback/default for config)
  // Usually the client passes city via another endpoint, but we can embed default here or let client fetch it
  let dynamicLiquidPrices = null;
  if (codes.length > 0) {
    dynamicLiquidPrices = await getLiquidPrices(codes[0]);
  }

  res.json({
    branding,
    liquidPrices: dynamicLiquidPrices,
    cities: codes.map((code) => ({
      code,
      title: code,
      currencySymbol: currencySymbol(),
      managerChatUrl: supportUrl,
    })),
    cityCodes: codes,
    currency: process.env.CURRENCY || 'EUR',
    currencySymbol: currencySymbol(),
    groupUrl: process.env.GROUP_URL || '',
    reservationTtlMs: Number(process.env.RESERVATION_TTL_MS || 30 * 60 * 1000),
    support: {
      managerUsername: process.env.MANAGER_USERNAME || '',
      supportUrl,
      faqBlocks: [
        { title: 'Доставка', text: 'Доставка 24/7 (при наличии курьеров). Если курьеров нет — самовывоз.' },
        { title: 'Оплата', text: 'Оплата наличными или переводом (уточняйте у менеджера).' },
        { title: 'Возврат', text: 'По вопросам возврата и брака — напишите менеджеру.' },
      ],
    },
    banners: [],
    categoryTiles: [
      { slug: 'liquids', title: 'ЖИДКОСТИ', imageUrl: buildBrandAssetUrl('categories/category-liquids.jpg') },
      { slug: 'disposables', title: 'ОДНОРАЗКИ', imageUrl: buildBrandAssetUrl('categories/category-disposables.jpg') },
      { slug: 'pods', title: 'ПОДЫ', imageUrl: buildBrandAssetUrl('categories/category-pods.jpg') },
      { slug: 'cartridges', title: 'КАРТРИДЖИ', imageUrl: buildBrandAssetUrl('categories/category-cartridges.jpg') },
    ],
    pickupPoints: [
      { id: 'p1', title: 'ul. Krucza 03, Śródmieście', address: 'ul. Krucza 03, Śródmieście' },
      { id: 'p2', title: 'ul. Optyków 7A, Praga-Południe', address: 'ul. Optyków 7A, Praga-Południe' },
      { id: 'p3', title: "ul. Tagore'a 1, Mokotów", address: "ul. Tagore'a 1, Mokotów" },
      { id: 'p4', title: 'ul. Ordona-WSA, Wola', address: 'ul. Ordona-WSA, Wola' },
    ],
    referralRules: {
      title: 'ПРИГЛАСИТЕ 2 РЕФЕРАЛА',
      description: 'За каждых двух друзей, которые совершают покупку, вы получите бонус на баланс.',
      ctaText: 'ПРИГЛАСИТЬ ДРУГА',
    },
    promos: promos.map((p) => ({
      id: String(p.id || ''),
      title: String(p.title || ''),
      description: String(p.description || ''),
      type: String(p.type || ''),
      value: Number(p.value || 0),
      minTotal: Number(p.minTotal || 0),
      startsAt: String(p.startsAt || ''),
      endsAt: String(p.endsAt || ''),
    })),
    contests: [
      {
        id: 'WHEEL',
        title: 'КОЛЕСО ФОРТУНЫ',
        description: 'Крутите колесо и получайте бонусы на баланс.',
        ctaText: 'Крутить',
        route: '/fortune',
      },
    ],
  });
});

export default router;
