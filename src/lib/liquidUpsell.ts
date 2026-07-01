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
  if (liquidQty !== 1) return [];

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

function unitPriceAtQuantity(quantity: number, liquidPrices: Record<string, number>) {
  const tiers = numericTiers(liquidPrices);
  if (!tiers.length || quantity <= 0) return 0;
  let unitPrice = tiers[0].price;
  for (const tier of tiers) {
    if (quantity >= tier.qty) unitPrice = tier.price;
  }
  return unitPrice;
}

export function nextLiquidBundlePrice(
  currentQty: number,
  liquidPrices: Record<string, number>,
) {
  const nextQty = Math.max(1, currentQty + 1);
  const tiers = numericTiers(liquidPrices);
  if (!tiers.length) return null;

  if (isPerUnitTierPricing(liquidPrices)) {
    const unitPrice = unitPriceAtQuantity(nextQty, liquidPrices);
    return Math.round(nextQty * unitPrice * 100) / 100;
  }

  if (liquidPrices[String(nextQty)]) return liquidPrices[String(nextQty)];
  const maxQty = tiers[tiers.length - 1].qty;
  if (maxQty > 0 && nextQty > maxQty) {
    const base = Number(liquidPrices[String(maxQty)] || 0);
    const extra = Number(liquidPrices.extra || 15);
    return base + (nextQty - maxQty) * extra;
  }
  return null;
}

export function liquidUnitPriceLabel(qty: number, liquidPrices: Record<string, number>) {
  const price = unitPriceAtQuantity(qty, liquidPrices);
  return price;
}
