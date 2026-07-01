export function isLiquidCategory(category) {
  const value = String(category || '').trim().toLowerCase();
  return value === 'liquids' || value === 'liquid' || value.includes('жидк');
}

function numericTiers(prices) {
  return Object.entries(prices || {})
    .map(([key, value]) => ({ qty: Number(key), price: Number(value) }))
    .filter((entry) => Number.isFinite(entry.qty) && entry.qty > 0 && Number.isFinite(entry.price) && entry.price > 0)
    .sort((a, b) => a.qty - b.qty);
}

export function calculateLiquidBundleTotal(quantity, prices, fallbackTotal = 0) {
  const qty = Number(quantity || 0);
  if (!Number.isFinite(qty) || qty <= 0) return 0;

  const tiers = numericTiers(prices);
  if (!tiers.length) return fallbackTotal;

  const exact = tiers.find((entry) => entry.qty === qty);
  if (exact) return exact.price;

  const maxTier = tiers[tiers.length - 1];
  const extraPrice = Number(prices?.extra || 0);
  if (qty > maxTier.qty && Number.isFinite(extraPrice) && extraPrice > 0) {
    return maxTier.price + (qty - maxTier.qty) * extraPrice;
  }

  return fallbackTotal;
}

export function calculateOrderPricing(items, liquidPrices) {
  let subtotal = 0;
  let liquidQty = 0;
  let liquidBaseTotal = 0;

  for (const item of items || []) {
    const qty = Number(item.quantity || 0);
    const price = Number(item.price || item.product_price || 0);
    const line = qty * price;
    subtotal += line;
    if (isLiquidCategory(item.category)) {
      liquidQty += qty;
      liquidBaseTotal += line;
    }
  }

  const liquidTotal = calculateLiquidBundleTotal(liquidQty, liquidPrices, liquidBaseTotal);
  const discount = Math.max(0, liquidBaseTotal - liquidTotal);
  const total = Math.max(0, subtotal - discount);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    liquidQty,
    liquidBaseTotal,
    liquidTotal,
  };
}
