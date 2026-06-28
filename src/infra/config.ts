import fs from "fs";
import path from "path";

type Env = {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_IDS: string;
  METRICS_TOKEN?: string;
  GOOGLE_SHEETS_SPREADSHEET_ID: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
  DB_PATH: string;
  TIMEZONE: string;
  DATA_BACKEND: "sheets" | "mock";
  GROUP_URL: string;
  GOOGLE_SHEETS_MODE: "TABS_PER_CITY" | "CITY_COLUMN";
  CITY_CODES: string;
  SHEETS_CACHE_TTL_SECONDS: number;
  SHEETS_WRITE_RETRY: number;
  SHEETS_WRITE_RETRY_BACKOFF_MS: number;
};

function requireEnv(key: keyof Env): string {
  const v = process.env[key as string];
  if (!v || v.trim() === "") throw new Error(`Missing env ${key}`);
  return v;
}

const DATA_BACKEND = (process.env.DATA_BACKEND as Env["DATA_BACKEND"]) || "mock";

// 1. Try to load from Base64 env var
const B64_CREDENTIALS = process.env.GOOGLE_CREDENTIALS_BASE64;
let parsedEmail = "";
let parsedKey = "";

if (B64_CREDENTIALS) {
  try {
    const parsed = JSON.parse(Buffer.from(B64_CREDENTIALS, 'base64').toString('utf8'));
    parsedEmail = parsed.client_email || "";
    parsedKey = parsed.private_key || "";
  } catch (e) {
    console.warn("Failed to parse GOOGLE_CREDENTIALS_BASE64");
  }
}

// 2. Try to load from service-account.json
if (!parsedEmail || !parsedKey) {
  try {
    const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH || "service-account.json";
    const fullPath = path.resolve(process.cwd(), jsonPath);
    if (fs.existsSync(fullPath)) {
      const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      parsedEmail = parsed.client_email || "";
      parsedKey = parsed.private_key || "";
    }
  } catch (e) {
    // ignore
  }
}

const SA_EMAIL = parsedEmail || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "";
const SA_KEY = parsedKey || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_SHEETS_PRIVATE_KEY || "";

export const env: Env = {
  TELEGRAM_BOT_TOKEN: requireEnv("TELEGRAM_BOT_TOKEN"),
  TELEGRAM_ADMIN_IDS: process.env.TELEGRAM_ADMIN_IDS || "",
  METRICS_TOKEN: process.env.METRICS_TOKEN || "",
  GOOGLE_SHEETS_SPREADSHEET_ID:
    DATA_BACKEND === "sheets" ? requireEnv("GOOGLE_SHEETS_SPREADSHEET_ID") : process.env.GOOGLE_SHEETS_SPREADSHEET_ID || "",
  GOOGLE_SERVICE_ACCOUNT_EMAIL:
    DATA_BACKEND === "sheets" ? (SA_EMAIL || requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL")) : SA_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY:
    DATA_BACKEND === "sheets"
      ? (SA_KEY || requireEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")).replace(/\\n/g, "\n")
      : SA_KEY.replace(/\\n/g, "\n"),
  DB_PATH: process.env.DB_PATH || "./data/app.db",
  TIMEZONE: process.env.TIMEZONE || "Europe/Moscow",
  DATA_BACKEND,
  GROUP_URL: process.env.GROUP_URL || "",
  GOOGLE_SHEETS_MODE: (process.env.GOOGLE_SHEETS_MODE as Env["GOOGLE_SHEETS_MODE"]) || "CITY_COLUMN",
  CITY_CODES: process.env.CITY_CODES || "FFM",
  SHEETS_CACHE_TTL_SECONDS: Number(process.env.SHEETS_CACHE_TTL_SECONDS || 300),
  SHEETS_WRITE_RETRY: Number(process.env.SHEETS_WRITE_RETRY || 3),
  SHEETS_WRITE_RETRY_BACKOFF_MS: Number(process.env.SHEETS_WRITE_RETRY_BACKOFF_MS || 500)
};

export const useSheets = env.DATA_BACKEND === "sheets";
