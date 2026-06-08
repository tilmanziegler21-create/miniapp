# Mini App Template Setup

Этот проект переведен в шаблонный режим и больше не зависит от старого бренда в коде.

## Что менять под новый шоп

- `CITY_CODES` — список городов через запятую
- `SHOP_NAME` — название магазина для bot/server части
- `VITE_BRAND_NAME` и `BRAND_NAME` — название витрины в mini app и API
- `VITE_BRAND_SUBTITLE` и `BRAND_SUBTITLE` — подпись в шапке и баннерах
- `VITE_APP_TITLE` и `APP_TITLE` — заголовок приложения
- `VITE_SUPPORT_LABEL` и `SUPPORT_LABEL` — подпись поддержки
- `VITE_REFERRAL_SHARE_TEXT` и `REFERRAL_SHARE_TEXT` — текст в реферальном шаринге
- `VITE_BRAND_ASSET_BASE_PATH` и `BRAND_ASSET_BASE_PATH` — базовый путь до ассетов бренда
- `VITE_BRAND_AVATAR_URL` и `BRAND_AVATAR_URL` — логотип/аватар бренда, если нужен

## Ассеты бренда

По умолчанию проект использует нейтральную папку:

```text
public/assets/brand
```

Для нового города можно:

1. Заменить файлы внутри `public/assets/brand`
2. Или создать свою папку, например `public/assets/warsaw`, и указать:

```env
VITE_BRAND_ASSET_BASE_PATH=/assets/warsaw
BRAND_ASSET_BASE_PATH=/assets/warsaw
```

## Быстрый старт под новый город

1. Скопируйте `.env.example` в `.env`
2. Задайте брендовые переменные
3. Обновите `CITY_CODES`, `GROUP_URL`, `MANAGER_USERNAME`
4. Подмените изображения в папке ассетов
5. Пересоберите фронт и backend

## Как это работает на Render

- Frontend-часть теперь использует branding из `/api/config`, а не только сборочные `VITE_*`.
- Это значит, что основное имя шопа, subtitle, support label, referral text и asset base path приходят с backend и управляются Render Variables.
- `VITE_*` переменные можно оставлять как fallback для момента загрузки приложения, но ключевой white-label теперь идёт через backend env.
- Один и тот же код можно деплоить в несколько Render services с разными Variables и получать разные витрины.

## Важно

- `VITE_*` переменные нужны фронтенду как fallback на этапе сборки
- переменные без `VITE_*` нужны backend/API и теперь считаются основным источником branding для runtime
- значения брендовых пар лучше держать одинаковыми, чтобы первый рендер и runtime UI показывали один и тот же бренд
