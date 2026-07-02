import type { CartItem } from '../store/useCartStore';
import { isLiquidCategory, liquidBundleTotal } from './liquidUpsell';

export type CartPricing = {
  subtotal: number;
  discount: number;
  total: number;
  promoDiscount?: number;
};

export function calculateClientCartPricing(
  items: CartItem[],
  liquidPrices: Record<string, number>,
  promoDiscount = 0,
) {
  let subtotal = 0;
  let totalLiquidsQty = 0;
  let totalLiquidsBasePrice = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const lineSubtotal = price * qty;
    subtotal += lineSubtotal;
    if (isLiquidCategory(item.category)) {
      totalLiquidsQty += qty;
      totalLiquidsBasePrice += lineSubtotal;
    }
  }

  const liquidsFinalPrice = liquidBundleTotal(totalLiquidsQty, liquidPrices);
  const totalLiquidsDiscount = totalLiquidsQty > 0 ? Math.max(0, totalLiquidsBasePrice - liquidsFinalPrice) : 0;

  const mappedItems = items.map((item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.price || 0);
    const lineSubtotal = price * qty;
    let lineTotal = lineSubtotal;
    let effectivePrice = price;

    if (isLiquidCategory(item.category) && totalLiquidsBasePrice > 0) {
      const itemShare = lineSubtotal / totalLiquidsBasePrice;
      const itemDiscount = totalLiquidsDiscount * itemShare;
      lineTotal = Math.max(0, lineSubtotal - itemDiscount);
      effectivePrice = qty > 0 ? lineTotal / qty : 0;
    }

    return {
      ...item,
      total: Math.round(lineTotal * 100) / 100,
      effectivePrice: Math.round(effectivePrice * 100) / 100,
    };
  });

  const quantityDiscount = Math.round(totalLiquidsDiscount * 100) / 100;
  const promo = Math.max(0, Number(promoDiscount || 0));
  const discount = Math.round((quantityDiscount + promo) * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  return {
    items: mappedItems,
    pricing: {
      subtotal: Math.round(subtotal * 100) / 100,
      discount,
      total,
      promoDiscount: promo,
    },
    total,
  };
}
