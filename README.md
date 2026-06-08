# Mini App Template

Шаблонный white-label проект для Telegram mini app с React + Vite на фронте и Express API на бэкенде.

## Что в репозитории

- `src/` — фронтенд mini app
- `api/` — API и runtime branding через `/api/config`
- `public/assets/brand/` — дефолтные баннеры, категории и изображения меню
- `public/images/brands/` — изображения брендов товаров
- `TEMPLATE_SETUP.md` — быстрая настройка под новый город
- `README_RENDER.md` — деплой на Render

## Локальный запуск

1. Скопируй `.env.example` в `.env`
2. Установи зависимости:

```bash
npm ci
```

3. Запусти API:

```bash
npm run dev
```

4. В отдельном терминале запусти фронтенд:

```bash
npm run dev:frontend
```

## Куда загружать фото

- Баннеры магазина: `public/assets/<shop-slug>/banners/`
- Картинки категорий: `public/assets/<shop-slug>/categories/`
- Картинки плиток в меню: `public/assets/<shop-slug>/tiles/`
- Логотип или служебные UI-файлы: `public/assets/<shop-slug>/ui/`
- Фото брендов товаров: `public/images/brands/<brand-slug>/`

Если делаешь новый город, проще всего скопировать `public/assets/brand/` в новую папку, например:

```text
public/assets/warsaw/
```

После этого укажи:

```env
BRAND_ASSET_BASE_PATH=/assets/warsaw
VITE_BRAND_ASSET_BASE_PATH=/assets/warsaw
```

## Что менять под новый город

- `BRAND_NAME` и `VITE_BRAND_NAME` — имя витрины
- `BRAND_SUBTITLE` и `VITE_BRAND_SUBTITLE` — подпись под брендом
- `APP_TITLE` и `VITE_APP_TITLE` — заголовок вкладки
- `BRAND_ASSET_BASE_PATH` и `VITE_BRAND_ASSET_BASE_PATH` — папка с изображениями города
- `CITY_CODES` — код города
- `TIMEZONE` — таймзона
- `GROUP_URL` — ссылка на чат или канал
- `SHOP_NAME` — внутреннее имя магазина для bot/server части

## Сборка

```bash
npm run typecheck
npm run build
```
