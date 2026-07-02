import { shopConfig } from "../config/shopConfig";

export function buildWelcomeCaption() {
  const shopName = String(shopConfig.shopName || "ELF DUCK SHOP").trim();
  return `Добро пожаловать в <b>${shopName}</b>!`;
}

export function buildReferralPromoCaption() {
  return [
    "🎁 <b>РЕФЕРАЛЬНАЯ СИСТЕМА</b>",
    "",
    "👥 Приглашай друзей в магазин",
    "🛍 Когда друг делает первый заказ — вы получаете бонус",
    "🍒 Бонусы можно тратить на следующие покупки",
    "",
    "👇 Нажмите «Подробнее», чтобы открыть программу",
  ].join("\n");
}
