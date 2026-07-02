export function buildReferralShareLink(botUsername: string, refCode: string) {
  const bot = String(botUsername || '').trim().replace(/^@/, '');
  const code = String(refCode || '').trim();
  if (!bot || !code) return '';
  return `https://t.me/${bot}?startapp=ref_${encodeURIComponent(code)}`;
}

/** @deprecated Use buildReferralShareLink — share must open mini app, not bot chat */
export function buildReferralBotLink(botUsername: string, refCode: string) {
  return buildReferralShareLink(botUsername, refCode);
}

export function buildMiniAppDeepLink(botUsername: string, startappPayload?: string) {
  const bot = String(botUsername || '').trim().replace(/^@/, '');
  if (!bot) return '';
  const payload = String(startappPayload || '').trim();
  if (payload) return `https://t.me/${bot}?startapp=${encodeURIComponent(payload)}`;
  return `https://t.me/${bot}?startapp`;
}
