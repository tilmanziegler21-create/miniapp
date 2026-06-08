export const shopConfig = {
  cityCode: process.env.CITY_CODE || "HG",
  shopName: process.env.SHOP_NAME || "Template Shop",
  welcomeMessage: (process.env.WELCOME_MESSAGE ||
    [
      "Добро пожаловать в ваш шаблонный mini app магазин.",
      "Настройте название, город, ассортимент и тексты под свою витрину.",
      "Заказ и выбор времени выдачи доступны в одном месте.",
      "",
      "Добавьте свои цены, условия и ссылки в env-конфиг.",
      "",
      "Поддерживаются доставка, самовывоз, бонусы и реферальная программа.",
      "",
      "👇 Оформление заказа занимает меньше минуты.",
    ].join("\n")).trim(),
  telegramGroupUrl: process.env.TELEGRAM_GROUP_URL || "",
  reviewsUrl: process.env.REVIEWS_URL || "",
};
