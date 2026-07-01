import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/order.js';
import productRoutes from './routes/product.js';
import couriersRoutes from './routes/couriers.js';
import configRoutes from './routes/config.js';
import analyticsRoutes from './routes/analytics.js';
import favoritesRoutes from './routes/favorites.js';
import bonusesRoutes from './routes/bonuses.js';
import adminRoutes from './routes/admin.js';
import courierPanelRoutes from './routes/courier.js';
import referralRoutes from './routes/referral.js';
import fortuneRoutes from './routes/fortune.js';
import cron from 'node-cron';
import db from './services/database.js';
import { updateOrderRowByOrderId, warmupSheetsCache } from './services/sheets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
const distDir = join(projectRoot, 'dist');
const distIndexPath = join(distDir, 'index.html');

dotenv.config({ path: join(__dirname, '../../.env') });

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render, Nginx, etc) for express-rate-limit

const PORT = process.env.PORT || 8080;
const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean),
);

app.use(helmet());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (
        process.env.NODE_ENV !== 'production' &&
        (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
      ) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/product', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/couriers', couriersRoutes);
app.use('/api/config', configRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/bonuses', bonusesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courier', courierPanelRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/fortune', fortuneRoutes);

app.get('/health', (req, res) => {
  const dataBackend = process.env.DATA_BACKEND || 'mock';
  const sheetsStatus = dataBackend === "sheets" ? "CHECK_DEFERRED" : "DISABLED";
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    backend: dataBackend, 
    sheets_auth: sheetsStatus
  });
});

app.get("/metrics", (req, res) => {
  const metricsToken = process.env.METRICS_TOKEN || "";
  const auth = req.headers.authorization || "";
  const token = String(auth).startsWith("Bearer ") ? String(auth).slice(7) : "";
  if (metricsToken.length > 0 && token !== metricsToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ qty_reserved: null });
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api|health).*/, (req, res, next) => {
    if (!fs.existsSync(distIndexPath)) return next();
    res.sendFile(distIndexPath);
  });
}

// Initialize TS Backend
async function initTSBackend() {
  try {
    const [
      { startBot },
      { initDb },
      { registerCron },
      { loadState },
      { logger },
      { getDefaultCity, getBackend },
      { validateSheetsSchemaOrThrow },
      { env, useSheets },
    ] = await Promise.all([
      import('../../src/bot/Bot.ts'),
      import('../../src/infra/db/sqlite.ts'),
      import('../../src/infra/cron/scheduler.ts'),
      import('../../src/infra/storage/InMemoryStorage.ts'),
      import('../../src/infra/logger.ts'),
      import('../../src/infra/backend/index.ts'),
      import('../../src/infra/sheets/SchemaValidator.ts'),
      import('../../src/infra/config.ts'),
    ]);

    loadState();
    logger.info("[BOT] State loaded from persistent storage");
    
    try { 
      const b = getBackend(); 
      if (typeof b.preloadData === "function") { 
        await b.preloadData(); 
        logger.info("[BOT] Sheets data preloaded"); 
      } 
      if (typeof b.init === "function") { 
        await b.init(); 
        logger.info("[BOT] Backend initialized"); 
      } 
    } catch (e) {
      logger.warn("[BOT] Backend init warning", { error: String(e) });
    }

    await initDb();
    
    if (useSheets) {
      const city = getDefaultCity();
      try { 
        await validateSheetsSchemaOrThrow(city); 
      } catch (e) { 
        logger.warn("Sheets schema validation warning", { error: String(e) }); 
      }
    }

    await startBot();
    await registerCron();
    logger.info("[BOT] TS Backend initialized successfully");
  } catch (e) {
    logger.error("[BOT] Failed to initialize TS Backend", { error: String(e) });
  }
}

async function warmupApiSheetsCache() {
  if (String(process.env.DATA_BACKEND || 'mock') !== 'sheets') return;
  const cities = String(process.env.CITY_CODES || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    await warmupSheetsCache(cities);
    console.log('[API] Sheets cache warmed for cities:', cities.join(', '));
  } catch (e) {
    console.warn('[API] Sheets warmup warning:', e?.message || e);
  }
}

const server = app.listen(PORT, async () => {
  const actualPort = server.address().port;
  console.log(`🚀 Server running on port ${actualPort}`);
  await Promise.all([initTSBackend(), warmupApiSheetsCache()]);
});

cron.schedule('*/1 * * * *', () => {
  try {
    const res = db.cleanupExpiredReservations();
    if (res.expiredOrders.length) {
      for (const oid of res.expiredOrders) {
        const order = db.orders.get(String(oid));
        if (order && (order.status === 'buffer' || order.status === 'pending')) {
          order.status = 'cancelled';
          order.cancelled_at = new Date().toISOString();
          db.orders.set(String(oid), order);
          const city = String(order.city || '');
          if (city) {
            updateOrderRowByOrderId(city, String(oid), { status: 'cancelled' }).catch(() => {});
          }
        }
      }
    }
  } catch (e) {
    console.error('Reservation cleanup error:', e);
  }
});

export default app;
