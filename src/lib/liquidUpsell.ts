import type { CatalogProduct } from '../store/useCatalogStore';
import type { CartItem } from '../store/useCartStore';

// Keep in sync with api/src/services/liquidPricing.js isLiquidCategory.
export function isLiquidCategory(category: string) {
  const raw = String(category || '').trim().toLowerCase();
  return raw === 'liquids' || raw === 'liquid' || raw.includes('жидк');
}

export function countLiquidItems(items: CartItem[]) {
  return items.reduce((sum, item) => (isLiquidCategory(item.category) ? sum + Number(item.quantity || 0) : sum), 0);
}

export function pickLiquidUpsellProducts(
  items: CartItem[],
  catalog: CatalogProduct[],
  limit = 3,
): CatalogProduct[] {
  const liquidQty = countLiquidItems(items);
  if (liquidQty < 1) return [];

  const inCart = new Set(items.map((item) => String(item.productId)));
  const pool = catalog.filter(
    (product) =>
      isLiquidCategory(product.category) &&
      product.qtyAvailable > 0 &&
      !inCart.has(String(product.id)),
  );

  if (!pool.length) return [];

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, limit);
}

function numericTiers(liquidPrices: Record<string, number>) {
  return Object.keys(liquidPrices)
    .filter((key) => key !== 'extra')
    .map((key) => ({ qty: Number(key), price: Number(liquidPrices[key]) }))
    .filter((entry) => Number.isFinite(entry.qty) && entry.qty > 0 && Number.isFinite(entry.price) && entry.price > 0)
    .sort((a, b) => a.qty - b.qty);
}

function isPerUnitTierPricing(liquidPrices: Record<string, number>) {
  const tiers = numericTiers(liquidPrices);
  if (tiers.length < 2) return true;
  return tiers[1].price <= tiers[0].price;
}

export function unitPriceAtQuantity(quantity: number, liquidPrices: Record<string, number>) {
  const tiers = numericTiers(liquidPrices);
  if (!tiers.length || quantity <= 0) return 0;
  let unitPrice = tiers[0].price;
  for (const tier of tiers) {
    if (quantity >= tier.qty) unitPrice = tier.price;
  }
  return unitPrice;
}

export function liquidBundleTotal(quantity: number, liquidPrices: Record<string, number>) {
  const qty = Number(quantity || 0);
  if (qty <= 0) return 0;
  if (isPerUnitTierPricing(liquidPrices)) {
    return Math.round(qty * unitPriceAtQuantity(qty, liquidPrices) * 100) / 100;
  }
  const exact = liquidPrices[String(qty)];
  if (exact) return Number(exact);
  const tiers = numericTiers(liquidPrices);
  const maxQty = tiers[tiers.length - 1]?.qty || 0;
  if (maxQty > 0 && qty > maxQty) {
    const base = Number(liquidPrices[String(maxQty)] || 0);
    const extra = Number(liquidPrices.extra || 15);
    return base + (qty - maxQty) * extra;
  }
  return qty * unitPriceAtQuantity(qty, liquidPrices);
}

export function nextLiquidBundlePrice(
  currentQty: number,
  liquidPrices: Record<string, number>,
) {
  const nextQty = Math.max(1, currentQty + 1);
  return liquidBundleTotal(nextQty, liquidPrices);
}

export function liquidTierSavings(currentQty: number, liquidPrices: Record<string, number>) {
  const qty = Math.max(0, Number(currentQty || 0));
  const nextQty = qty + 1;
  if (nextQty <= 1) return 0;
  const naive = liquidBundleTotal(qty, liquidPrices) + unitPriceAtQuantity(1, liquidPrices);
  const bundled = liquidBundleTotal(nextQty, liquidPrices);
  return Math.max(0, Math.round((naive - bundled) * 100) / 100);
}

export type LiquidUpsellStage = {
  nextQty: number;
  title: string;
  subtitle: string;
  animation: 'pulse' | 'burst' | 'glow';
};

export function getLiquidUpsellStage(liquidQty: number, liquidPrices: Record<string, number>): LiquidUpsellStage | null {
  const qty = Number(liquidQty || 0);
  if (qty < 1) return null;
  const nextQty = qty + 1;
  const savings = liquidTierSavings(qty, liquidPrices);
  const nextTotal = nextLiquidBundlePrice(qty, liquidPrices);

  if (qty === 1) {
    return {
      nextQty: 2,
      title: '2-я жидкость — очень выгодно',
      subtitle: savings > 0
        ? `Экономия ${savings.toFixed(2)} € · ${nextTotal?.toFixed(2)} € за 2 шт`
        : `Всего ${nextTotal?.toFixed(2)} € за 2 шт по таблице цен`,
      animation: 'pulse',
    };
  }
  if (qty === 2) {
    return {
      nextQty: 3,
      title: '3-я жидкость — максимальная выгода',
      subtitle: savings > 0
        ? `Ещё −${savings.toFixed(2)} € · ${nextTotal?.toFixed(2)} € за 3 шт`
        : `Всего ${nextTotal?.toFixed(2)} € за 3 шт — лучшая цена`,
      animation: 'burst',
    };
  }
  return {
    nextQty,
    title: 'Бери ещё — цена за штуку ниже',
    subtitle: `${unitPriceAtQuantity(nextQty, liquidPrices).toFixed(2)} €/шт при ${nextQty} шт`,
    animation: 'glow',
  };
}

export function getBrandLiquidFlavors(catalog: CatalogProduct[], brand: string) {
  const brandKey = String(brand || '').trim();
  if (!brandKey) return [];
  return catalog
    .filter((p) => isLiquidCategory(p.category) && String(p.brand || '').trim() === brandKey && p.qtyAvailable > 0)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
