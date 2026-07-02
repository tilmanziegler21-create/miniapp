import db from '../services/database.js';

export function evaluatePromoCode(promoCode, amountAfterLiquidDiscount) {
  const code = String(promoCode || '').trim();
  if (!code) {
    return { valid: false, discount: 0, message: 'Введите промокод', code: '' };
  }

  const promoObj = db.getPromoById(code);
  if (!promoObj) {
    return { valid: false, discount: 0, message: 'Промокод не найден', code };
  }
  if (!promoObj.active) {
    return { valid: false, discount: 0, message: 'Промокод неактивен', code };
  }

  const now = Date.now();
  const inWindow =
    (!promoObj.startsAt || Date.parse(promoObj.startsAt) <= now) &&
    (!promoObj.endsAt || Date.parse(promoObj.endsAt) >= now);
  if (!inWindow) {
    return { valid: false, discount: 0, message: 'Срок действия промокода истёк', code };
  }

  const base = Math.max(0, Number(amountAfterLiquidDiscount || 0));
  const minTotal = Number(promoObj.minTotal || 0);
  if (base < minTotal) {
    return {
      valid: false,
      discount: 0,
      message: `Минимальная сумма для промокода: ${minTotal}`,
      code,
    };
  }

  const type = String(promoObj.type || '').trim().toLowerCase();
  let discount = 0;
  if (type === 'percent') {
    discount = (base * Number(promoObj.value || 0)) / 100;
  } else if (type === 'fixed' || type === 'amount') {
    discount = Number(promoObj.value || 0);
  } else {
    return { valid: false, discount: 0, message: 'Неподдерживаемый тип промокода', code };
  }

  discount = Math.min(base, Math.round(Math.max(0, discount) * 100) / 100);
  if (discount <= 0) {
    return { valid: false, discount: 0, message: 'Промокод не даёт скидку', code };
  }

  return {
    valid: true,
    discount,
    message: `Скидка ${discount}`,
    code,
    title: String(promoObj.title || code),
  };
}
