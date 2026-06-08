# Deploy to Render (White-Label Shop)

## Prerequisites
- Fork this repository to your GitHub account
- Create an account on Render.com

## Deploy Steps
1. In Render, click "New +" → "Blueprint" and select your fork
2. Render will auto-detect `render.yaml` and create one Web service
3. In this service:
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
   - The service serves both API and built frontend from one deployment
4. Set Environment Variables for the конкретный shop:
   - `BRAND_NAME` = название магазина, например `BlueVape Warsaw`
   - `BRAND_SUBTITLE` = подпись под брендом, например `warsaw delivery`
   - `APP_TITLE` = заголовок вкладки, например `BlueVape Warsaw mini app`
   - `SUPPORT_LABEL` = подпись поддержки, например `Поддержка`
   - `REFERRAL_SHARE_TEXT` = текст шеринга, например `Присоединяйся к BlueVape Warsaw:`
   - `BRAND_ASSET_BASE_PATH` = путь до ассетов, например `/assets/warsaw`
   - `BRAND_AVATAR_URL` = URL логотипа, если нужен
   - `SHOP_NAME` = название магазина для bot/cron/server части
   - `CITY_CODES` = коды городов, например `WAW`
   - `TIMEZONE` = например `Europe/Warsaw`
   - `GROUP_URL` = ссылка на группу/чат
   - `REVIEWS_URL` = ссылка на отзывы
   - `MANAGER_USERNAME` = username менеджера без лишних описаний
   - `MANAGER_PHONE` = телефон менеджера
   - `FRONTEND_URL` = публичный URL Render сервиса, например `https://bluevape-warsaw.onrender.com`
   - `DB_PATH` = `/data/app.db`, если используешь SQLite с диском
   - `TELEGRAM_BOT_TOKEN` = your bot token
   - `DATA_BACKEND` = `sheets` or `mock`
   - If using Google Sheets backend:
     - `GOOGLE_SHEETS_SPREADSHEET_ID` = your spreadsheet id
     - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = service account email
     - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = full private key (include line breaks as-is)
5. Optional fallback variables for first frontend paint:
   - `VITE_BRAND_NAME`
   - `VITE_BRAND_SUBTITLE`
   - `VITE_APP_TITLE`
   - `VITE_SUPPORT_LABEL`
   - `VITE_REFERRAL_SHARE_TEXT`
   - `VITE_BRAND_ASSET_BASE_PATH`
   - `VITE_BRAND_AVATAR_URL`
   - Их лучше держать равными backend branding values, но runtime UI уже берёт данные из `/api/config`

## How to create different shops
- Создай новый Render service из того же репозитория
- Дай ему своё имя, например `bluevape-warsaw`, `cloudhub-berlin`, `ice-market-prague`
- Введи свой набор Variables
- Подложи свой набор ассетов в `public/assets/<shop-slug>`
- Укажи `BRAND_ASSET_BASE_PATH=/assets/<shop-slug>`
- После деплоя получишь отдельный shop без изменений в коде

## Notes
- Один код теперь подходит для нескольких white-label shops
- Основной branding приходит с backend `/api/config`, поэтому смена shop name и brand texts контролируется Variables
- Disk `/data` persists your SQLite database across deployments
