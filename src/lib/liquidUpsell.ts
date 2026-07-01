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

export function nextLiquidBundlePrice(
  currentQty: number,
  liquidPrices: Record<string, number>,
) {
  const nextQty = Math.max(1, currentQty + 1);
  if (liquidPrices[String(nextQty)]) return liquidPrices[String(nextQty)];
  const numericKeys = Object.keys(liquidPrices)
    .filter((key) => key !== 'extra')
    .map((key) => Number(key))
    .filter((n) => Number.isFinite(n) && n > 0);
  const maxQty = numericKeys.length ? Math.max(...numericKeys) : 0;
  if (maxQty > 0 && nextQty > maxQty) {
    const base = Number(liquidPrices[String(maxQty)] || 0);
    const extra = Number(liquidPrices.extra || 14);
    return base + (nextQty - maxQty) * extra;
  }
  return null;
}
