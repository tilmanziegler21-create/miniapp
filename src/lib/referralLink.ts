export function buildReferralBotLink(botUsername: string, refCode: string) {
  const bot = String(botUsername || '').trim().replace(/^@/, '');
  const code = String(refCode || '').trim();
  if (!bot || !code) return '';
  return `https://t.me/${bot}?start=ref_${encodeURIComponent(code)}`;
}

export function buildMiniAppDeepLink(botUsername: string, startappPayload?: string) {
  const bot = String(botUsername || '').trim().replace(/^@/, '');
  if (!bot) return '';
  const payload = String(startappPayload || '').trim();
  if (payload) return `https://t.me/${bot}?startapp=${encodeURIComponent(payload)}`;
  return `https://t.me/${bot}?startapp`;
}
