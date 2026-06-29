export const CART_FLY_EVENT = 'app:cart-fly';

export type CartFlyDetail = {
  startX: number;
  startY: number;
  image?: string;
  label?: string;
};

export const triggerCartFly = (detail: CartFlyDetail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CartFlyDetail>(CART_FLY_EVENT, { detail }));
};

