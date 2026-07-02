import path from 'path';
import fs from 'fs';

export function getBotUsername() {
  return String(process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
}

export function buildMiniAppStartUrl(startappPayload?: string) {
  const bot = getBotUsername();
  if (!bot) return null;
  const payload = String(startappPayload || '').trim();
  if (payload) return `https://t.me/${bot}?startapp=${encodeURIComponent(payload)}`;
  return `https://t.me/${bot}?startapp`;
}

export function resolveStartLogoPath() {
  const candidates = [
    path.join(process.cwd(), 'src/ui/startlogo.png'),
    path.join(process.cwd(), 'dist/assets/startlogo.png'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}
